import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { api } from '#/lib/api';

/** 統計を出せるゲーム。API の経路の名前と同じ。 */
export type StatsGame = 'water-shooting' | 'uu-jump';

// 取り直す間隔。サーバーのキャッシュ(30 秒)と同じにしている
const REFETCH_INTERVAL_MS = 30_000;

/** 10 分ごとのプレイ数。 */
export function playStatsQueryOptions(game: StatsGame) {
  return queryOptions({
    queryKey: [game, 'stats'],
    queryFn: async () => {
      const res = await api[game].stats.$get();
      if (!res.ok) throw new Error(`統計を取得できませんでした (${res.status})`);
      return res.json();
    },
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}
