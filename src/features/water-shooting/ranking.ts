import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api } from '#/lib/api';
import type { RESULTS } from './labels';

const getRanking = api['water-shooting'].ranking.$get;

export type WaterShootingRanking = InferResponseType<typeof getRanking, 200>;
export type WaterShootingRun = WaterShootingRanking['runs'][number];

export const SORT_KEYS = ['score', 'playSeconds', 'reachedStage', 'createdAt'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type WaterShootingRankingParams = {
  limit: number;
  offset: number;
  sort?: SortKey;
  difficulty?: string;
  player?: string;
  result?: (typeof RESULTS)[number];
};

// 新しい記録を拾う間隔
const REFETCH_INTERVAL_MS = 10_000;

async function fetchRanking(params: WaterShootingRankingParams): Promise<WaterShootingRanking> {
  const res = await getRanking({
    query: {
      limit: String(params.limit),
      offset: String(params.offset),
      sort: params.sort,
      difficulty: params.difficulty,
      player: params.player,
      result: params.result,
    },
  });
  if (!res.ok) throw new Error(`ランキングを取得できませんでした (${res.status})`);
  return res.json();
}

/** ランキングの 1 ページ。定期的に取り直し、ページや条件を変えた直後は前の表示を残す。 */
export function rankingQueryOptions(params: WaterShootingRankingParams) {
  return queryOptions({
    queryKey: ['water-shooting', 'ranking', params],
    queryFn: () => fetchRanking(params),
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}
