import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { z } from 'zod';
import { FilterSelect } from '#/components/filter-select';
import { LastUpdated } from '#/components/last-updated';
import { STATS_SEARCH_DEFAULTS, statsSearchShape } from '#/features/stats/search';
import { StatsPanel, StatsToggle } from '#/features/stats/stats-panel';
import { RotatingWaterShootingBackdrop } from '#/features/water-shooting/backdrop';
import { DriftingPlayers } from '#/features/water-shooting/drifting-players';
import { WATER_SHOOTING_THEME } from '#/features/water-shooting/theme';
import { useDocumentTheme } from '#/lib/use-document-theme';
import { Button } from '#/components/ui/button';
import {
  DIFFICULTIES,
  PLAYERS,
  RESULTS,
  difficultyLabel,
  playerLabel,
  resultLabel,
} from '#/features/water-shooting/labels';
import { SORT_KEYS, rankingQueryOptions } from '#/features/water-shooting/ranking';
import type { SortKey } from '#/features/water-shooting/ranking';
import {
  WaterShootingRankingTable,
  WaterShootingRankingTableSkeleton,
} from '#/features/water-shooting/ranking-table';

const PAGE_SIZE = 20;

// URL に置く、並べ替え・絞り込み・ページ。読めない値は既定に戻す。
const searchSchema = z.object({
  sort: z.enum(SORT_KEYS).default('score').catch('score'),
  difficulty: z.enum(DIFFICULTIES).optional().catch(undefined),
  player: z.enum(PLAYERS).optional().catch(undefined),
  result: z.enum(RESULTS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  ...statsSearchShape,
});

type Search = z.infer<typeof searchSchema>;

const DEFAULT_SEARCH = {
  sort: 'score',
  page: 1,
  ...STATS_SEARCH_DEFAULTS,
} as const satisfies Partial<Search>;

export const Route = createFileRoute('/water-shooting')({
  validateSearch: searchSchema,
  // 既定の値は URL に出さない
  search: { middlewares: [stripSearchParams(DEFAULT_SEARCH)] },
  component: WaterShootingRanking,
});

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'score', label: 'スコアが高い順' },
  { value: 'playSeconds', label: 'プレイ時間が短い順' },
  { value: 'reachedStage', label: '進んだステージ順' },
  { value: 'createdAt', label: '新しい順' },
];

// 絞り込みを「付けない」を表す値
const ALL = 'all';

function withAll<T extends string>(values: readonly T[], label: (value: T) => string) {
  const options: { value: T | typeof ALL; label: string }[] = [{ value: ALL, label: 'すべて' }];
  for (const value of values) options.push({ value, label: label(value) });
  return options;
}

const DIFFICULTY_OPTIONS = withAll(DIFFICULTIES, difficultyLabel);
const PLAYER_OPTIONS = withAll(PLAYERS, playerLabel);
const RESULT_OPTIONS = withAll(RESULTS, resultLabel);

const fromAll = <T extends string>(value: T | typeof ALL) =>
  value === ALL ? undefined : (value as T);

function WaterShootingRanking() {
  useDocumentTheme(WATER_SHOOTING_THEME);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // 統計を開いているあいだは、ランキングを取りに行かない
  const showStats = search.view === 'stats';

  const { data, dataUpdatedAt, isPending, isError, isPlaceholderData, refetch } = useQuery({
    ...rankingQueryOptions({
      limit: PAGE_SIZE,
      offset: (search.page - 1) * PAGE_SIZE,
      sort: search.sort,
      difficulty: search.difficulty,
      player: search.player,
      result: search.result,
    }),
    enabled: !showStats,
  });

  // 並べ替えや絞り込みを変えたら、1 ページ目に戻す
  const setFilter = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace: true });
  const setPage = (page: number) => navigate({ search: (prev) => ({ ...prev, page }) });

  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <RotatingWaterShootingBackdrop>
        <DriftingPlayers />
      </RotatingWaterShootingBackdrop>
      <header className="flex flex-col gap-3">
        {/* 左は一覧へ、中央は統計の切り替え、右はもう一方のゲームのランキングへ */}
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            render={<Link to="/" />}
            nativeButton={false}
          >
            <ArrowLeft aria-hidden="true" />
            トップ
          </Button>
          <StatsToggle from="/water-shooting" open={showStats} />
          <Button
            variant="outline"
            size="sm"
            className="justify-self-end"
            render={<Link to="/uu-jump" />}
            nativeButton={false}
          >
            <Trophy aria-hidden="true" className="mr-0.5" />
            UU-JUMP
          </Button>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="font-display text-5xl leading-none text-primary">
            WaterShooting{' '}
            <span className="block font-sans text-xl text-foreground sm:inline">
              {showStats ? '統計' : 'ランキング'}
            </span>
          </h1>
          {data && !showStats && (
            <p className="text-sm text-muted-foreground">全 {data.total} 件</p>
          )}
        </div>
      </header>

      {showStats ? (
        <StatsPanel
          game="water-shooting"
          title="WaterShooting"
          search={search}
          onChange={(patch) =>
            navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
          }
          className="border-2 bg-background/80 p-3 sm:p-4"
        />
      ) : (
        <>
          {/* 絞り込みは左、並べ替えは右。役目が違うので、離して置く */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <FilterSelect
              label="難易度"
              value={search.difficulty ?? ALL}
              options={DIFFICULTY_OPTIONS}
              onChange={(value) => setFilter({ difficulty: fromAll(value) })}
            />
            <FilterSelect
              label="キャラ"
              value={search.player ?? ALL}
              options={PLAYER_OPTIONS}
              onChange={(value) => setFilter({ player: fromAll(value) })}
            />
            <FilterSelect
              label="結果"
              value={search.result ?? ALL}
              options={RESULT_OPTIONS}
              onChange={(value) => setFilter({ result: fromAll(value) })}
            />
            <div className="sm:ml-auto">
              <FilterSelect
                label="並べ替え"
                value={search.sort}
                options={SORT_OPTIONS}
                onChange={(sort) => setFilter({ sort })}
              />
            </div>
          </div>

          {isPending ? (
            <WaterShootingRankingTableSkeleton rows={10} />
          ) : !data ? (
            <div className="flex flex-col items-start gap-3 py-8">
              <p>ランキングを読み込めませんでした。</p>
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
              {data.total === 0 ? (
                <p className="py-8 text-muted-foreground">条件に合う記録はありません</p>
              ) : data.runs.length === 0 ? (
                <div className="flex flex-col items-start gap-3 py-8">
                  <p className="text-muted-foreground">このページには記録がありません。</p>
                  <Button variant="outline" onClick={() => setPage(1)}>
                    最初のページへ
                  </Button>
                </div>
              ) : (
                <div
                  className={`border-2 bg-background/80 px-3 sm:px-4 md:px-0 ${
                    isPlaceholderData ? 'opacity-60 transition-opacity' : ''
                  }`}
                >
                  <WaterShootingRankingTable runs={data.runs} />
                </div>
              )}

              <nav className="flex items-center justify-between gap-3" aria-label="ページ送り">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="前のページ"
                  title="前のページ"
                  disabled={search.page <= 1}
                  onClick={() => setPage(search.page - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {search.page} / {pageCount} ページ
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="次のページ"
                  title="次のページ"
                  disabled={search.page >= pageCount}
                  onClick={() => setPage(search.page + 1)}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </nav>
            </>
          )}
          <LastUpdated updatedAt={dataUpdatedAt} />
        </>
      )}
    </main>
  );
}
