import { zValidator } from '@hono/zod-validator';
import { and, asc, count, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { fetchAccessIdentity, requireAccess } from './auth';
import { devices, waterShootingRuns as runs } from './db/schema';

const runsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  // 既定は新しい順
  sort: z.enum(['createdAt', 'score']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  // テストの記録の扱い。all: 混ぜる、only: テストだけ、exclude: 本番だけ
  test: z.enum(['all', 'only', 'exclude']).default('all'),
  deviceId: z.string().min(1).max(128).optional(),
  result: z.enum(['cleared', 'game_over']).optional(),
});

function parseRunId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

// 管理用の API。/api/admin/* はすべて Cloudflare Access の内側に置く。
export const adminApp = new Hono<{ Bindings: Env }>()
  .use(requireAccess)
  // ログインできているかの確認用
  .get('/me', async (c) => {
    const token = c.get('accessToken');
    // token が無いのはローカル開発だけ(requireAccess が検証を飛ばしたとき)
    const identity = token
      ? await fetchAccessIdentity(c.env.ACCESS_TEAM_DOMAIN, token)
      : { login: null, name: null };
    return c.json({ authenticated: token !== null, ...identity, email: c.get('adminEmail') });
  })
  // 登録済みの PC。記録の数も付ける
  .get('/devices', async (c) => {
    const db = drizzle(c.env.DB);
    const rows = await db
      .select({
        id: devices.id,
        name: devices.displayName,
        createdAt: devices.createdAt,
        runCount: count(runs.id),
      })
      .from(devices)
      .leftJoin(runs, eq(runs.deviceId, devices.id))
      .groupBy(devices.id)
      .orderBy(asc(devices.createdAt), asc(devices.displayName));
    return c.json({ devices: rows });
  })
  // PC の表示名を変える
  .patch(
    '/devices/:id',
    zValidator('json', z.object({ name: z.string().trim().min(1).max(32) })),
    async (c) => {
      const db = drizzle(c.env.DB);
      const { name } = c.req.valid('json');
      const [row] = await db
        .update(devices)
        .set({ displayName: name })
        .where(eq(devices.id, c.req.param('id')))
        .returning();
      if (!row) return c.json({ error: 'その ID の PC は登録されていません' }, 404);
      return c.json({ id: row.id, name: row.displayName });
    },
  )
  // WaterShooting の記録の一覧。ランキングと違い、テストの記録も、どの PC からかも見える
  .get('/water-shooting/runs', zValidator('query', runsQuerySchema), async (c) => {
    const db = drizzle(c.env.DB);
    const query = c.req.valid('query');

    const where = and(
      query.test === 'all' ? undefined : eq(runs.isTest, query.test === 'only'),
      query.deviceId ? eq(runs.deviceId, query.deviceId) : undefined,
      query.result ? eq(runs.result, query.result) : undefined,
    );
    const direction = query.order === 'asc' ? asc : desc;
    // 記録した時刻は秒までしか持たないので、記録順は id で並べる(id は記録した順に増える)
    const orderBy =
      query.sort === 'score' ? [direction(runs.score), asc(runs.id)] : [direction(runs.id)];

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: runs.id,
          runId: runs.runId,
          deviceId: runs.deviceId,
          deviceName: devices.displayName,
          score: runs.score,
          baseScore: runs.baseScore,
          result: runs.result,
          difficulty: runs.difficulty,
          player: runs.player,
          playSeconds: runs.playSeconds,
          reachedStage: runs.reachedStage,
          totalStages: runs.totalStages,
          test: runs.isTest,
          createdAt: runs.createdAt,
        })
        .from(runs)
        .innerJoin(devices, eq(runs.deviceId, devices.id))
        .where(where)
        .orderBy(...orderBy)
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(runs).where(where),
    ]);

    return c.json({ total: totalRow?.total ?? 0, runs: rows });
  })
  // 記録をテスト扱いにする/戻す。テスト扱いの記録はランキングに出ない。消すのと違い、元に戻せる
  .patch(
    '/water-shooting/runs/:id',
    zValidator('json', z.object({ test: z.boolean() })),
    async (c) => {
      const id = parseRunId(c.req.param('id'));
      if (id === null) return c.json({ error: 'id が数字ではありません' }, 400);
      const db = drizzle(c.env.DB);
      const [row] = await db
        .update(runs)
        .set({ isTest: c.req.valid('json').test })
        .where(eq(runs.id, id))
        .returning({ id: runs.id, test: runs.isTest });
      if (!row) return c.json({ error: 'その id の記録はありません' }, 404);
      return c.json(row);
    },
  )
  // WaterShooting の記録を 1 件消す(いたずらや誤送信の片付け用)
  .delete('/water-shooting/runs/:id', async (c) => {
    const id = parseRunId(c.req.param('id'));
    if (id === null) return c.json({ error: 'id が数字ではありません' }, 400);
    const db = drizzle(c.env.DB);
    const [row] = await db.delete(runs).where(eq(runs.id, id)).returning({ id: runs.id });
    if (!row) return c.json({ error: 'その id の記録はありません' }, 404);
    return c.json({ id: row.id });
  });
