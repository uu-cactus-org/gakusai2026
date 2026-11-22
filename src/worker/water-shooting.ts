import { zValidator } from '@hono/zod-validator';
import { and, asc, count, desc, eq, gt, lt, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireGame } from './auth';
import { edgeCache } from './cache';
import { devices, waterShootingRuns as runs } from './db/schema';
import { registerDevice } from './devices';
import { limitRankingReads } from './ranking-limit';
import { PLAY_BUCKET_SECONDS, STATS_CACHE_SECONDS, playBuckets } from './stats';

// 値の範囲は、ゲームの仕様変更で当日の記録が落ちないよう広めに取る。明らかに壊れた値だけ弾く。
const runSchema = z.object({
  runId: z.string().min(1).max(64),
  deviceId: z.string().min(1).max(128),
  result: z.enum(['cleared', 'game_over']),
  difficulty: z.string().min(1).max(32),
  player: z.string().min(1).max(32),
  score: z.number().int().min(0).max(1_000_000_000),
  baseScore: z.number().int().min(0).max(1_000_000_000),
  playSeconds: z.number().min(0).max(86_400),
  reachedStage: z.number().int().min(1).max(100),
  totalStages: z.number().int().min(1).max(100),
  test: z.boolean().default(false),
});

// 並べ替えに使える項目
const SORT_KEYS = ['score', 'baseScore', 'playSeconds', 'reachedStage', 'createdAt'] as const;

// ランキングの応答をキャッシュに置く秒数。
// サイネージは 30 秒ほどで一巡して同じページへ戻ってくるので、それより長く置かないと、毎回 D1 を読むことになる
const RANKING_CACHE_SECONDS = 60;

const rankingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(SORT_KEYS).default('score'),
  // 省いたときは、プレイ時間だけ短い順、ほかは大きい順(新しい順)
  order: z.enum(['asc', 'desc']).optional(),
  // 絞り込み
  difficulty: z.string().min(1).max(32).optional(),
  player: z.string().min(1).max(32).optional(),
  result: z.enum(['cleared', 'game_over']).optional(),
  // 1 を付けると、エディターやデバッグ用のビルドからの記録も混ぜる(動作確認用)
  includeTest: z.enum(['0', '1']).default('0'),
});

type DB = ReturnType<typeof drizzle>;

/**
 * 順位(1 始まり)。スコアが高い順で、同点は先に記録したほうが上。
 * テストの記録は順位に数えない。テストの記録自身の順位は「本番の記録の中に入れたら何位か」を返す。
 */
async function rankOf(db: DB, run: { id: number; score: number }): Promise<number> {
  const [row] = await db
    .select({ ahead: count() })
    .from(runs)
    .where(
      and(
        eq(runs.isTest, false),
        or(gt(runs.score, run.score), and(eq(runs.score, run.score), lt(runs.id, run.id))),
      ),
    );
  return (row?.ahead ?? 0) + 1;
}

async function totalRanked(db: DB): Promise<number> {
  const [row] = await db.select({ total: count() }).from(runs).where(eq(runs.isTest, false));
  return row?.total ?? 0;
}

export const waterShootingApp = new Hono<{ Bindings: Env }>()
  // 1 回のプレイを記録する。同じ runId を送り直しても 2 行にはならない。
  .post('/runs', requireGame, zValidator('json', runSchema), async (c) => {
    const db = drizzle(c.env.DB);
    const body = c.req.valid('json');

    // 起動時の登録が失敗していた PC でも、スコアは落とさない
    await registerDevice(c.env.DB, body.deviceId);

    const inserted = await db
      .insert(runs)
      .values({
        runId: body.runId,
        deviceId: body.deviceId,
        result: body.result,
        difficulty: body.difficulty,
        player: body.player,
        score: body.score,
        baseScore: body.baseScore,
        playSeconds: body.playSeconds,
        reachedStage: body.reachedStage,
        totalStages: body.totalStages,
        isTest: body.test,
      })
      .onConflictDoNothing({ target: runs.runId })
      .returning({ id: runs.id });

    const [run] = await db.select().from(runs).where(eq(runs.runId, body.runId));
    if (!run) return c.json({ error: '記録に失敗しました' }, 500);

    const [rank, total] = await Promise.all([rankOf(db, run), totalRanked(db)]);
    return c.json({ id: run.id, rank, total, test: run.isTest }, inserted.length > 0 ? 201 : 200);
  })
  // 10 分ごとのプレイ数。統計の画面のグラフに使う。
  .get('/stats', edgeCache(STATS_CACHE_SECONDS, []), async (c) => {
    const buckets = await playBuckets(drizzle(c.env.DB), runs);
    return c.json({ bucketSeconds: PLAY_BUCKET_SECONDS, buckets });
  })
  // ランキング。既定はスコアが高い順。並べ替えと絞り込みができる。
  .get(
    '/ranking',
    edgeCache(RANKING_CACHE_SECONDS, Object.keys(rankingQuerySchema.shape)),
    zValidator('query', rankingQuerySchema),
    limitRankingReads,
    async (c) => {
      const db = drizzle(c.env.DB);
      const query = c.req.valid('query');

      const where = and(
        query.includeTest === '1' ? undefined : eq(runs.isTest, false),
        query.difficulty ? eq(runs.difficulty, query.difficulty) : undefined,
        query.player ? eq(runs.player, query.player) : undefined,
        query.result ? eq(runs.result, query.result) : undefined,
      );

      // 順位は、絞り込んだ記録の中でのスコア順(同点は先に記録したほうが上)。
      // 並べ替えやページ送りをしても変わらないよう、先に全体へ順位を振ってから並べ替える。
      const ranked = db
        .select({
          rank: sql<number>`row_number() over (order by ${runs.score} desc, ${runs.id} asc)`.as(
            'rank',
          ),
          id: runs.id,
          score: runs.score,
          baseScore: runs.baseScore,
          result: runs.result,
          difficulty: runs.difficulty,
          player: runs.player,
          playSeconds: runs.playSeconds,
          reachedStage: runs.reachedStage,
          totalStages: runs.totalStages,
          test: runs.isTest,
          deviceName: devices.displayName,
          createdAt: runs.createdAt,
        })
        .from(runs)
        .innerJoin(devices, eq(runs.deviceId, devices.id))
        .where(where)
        .as('ranked');

      const direction =
        (query.order ?? (query.sort === 'playSeconds' ? 'asc' : 'desc')) === 'asc' ? asc : desc;

      // 記録した時刻は秒までしか持たないので、記録順は id で並べる(id は記録した順に増える)
      const sortColumn = query.sort === 'createdAt' ? ranked.id : ranked[query.sort];

      const [rows, [totalRow]] = await Promise.all([
        db
          .select()
          .from(ranked)
          // 同じ値どうしは順位の順に並べる
          .orderBy(direction(sortColumn), asc(ranked.rank))
          .limit(query.limit)
          .offset(query.offset),
        db.select({ total: count() }).from(runs).where(where),
      ]);

      return c.json({ total: totalRow?.total ?? 0, runs: rows });
    },
  );
