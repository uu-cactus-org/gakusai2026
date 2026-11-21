import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChartColumn } from 'lucide-react';
import { Suspense, lazy, useMemo } from 'react';
import { LastUpdated } from '#/components/last-updated';
import { Button } from '#/components/ui/button';
import { FESTIVAL_DAYS, buildPlaySeries, dayLabel, defaultDay } from './buckets';
import type { Range } from './buckets';
import { playStatsQueryOptions } from './query';
import type { StatsGame } from './query';
import type { StatsSearch } from './search';

// グラフのライブラリは、統計を開いたときにだけ読み込む
const PlayCountChart = lazy(() => import('./play-count-chart'));

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '3h', label: '3時間' },
  { value: 'day', label: '1日' },
  { value: 'all', label: '全期間' },
];

const DAY_OPTIONS = FESTIVAL_DAYS.map((day) => ({ value: day, label: dayLabel(day) }));

/**
 * ナビの中央に置く「統計」のボタン。開いているあいだは色を付け、もう 1 度押すとランキングへ戻る。
 * 開くときは履歴に積むので、ブラウザの「戻る」でも戻れる。
 */
export function StatsToggle({
  from,
  open,
}: {
  from: '/water-shooting' | '/uu-jump';
  open: boolean;
}) {
  return (
    <Button
      variant={open ? 'default' : 'outline'}
      size="sm"
      nativeButton={false}
      render={
        <Link
          from={from}
          to="."
          search={(prev) => ({ ...prev, view: open ? undefined : ('stats' as const) })}
          aria-pressed={open}
        />
      }
    >
      <ChartColumn aria-hidden="true" className="mr-0.5" />
      統計
    </Button>
  );
}

/** 横に並べた、押して切り替えるボタン。 */
function ToggleButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`h-8 border-2 border-foreground px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
        pressed
          ? 'translate-y-0.5 bg-primary text-primary-foreground'
          : 'bg-card text-foreground shadow-[0_2px_0_var(--foreground)] hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <ToggleButton
            key={option.value}
            pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </ToggleButton>
        ))}
      </div>
    </div>
  );
}

/** プレイ数の統計。期間の切り替えと、時間ごとのプレイ数のグラフ。 */
export function StatsPanel({
  game,
  title,
  search,
  onChange,
  className,
}: {
  game: StatsGame;
  /** グラフの読み上げ用の名前に使う、ゲームの名前 */
  title: string;
  search: StatsSearch;
  onChange: (patch: Partial<StatsSearch>) => void;
  /** 枠の見た目。ゲームごとに違う */
  className?: string;
}) {
  const { data, dataUpdatedAt, isPending, isError, refetch } = useQuery(
    playStatsQueryOptions(game),
  );

  // 取り直すたびに「いま」も進める(直近 3 時間の窓が動く)
  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), [dataUpdatedAt]);
  const day = search.day ?? defaultDay(nowSec);

  const series = useMemo(
    () =>
      data &&
      buildPlaySeries({
        buckets: data.buckets,
        sourceSeconds: data.bucketSeconds,
        range: search.range,
        day,
        trim: search.trim,
        nowSec,
      }),
    [data, search.range, search.trim, day, nowSec],
  );

  return (
    <section className={`flex flex-col gap-3 ${className ?? ''}`}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <ToggleGroup
          label="期間"
          options={RANGE_OPTIONS}
          value={search.range}
          onChange={(range) => onChange({ range })}
        />
        {search.range === 'day' && (
          <ToggleGroup
            label="日付"
            options={DAY_OPTIONS}
            value={day}
            onChange={(next) => onChange({ day: next })}
          />
        )}
        {/* ラベルは、ほかの項目と同じく上に小さく出す */}
        <label className="ml-auto flex cursor-pointer flex-col items-end gap-1 text-xs text-muted-foreground">
          <span>記録のない期間を省く</span>
          <span className="flex h-8 items-center">
            <input
              type="checkbox"
              checked={search.trim}
              onChange={(event) => onChange({ trim: event.target.checked })}
              className="size-5 cursor-pointer accent-primary"
            />
          </span>
        </label>
      </div>

      {isPending ? (
        <p className="py-8 text-center text-muted-foreground">読み込んでいます…</p>
      ) : !series ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p>統計を読み込めませんでした。</p>
          <Button variant="outline" onClick={() => refetch()}>
            もう一度読み込む
          </Button>
        </div>
      ) : (
        <>
          {isError && (
            <p className="text-sm text-destructive">
              最新の記録を取得できませんでした。前回の内容を表示しています。
            </p>
          )}
          {/* 数字は、選んだ期間の合計。棒 1 本の幅は、合計と読み違えないよう右に離して置く */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm text-muted-foreground">
            <p>
              {search.range === '3h'
                ? '直近3時間'
                : search.range === 'day'
                  ? dayLabel(day)
                  : '全期間'}
              のプレイ数{' '}
              <span className="font-digits text-2xl text-foreground tabular-nums">
                {series.total}
              </span>{' '}
              回
            </p>
            <p className="text-xs">
              棒1本 = {series.stepSeconds >= 86_400 ? '1日' : `${series.stepSeconds / 60}分`}
            </p>
          </div>
          {series.points.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">この期間の記録はありません</p>
          ) : (
            <Suspense fallback={<div className="h-80" />}>
              <PlayCountChart series={series} ariaLabel={`${title} の時間ごとのプレイ数`} />
            </Suspense>
          )}
        </>
      )}
      <LastUpdated updatedAt={dataUpdatedAt} />
    </section>
  );
}
