import { defineConfig } from 'drizzle-kit';

// マイグレーションの SQL を作るためだけに使う(`vp run db:generate`)。
// 適用は `cf d1 migrations apply` で行う。
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/worker/db/schema.ts',
  out: './migrations',
});
