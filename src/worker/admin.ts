import { zValidator } from '@hono/zod-validator';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { fetchAccessIdentity, requireAccess } from './auth';
import { devices, uuJumpRuns, waterShootingRuns } from './db/schema';

const waterShootingRunsQuerySchema = z.object({
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

const uuJumpRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  // 既定は新しい順。clearSeconds は短い順
  sort: z.enum(['createdAt', 'clearSeconds']).default('createdAt'),
  test: z.enum(['all', 'only', 'exclude']).default('all'),
  deviceId: z.string().min(1).max(128).optional(),
  map: z.string().min(1).max(64).optional(),
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
        // 全ゲームの記録の合計。列の名前だけだと内側の表の列と取り違えるので、表の名前から書く
        runCount: sql<number>`(select count(*) from water_shooting_runs where water_shooting_runs.device_id = devices.id) + (select count(*) from uu_jump_runs where uu_jump_runs.device_id = devices.id)`,
      })
      .from(devices)
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
  .get('/water-shooting/runs', zValidator('query', waterShootingRunsQuerySchema), async (c) => {
    const db = drizzle(c.env.DB);
    const query = c.req.valid('query');

    const where = and(
      query.test === 'all' ? undefined : eq(waterShootingRuns.isTest, query.test === 'only'),
      query.deviceId ? eq(waterShootingRuns.deviceId, query.deviceId) : undefined,
      query.result ? eq(waterShootingRuns.result, query.result) : undefined,
    );
    const direction = query.order === 'asc' ? asc : desc;
    // 記録した時刻は秒までしか持たないので、記録順は id で並べる(id は記録した順に増える)
    const orderBy =
      query.sort === 'score'
        ? [direction(waterShootingRuns.score), asc(waterShootingRuns.id)]
        : [direction(waterShootingRuns.id)];

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: waterShootingRuns.id,
          runId: waterShootingRuns.runId,
          deviceId: waterShootingRuns.deviceId,
          deviceName: devices.displayName,
          score: waterShootingRuns.score,
          baseScore: waterShootingRuns.baseScore,
          result: waterShootingRuns.result,
          difficulty: waterShootingRuns.difficulty,
          player: waterShootingRuns.player,
          playSeconds: waterShootingRuns.playSeconds,
          reachedStage: waterShootingRuns.reachedStage,
          totalStages: waterShootingRuns.totalStages,
          test: waterShootingRuns.isTest,
          createdAt: waterShootingRuns.createdAt,
        })
        .from(waterShootingRuns)
        .innerJoin(devices, eq(waterShootingRuns.deviceId, devices.id))
        .where(where)
        .orderBy(...orderBy)
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(waterShootingRuns).where(where),
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
        .update(waterShootingRuns)
        .set({ isTest: c.req.valid('json').test })
        .where(eq(waterShootingRuns.id, id))
        .returning({ id: waterShootingRuns.id, test: waterShootingRuns.isTest });
      if (!row) return c.json({ error: 'その id の記録はありません' }, 404);
      return c.json(row);
    },
  )
  // WaterShooting の記録を 1 件消す(いたずらや誤送信の片付け用)
  .delete('/water-shooting/runs/:id', async (c) => {
    const id = parseRunId(c.req.param('id'));
    if (id === null) return c.json({ error: 'id が数字ではありません' }, 400);
    const db = drizzle(c.env.DB);
    const [row] = await db
      .delete(waterShootingRuns)
      .where(eq(waterShootingRuns.id, id))
      .returning({ id: waterShootingRuns.id });
    if (!row) return c.json({ error: 'その id の記録はありません' }, 404);
    return c.json({ id: row.id });
  })
  // UU-JUMP の記録の一覧。テストの記録も、どの PC からかも見える。順位は付けない
  .get('/uu-jump/runs', zValidator('query', uuJumpRunsQuerySchema), async (c) => {
    const db = drizzle(c.env.DB);
    const query = c.req.valid('query');

    const where = and(
      query.test === 'all' ? undefined : eq(uuJumpRuns.isTest, query.test === 'only'),
      query.deviceId ? eq(uuJumpRuns.deviceId, query.deviceId) : undefined,
      query.map ? eq(uuJumpRuns.mapName, query.map) : undefined,
    );
    // 記録した時刻は秒までしか持たないので、記録順は id で並べる(id は記録した順に増える)
    const orderBy =
      query.sort === 'clearSeconds'
        ? [asc(uuJumpRuns.clearSeconds), asc(uuJumpRuns.id)]
        : [desc(uuJumpRuns.id)];

    const [rows, [totalRow], maps] = await Promise.all([
      db
        .select({
          id: uuJumpRuns.id,
          runId: uuJumpRuns.runId,
          deviceId: uuJumpRuns.deviceId,
          deviceName: devices.displayName,
          mapName: uuJumpRuns.mapName,
          clearSeconds: uuJumpRuns.clearSeconds,
          jumpCount: uuJumpRuns.jumpCount,
          test: uuJumpRuns.isTest,
          createdAt: uuJumpRuns.createdAt,
        })
        .from(uuJumpRuns)
        .innerJoin(devices, eq(uuJumpRuns.deviceId, devices.id))
        .where(where)
        .orderBy(...orderBy)
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(uuJumpRuns).where(where),
      // 絞り込みの選択肢。テストの記録だけのマップも含める
      db
        .selectDistinct({ name: uuJumpRuns.mapName })
        .from(uuJumpRuns)
        .orderBy(asc(uuJumpRuns.mapName)),
    ]);

    return c.json({
      total: totalRow?.total ?? 0,
      maps: maps.map((map) => map.name),
      runs: rows,
    });
  })
  // UU-JUMP の記録をテスト扱いにする/戻す
  .patch('/uu-jump/runs/:id', zValidator('json', z.object({ test: z.boolean() })), async (c) => {
    const id = parseRunId(c.req.param('id'));
    if (id === null) return c.json({ error: 'id が数字ではありません' }, 400);
    const db = drizzle(c.env.DB);
    const [row] = await db
      .update(uuJumpRuns)
      .set({ isTest: c.req.valid('json').test })
      .where(eq(uuJumpRuns.id, id))
      .returning({ id: uuJumpRuns.id, test: uuJumpRuns.isTest });
    if (!row) return c.json({ error: 'その id の記録はありません' }, 404);
    return c.json(row);
  })
  // UU-JUMP の記録を 1 件消す
  .delete('/uu-jump/runs/:id', async (c) => {
    const id = parseRunId(c.req.param('id'));
    if (id === null) return c.json({ error: 'id が数字ではありません' }, 400);
    const db = drizzle(c.env.DB);
    const [row] = await db
      .delete(uuJumpRuns)
      .where(eq(uuJumpRuns.id, id))
      .returning({ id: uuJumpRuns.id });
    if (!row) return c.json({ error: 'その id の記録はありません' }, 404);
    return c.json({ id: row.id });
  });
