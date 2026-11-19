import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { LastUpdated } from '#/components/last-updated';
import type { SignageBoardProps } from '#/features/signage/types';
import { mapsQueryOptions, rankingQueryOptions } from './ranking';
import type { UuJumpMap } from './ranking';
import { rankColor } from './ranking-table';
import { formatClearTime } from './runs';

// 列の幅。文字の大きさ(em)に合わせて、画面の大きさと一緒に伸び縮みする。
// 順位、タイム、ジャンプ、PC
const COLUMNS = '3em 8em 6em minmax(0, 1fr)';

/**
 * サイネージのページを、マップごとのページに割り振る。
 * マップを名前の順に並べ、それぞれ maxPages ページまで映す。
 */
function toSlots(maps: UuJumpMap[], rows: number, maxPages: number) {
  return maps.flatMap((map) => {
    const pageCount = Math.min(maxPages, Math.max(1, Math.ceil(map.count / rows)));
    return Array.from({ length: pageCount }, (_, mapPage) => ({ map: map.name, mapPage }));
  });
}

/** サイネージ用の UU-JUMP のランキング。マップを順に、タイムの短い順で 1 ページ分ずつ並べる。 */
export function UuJumpSignageBoard({ page, rows, maxPages, onPageCount }: SignageBoardProps) {
  const maps = useQuery(mapsQueryOptions);
  const slots = maps.data ? toSlots(maps.data, rows, maxPages) : null;
  // マップが減ってページが減っても、無いページを映さない
  const slot = slots?.[Math.min(page, slots.length - 1)];

  const { data, dataUpdatedAt } = useQuery(
    rankingQueryOptions({
      map: slot?.map,
      limit: rows,
      offset: (slot?.mapPage ?? 0) * rows,
    }),
  );

  // 記録が無いあいだも、1 ページとして映す
  const pageCount = slots ? Math.max(1, slots.length) : null;
  useEffect(() => {
    if (pageCount !== null) onPageCount(pageCount);
  }, [pageCount, onPageCount]);

  if (!slots) {
    return <p className="p-[1.5em] text-muted-foreground">読み込んでいます…</p>;
  }
  if (!slot) {
    return <p className="p-[1.5em] text-muted-foreground">まだ記録がありません。</p>;
  }
  if (!data) {
    return <p className="p-[1.5em] text-muted-foreground">読み込んでいます…</p>;
  }

  return (
    <div className="flex h-full flex-col px-[1.5em]">
      <p className="pb-[0.1em] text-[0.9em] leading-tight">マップ: {slot.map}</p>
      <div
        className="grid items-end gap-x-[1em] px-[0.6em] pb-[0.1em]"
        style={{ gridTemplateColumns: COLUMNS }}
      >
        {['順位', 'タイム', 'ジャンプ', 'PC'].map((heading, i) => (
          <span key={heading} className={i < 3 ? 'text-right text-[0.5em]' : 'text-[0.5em]'}>
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
            className="grid items-center gap-x-[1em] border-[0.08em] border-foreground bg-card/90 px-[0.6em] whitespace-nowrap"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <span
              className="text-right text-[1.3em] leading-none font-bold tabular-nums"
              style={{ color: rankColor(run.rank) }}
            >
              {run.rank}
            </span>
            <span className="text-right text-[1.3em] leading-none tabular-nums">
              {formatClearTime(run.clearSeconds)}
            </span>
            <span className="text-right text-[0.8em] tabular-nums">{run.jumpCount} 回</span>
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
