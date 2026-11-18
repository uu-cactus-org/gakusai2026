// D1 のマイグレーションを適用する。
//
// `cf d1 migrations apply` はデータベースを ID でしか指定できない。ID をコマンドに直接書かずに
// 済むよう、cloudflare.config.ts の D1 バインディングから ID を引いて渡す。
//
//   vpx scripts/db-migrate.ts            本番の D1 に適用
//   vpx scripts/db-migrate.ts --local    ローカルの D1 に適用
//
// 残りの引数はそのまま cf に渡す(--dry-run など)。
import { spawnSync } from 'node:child_process';
import { loadAndParseConfig } from '@cloudflare/config';

const BINDING = 'DB';

const { result } = await loadAndParseConfig('cloudflare.config.ts', {
  mode: 'production',
  isPreview: false,
});
if (!result.success) {
  console.error('cloudflare.config.ts を読めませんでした');
  console.error(result.error);
  process.exit(1);
}

const binding = result.data.worker?.env?.[BINDING];
if (binding?.type !== 'd1' || !binding.id) {
  console.error(
    `cloudflare.config.ts の env.${BINDING} に、id 付きの D1 バインディングがありません`,
  );
  process.exit(1);
}

const args = ['d1', 'migrations', 'apply', binding.id, ...process.argv.slice(2)];
console.log(`> cf ${args.join(' ')}`);
const { status } = spawnSync('cf', args, { stdio: 'inherit', shell: true });
process.exit(status ?? 1);
