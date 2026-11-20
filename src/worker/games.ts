import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';

// 部員に配るゲームの zip(docs/games.md)。合言葉を知っている人だけが、一覧とダウンロードを使える。

const COOKIE_NAME = 'games_auth';
// 学祭の準備から片付けまでを 1 回の入力で済ませる長さ。止めるときは合言葉を変えるか消す
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** R2 のキーにするファイル名。フォルダは作らないので、区切りの文字は受け付けない。 */
export const fileNameSchema = z
  .string()
  .min(1)
  .max(200)
  // oxlint-disable-next-line no-control-regex -- 制御文字を弾くための範囲
  .regex(/^[^/\\\u0000-\u001f]+$/, 'ファイル名に使えない文字が入っています');

/** 置いてあるファイルを、名前の順に並べる。 */
export async function listGameFiles(bucket: R2Bucket) {
  // 1 回で 1000 件まで返る。配るゲームは数本なので、続きは取りに行かない
  const { objects } = await bucket.list({ limit: 1000 });
  return objects
    .map((object) => ({
      name: object.key,
      size: object.size,
      uploadedAt: object.uploaded.toISOString(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

const encoder = new TextEncoder();

/**
 * 合言葉から、Cookie に入れる値を作る。
 * 合言葉そのものを鍵にするので、合言葉を変えると、配ってあった Cookie はすべて通らなくなる。
 */
async function tokenFor(passphrase: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('gakusai2026-games'));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** 比べるのにかかる時間から中身を推測されないよう、最後まで比べる。 */
function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 合言葉が未設定のあいだは、配布を止める。空の合言葉で通ってしまわないよう、必ず断る。 */
const requirePassphraseSet = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!c.env.GAMES_PASSPHRASE) return c.json({ error: '配布は止まっています' }, 503);
  await next();
});

const requireGamesCookie = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const cookie = getCookie(c, COOKIE_NAME);
  if (!cookie || !sameToken(cookie, await tokenFor(c.env.GAMES_PASSPHRASE))) {
    return c.json({ error: '合言葉を入力してください' }, 401);
  }
  await next();
});

