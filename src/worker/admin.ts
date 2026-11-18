import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireAccess } from './auth';
import { devices } from './db/schema';

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
  );
