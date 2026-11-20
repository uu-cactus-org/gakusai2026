import { createMiddleware } from 'hono/factory';

/**
 * 公開の GET の応答を、Cloudflare のキャッシュに数秒だけ置く。
 *
 * ランキングは呼ばれるたびに全行へ順位を振るので、外から連打されると D1 の読み取りが膨らむ。
 * 画面は 10 秒ごとに取り直すだけなので、数秒古くても困らない。
 *
 * キャッシュのキーには、`params` に挙げたクエリだけを使う。関係のないクエリを足して
 * キャッシュを避けることはできない(`offset` のように値を変えられるものは、値ごとに別になる)。
 * ブラウザには残さない(`s-maxage` だけを付ける)。
 */
export const edgeCache = (seconds: number, params: readonly string[]) =>
  createMiddleware(async (c, next) => {
    // テストやローカルなど、キャッシュが無い環境ではそのまま通す
    const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
    if (!cache || c.req.method !== 'GET') return next();

    const url = new URL(c.req.url);
    const keyUrl = new URL(url.pathname, url.origin);
    for (const name of [...params].sort()) {
      const value = url.searchParams.get(name);
      if (value !== null) keyUrl.searchParams.set(name, value);
    }
    const key = new Request(keyUrl, { method: 'GET' });

    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, hit);

    await next();
    if (c.res.status !== 200) return;
    c.res.headers.set('Cache-Control', `public, s-maxage=${seconds}`);
    c.executionCtx.waitUntil(cache.put(key, c.res.clone()));
  });
