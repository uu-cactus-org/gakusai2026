import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// PC の登録簿。全ゲーム共通で、表示名(PC1, PC2...)はここで管理する。
export const devices = sqliteTable('devices', {
  // Unity の SystemInfo.deviceUniqueIdentifier
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
