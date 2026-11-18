import { zValidator } from '@hono/zod-validator';
import { asc, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireGame } from './auth';
import { devices } from './db/schema';

// ID の形は決めつけない。Unity の deviceUniqueIdentifier は環境によって形が変わりうるので、
// 形が合わないせいで当日に登録やスコア送信が落ちるほうが困る。空と極端に長いものだけ弾く。
const MAX_ID_LENGTH = 128;
const isValidId = (id: string) => id.length > 0 && id.length <= MAX_ID_LENGTH;
const MAX_IDS_PER_REQUEST = 100;

/**
 * 知らない ID を登録し、表示名に連番(PC1, PC2...)を付ける。登録済みの ID には何もしない。
 * 数えるのと入れるのを 1 つの SQL にして、同時に来た 2 台が同じ名前にならないようにしている。
 * 新しく登録したときは true を返す。
 */
export async function registerDevice(d1: D1Database, id: string): Promise<boolean> {
  const result = await d1
    .prepare(
      `INSERT OR IGNORE INTO devices (id, display_name)
       SELECT ?1, 'PC' || (COUNT(*) + 1) FROM devices`,
    )
    .bind(id)
    .run();
  return result.meta.changes > 0;
}

function toResponse(row: typeof devices.$inferSelect) {
  return { id: row.id, name: row.displayName };
}

export const devicesApp = new Hono<{ Bindings: Env }>()
  // ID から表示名を引く。登録はしない。知らない ID は応答から省く。
  // ids を付けない場合は登録済みの全件を返す。
  .get('/', async (c) => {
    const db = drizzle(c.env.DB);
    const idsParam = c.req.query('ids');

    if (idsParam === undefined) {
      const rows = await db.select().from(devices).orderBy(asc(devices.createdAt));
      return c.json({ devices: rows.map(toResponse) });
    }

    const ids = [...new Set(idsParam.split(','))].filter(isValidId);
    if (ids.length > MAX_IDS_PER_REQUEST) {
      return c.json({ error: `ids は ${MAX_IDS_PER_REQUEST} 件までです` }, 400);
    }
    if (ids.length === 0) return c.json({ devices: [] });

    const rows = await db.select().from(devices).where(inArray(devices.id, ids));
    const byId = new Map(rows.map((row) => [row.id, row]));
    // 聞かれた順に返す
    return c.json({ devices: ids.flatMap((id) => byId.get(id) ?? []).map(toResponse) });
  })
  // PC を登録する。登録済みならそのままの表示名を返すので、何度呼んでもよい。
  .post(
    '/',
    requireGame,
    zValidator('json', z.object({ id: z.string().min(1).max(MAX_ID_LENGTH) })),
    async (c) => {
      const db = drizzle(c.env.DB);
      const { id } = c.req.valid('json');
      const created = await registerDevice(c.env.DB, id);
      const [row] = await db.select().from(devices).where(eq(devices.id, id));
      if (!row) return c.json({ error: '登録に失敗しました' }, 500);
      return c.json(toResponse(row), created ? 201 : 200);
    },
  );
