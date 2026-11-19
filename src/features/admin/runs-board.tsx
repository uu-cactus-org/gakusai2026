import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, EyeOff, RefreshCw, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
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
import { formatRecordedAt } from '#/lib/format';
import { devicesQueryOptions } from './api';
import type { AdminRunsBaseParams, TestFilter } from './api';

const PAGE_SIZE = 50;

/** 絞り込みを「付けない」を表す値。ゲームごとの絞り込みの選択欄でも使う。 */
export const ALL = 'all';

const TEST_OPTIONS: { value: TestFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'exclude', label: 'ランキングに出ているもの' },
  { value: 'only', label: 'テスト扱いのもの' },
];

/** どのゲームの記録にもある項目。 */
type RunBase = { id: number; test: boolean; deviceName: string; createdAt: string };

/** ゲームごとの列。ID・時刻・PC と、種類・操作のあいだに並べる。 */
export type RunColumn<Run> = {
  head: string;
  /** 数字の列。右に寄せて、桁をそろえる */
  numeric?: boolean;
  /** 太字にする(順位を決める値) */
  strong?: boolean;
  cell: (run: Run) => ReactNode;
};

/**
 * 管理画面の、記録の一覧。並べ替えと絞り込み、ランキングから外す・戻す・消す、ページ送りをまとめて持つ。
 * ゲームごとに違うのは、取ってくる先・並べ替えの種類・追加の絞り込み・列なので、それだけを受け取る。
 */
export function RunsBoard<
  Run extends RunBase,
  Sort extends string,
  Extra extends object,
  Data extends { runs: Run[]; total: number },
>({
  queryKey,
  fetchRuns,
  setTest,
  deleteRun,
  sortOptions,
  initialExtra,
  extraFilter,
  columns,
}: {
  queryKey: (params: AdminRunsBaseParams<Sort> & Extra) => QueryKey;
  fetchRuns: (params: AdminRunsBaseParams<Sort> & Extra) => Promise<Data>;
  setTest: (change: { id: number; test: boolean }) => Promise<{ id: number; test: boolean }>;
  deleteRun: (id: number) => Promise<{ id: number }>;
  /** 並べ替えの選択肢。先頭が既定 */
  sortOptions: readonly [{ value: Sort; label: string }, ...{ value: Sort; label: string }[]];
  /** ゲームごとの絞り込みの、最初の値 */
  initialExtra: Extra;
  /** ゲームごとの絞り込みの選択欄。data は、選択肢を一覧の応答から作るときに使う */
  extraFilter: (context: {
    extra: Extra;
    setExtra: (extra: Extra) => void;
    data: Data | undefined;
  }) => ReactNode;
  /** ゲームごとの列。消す前の確認にも、同じ内容を出す */
  columns: RunColumn<Run>[];
}) {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<Sort>(sortOptions[0].value);
  const [test, setTestFilter] = useState<TestFilter>('all');
  const [deviceId, setDeviceId] = useState<string>();
  const [extra, setExtra] = useState(initialExtra);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Run | null>(null);

  // 並べ替えや絞り込みを変えたら、1 ページ目に戻す
  const filtering =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  const params = {
    ...extra,
    sort,
    test,
    deviceId,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
  const { data: devices } = useQuery(devicesQueryOptions);
  const { data, dataUpdatedAt, isPending, error, isFetching, isPlaceholderData, refetch } =
    useQuery({
      queryKey: queryKey(params),
      queryFn: () => fetchRuns(params),
      placeholderData: keepPreviousData,
      // 当日は記録が増え続けるので、開いたままでも新しい記録が見えるようにする
      refetchInterval: 15_000,
    });

  // 記録を変えたら、管理画面の一覧もランキングも取り直す
  const refreshAll = () => queryClient.invalidateQueries();

  const toggleTest = useMutation({
    mutationFn: setTest,
    onSuccess: async (result) => {
      toast.success(
        result.test
          ? `ID ${result.id} をテスト扱いにしました(ランキングから外れます)`
          : `ID ${result.id} をランキングに戻しました`,
      );
      await refreshAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: deleteRun,
    onSuccess: async (result) => {
      setDeleting(null);
      toast.success(`ID ${result.id} を消しました`);
      await refreshAll();
    },
  });

  const deviceOptions = [
    { value: ALL, label: 'すべて' },
    ...(devices ?? []).map((device) => ({ value: device.id, label: device.name })),
  ];
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-3">
      {/* 絞り込みは左、並べ替えは右。役目が違うので、離して置く */}
      <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
        <FilterSelect
          label="種類"
          value={test}
          options={TEST_OPTIONS}
          onChange={filtering(setTestFilter)}
        />
        <FilterSelect
          label="PC"
          value={deviceId ?? ALL}
          options={deviceOptions}
          onChange={filtering((value: string) => setDeviceId(value === ALL ? undefined : value))}
        />
        {extraFilter({ extra, setExtra: filtering(setExtra), data })}
        {/* 並べ替え、件数、更新は、スマホでも右端に横に並べる。更新が一番右 */}
        <div className="col-span-2 flex items-end justify-end gap-3 sm:ml-auto">
          {data && (
            <p className="flex h-8 items-center text-sm leading-none text-muted-foreground">
              {data.total} 件
            </p>
          )}
          <FilterSelect
            label="並べ替え"
            value={sort}
            options={sortOptions}
            onChange={filtering(setSort)}
          />
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
                {columns.map((column) => (
                  <TableHead key={column.head} className={column.numeric ? 'text-right' : ''}>
                    {column.head}
                  </TableHead>
                ))}
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
                    {columns.map((column) => (
                      <TableCell
                        key={column.head}
                        className={`${column.numeric ? 'text-right tabular-nums' : ''} ${
                          column.strong ? 'font-semibold' : ''
                        }`}
                      >
                        {column.cell(run)}
                      </TableCell>
                    ))}
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
                          title={
                            run.test ? 'ランキングに戻す' : 'テスト扱いにして、ランキングから外す'
                          }
                          onClick={() => toggleTest.mutate({ id: run.id, test: !run.test })}
                        >
                          {run.test ? <Undo2 aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                          {run.test ? '戻す' : '外す'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          aria-label="消す"
                          title="消す"
                          onClick={() => {
                            remove.reset();
                            setDeleting(run);
                          }}
                        >
                          <Trash2 aria-hidden="true" />
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
              消した記録は元に戻せません。ランキングから外すだけなら「外す」を使ってください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleting && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="tabular-nums">{deleting.id}</dd>
              <dt className="text-muted-foreground">記録した時刻</dt>
              <dd className="tabular-nums">{formatRecordedAt(deleting.createdAt)}</dd>
              <dt className="text-muted-foreground">PC</dt>
              <dd>{deleting.deviceName}</dd>
              {columns.map((column) => (
                <div key={column.head} className="contents">
                  <dt className="text-muted-foreground">{column.head}</dt>
                  <dd className={column.numeric ? 'tabular-nums' : ''}>{column.cell(deleting)}</dd>
                </div>
              ))}
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
