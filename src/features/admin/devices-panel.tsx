import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { LastUpdated } from '#/components/last-updated';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table';
import { formatRecordedAt } from '#/lib/format';
import { adminKeys, devicesQueryOptions, renameDevice } from './api';
import type { AdminDevice } from './api';

const MAX_NAME_LENGTH = 32;

function DeviceRow({ device }: { device: AdminDevice }) {
  const queryClient = useQueryClient();
  // 入力中の名前。null のときは、今の表示名をそのまま出す
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? device.name;
  const trimmed = name.trim();
  const changed = trimmed !== device.name;
  const valid = trimmed.length >= 1 && trimmed.length <= MAX_NAME_LENGTH;

  const rename = useMutation({
    mutationFn: renameDevice,
    onSuccess: async () => {
      // ランキングに出る表示名も変わるので、全部取り直す
      await queryClient.invalidateQueries();
      setDraft(null);
    },
  });

  return (
    <TableRow>
      <TableCell>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (changed && valid && !rename.isPending)
              rename.mutate({ id: device.id, name: trimmed });
          }}
        >
          <Input
            aria-label={`${device.name} の表示名`}
            className="w-44"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={!changed || !valid || rename.isPending}>
            {rename.isPending ? '保存中…' : '保存'}
          </Button>
          {changed && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              戻す
            </Button>
          )}
        </form>
        {changed && !valid && (
          <p className="mt-1 text-xs text-destructive">
            1〜{MAX_NAME_LENGTH} 文字で入力してください
          </p>
        )}
        {rename.isError && <p className="mt-1 text-xs text-destructive">{rename.error.message}</p>}
      </TableCell>
      <TableCell className="text-right tabular-nums">{device.runCount}</TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {formatRecordedAt(device.createdAt)}
      </TableCell>
      <TableCell
        className="max-w-56 truncate font-mono text-xs text-muted-foreground"
        title={device.id}
      >
        {device.id}
      </TableCell>
    </TableRow>
  );
}

/** PC の一覧と、表示名の変更。 */
export function DevicesPanel() {
  const queryClient = useQueryClient();
  const {
    data: devices,
    dataUpdatedAt,
    isPending,
    error,
    isFetching,
  } = useQuery(devicesQueryOptions);

  if (isPending) return <p className="py-6 text-muted-foreground">読み込んでいます…</p>;
  if (!devices) {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="text-destructive">{error?.message}</p>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: adminKeys.devices })}
        >
          もう一度読み込む
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {devices.length} 台。表示名は、ランキングと中継の管理画面に出ます。
        </p>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="更新"
          title="更新"
          disabled={isFetching}
          onClick={() => queryClient.invalidateQueries({ queryKey: adminKeys.devices })}
        >
          <RefreshCw aria-hidden="true" className={isFetching ? 'animate-spin' : undefined} />
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {devices.length === 0 ? (
        <p className="py-6 text-muted-foreground">登録されている PC はありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>表示名</TableHead>
              <TableHead className="text-right">記録の数</TableHead>
              <TableHead>登録した時刻</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => (
              <DeviceRow key={device.id} device={device} />
            ))}
          </TableBody>
        </Table>
      )}
      <LastUpdated updatedAt={dataUpdatedAt} />
    </div>
  );
}
