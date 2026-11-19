import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { LastUpdated } from '#/components/last-updated';
import type { SignageBoardProps } from '#/features/signage/types';
import { formatPlayTime, formatScore } from '#/lib/format';
import { DifficultyLabel, PlayerLabel, rankColor } from './run-labels';
import { rankingQueryOptions } from './ranking';
import type { WaterShootingRun } from './ranking';

// 列の幅。文字の大きさ(em)に合わせて、画面の大きさと一緒に伸び縮みする。
// 順位、スコア、難易度、キャラ、結果、プレイ時間、PC
const COLUMNS = '3em 7.5em 6em 3em 8em 4em minmax(0, 1fr)';

const resultText = (run: WaterShootingRun) =>
  run.result === 'cleared' ? 'クリア' : `ステージ ${run.reachedStage}/${run.totalStages}`;

/** サイネージ用の WaterShooting のランキング。スコアの高い順に、1 ページ分を画面いっぱいに並べる。 */
export function WaterShootingSignageBoard({
  page,
  rows,
  maxPages,
  onPageCount,
}: SignageBoardProps) {
  const { data, dataUpdatedAt } = useQuery(
    rankingQueryOptions({ limit: rows, offset: page * rows }),
  );

  const pageCount = data ? Math.min(maxPages, Math.max(1, Math.ceil(data.total / rows))) : null;
  useEffect(() => {
    if (pageCount !== null) onPageCount(pageCount);
  }, [pageCount, onPageCount]);

  if (!data) {
    return <p className="p-[1.5em] text-muted-foreground">読み込んでいます…</p>;
  }
  if (data.total === 0) {
    return <p className="p-[1.5em] text-muted-foreground">まだ記録がありません。</p>;
  }

  return (
    <div className="flex h-full flex-col px-[1.5em]">
      <div
        className="grid items-end gap-x-[1em] px-[0.6em] pb-[0.1em]"
        style={{ gridTemplateColumns: COLUMNS }}
      >
        {['順位', 'スコア', '難易度', 'キャラ', '結果', '時間', 'PC'].map((heading, i) => (
          <span key={heading} className={i < 2 ? 'text-right text-[0.5em]' : 'text-[0.5em]'}>
            {heading}
          </span>
        ))}
      </div>
      <ol
        className="grid min-h-0 flex-1 gap-y-[0.18em] pb-[0.2em]"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {data.runs.map((run) => (
          <li
            key={run.id}
            className="grid items-center gap-x-[1em] border-[0.06em] bg-background/75 px-[0.6em] whitespace-nowrap"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <span
              className="text-right font-display text-[1.4em] leading-none tabular-nums"
              style={{ color: rankColor(run.rank) }}
            >
              {run.rank}
            </span>
            <span className="text-right font-display text-[1.4em] leading-none tabular-nums">
              {formatScore(run.score)}
            </span>
            <span className="text-[0.8em]">
              <DifficultyLabel value={run.difficulty} />
            </span>
            <span className="text-[0.8em]">
              <PlayerLabel value={run.player} showName={false} />
            </span>
            <span className="text-[0.8em] tabular-nums">{resultText(run)}</span>
            <span className="text-[0.8em] tabular-nums">{formatPlayTime(run.playSeconds)}</span>
            <span className="truncate text-[0.8em]">{run.deviceName}</span>
          </li>
        ))}
      </ol>
      {/* 画面の右下の隅に小さく出す(サイネージの画面全体が基準)。ページの点と同じ高さ */}
      <LastUpdated
        updatedAt={dataUpdatedAt}
        className="absolute right-[3.4em] bottom-[0.9em] text-[0.45em] leading-none text-muted-foreground tabular-nums"
      />
    </div>
  );
}
