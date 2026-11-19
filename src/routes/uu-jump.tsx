import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import { LastUpdated } from '#/components/last-updated';
import { Button } from '#/components/ui/button';
import { UuJumpBackdrop } from '#/features/uu-jump/backdrop';
import { Cactakun } from '#/features/uu-jump/cactakun';
import { mapsQueryOptions, rankingQueryOptions } from '#/features/uu-jump/ranking';
import { UuJumpRankingTable } from '#/features/uu-jump/ranking-table';
import { UU_JUMP_THEME } from '#/features/uu-jump/theme';
import { useDocumentTheme } from '#/lib/use-document-theme';

const PAGE_SIZE = 20;

const searchSchema = z.object({
  // 見るマップ。省いたときは、一覧の先頭のマップ
  map: z.string().min(1).max(64).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute('/uu-jump')({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams({ page: 1 })] },
  component: UuJumpRanking,
});

function UuJumpRanking() {
  useDocumentTheme(UU_JUMP_THEME);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const maps = useQuery(mapsQueryOptions);
  const selectedMap = search.map ?? maps.data?.[0]?.name;
  const { data, dataUpdatedAt, isPending, isError, isPlaceholderData, refetch } = useQuery(
    rankingQueryOptions({
      map: selectedMap,
      limit: PAGE_SIZE,
      offset: (search.page - 1) * PAGE_SIZE,
    }),
  );

  const setPage = (page: number) => navigate({ search: (prev) => ({ ...prev, page }) });
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <UuJumpBackdrop />
      <header className="flex flex-col items-start gap-3">
        <Button variant="outline" size="sm" render={<Link to="/" />} nativeButton={false}>
          <ArrowLeft aria-hidden="true" />
          一覧に戻る
        </Button>
        <div className="flex items-end gap-3">
          <Cactakun size={64} />
          <h1 className="uu-jump-title text-5xl leading-none sm:text-6xl">
            UU-JUMP <span className="block text-2xl sm:inline sm:text-3xl">ランキング</span>
          </h1>
        </div>
      </header>

      <section className="flex flex-col gap-3 border-4 border-foreground bg-card/90 px-3 py-4 sm:px-5">
        {/* マップの切り替え。ランキングはマップごと */}
        <div className="flex flex-wrap items-center gap-2">
          {maps.data && maps.data.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="マップ">
              {maps.data.map((map) => (
                <Button
                  key={map.name}
                  variant={map.name === selectedMap ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={map.name === selectedMap}
                  onClick={() => navigate({ search: { map: map.name, page: 1 }, replace: true })}
                >
                  {map.name}
                </Button>
              ))}
            </div>
          )}
          {data && selectedMap && (
            <p className="ml-auto text-sm text-muted-foreground">全 {data.total} 件</p>
          )}
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
    </main>
  );
}
