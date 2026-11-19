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
import { difficultyLabel, playerLabel, resultLabel } from '#/features/water-shooting/labels';
import { formatPlayTime, formatRecordedAt, formatScore } from '#/lib/format';
import { deleteRun, devicesQueryOptions, runsQueryOptions, setRunTest } from './api';
import type { AdminRun, AdminRunsParams } from './api';

const PAGE_SIZE = 50;
const ALL = 'all';

const TEST_OPTIONS: { value: AdminRunsParams['test']; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'exclude', label: 'ランキングに出ているもの' },
  { value: 'only', label: 'テスト扱いのもの' },
];

const SORT_OPTIONS: { value: AdminRunsParams['sort']; label: string }[] = [
  { value: 'createdAt', label: '新しい順' },
  { value: 'score', label: 'スコアが高い順' },
];

const RESULT_OPTIONS: { value: 'all' | 'cleared' | 'game_over'; label: string }[] = [
  { value: ALL, label: 'すべて' },
  { value: 'cleared', label: resultLabel('cleared') },
  { value: 'game_over', label: resultLabel('game_over') },
];

type Filters = Pick<AdminRunsParams, 'sort' | 'test' | 'deviceId' | 'result'>;

/** 消す前の確認。消すと戻せないので、どの記録かを見せる。 */
function DeleteDialog({
  run,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  run: AdminRun | null;
  pending: boolean;
  error: string | null;
  onConfirm: (run: AdminRun) => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={run !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>この記録を消しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            消した記録は元に戻せません。ランキングから外すだけなら「テスト扱いにする」を使ってください。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {run && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">ID</dt>
            <dd className="tabular-nums">{run.id}</dd>
            <dt className="text-muted-foreground">スコア</dt>
            <dd className="tabular-nums">{formatScore(run.score)}</dd>
            <dt className="text-muted-foreground">PC</dt>
            <dd>{run.deviceName}</dd>
            <dt className="text-muted-foreground">記録した時刻</dt>
            <dd className="tabular-nums">{formatRecordedAt(run.createdAt)}</dd>
          </dl>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>やめる</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || !run}
            onClick={() => run && onConfirm(run)}
          >
            {pending ? '消しています…' : '消す'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** 記録の一覧と、ランキングから外す・戻す・消す。 */
export function RunsPanel() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ sort: 'createdAt', test: 'all' });
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<AdminRun | null>(null);
  const [message, setMessage] = useState<{ kind: 'done' | 'error'; text: string } | null>(null);

  const { data: devices } = useQuery(devicesQueryOptions);
  const { data, dataUpdatedAt, isPending, error, isFetching, isPlaceholderData, refetch } =
    useQuery(runsQueryOptions({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }));

  // 記録を変えたら、管理画面の一覧もランキングも取り直す
  const refreshAll = () => queryClient.invalidateQueries();

  const toggleTest = useMutation({
    mutationFn: setRunTest,
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
    mutationFn: deleteRun,
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
          label="結果"
          value={filters.result ?? ALL}
          options={RESULT_OPTIONS}
          onChange={(value) => updateFilters({ result: value === ALL ? undefined : value })}
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
            {data.total === 0 ? '条件に合う記録はありません。' : 'このページには記録がありません。'}
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
                <TableHead className="text-right">スコア</TableHead>
                <TableHead>難易度</TableHead>
                <TableHead>キャラ</TableHead>
                <TableHead>結果</TableHead>
                <TableHead>ステージ</TableHead>
                <TableHead className="text-right">プレイ時間</TableHead>
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
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatScore(run.score)}
                    </TableCell>
                    <TableCell>{difficultyLabel(run.difficulty)}</TableCell>
                    <TableCell>{playerLabel(run.player)}</TableCell>
                    <TableCell>{resultLabel(run.result)}</TableCell>
                    <TableCell className="tabular-nums">
                      {run.reachedStage} / {run.totalStages}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPlayTime(run.playSeconds)}
                    </TableCell>
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

      <DeleteDialog
        run={deleting}
        pending={remove.isPending}
        error={remove.error?.message ?? null}
        onConfirm={(run) => remove.mutate(run.id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
