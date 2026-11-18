import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { SignageBoardProps } from '#/features/signage/types';
import { formatPlayTime, formatScore } from '#/lib/format';
import { difficultyLabel, playerLabel } from './labels';
import { rankingQueryOptions } from './ranking';
import type { RankingRun } from './ranking';

// 列の幅。文字の大きさ(em)に合わせて、画面の大きさと一緒に伸び縮みする。
// 順位、スコア、難易度、キャラ、結果、プレイ時間、PC
const COLUMNS = '3em 7.5em 6em 3em 8em 4em minmax(0, 1fr)';

const resultText = (run: RankingRun) =>
  run.result === 'cleared' ? 'クリア' : `ステージ ${run.reachedStage}/${run.totalStages}`;

/** サイネージ用の WaterShooting のランキング。スコアの高い順に、1 ページ分を画面いっぱいに並べる。 */
export function WaterShootingSignageBoard({
  page,
  rows,
  maxPages,
  onPageCount,
}: SignageBoardProps) {
  const { data } = useQuery(rankingQueryOptions({ limit: rows, offset: page * rows }));

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
        className="grid items-end gap-x-[1em] border-b pb-[0.2em] text-muted-foreground"
        style={{ gridTemplateColumns: COLUMNS }}
      >
        {['順位', 'スコア', '難易度', 'キャラ', '結果', '時間', 'PC'].map((heading, i) => (
          <span key={heading} className={i < 2 ? 'text-right text-[0.5em]' : 'text-[0.5em]'}>
            {heading}
          </span>
        ))}
      </div>
      <ol
        className="grid min-h-0 flex-1"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {data.runs.map((run) => (
          <li
            key={run.id}
            className="grid items-center gap-x-[1em] border-b whitespace-nowrap last:border-b-0"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <span className="text-right font-bold tabular-nums">{run.rank}</span>
            <span className="text-right font-bold tabular-nums">{formatScore(run.score)}</span>
            <span className="text-[0.8em]">{difficultyLabel(run.difficulty)}</span>
            <span className="text-[0.8em]">{playerLabel(run.player)}</span>
            <span className="text-[0.8em] tabular-nums">{resultText(run)}</span>
            <span className="text-[0.8em] tabular-nums">{formatPlayTime(run.playSeconds)}</span>
            <span className="truncate text-[0.8em] text-muted-foreground">{run.deviceName}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
