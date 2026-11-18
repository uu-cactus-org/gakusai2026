import { bindings, defineConfig } from 'cf/config';
import * as entrypoint from './src/worker/index.ts' with { type: 'cf-worker' };

// Cloudflare Access の設定。どちらも秘密ではない。値の調べ方は docs/access-setup.md。
// 空のままだと、管理用の API(/api/admin/*)は 503 を返す。
// 例: 'https://<チーム名>.cloudflareaccess.com'
const ACCESS_TEAM_DOMAIN: string = 'https://uucactus.cloudflareaccess.com';
// Access のアプリケーションの「Application Audience (AUD) Tag」。
// 本番の管理用の経路とプレビューを同じアプリケーションで守っているので、1 つで足りる。
const ACCESS_AUD: string = '5d3e6e2ccc03345df22dd87dca7378e5c2afe172dff1abbc661bbf3c769721cf';

export default defineConfig(({ mode }) => ({
  accountId: '8c3dac10dd8b3da4f8704c273b4617a3',
  worker: {
    name: 'gakusai2026',
    entrypoint,
    compatibilityDate: '2026-11-17',
    observability: {
      enabled: true,
    },
    assets: {
      notFoundHandling: 'single-page-application',
      runWorkerFirst: ['/api/*'],
    },
    env: {
      DB: bindings.d1({ name: 'gakusai2026', id: 'bf05b031-70ec-4619-8674-0e98bda25b64' }),
      GAME_TOKEN: bindings.secret(),
      ACCESS_TEAM_DOMAIN: bindings.text(ACCESS_TEAM_DOMAIN),
      ACCESS_AUD: bindings.text(ACCESS_AUD),
      // ローカル開発(vp dev)のときだけ、Access の検証を飛ばす
      ACCESS_DEV_BYPASS: bindings.text<string>(mode === 'development' ? 'true' : 'false'),
    },
  },
}));
