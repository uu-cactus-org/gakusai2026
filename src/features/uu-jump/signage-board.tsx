import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { LastUpdated } from '#/components/last-updated';
import { SIGNAGE_SCREENS_PER_PAGE, SignageScrollRows } from '#/features/signage/scroll-rows';
import type { SignageBoardProps } from '#/features/signage/types';
import { formatRecordedAt } from '#/lib/format';
import { mapsQueryOptions, rankingQueryOptions } from './ranking';
import { Cactakun } from './cactakun';
import { RankBadge, medalTint } from './rank-badge';
import { formatClearTime } from './runs';

// 列の幅。文字の大きさ(em)に合わせて、画面の大きさと一緒に伸び縮みする。
// 中身が収まるぎりぎりに詰めてある。合計が小さいほど、縦長寄りの画面で文字を大きくできる(boards.ts の widthEm)。
// 画面の幅が余るときは、列のあいだを均等に空けて、全体に散らす(justify-between)
// 順位、タイム、ジャンプ、PC、記録した時刻
const COLUMNS = '3em 4.6em 4.4em 3.6em 4em';

/** サイネージの題字。ランキングの画面と同じ、サボテンと黄色い字。大きさは em で、画面と一緒に伸び縮みする。 */
export function UuJumpSignageTitle() {
  return (
    <h1 className="uu-jump-title flex items-end gap-[0.25em] text-[2.2em] leading-none [--uu-jump-edge:0.055em]">
      <Cactakun className="size-[1.1em]" />
      UU-JUMP
      {/* 影は親の太さのまま受け継がれるので、小さい字には、その字の大きさに合う太さで掛け直す */}
      <span className="uu-jump-title text-[0.5em] [--uu-jump-edge:0.07em]">タイムランキング</span>
    </h1>
  );
}

/**
 * サイネージ用の UU-JUMP のランキング。マップを名前の順に、1 マップ 1 ページで映す。
 * マップが数個あり、何ページも送ると一巡が長くなるので、どのマップも上位の 1 ページ(既定で 20 位まで)だけにする。
 * サイネージの pages(ボードごとのページ数の上限)は使わない。
 */
export function UuJumpSignageBoard({
  page,
  rows,
  interval,
  paused,
  onPageCount,
}: SignageBoardProps) {
  const maps = useQuery(mapsQueryOptions);
  const slots = maps.data ?? null;
  // マップが減ってページが減っても、無いページを映さない
  const slot = slots?.[Math.min(page, slots.length - 1)];

  const { data, dataUpdatedAt } = useQuery(
    // 画面には rows 件ずつ並べて、途中で下へ送る
    rankingQueryOptions({ map: slot?.name, limit: rows * SIGNAGE_SCREENS_PER_PAGE, offset: 0 }),
  );

  // 記録が無いあいだも、1 ページとして映す
  const pageCount = slots ? Math.max(1, slots.length) : null;
  useEffect(() => {
    if (pageCount !== null) onPageCount(pageCount);
  }, [pageCount, onPageCount]);

  // 次のマップを先に読んでおく。送った瞬間に中身がそろっていないと、滑って入ってくる表が前のマップのままになる
  const queryClient = useQueryClient();
  const nextMap =
    slots && slots.length > 1
      ? slots[(Math.min(page, slots.length - 1) + 1) % slots.length]?.name
      : undefined;
  useEffect(() => {
    if (nextMap === undefined) return;
    void queryClient.prefetchQuery(
      rankingQueryOptions({ map: nextMap, limit: rows * SIGNAGE_SCREENS_PER_PAGE, offset: 0 }),
    );
  }, [queryClient, nextMap, rows]);

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
      <div
        className="relative grid items-end justify-between gap-x-[1em] px-[0.6em] pb-[0.1em]"
        style={{ gridTemplateColumns: COLUMNS }}
      >
        {/* マップ名は、見出しの行の右端の上に載せる。行を 1 つ使わないので、その分だけ表を上へ広げられる。
            右端の列の見出しに重ならないよう、見出しの字の上まで持ち上げて、題字の右の空きへはみ出させる */}
        <p className="absolute right-0 bottom-[1em] text-[1.2em] leading-none">{slot.name}</p>
        {/* どの列も中央に寄せる。タイムも桁数が決まっているので、中央に寄せても桁がそろう */}
        {['順位', 'タイム', 'ジャンプ', 'PC', '記録した時刻'].map((heading) => (
          <span key={heading} className="text-center text-[0.5em]">
            {heading}
          </span>
        ))}
      </div>
      {/* key を変えて、マップを送るたびに一番上から動かす */}
      <SignageScrollRows
        key={slot.name}
        rows={rows}
        count={data.runs.length}
        interval={interval}
        paused={paused}
      >
        {data.runs.map((run) => {
          const tint = medalTint(run.rank);
          return (
            <li
              key={run.id}
              className="grid items-center justify-between gap-x-[1em] border-[0.08em] border-foreground bg-card/90 px-[0.6em] whitespace-nowrap"
              style={{
                gridTemplateColumns: COLUMNS,
                // 1〜3 位は、白い地の上にメダルの色を薄く重ねる
                backgroundImage: tint && `linear-gradient(${tint}, ${tint})`,
              }}
            >
              <span className="text-center text-[1.3em] leading-none">
                <RankBadge rank={run.rank} />
              </span>
              <span className="text-center font-digits text-[1.3em] leading-none tabular-nums">
                {formatClearTime(run.clearSeconds)}
              </span>
              <span className="flex items-center justify-center gap-[0.3em] text-[0.8em] tabular-nums">
                <Cactakun still className="size-[1.4em]" />
                {/* 数字は 3 桁ぶんの幅を取って右にそろえる。2 桁と 3 桁が混ざっても、サボテンの位置がずれない */}
                <span className="min-w-[1.5em] text-right">{run.jumpCount}</span>回
              </span>
              <span className="truncate text-center text-[0.8em]">{run.deviceName}</span>
              <span className="text-center text-[0.7em] text-muted-foreground tabular-nums">
                {formatRecordedAt(run.createdAt)}
              </span>
            </li>
          );
        })}
      </SignageScrollRows>
      {/* 画面の右下の隅に小さく出す(サイネージの画面全体が基準)。ページの点と同じ高さ */}
      <LastUpdated
        updatedAt={dataUpdatedAt}
        className="absolute right-[3.4em] bottom-[0.9em] text-[0.45em] leading-none text-muted-foreground tabular-nums"
      />
    </div>
  );
}
