import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, Download } from 'lucide-react';
import { useState } from 'react';
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
import { downloadUrl, gamesQueryOptions, login } from '#/features/games/api';
import type { GameFile } from '#/features/games/api';
import { formatBytes, formatRecordedAt } from '#/lib/format';

// 部員向けの、ゲームの zip の配布(docs/games.md)。トップの端に、小さいリンクがある。
export const Route = createFileRoute('/games')({ component: Games });

function PassphraseForm() {
  const queryClient = useQueryClient();
  const [passphrase, setPassphrase] = useState('');
  const submit = useMutation({
    mutationFn: login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gamesQueryOptions.queryKey }),
  });

  return (
    <form
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (passphrase && !submit.isPending) submit.mutate(passphrase);
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        合言葉
        <Input
          type="password"
          autoComplete="off"
          autoFocus
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
        />
      </label>
      {submit.isError && <p className="text-sm text-destructive">{submit.error.message}</p>}
      <Button type="submit" className="self-start" disabled={!passphrase || submit.isPending}>
        {submit.isPending ? '確認しています…' : '開く'}
      </Button>
    </form>
  );
}

function FileList({ files }: { files: GameFile[] }) {
  if (files.length === 0) {
    return <p className="py-6 text-muted-foreground">まだファイルがありません。</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ファイル</TableHead>
          <TableHead className="text-right">大きさ</TableHead>
          <TableHead>更新した時刻</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.name}>
            <TableCell className="font-medium break-all whitespace-normal">{file.name}</TableCell>
            <TableCell className="text-right tabular-nums">{formatBytes(file.size)}</TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {formatRecordedAt(file.uploadedAt)}
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                nativeButton={false}
                render={<a href={downloadUrl(file.name)} download={file.name} />}
              >
                <Download aria-hidden="true" />
                ダウンロード
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Games() {
  const { data, isPending, error, refetch } = useQuery(gamesQueryOptions);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        render={<Link to="/" />}
        nativeButton={false}
      >
        <ArrowLeft aria-hidden="true" />
        トップに戻る
      </Button>
      <h1 className="text-xl font-semibold">ゲームのダウンロード</h1>
      {isPending ? (
        <p className="text-muted-foreground">読み込んでいます…</p>
      ) : !data ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-destructive">{error?.message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            もう一度読み込む
          </Button>
        </div>
      ) : data.status === 'stopped' ? (
        <p className="text-muted-foreground">配布は止まっています。</p>
      ) : data.status === 'locked' ? (
        <PassphraseForm />
      ) : (
        <FileList files={data.files} />
      )}
    </main>
  );
}
