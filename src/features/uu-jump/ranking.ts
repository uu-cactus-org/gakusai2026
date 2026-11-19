import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api } from '#/lib/api';

const uuJump = api['uu-jump'];

export type UuJumpRanking = InferResponseType<typeof uuJump.ranking.$get, 200>;
export type UuJumpRun = UuJumpRanking['runs'][number];
export type UuJumpMap = InferResponseType<typeof uuJump.maps.$get, 200>['maps'][number];

// 新しい記録を拾う間隔
const REFETCH_INTERVAL_MS = 10_000;

/** 記録があるマップの一覧。 */
export const mapsQueryOptions = queryOptions({
  queryKey: ['uu-jump', 'maps'],
  queryFn: async () => {
    const res = await uuJump.maps.$get();
    if (!res.ok) throw new Error(`マップの一覧を取得できませんでした (${res.status})`);
    return (await res.json()).maps;
  },
  refetchInterval: REFETCH_INTERVAL_MS,
});

/** あるマップのランキングの 1 ページ。マップが決まるまでは取りに行かない。 */
export function rankingQueryOptions(params: {
  map: string | undefined;
  limit: number;
  offset: number;
}) {
  return queryOptions({
    queryKey: ['uu-jump', 'ranking', params],
    queryFn: async () => {
      const res = await uuJump.ranking.$get({
        query: {
          map: params.map ?? '',
          limit: String(params.limit),
          offset: String(params.offset),
        },
      });
      if (!res.ok) throw new Error(`ランキングを取得できませんでした (${res.status})`);
      return res.json();
    },
    enabled: params.map !== undefined,
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}
