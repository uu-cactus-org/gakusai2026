import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { FilterSelect } from '#/components/filter-select';
import { LastUpdated } from '#/components/last-updated';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table';
import { formatClearTime } from '#/features/uu-jump/runs';
import { formatRecordedAt } from '#/lib/format';
import {
  deleteUuJumpRun,
  devicesQueryOptions,
  setUuJumpRunTest,
  uuJumpRunsQueryOptions,
} from './api';
import type { AdminUuJumpRun, AdminUuJumpRunsParams } from './api';

const PAGE_SIZE = 50;
const ALL = 'all';

const TEST_OPTIONS: { value: AdminUuJumpRunsParams['test']; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'exclude', label: 'ランキングに出ているもの' },
  { value: 'only', label: 'テスト扱いのもの' },
];

const SORT_OPTIONS: { value: AdminUuJumpRunsParams['sort']; label: string }[] = [
  { value: 'createdAt', label: '新しい順' },
  { value: 'clearSeconds', label: 'タイムが短い順' },
];

type Filters = Pick<AdminUuJumpRunsParams, 'sort' | 'test' | 'deviceId' | 'map'>;

/** UU-JUMP の記録の一覧と、ランキングから外す・戻す・消す。WaterShooting の記録の画面と同じ作り。 */
export function UuJumpRunsPanel() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ sort: 'createdAt', test: 'all' });
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<AdminUuJumpRun | null>(null);
  const [message, setMessage] = useState<{ kind: 'done' | 'error'; text: string } | null>(null);

  const { data: devices } = useQuery(devicesQueryOptions);
  const { data, dataUpdatedAt, isPending, error, isFetching, isPlaceholderData, refetch } =
    useQuery(
      uuJumpRunsQueryOptions({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    );

  // 記録を変えたら、管理画面の一覧もランキングも取り直す
  const refreshAll = () => queryClient.invalidateQueries();

  const toggleTest = useMutation({
    mutationFn: setUuJumpRunTest,
    onSuccess: async (result) => {
      setMessage({
        kind: 'done',
        text: result.test
          ? `ID ${result.id} をテスト扱いにしました(ランキングから外れます)`
          : `ID ${result.id} をランキングに戻しました`,
      });
      await refreshAll();
    },
    onError: (err) => setMessage({ kind: 'error', text: err.message }),
  });

  const remove = useMutation({
    mutationFn: deleteUuJumpRun,
    onSuccess: async (result) => {
      setDeleting(null);
      setMessage({ kind: 'done', text: `ID ${result.id} を消しました` });
      await refreshAll();
    },
  });

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const deviceOptions = [
    { value: ALL, label: 'すべて' },
    ...(devices ?? []).map((device) => ({ value: device.id, label: device.name })),
  ];
  const mapOptions = [
    { value: ALL, label: 'すべて' },
    ...(data?.maps ?? []).map((name) => ({ value: name, label: name })),
  ];
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
        <FilterSelect
          label="並べ替え"
          value={filters.sort}
          options={SORT_OPTIONS}
          onChange={(sort) => updateFilters({ sort })}
        />
        <FilterSelect
          label="種類"
          value={filters.test}
          options={TEST_OPTIONS}
          onChange={(test) => updateFilters({ test })}
        />
        <FilterSelect
          label="PC"
          value={filters.deviceId ?? ALL}
          options={deviceOptions}
          onChange={(value) => updateFilters({ deviceId: value === ALL ? undefined : value })}
        />
        <FilterSelect
          label="マップ"
          value={filters.map ?? ALL}
          options={mapOptions}
          onChange={(value) => updateFilters({ map: value === ALL ? undefined : value })}
        />
        {/* 件数と更新は、スマホでも右端に横に並べる。更新が一番右 */}
        <div className="col-span-2 flex items-center justify-end gap-3 sm:ml-auto">
          {data && <p className="text-sm leading-none text-muted-foreground">{data.total} 件</p>}
          <Button
            variant="outline"
            size="icon"
            aria-label="更新"
            title="更新"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw aria-hidden="true" className={isFetching ? 'animate-spin' : undefined} />
          </Button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`text-sm ${message.kind === 'error' ? 'text-destructive' : 'text-foreground'}`}
        >
          {message.text}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {isPending ? (
        <p className="py-6 text-muted-foreground">読み込んでいます…</p>
      ) : !data ? (
        <Button variant="outline" className="self-start" onClick={() => refetch()}>
          もう一度読み込む
        </Button>
      ) : data.runs.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p className="text-muted-foreground">
            {data.total === 0 ? '条件に合う記録はありません' : 'このページには記録がありません。'}
          </p>
          {data.total > 0 && (
            <Button variant="outline" onClick={() => setPage(1)}>
              最初のページへ
            </Button>
          )}
        </div>
      ) : (
        <div className={isPlaceholderData ? 'opacity-60' : undefined}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">ID</TableHead>
                <TableHead>記録した時刻</TableHead>
                <TableHead>PC</TableHead>
                <TableHead>マップ</TableHead>
                <TableHead className="text-right">タイム</TableHead>
                <TableHead className="text-right">ジャンプ</TableHead>
                <TableHead>種類</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.runs.map((run) => {
                const busy = toggleTest.isPending && toggleTest.variables.id === run.id;
                return (
                  <TableRow key={run.id}>
                    <TableCell className="text-right tabular-nums">{run.id}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatRecordedAt(run.createdAt)}
                    </TableCell>
                    <TableCell>{run.deviceName}</TableCell>
                    <TableCell>{run.mapName}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatClearTime(run.clearSeconds)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{run.jumpCount} 回</TableCell>
                    <TableCell>
                      <Badge variant={run.test ? 'outline' : 'secondary'}>
                        {run.test ? 'テスト' : 'ランキング'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => toggleTest.mutate({ id: run.id, test: !run.test })}
                        >
                          {run.test ? 'ランキングに戻す' : 'テスト扱いにする'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            remove.reset();
                            setDeleting(run);
                          }}
                        >
                          消す
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {data && (
        <nav className="flex items-center justify-between gap-3" aria-label="ページ送り">
          <Button
            variant="outline"
            size="icon"
            aria-label="前のページ"
            title="前のページ"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {page} / {pageCount} ページ
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="次のページ"
            title="次のページ"
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
      <LastUpdated updatedAt={dataUpdatedAt} />

      {/* 消す前の確認。消すと戻せないので、どの記録かを見せる */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この記録を消しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              消した記録は元に戻せません。ランキングから外すだけなら「テスト扱いにする」を使ってください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleting && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="tabular-nums">{deleting.id}</dd>
              <dt className="text-muted-foreground">マップ</dt>
              <dd>{deleting.mapName}</dd>
              <dt className="text-muted-foreground">タイム</dt>
              <dd className="tabular-nums">{formatClearTime(deleting.clearSeconds)}</dd>
              <dt className="text-muted-foreground">PC</dt>
              <dd>{deleting.deviceName}</dd>
              <dt className="text-muted-foreground">記録した時刻</dt>
              <dd className="tabular-nums">{formatRecordedAt(deleting.createdAt)}</dd>
            </dl>
          )}
          {remove.error && <p className="text-sm text-destructive">{remove.error.message}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>やめる</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending || !deleting}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              {remove.isPending ? '消しています…' : '消す'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
