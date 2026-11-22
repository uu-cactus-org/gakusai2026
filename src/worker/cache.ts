import { createMiddleware } from 'hono/factory';

/**
 * 公開の GET の応答を、Cloudflare のキャッシュに数秒だけ置く。
 *
 * ランキングは呼ばれるたびに全行へ順位を振るので、外から連打されると D1 の読み取りが膨らむ。
 * 画面は 10 秒ごとに取り直すだけなので、数秒古くても困らない。
 *
 * キャッシュのキーには、`params` に挙げたクエリだけを使う。関係のないクエリを足して
 * キャッシュを避けることはできない(`offset` のように値を変えられるものは、値ごとに別になる)。
 * ブラウザには残さない(ブラウザへ返す応答は `no-store` にする)。
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
    if (hit) {
      // Cloudflare は、キャッシュから返す応答に、ゾーンの「ブラウザのキャッシュ TTL」(既定で 4 時間)の
      // max-age を足す。そのまま返すと、ブラウザが何時間も同じ応答を使い回して、画面が更新されなくなる
      const res = new Response(hit.body, hit);
      res.headers.set('Cache-Control', BROWSER_CACHE_CONTROL);
      return res;
    }

    await next();
    if (c.res.status !== 200) return;
    // キャッシュに置くものにだけ、置く秒数を付ける
    const stored = new Response(c.res.clone().body, c.res);
    stored.headers.set('Cache-Control', `public, s-maxage=${seconds}`);
    c.executionCtx.waitUntil(cache.put(key, stored));
    c.res.headers.set('Cache-Control', BROWSER_CACHE_CONTROL);
  });

// ブラウザには残させない
const BROWSER_CACHE_CONTROL = 'no-store';

type CacheContext = {
  req: { url: string };
  executionCtx: { waitUntil(p: Promise<unknown>): void };
};

const defaultCache = () => (globalThis as { caches?: { default?: Cache } }).caches?.default;

// D1 から読んだ中身を置くときのキー。外から叩ける経路と重ならないパスにする
const dataKey = (c: CacheContext, name: string) =>
  new Request(new URL(`/__data/${name}`, new URL(c.req.url).origin), { method: 'GET' });

/**
 * D1 から読んだ中身(JSON にできるもの)を、Cloudflare のキャッシュに `seconds` 秒だけ置いて使い回す。
 *
 * ランキングは、ページ・並べ替え・絞り込みごとに URL が違う。応答ごとに置くと、URL の数だけ D1 を読む。
 * 元の行を 1 つだけ置いて、そこから毎回組み立てれば、D1 を読むのは `seconds` 秒に 1 回で済む。
 *
 * キャッシュが無い環境(テストやローカル)では、毎回 `load` を呼ぶ。
 * 置いた中身は JSON を通るので、Date などは文字列になる。`load` は、JSON にしても形が変わらないものを返す。
 */
export async function cachedData<T>(
  c: CacheContext,
  name: string,
  seconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const cache = defaultCache();
  if (!cache) return load();

  const key = dataKey(c, name);
  const hit = await cache.match(key);
  if (hit) return (await hit.json()) as T;

  const data = await load();
  const stored = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, s-maxage=${seconds}` },
  });
  c.executionCtx.waitUntil(cache.put(key, stored));
  return data;
}

/** `cachedData` で置いた中身を捨てる。記録が増えたときに呼ぶと、次の取得で読み直す(同じ拠点のキャッシュだけ)。 */
export async function dropCachedData(c: CacheContext, name: string): Promise<void> {
  await defaultCache()?.delete(dataKey(c, name));
}
