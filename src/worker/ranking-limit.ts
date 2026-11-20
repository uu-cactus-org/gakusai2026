import { createMiddleware } from 'hono/factory';
import { loginLimitKey } from './games';

/**
 * ランキングを D1 から読む回数を抑える(回数は cloudflare.config.ts)。
 *
 * ランキングは呼ばれるたびに全行を読むので、外から連打されると、D1 の 1 日の読み取りの枠を使い切る。
 * 使い切ると、その日はスコアの記録も止まる。
 *
 * キャッシュ(cache.ts)の後ろに置く。キャッシュから返せた分は D1 を読まないので、数えない。
 * クエリを変えながらの連打はキャッシュを素通りするので、ここで止める。
 *
 * - 送信元ごと: 1 か所からの連打で、ほかの人が見られなくならないようにする
 * - 全体: 送信元を変えながら連打されても、D1 を読む回数に上限をかける
 *
 * 数え方はおおよそで、厳密ではない(Cloudflare の拠点ごとに数える)。
 */
export const limitRankingReads = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const client = await c.env.RANKING_CLIENT_LIMIT.limit({
    key: loginLimitKey(c.req.header('CF-Connecting-IP')),
  });
  // 送信元ごとの制限で断った分は、全体の回数に数えない
  const all = client.success ? await c.env.RANKING_TOTAL_LIMIT.limit({ key: 'all' }) : client;
  if (!all.success) {
    c.header('Retry-After', '60');
    return c.json({ error: '取得の回数が多すぎます。1 分ほど待ってください' }, 429);
  }
  await next();
});
