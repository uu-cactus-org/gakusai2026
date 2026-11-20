import { Hono } from 'hono';
import { describe, expect, test } from 'vite-plus/test';
import { limitRankingReads } from './ranking-limit';

// 決めた回数まで通す、レート制限の代わり。キーごとに数える
function fakeLimit(limit: number) {
  const counts = new Map<string, number>();
  return {
    counts,
    limit: async ({ key }: { key: string }) => {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { success: count <= limit };
    },
  };
}

function setup(clientLimit: number, totalLimit: number) {
  const client = fakeLimit(clientLimit);
  const total = fakeLimit(totalLimit);
  const app = new Hono<{ Bindings: Env }>().get('/ranking', limitRankingReads, (c) =>
    c.json({ ok: true }),
  );
  const env = { RANKING_CLIENT_LIMIT: client, RANKING_TOTAL_LIMIT: total } as unknown as Env;
  const get = (ip: string) => app.request('/ranking', { headers: { 'CF-Connecting-IP': ip } }, env);
  return { client, total, get };
}

describe('limitRankingReads', () => {
  test('同じ送信元は、決めた回数を超えると 429 になる。ほかの送信元は通る', async () => {
    const { get } = setup(2, 100);
    expect((await get('203.0.113.7')).status).toBe(200);
    expect((await get('203.0.113.7')).status).toBe(200);
    const blocked = await get('203.0.113.7');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('60');
    expect((await get('203.0.113.8')).status).toBe(200);
  });

  test('送信元を変えても、全体の回数を超えると 429 になる', async () => {
    const { get } = setup(100, 2);
    expect((await get('203.0.113.1')).status).toBe(200);
    expect((await get('203.0.113.2')).status).toBe(200);
    expect((await get('203.0.113.3')).status).toBe(429);
  });

  test('送信元ごとの制限で断った分は、全体の回数に数えない', async () => {
    const { total, get } = setup(1, 100);
    await get('203.0.113.7');
    await get('203.0.113.7');
    await get('203.0.113.7');
    expect(total.counts.get('all')).toBe(1);
  });
});
