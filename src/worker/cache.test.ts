import { Hono } from 'hono';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { edgeCache } from './cache';

// Cloudflare のキャッシュの代わり。URL をキーに、応答を覚えておく
function fakeCache() {
  const stored = new Map<string, Response>();
  return {
    stored,
    match: async (request: Request) => stored.get(request.url)?.clone(),
    put: async (request: Request, response: Response) => {
      stored.set(request.url, response);
    },
  };
}

function setup() {
  const cache = fakeCache();
  vi.stubGlobal('caches', { default: cache });
  let calls = 0;
  const app = new Hono().get('/ranking', edgeCache(5, ['limit', 'offset']), (c) => {
    calls += 1;
    if (c.req.query('limit') === 'bad') return c.json({ error: 'bad' }, 400);
    return c.json({ calls });
  });
  const pending: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: (promise: Promise<unknown>) => void pending.push(promise),
    passThroughOnException: () => {},
    props: {},
  };
  const get = async (path: string) => {
    const res = await app.request(path, {}, {}, ctx as unknown as ExecutionContext);
    await Promise.all(pending);
    return res;
  };
  return { cache, get, calls: () => calls };
}

afterEach(() => vi.unstubAllGlobals());

describe('edgeCache', () => {
  test('2 回目は、処理を呼ばずにキャッシュから返す', async () => {
    const { get, calls } = setup();
    const first = await get('/ranking?limit=10');
    expect(first.headers.get('Cache-Control')).toBe('public, s-maxage=5');
    expect(await first.json()).toEqual({ calls: 1 });
    expect(await (await get('/ranking?limit=10')).json()).toEqual({ calls: 1 });
    expect(calls()).toBe(1);
  });

  test('挙げていないクエリを足しても、同じキャッシュに当たる', async () => {
    const { get, calls } = setup();
    await get('/ranking?limit=10&offset=0');
    await get('/ranking?offset=0&limit=10&nocache=123');
    expect(calls()).toBe(1);
  });

  test('挙げたクエリの値が違えば、別に数える', async () => {
    const { get, calls } = setup();
    await get('/ranking?limit=10');
    await get('/ranking?limit=20');
    expect(calls()).toBe(2);
  });

  test('200 でない応答は残さない', async () => {
    const { cache, get } = setup();
    expect((await get('/ranking?limit=bad')).status).toBe(400);
    expect(cache.stored.size).toBe(0);
  });

  test('キャッシュが無い環境では、そのまま通す', async () => {
    const app = new Hono().get('/ranking', edgeCache(5, []), (c) => c.json({ ok: true }));
    const res = await app.request('/ranking');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBeNull();
  });
});
