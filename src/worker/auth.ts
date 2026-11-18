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
  Variables: { adminEmail: string | null };
}>(async (c, next) => {
  // ローカル開発には Access が無いので検証を飛ばす(cloudflare.config.ts で開発時だけ有効)
  if (c.env.ACCESS_DEV_BYPASS === 'true') {
    c.set('adminEmail', null);
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
  } catch {
    return c.json({ error: 'Cloudflare Access のトークンが無効です' }, 403);
  }
  await next();
});
