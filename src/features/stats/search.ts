import { z } from 'zod';
import { FESTIVAL_DAYS, RANGES } from './buckets';

/**
 * 統計の表示のために URL に置く値。各ゲームの画面の検索の定義に混ぜて使う。
 * 読めない値は既定に戻す。
 */
export const statsSearchShape = {
  // 'stats' のあいだ、ランキングの代わりに統計を出す
  view: z.enum(['stats']).optional().catch(undefined),
  range: z.enum(RANGES).default('day').catch('day'),
  // 「1 日」で見る日。省いたときは、今日(学祭の外なら、近いほうの日)
  day: z.enum(FESTIVAL_DAYS).optional().catch(undefined),
  // 最初と最後の、記録が無い時間を切り詰める
  trim: z.boolean().default(true).catch(true),
};

/** 既定の値。URL には出さない。 */
export const STATS_SEARCH_DEFAULTS = { range: 'day', trim: true } as const;

export type StatsSearch = z.infer<z.ZodObject<typeof statsSearchShape>>;
