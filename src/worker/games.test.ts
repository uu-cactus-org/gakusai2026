import { describe, expect, test } from 'vite-plus/test';
import { parseRange, resolveRange } from './games';
import app from './index';

// R2 に触る前で断る経路だけを確かめる。R2 を使う経路は、ローカルで動かして確かめる(docs/games.md)
function env(overrides: Partial<Env> = {}): Env {
  return {
    GAMES_PASSPHRASE: 'correct horse battery staple',
    ACCESS_TEAM_DOMAIN: 'https://example.cloudflareaccess.com',
    ACCESS_AUD: 'aud',
    ACCESS_DEV_BYPASS: 'false',
    GAMES_LOGIN_LIMIT: { limit: async () => ({ success: true }) },
    ...overrides,
  } as Env;
}

function login(passphrase: string, environment = env()) {
  return app.request(
    '/api/games/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    },
    environment,
  );
}

describe('/api/games', () => {
  test('合言葉が未設定なら、どの経路も 503', async () => {
    const stopped = env({ GAMES_PASSPHRASE: '' });
    expect((await login('', stopped)).status).toBe(503);
    expect((await login('anything', stopped)).status).toBe(503);
    expect((await app.request('/api/games', {}, stopped)).status).toBe(503);
    expect((await app.request('/api/games/dl/a.zip', {}, stopped)).status).toBe(503);
  });

  test('Cookie が無ければ、一覧もダウンロードも 401', async () => {
    expect((await app.request('/api/games', {}, env())).status).toBe(401);
    expect((await app.request('/api/games/dl/a.zip', {}, env())).status).toBe(401);
  });

  test('でたらめな Cookie は 401', async () => {
    const res = await app.request('/api/games', { headers: { Cookie: 'games_auth=0000' } }, env());
    expect(res.status).toBe(401);
  });

  test('合言葉が違えば 401 で、Cookie を出さない', async () => {
    const res = await login('wrong');
    expect(res.status).toBe(401);
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  test('合言葉が合えば Cookie を出す。合言葉を変えると、その Cookie は通らない', async () => {
    const res = await login('correct horse battery staple');
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).not.toContain('correct');

    const cookie = setCookie.split(';')[0] ?? '';
    const changed = env({ GAMES_PASSPHRASE: 'another passphrase' });
    expect((await app.request('/api/games', { headers: { Cookie: cookie } }, changed)).status).toBe(
      401,
    );
  });
});

describe('合言葉の入力の回数', () => {
  test('回数を超えたら、合言葉が合っていても 429 で、Cookie を出さない', async () => {
    const keys: string[] = [];
    const limited = env({
      GAMES_LOGIN_LIMIT: {
        limit: async ({ key }) => {
          keys.push(key);
          return { success: false };
        },
      },
    });
    const res = await app.request(
      '/api/games/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
        body: JSON.stringify({ passphrase: 'correct horse battery staple' }),
      },
      limited,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    // 送信元ごとに数える
    expect(keys).toEqual(['203.0.113.7']);
  });

  test('一覧とダウンロードは数えない', async () => {
    let calls = 0;
    const counting = env({
      GAMES_LOGIN_LIMIT: {
        limit: async () => {
          calls++;
          return { success: true };
        },
      },
    });
    await app.request('/api/games', {}, counting);
    await app.request('/api/games/dl/a.zip', {}, counting);
    expect(calls).toBe(0);
  });
});

describe('/api/admin/games', () => {
  test('Access を通っていなければ、どの操作も 403', async () => {
    const requests: [string, RequestInit][] = [
      ['/api/admin/games', {}],
      ['/api/admin/games/dl/a.zip', {}],
      ['/api/admin/games/a.zip', { method: 'DELETE' }],
      [
        '/api/admin/games/uploads',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'a.zip' }),
        },
      ],
      ['/api/admin/games/uploads/id/parts/1?name=a.zip', { method: 'PUT', body: 'x' }],
    ];
    for (const [path, init] of requests) {
      expect((await app.request(path, init, env())).status, path).toBe(403);
    }
  });

  test('合言葉の Cookie では、管理用の操作は通らない', async () => {
    const res = await login('correct horse battery staple');
    const cookie = (res.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
    const list = await app.request('/api/admin/games', { headers: { Cookie: cookie } }, env());
    expect(list.status).toBe(403);
  });
});

describe('Range', () => {
  test('ヘッダーを読む', () => {
    expect(parseRange(undefined)).toBeUndefined();
    expect(parseRange('bytes=100-')).toEqual({ start: 100, end: undefined });
    expect(parseRange('bytes=100-199')).toEqual({ start: 100, end: 199 });
    expect(parseRange('bytes=-500')).toEqual({ suffix: 500 });
  });

  test('読めないものは、範囲なしとして扱う', () => {
    expect(parseRange('bytes=-')).toBeUndefined();
    expect(parseRange('bytes=200-100')).toBeUndefined();
    expect(parseRange('bytes=0-1,5-6')).toBeUndefined();
    expect(parseRange('items=0-1')).toBeUndefined();
  });

  test('ファイルの大きさに収める', () => {
    expect(resolveRange({ start: 100 }, 1000)).toEqual({ offset: 100, length: 900 });
    expect(resolveRange({ start: 100, end: 199 }, 1000)).toEqual({ offset: 100, length: 100 });
    expect(resolveRange({ start: 100, end: 5000 }, 1000)).toEqual({ offset: 100, length: 900 });
    expect(resolveRange({ suffix: 300 }, 1000)).toEqual({ offset: 700, length: 300 });
    expect(resolveRange({ suffix: 5000 }, 1000)).toEqual({ offset: 0, length: 1000 });
  });

  test('1 バイトも返せない範囲は断る', () => {
    expect(resolveRange({ start: 1000 }, 1000)).toBeUndefined();
    expect(resolveRange({ suffix: 0 }, 1000)).toBeUndefined();
  });
});