/** ダウンロードするときのファイル名を、日本語でも崩れない書き方(RFC 5987)にする。 */
function contentDisposition(name: string): string {
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename*=UTF-8''${encoded}`;
}

/** Range ヘッダーの求める範囲。先頭からの位置か、末尾からの長さ。 */
type RequestedRange = { start: number; end?: number } | { suffix: number };

/**
 * Range ヘッダーを読む。範囲が 1 つのものだけ受け付ける。
 * 読めないときは undefined を返し、ファイル全体を返す(ヘッダーが無いときと同じ扱い)。
 */
export function parseRange(header: string | undefined): RequestedRange | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? '');
  if (!match) return undefined;
  const [, start = '', end = ''] = match;
  if (start === '') return end === '' ? undefined : { suffix: Number(end) };
  if (end !== '' && Number(end) < Number(start)) return undefined;
  return { start: Number(start), end: end === '' ? undefined : Number(end) };
}

/** 求められた範囲を、ファイルの大きさに収める。1 バイトも返せないときは undefined。 */
export function resolveRange(
  requested: RequestedRange,
  size: number,
): { offset: number; length: number } | undefined {
  if ('suffix' in requested) {
    const length = Math.min(requested.suffix, size);
    return length > 0 ? { offset: size - length, length } : undefined;
  }
  if (requested.start >= size) return undefined;
  const last = Math.min(requested.end ?? size - 1, size - 1);
  return { offset: requested.start, length: last - requested.start + 1 };
}

/** ファイルを返す。大きいので、途中から取り直せるよう Range にも応える。 */
async function serveGameFile(
  bucket: R2Bucket,
  name: string,
  rangeHeader: string | undefined,
): Promise<Response> {
  const requested = parseRange(rangeHeader);

  // 範囲つきのときは、先に大きさを調べて、返す範囲を自分で決める
  let range: { offset: number; length: number } | undefined;
  if (requested) {
    const head = await bucket.head(name);
    if (!head) return Response.json({ error: 'そのファイルはありません' }, { status: 404 });
    range = resolveRange(requested, head.size);
    if (!range) {
      return Response.json(
        { error: 'その範囲は返せません' },
        { status: 416, headers: { 'Content-Range': `bytes */${head.size}` } },
      );
    }
  }

  const object = await bucket.get(name, range ? { range } : undefined);
  if (!object) return Response.json({ error: 'そのファイルはありません' }, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Disposition', contentDisposition(name));
  // 合言葉や Access の内側のものなので、途中のキャッシュに残さない
  headers.set('Cache-Control', 'private, no-store');

  if (!range) {
    headers.set('Content-Length', String(object.size));
    return new Response(object.body, { headers });
  }
  headers.set('Content-Length', String(range.length));
  headers.set(
    'Content-Range',
    `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`,
  );
  return new Response(object.body, { status: 206, headers });
}

/**
 * 合言葉の総当たりを防ぐ。同じ送信元からの入力を、決めた回数までにする(回数は cloudflare.config.ts)。
 * 数え方はおおよそで、厳密ではない。合言葉を長くしておくのと合わせて効かせる。
 */
const limitLoginAttempts = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  // 本番では Cloudflare が必ず付ける。ローカルには無いので、まとめて 1 つとして数える
  const key = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const { success } = await c.env.GAMES_LOGIN_LIMIT.limit({ key });
  if (!success) {
    return c.json({ error: '入力の回数が多すぎます。1 分ほど待ってください' }, 429);
  }
  await next();
});

export const gamesApp = new Hono<{ Bindings: Env }>()
  .use(requirePassphraseSet)
  // 合言葉が合っていれば、Cookie を出す
  .post(
    '/login',
    limitLoginAttempts,
    zValidator('json', z.object({ passphrase: z.string().min(1).max(200) })),
    async (c) => {
      const [given, expected] = await Promise.all([
        tokenFor(c.req.valid('json').passphrase),
        tokenFor(c.env.GAMES_PASSPHRASE),
      ]);
      if (!sameToken(given, expected)) return c.json({ error: '合言葉が違います' }, 401);
      setCookie(c, COOKIE_NAME, expected, {
        path: '/api/games',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: COOKIE_MAX_AGE_SECONDS,
      });
      return c.json({ ok: true });
    },
  )
  .use(requireGamesCookie)
  .get('/', async (c) => c.json({ files: await listGameFiles(c.env.GAMES) }))
  .get('/dl/:name', (c) => serveGameFile(c.env.GAMES, c.req.param('name'), c.req.header('Range')));

const uploadPartsSchema = z.object({
  name: fileNameSchema,
  parts: z
    .array(z.object({ partNumber: z.number().int().min(1).max(10000), etag: z.string().min(1) }))
    .min(1),
});

/**
 * 管理用の API(/api/admin/games)。Cloudflare Access の検証は、載せる側の adminApp が先に通す。
 *
 * Worker が 1 回で受け取れる大きさには上限があるので、ファイルは画面の側で切って送る。
 * 受け取ったパートを R2 のマルチパートアップロードに渡し、最後にまとめる。
 */
export const adminGamesApp = new Hono<{ Bindings: Env }>()
  .get('/', async (c) => c.json({ files: await listGameFiles(c.env.GAMES) }))
  // 管理画面からのダウンロード。上げたものを、合言葉なしで確かめられるようにする
  .get('/dl/:name', (c) => serveGameFile(c.env.GAMES, c.req.param('name'), c.req.header('Range')))
  // アップロードを始める。同じ名前のファイルがあれば、まとめた時点で置き換わる
  .post('/uploads', zValidator('json', z.object({ name: fileNameSchema })), async (c) => {
    const upload = await c.env.GAMES.createMultipartUpload(c.req.valid('json').name);
    return c.json({ uploadId: upload.uploadId });
  })
  // パートを 1 つ受け取る。本文はそのまま R2 へ流す
  .put(
    '/uploads/:uploadId/parts/:partNumber',
    zValidator('query', z.object({ name: fileNameSchema })),
    async (c) => {
      const partNumber = Number(c.req.param('partNumber'));
      if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
        return c.json({ error: 'パートの番号が正しくありません' }, 400);
      }
      const body = c.req.raw.body;
      if (!body) return c.json({ error: '本文がありません' }, 400);

      const upload = c.env.GAMES.resumeMultipartUpload(
        c.req.valid('query').name,
        c.req.param('uploadId'),
      );
      try {
        const part = await upload.uploadPart(partNumber, body);
        return c.json({ partNumber: part.partNumber, etag: part.etag });
      } catch (error) {
        console.error('uploadPart に失敗', error);
        return c.json({ error: 'パートを保存できませんでした' }, 400);
      }
    },
  )
  // 送ったパートをまとめて、1 つのファイルにする
  .post('/uploads/:uploadId/complete', zValidator('json', uploadPartsSchema), async (c) => {
    const { name, parts } = c.req.valid('json');
    const upload = c.env.GAMES.resumeMultipartUpload(name, c.req.param('uploadId'));
    try {
      const object = await upload.complete(parts);
      return c.json({ name: object.key, size: object.size });
    } catch (error) {
      console.error('complete に失敗', error);
      return c.json({ error: 'ファイルをまとめられませんでした' }, 400);
    }
  })
  .delete('/:name', async (c) => {
    const name = c.req.param('name');
    if (!(await c.env.GAMES.head(name))) return c.json({ error: 'そのファイルはありません' }, 404);
    await c.env.GAMES.delete(name);
    return c.json({ name });
  });
