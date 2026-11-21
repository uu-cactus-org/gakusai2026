import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { z } from 'zod';
import { FilterSelect } from '#/components/filter-select';
import { LastUpdated } from '#/components/last-updated';
import { Button } from '#/components/ui/button';
import { STATS_SEARCH_DEFAULTS, statsSearchShape } from '#/features/stats/search';
import { StatsPanel, StatsToggle } from '#/features/stats/stats-panel';
import { UuJumpBackdrop } from '#/features/uu-jump/backdrop';
import { Cactakun } from '#/features/uu-jump/cactakun';
import { JumpingCactakuns } from '#/features/uu-jump/jumping-cactakuns';
import { SORT_KEYS, mapsQueryOptions, rankingQueryOptions } from '#/features/uu-jump/ranking';
import type { SortKey } from '#/features/uu-jump/ranking';
import { UuJumpRankingTable } from '#/features/uu-jump/ranking-table';
import { UU_JUMP_THEME } from '#/features/uu-jump/theme';
import { useDocumentTheme } from '#/lib/use-document-theme';

const PAGE_SIZE = 20;

// URL に置く、並べ替え・マップ・ページ。読めない値は既定に戻す。
const searchSchema = z.object({
  sort: z.enum(SORT_KEYS).default('clearSeconds').catch('clearSeconds'),
  // 見るマップ。省いたときは、一覧の先頭のマップ
  map: z.string().min(1).max(64).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  ...statsSearchShape,
});

export const Route = createFileRoute('/uu-jump')({
  validateSearch: searchSchema,
  // 既定の値は URL に出さない
  search: {
    middlewares: [stripSearchParams({ sort: 'clearSeconds', page: 1, ...STATS_SEARCH_DEFAULTS })],
  },
  component: UuJumpRanking,
});

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'clearSeconds', label: 'タイムが短い順' },
  { value: 'jumpCount', label: 'ジャンプが少ない順' },
  { value: 'createdAt', label: '新しい順' },
];

/** マップの切り替え。マップは数個なので、選択欄にせず、ボタンを並べて 1 回で選べるようにする。 */
function MapToggle({
  maps,
  value,
  onChange,
}: {
  maps: string[];
  value: string;
  onChange: (map: string) => void;
}) {
  return (
    <div className="col-span-2 flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
      <span id="uu-jump-map-label">マップ</span>
      <div role="group" aria-labelledby="uu-jump-map-label" className="flex flex-wrap gap-1.5">
        {maps.map((map) => {
          const selected = map === value;
          return (
            <button
              key={map}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(map)}
              className={`h-8 border-2 border-foreground px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                selected
                  ? 'translate-y-0.5 bg-primary text-primary-foreground'
                  : 'bg-card text-foreground shadow-[0_2px_0_var(--foreground)] hover:bg-accent'
              }`}
            >
              {map}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UuJumpRanking() {
  useDocumentTheme(UU_JUMP_THEME);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // 統計を開いているあいだは、ランキングを取りに行かない
  const showStats = search.view === 'stats';

  const maps = useQuery({ ...mapsQueryOptions, enabled: !showStats });
  const selectedMap = search.map ?? maps.data?.[0]?.name;
  const { data, dataUpdatedAt, isPending, isError, isPlaceholderData, refetch } = useQuery({
    ...rankingQueryOptions({
      map: selectedMap,
      sort: search.sort,
      limit: PAGE_SIZE,
      offset: (search.page - 1) * PAGE_SIZE,
    }),
    enabled: !showStats && selectedMap !== undefined,
  });

  // URL で指定されたマップに記録が無くても、選択欄には出す
  const mapNames = (maps.data ?? []).map((map) => map.name);
  if (selectedMap !== undefined && !mapNames.includes(selectedMap)) mapNames.push(selectedMap);

  const setPage = (page: number) => navigate({ search: (prev) => ({ ...prev, page }) });
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <UuJumpBackdrop>
        <JumpingCactakuns />
      </UuJumpBackdrop>
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
          <StatsToggle from="/uu-jump" open={showStats} />
          <Button
            variant="outline"
            size="sm"
            className="justify-self-end"
            render={<Link to="/water-shooting" />}
            nativeButton={false}
          >
            <Trophy aria-hidden="true" className="mr-0.5" />
            WaterShooting
          </Button>
        </nav>
        <div className="flex items-end gap-3">
          <Cactakun />
          <h1 className="uu-jump-title text-5xl leading-none sm:text-6xl">
            UU-JUMP{' '}
            <span className="block text-2xl sm:inline sm:text-3xl">
              {showStats ? '統計' : 'ランキング'}
            </span>
          </h1>
        </div>
      </header>

      {showStats ? (
        <StatsPanel
          game="uu-jump"
          title="UU-JUMP"
          search={search}
          onChange={(patch) =>
            navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
          }
          className="border-4 border-foreground bg-(--panel)/80 px-3 py-4 sm:px-5"
        />
      ) : (
        <section className="flex flex-col gap-3 border-4 border-foreground bg-(--panel)/80 px-3 py-4 sm:px-5">
          {/* マップの切り替えは左、並べ替えは右。ランキングはマップごと */}
          <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
            {selectedMap !== undefined && (
              <MapToggle
                maps={mapNames}
                value={selectedMap}
                onChange={(map) =>
                  navigate({ search: (prev) => ({ ...prev, map, page: 1 }), replace: true })
                }
              />
            )}
            <div className="col-span-2 flex items-end justify-end gap-3 sm:ml-auto">
              {data && selectedMap && (
                <p className="flex h-8 items-center text-sm text-muted-foreground">
                  全 {data.total} 件
                </p>
              )}
              <FilterSelect
                label="並べ替え"
                value={search.sort}
                options={SORT_OPTIONS}
                onChange={(sort) =>
                  navigate({ search: (prev) => ({ ...prev, sort, page: 1 }), replace: true })
                }
              />
            </div>
          </div>

          {maps.isPending ? (
            <p className="py-8 text-center text-muted-foreground">読み込んでいます…</p>
          ) : maps.isError && !maps.data ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p>ランキングを読み込めませんでした。</p>
              <Button variant="outline" onClick={() => maps.refetch()}>
                もう一度読み込む
              </Button>
            </div>
          ) : selectedMap === undefined ? (
            <p className="py-8 text-center text-muted-foreground">まだ記録がありません</p>
          ) : isPending ? (
            <p className="py-8 text-center text-muted-foreground">読み込んでいます…</p>
          ) : !data ? (
            <div className="flex flex-col items-center gap-3 py-8">
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
                <p className="py-8 text-center text-muted-foreground">条件に合う記録はありません</p>
              ) : data.runs.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <p className="text-muted-foreground">このページには記録がありません。</p>
                  <Button variant="outline" onClick={() => setPage(1)}>
                    最初のページへ
                  </Button>
                </div>
              ) : (
                <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
                  <UuJumpRankingTable runs={data.runs} />
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
        </section>
      )}
    </main>
  );
}
