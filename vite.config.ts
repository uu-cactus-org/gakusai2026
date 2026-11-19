import { defineConfig, lazyPlugins } from 'vite-plus';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import license from 'rollup-plugin-license';
import type { Dependency } from 'rollup-plugin-license';
import type { Plugin } from 'vite-plus';

/**
 * ブラウザへ配るコードに入ったパッケージのライセンスを、licenses.json として書き出す。
 * ライセンスの画面(/licenses)が、これを読んで並べる。開発中(vp dev)は書き出されない。
 */
function thirdPartyLicenses(): Plugin {
  let found: Dependency[] = [];
  const scanner = license({ thirdParty: { output: (dependencies) => (found = dependencies) } });
  const scan = scanner.generateBundle as (this: unknown) => void;

  return {
    ...(scanner as Plugin),
    name: 'third-party-licenses',
    // Worker の側のビルドでは動かさない。配るのはブラウザの側だけなので
    applyToEnvironment: (environment) => environment.name === 'client',
    generateBundle() {
      // ここで found が埋まる
      scan.call(this);
      const packages = found
        .map(({ name, version, license, licenseText, repository }) => ({
          name: name ?? '',
          version: version ?? '',
          license: license ?? '',
          licenseText: licenseText ?? '',
          repository: (typeof repository === 'string' ? repository : repository?.url) ?? '',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      this.emitFile({
        type: 'asset',
        fileName: 'licenses.json',
        source: JSON.stringify(packages),
      });
    },
  };
}

const config = defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    singleQuote: true,
    ignorePatterns: ['src/routeTree.gen.ts'],
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ['src/routeTree.gen.ts'],
  },
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    devtools(),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
    cloudflare(),
    thirdPartyLicenses(),
  ]),
});

export default config;
