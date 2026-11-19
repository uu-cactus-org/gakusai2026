import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * ゲームからの書き込みを `Authorization: Bearer <GAME_TOKEN>` で守る。
 * 鍵はビルドに埋め込み、配布するビルドからは消す。
 */
export const requireGame = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const token = c.env.GAME_TOKEN;
  // 鍵が未設定のときは、空の鍵で通ってしまわないよう必ず拒否する
  if (!token) return c.json({ error: 'GAME_TOKEN が設定されていません' }, 503);
  if (c.req.header('Authorization') !== `Bearer ${token}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

// 公開鍵の取得結果を使い回す(チームドメインごと)
const jwksByTeamDomain = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
  let jwks = jwksByTeamDomain.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksByTeamDomain.set(teamDomain, jwks);
  }
  return jwks;
}

/**
 * 管理用の操作を Cloudflare Access で守る。
 *
 * ログインそのものは Access が Worker の手前で行う(docs/access-setup.md)。ここでは Access が
 * 付けた JWT を確かめる。Access の経路の設定が漏れていても、管理用の API が素通しにならない
 * ようにするため。静的アセット付きの Worker では `ctx.access` が渡らないので、自前で検証している。
 */
export const requireAccess = createMiddleware<{
  Bindings: Env;
  Variables: { adminEmail: string | null; accessToken: string | null };
}>(async (c, next) => {
  // ローカル開発には Access が無いので検証を飛ばす(cloudflare.config.ts で開発時だけ有効)
  if (c.env.ACCESS_DEV_BYPASS === 'true') {
    c.set('adminEmail', null);
    c.set('accessToken', null);
    return next();
  }

  const teamDomain = c.env.ACCESS_TEAM_DOMAIN;
  const audience = c.env.ACCESS_AUD;
  if (!teamDomain || !audience) {
    return c.json({ error: 'Cloudflare Access の設定(チームドメインと AUD)がありません' }, 503);
  }

  const token = c.req.header('Cf-Access-Jwt-Assertion');
  if (!token) return c.json({ error: 'Cloudflare Access を通っていません' }, 403);

  try {
    const { payload } = await jwtVerify(token, getJwks(teamDomain), {
      issuer: teamDomain,
      audience,
    });
    c.set('adminEmail', typeof payload.email === 'string' ? payload.email : null);
    c.set('accessToken', token);
  } catch {
    return c.json({ error: 'Cloudflare Access のトークンが無効です' }, 403);
  }
  await next();
});

export type AccessIdentity = {
  /** GitHub のユーザー名(@ の後ろ)。取れなければ null */
  login: string | null;
  /** GitHub のプロフィールの名前。取れなければ null */
  name: string | null;
};

// GitHub の id からユーザー名を引いた結果を使い回す。GitHub の API は、鍵なしだと
// 送信元ごとに 1 時間 60 回までなので、同じ人のために何度も問い合わせない
const githubLoginById = new Map<number, string>();

async function fetchGithubLogin(id: number): Promise<string | null> {
  const cached = githubLoginById.get(id);
  if (cached) return cached;
  try {
    const res = await fetch(`https://api.github.com/user/${id}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'leaderboard-admin' },
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (typeof body !== 'object' || body === null || !('login' in body)) return null;
    if (typeof body.login !== 'string' || body.login === '') return null;
    githubLoginById.set(id, body.login);
    return body.login;
  } catch {
    return null;
  }
}

/**
 * ログインした人が誰かを調べる。
 *
 * JWT にはメールアドレスしか入らないので、Access の get-identity に問い合わせる。そこにも
 * GitHub のユーザー名は無く、数字の id だけがあるので、ユーザー名は GitHub の API で引く。
 * どれも表示のためだけで、管理の操作には関係ないので、失敗は null にして握りつぶす。
 */
export async function fetchAccessIdentity(
  teamDomain: string,
  token: string,
): Promise<AccessIdentity> {
  const identity: AccessIdentity = { login: null, name: null };
  try {
    const res = await fetch(`${teamDomain}/cdn-cgi/access/get-identity`, {
      headers: { Cookie: `CF_Authorization=${token}` },
    });
    if (!res.ok) return identity;
    const body: unknown = await res.json();
    if (typeof body !== 'object' || body === null) return identity;

    if ('name' in body && typeof body.name === 'string' && body.name.trim() !== '') {
      identity.name = body.name.trim();
    }
    // id が GitHub のものなのは、GitHub でログインしたときだけ
    const viaGithub =
      'idp' in body &&
      typeof body.idp === 'object' &&
      body.idp !== null &&
      'type' in body.idp &&
      body.idp.type === 'github';
    if (viaGithub && 'id' in body && typeof body.id === 'number' && Number.isInteger(body.id)) {
      identity.login = await fetchGithubLogin(body.id);
    }
  } catch {
    // 取れた分だけ返す
  }
  return identity;
}
