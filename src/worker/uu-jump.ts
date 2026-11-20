import { zValidator } from '@hono/zod-validator';
import { and, asc, count, desc, eq, lt, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireGame } from './auth';
import { edgeCache } from './cache';
import { devices, uuJumpRuns as runs } from './db/schema';
import { registerDevice } from './devices';
import { limitRankingReads } from './ranking-limit';

// 値の範囲は、ゲームの仕様変更で当日の記録が落ちないよう広めに取る。明らかに壊れた値だけ弾く。
const runSchema = z.object({
  runId: z.string().min(1).max(64),
  deviceId: z.string().min(1).max(128),
  mapName: z.string().trim().min(1).max(64),
  clearSeconds: z.number().min(0).max(86_400),
  jumpCount: z.number().int().min(0).max(1_000_000),
  test: z.boolean().default(false),
});

// 並べ替えに使える項目
const SORT_KEYS = ['clearSeconds', 'jumpCount', 'createdAt'] as const;

// ランキングとマップの一覧の応答をキャッシュに置く秒数
const RANKING_CACHE_SECONDS = 5;

const rankingQuerySchema = z.object({
  // どのマップのランキングか。マップをまたいだ順位は意味がないので、必ず指定する
  map: z.string().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  // 並べ替え。clearSeconds は短い順、jumpCount は少ない順、createdAt は新しい順。順位はどれでもタイム順のまま
  sort: z.enum(SORT_KEYS).default('clearSeconds'),
  // 1 を付けると、エディターやデバッグ用のビルドからの記録も混ぜる(動作確認用)
  includeTest: z.enum(['0', '1']).default('0'),
});

type DB = ReturnType<typeof drizzle>;

/**
 * そのマップでの順位(1 始まり)。クリアまでが短い順で、同じタイムは先に記録したほうが上。
 * テストの記録は順位に数えない。テストの記録自身の順位は「本番の記録の中に入れたら何位か」を返す。
 */
async function rankOf(
  db: DB,
  run: { id: number; mapName: string; clearSeconds: number },
): Promise<number> {
  const [row] = await db
    .select({ ahead: count() })
    .from(runs)
    .where(
      and(
        eq(runs.isTest, false),
        eq(runs.mapName, run.mapName),
        or(
          lt(runs.clearSeconds, run.clearSeconds),
          and(eq(runs.clearSeconds, run.clearSeconds), lt(runs.id, run.id)),
        ),
      ),
    );
  return (row?.ahead ?? 0) + 1;
}

async function totalRanked(db: DB, mapName: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(runs)
    .where(and(eq(runs.isTest, false), eq(runs.mapName, mapName)));
  return row?.total ?? 0;
}

export const uuJumpApp = new Hono<{ Bindings: Env }>()
  // ゴールした 1 回のプレイを記録する。同じ runId を送り直しても 2 行にはならない。
  .post('/runs', requireGame, zValidator('json', runSchema), async (c) => {
    const db = drizzle(c.env.DB);
    const body = c.req.valid('json');

    // 起動時の登録が失敗していた PC でも、記録は落とさない
    await registerDevice(c.env.DB, body.deviceId);

    const inserted = await db
      .insert(runs)
      .values({
        runId: body.runId,
        deviceId: body.deviceId,
        mapName: body.mapName,
        clearSeconds: body.clearSeconds,
        jumpCount: body.jumpCount,
        isTest: body.test,
      })
      .onConflictDoNothing({ target: runs.runId })
      .returning({ id: runs.id });

    const [run] = await db.select().from(runs).where(eq(runs.runId, body.runId));
    if (!run) return c.json({ error: '記録に失敗しました' }, 500);

    const [rank, total] = await Promise.all([rankOf(db, run), totalRanked(db, run.mapName)]);
    return c.json({ id: run.id, rank, total, test: run.isTest }, inserted.length > 0 ? 201 : 200);
  })
  // 記録があるマップの一覧。画面のマップの切り替えに使う。テストの記録だけのマップは出さない。
  .get('/maps', edgeCache(RANKING_CACHE_SECONDS, []), async (c) => {
    const db = drizzle(c.env.DB);
    const rows = await db
      .select({ name: runs.mapName, count: count() })
      .from(runs)
      .where(eq(runs.isTest, false))
      .groupBy(runs.mapName)
      .orderBy(asc(runs.mapName));
    return c.json({ maps: rows });
  })
  // マップごとのランキング。既定はクリアまでが短い順。
  .get(
    '/ranking',
    edgeCache(RANKING_CACHE_SECONDS, Object.keys(rankingQuerySchema.shape)),
    zValidator('query', rankingQuerySchema),
    limitRankingReads,
    async (c) => {
      const db = drizzle(c.env.DB);
      const query = c.req.valid('query');

      const where = and(
        eq(runs.mapName, query.map),
        query.includeTest === '1' ? undefined : eq(runs.isTest, false),
      );

      // 順位は、そのマップでのタイム順(同じタイムは先に記録したほうが上)。
      // 並べ替えやページ送りをしても変わらないよう、先に全体へ順位を振ってから並べ替える。
      const ranked = db
        .select({
          rank: sql<number>`row_number() over (order by ${runs.clearSeconds} asc, ${runs.id} asc)`.as(
            'rank',
          ),
          id: runs.id,
          mapName: runs.mapName,
          clearSeconds: runs.clearSeconds,
          jumpCount: runs.jumpCount,
          test: runs.isTest,
          deviceName: devices.displayName,
          createdAt: runs.createdAt,
        })
        .from(runs)
        .innerJoin(devices, eq(runs.deviceId, devices.id))
        .where(where)
        .as('ranked');

      // 記録した時刻は秒までしか持たないので、記録順は id で並べる(id は記録した順に増える)
      const orderBy =
        query.sort === 'createdAt'
          ? [desc(ranked.id)]
          : query.sort === 'jumpCount'
            ? [asc(ranked.jumpCount), asc(ranked.rank)]
            : [asc(ranked.rank)];

      const [rows, [totalRow]] = await Promise.all([
        db
          .select()
          .from(ranked)
          .orderBy(...orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db.select({ total: count() }).from(runs).where(where),
      ]);

      return c.json({ total: totalRow?.total ?? 0, runs: rows });
    },
  );
