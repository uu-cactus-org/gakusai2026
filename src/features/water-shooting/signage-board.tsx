import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { LastUpdated } from '#/components/last-updated';
import type { SignageBoardProps } from '#/features/signage/types';
import { formatPlayTime, formatRecordedAt, formatScore } from '#/lib/format';
import { DifficultyLabel, PlayerLabel, rankColor, rankTint } from './run-labels';
import { rankingQueryOptions } from './ranking';
import type { WaterShootingRun } from './ranking';

// 列の幅。文字の大きさ(em)に合わせて、画面の大きさと一緒に伸び縮みする。
// 中身が収まるぎりぎりに詰めてある。合計が小さいほど、縦長寄りの画面で文字を大きくできる(boards.ts の widthEm)。
// 画面の幅が余るときは、列のあいだを均等に空けて、全体に散らす(justify-between)
// 順位、スコア、難易度、キャラ、結果、プレイ時間、PC、記録した時刻
// キャラの列は、横長の画面では名前も出すので、その分だけ広げる
const COLUMNS = '2.2em 4.2em 4.4em var(--player-column, 2em) 5.4em 2.4em 3.6em 4em';

// 横長の画面(3:2 より横に長い)では、文字の大きさが画面の高さで決まり、幅が余るので、キャラの名前も出す。
// iPad のような 4:3 では、幅がぎりぎりなので出さない。
// クラスは、Tailwind が拾えるよう、変数でつながずにそのまま書く
const WIDE_PLAYER_COLUMN = '[@media(min-aspect-ratio:3/2)]:[--player-column:3em]';
const WIDE_ONLY = 'hidden [@media(min-aspect-ratio:3/2)]:inline';

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

  // 次のページを先に読んでおく。送った瞬間に中身がそろっていないと、滑って入ってくる表が前のページのままになる
  const queryClient = useQueryClient();
  const nextPage = pageCount !== null && pageCount > 1 ? (page + 1) % pageCount : null;
  useEffect(() => {
    if (nextPage === null) return;
    void queryClient.prefetchQuery(rankingQueryOptions({ limit: rows, offset: nextPage * rows }));
  }, [queryClient, nextPage, rows]);

  if (!data) {
    return <p className="p-[1.5em] text-muted-foreground">読み込んでいます…</p>;
  }
  if (data.total === 0) {
    return <p className="p-[1.5em] text-muted-foreground">まだ記録がありません。</p>;
  }

  return (
    <div className={`flex h-full flex-col px-[1.5em] ${WIDE_PLAYER_COLUMN}`}>
      <div
        className="grid items-end justify-between gap-x-[0.6em] px-[0.6em] pb-[0.1em]"
        style={{ gridTemplateColumns: COLUMNS }}
      >
        {['順位', 'スコア', '難易度', 'キャラ', '結果', 'タイム', 'PC', '記録した時刻'].map(
          (heading, i) => (
            // スコアだけ右にそろえて、ほかは中央に寄せる(ランキングの画面の表と同じ)
            <span
              key={heading}
              className={i === 1 ? 'text-right text-[0.5em]' : 'text-center text-[0.5em]'}
            >
              {heading}
            </span>
          ),
        )}
      </div>
      {/* ページを送るときに横へ滑らせる枠(signage-rows)。左右の余白まで広げて、画面の端から出入りさせる */}
      <ol
        className="-mx-[1.5em] grid min-h-0 flex-1 gap-y-[0.18em] px-[1.5em] pb-[0.2em] [view-transition-name:signage-rows]"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {data.runs.map((run) => {
          const tint = rankTint(run.rank);
          return (
            <li
              key={run.id}
              className="grid items-center justify-between gap-x-[0.6em] border-[0.06em] bg-background/75 px-[0.6em] whitespace-nowrap"
              style={{
                gridTemplateColumns: COLUMNS,
                // 1〜3 位は、暗い地の上に、順位の色を薄く重ねる(地の色を差し替えると、背景の絵が透けすぎる)
                backgroundImage: tint && `linear-gradient(${tint}, ${tint})`,
              }}
            >
              <span
                className="text-center font-display text-[1.4em] leading-none tabular-nums"
                style={{ color: rankColor(run.rank) }}
              >
                {run.rank}
              </span>
              <span className="text-right font-display text-[1.4em] leading-none tabular-nums">
                {formatScore(run.score)}
              </span>
              <span className="text-center text-[0.8em]">
                <DifficultyLabel value={run.difficulty} />
              </span>
              <span className="text-[0.8em]">
                <PlayerLabel
                  value={run.player}
                  nameClassName={WIDE_ONLY}
                  className="justify-center"
                />
              </span>
              {/* クリアは、題字と同じ黄色で目立たせる。途中で終わった「ステージ n/n」は、一回り小さくして控えめに */}
              <span
                className={`text-center tabular-nums ${run.result === 'cleared' ? 'text-[0.8em] text-primary' : 'text-[0.65em] text-muted-foreground'}`}
              >
                {resultText(run)}
              </span>
              <span className="text-center text-[0.8em] tabular-nums">
                {formatPlayTime(run.playSeconds)}
              </span>
              <span className="truncate text-center text-[0.8em]">{run.deviceName}</span>
              <span className="text-center text-[0.7em] text-muted-foreground tabular-nums">
                {formatRecordedAt(run.createdAt)}
              </span>
            </li>
          );
        })}
      </ol>
      {/* 画面の右下の隅に小さく出す(サイネージの画面全体が基準)。ページの点と同じ高さ */}
      <LastUpdated
        updatedAt={dataUpdatedAt}
        className="absolute right-[3.4em] bottom-[0.9em] text-[0.45em] leading-none text-muted-foreground tabular-nums"
      />
    </div>
  );
}
