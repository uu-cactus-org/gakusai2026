import { queryOptions } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api } from '#/lib/api';

const games = api.games;

export type GameFile = InferResponseType<typeof games.$get, 200>['files'][number];

/**
 * 配布の画面の状態。
 * locked: 合言葉がまだ、stopped: 配布を止めている(合言葉が未設定)、open: 一覧を見られる
 */
export type GamesState =
  | { status: 'locked' }
  | { status: 'stopped' }
  | { status: 'open'; files: GameFile[] };

export const gamesQueryOptions = queryOptions({
  queryKey: ['games'],
  queryFn: async (): Promise<GamesState> => {
    const res = await games.$get();
    if (res.status === 401) return { status: 'locked' };
    if (res.status === 503) return { status: 'stopped' };
    if (!res.ok) throw new Error(`一覧を取得できませんでした (${res.status})`);
    return { status: 'open', files: (await res.json()).files };
  },
  retry: false,
});

export async function login(passphrase: string) {
  const res = await games.login.$post({ json: { passphrase } });
  if (res.status === 401) throw new Error('合言葉が違います');
  if (res.status === 503) throw new Error('配布は止まっています');
  if (res.status === 429) throw new Error('入力の回数が多すぎます。1 分ほど待ってください');
  if (!res.ok) throw new Error(`確認できませんでした (${res.status})`);
}

/** ダウンロードの URL。Cookie で守っているので、リンクとしてそのまま開ける。 */
export function downloadUrl(name: string): string {
  return `/api/games/dl/${encodeURIComponent(name)}`;
}
