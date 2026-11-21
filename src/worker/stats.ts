import { asc, count, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/d1';
import type { uuJumpRuns, waterShootingRuns } from './db/schema';

/** プレイ数を数える区切りの秒数。画面はこれをまとめ直して、30 分ごとや 1 時間ごとにする。 */
export const PLAY_BUCKET_SECONDS = 600;

// 統計の応答をキャッシュに置く秒数。全行を数えるので、ランキングより長く置く
export const STATS_CACHE_SECONDS = 30;

/**
 * 10 分ごとのプレイ数。記録がある区切りだけを、古い順に返す。テストの記録は数えない。
 * `t` は区切りの始まり(UNIX 時刻の秒)。
 */
export async function playBuckets(
  db: ReturnType<typeof drizzle>,
  runs: typeof waterShootingRuns | typeof uuJumpRuns,
) {
  const bucket = sql<number>`${runs.createdAt} / ${sql.raw(String(PLAY_BUCKET_SECONDS))} * ${sql.raw(String(PLAY_BUCKET_SECONDS))}`;
  return db
    .select({ t: bucket, count: count() })
    .from(runs as typeof waterShootingRuns)
    .where(eq(runs.isTest, false))
    .groupBy(bucket)
    .orderBy(asc(bucket));
}
