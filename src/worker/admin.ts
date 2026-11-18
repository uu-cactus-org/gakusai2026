import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireAccess } from './auth';
import { devices, waterShootingRuns } from './db/schema';

// 管理用の API。/api/admin/* はすべて Cloudflare Access の内側に置く。
export const adminApp = new Hono<{ Bindings: Env }>()
  .use(requireAccess)
  // ログインできているかの確認用
  .get('/me', (c) => c.json({ email: c.get('adminEmail') }))
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
  // WaterShooting の記録を 1 件消す(いたずらや誤送信の片付け用)
  .delete('/water-shooting/runs/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) return c.json({ error: 'id が数字ではありません' }, 400);
    const db = drizzle(c.env.DB);
    const [row] = await db
      .delete(waterShootingRuns)
      .where(eq(waterShootingRuns.id, id))
      .returning({ id: waterShootingRuns.id });
    if (!row) return c.json({ error: 'その id の記録はありません' }, 404);
    return c.json({ id: row.id });
  });
