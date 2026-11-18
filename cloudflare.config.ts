import { defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'gakusai2026',
    compatibilityDate: '2026-11-17',
    observability: {
      enabled: true,
    },
    assets: {
      notFoundHandling: 'single-page-application',
    },
  },
});
