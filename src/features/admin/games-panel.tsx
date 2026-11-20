import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
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
import { formatBytes, formatRecordedAt } from '#/lib/format';
import {
  adminGameFileUrl,
  adminKeys,
  deleteGameFile,
  gameFilesQueryOptions,
  uploadGameFile,
} from './api';
import type { AdminGameFile } from './api';

/** ファイルを選んで送る欄。送っているあいだは、どこまで送ったかを出す。 */
function UploadForm({ existingNames }: { existingNames: string[] }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sentBytes, setSentBytes] = useState(0);

  const upload = useMutation({
    mutationFn: uploadGameFile,
    onSuccess: async (result) => {
      toast.success(`${result.name} をアップロードしました`);
      setFile(null);
      if (input.current) input.current.value = '';
      await queryClient.invalidateQueries({ queryKey: adminKeys.gameFiles });
    },
  });

  const replaces = file !== null && existingNames.includes(file.name);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!file || upload.isPending) return;
        setSentBytes(0);
        upload.mutate({ file, onProgress: setSentBytes });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={input}
          type="file"
          aria-label="アップロードするファイル"
          className="w-full sm:w-96"
          disabled={upload.isPending}
          onChange={(event) => {
            upload.reset();
            setFile(event.target.files?.[0] ?? null);
          }}
        />
        <Button type="submit" disabled={!file || upload.isPending}>
          <Upload aria-hidden="true" />
          {upload.isPending ? 'アップロード中…' : replaces ? '置き換える' : 'アップロード'}
        </Button>
      </div>
      {file && !upload.isPending && (
        <p className="text-sm text-muted-foreground">
          {formatBytes(file.size)}
          {replaces && '。同じ名前のファイルがあるので、置き換えます'}
        </p>
      )}
      {upload.isPending && file && (
        <div className="flex flex-col gap-1">
          <progress className="w-full sm:w-96" max={file.size} value={sentBytes} />
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatBytes(sentBytes)} / {formatBytes(file.size)}
            。終わるまで、このページを閉じないでください
          </p>
        </div>
      )}
      {upload.isError && (
        <p className="text-sm text-destructive">
          {upload.error.message}。もう一度「アップロード」を押すと、最初から送り直します。
        </p>
      )}
    </form>
  );
}

/** 部員に配る zip の、アップロードと削除。配る先は /games(docs/games.md)。 */
export function GamesPanel() {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<AdminGameFile | null>(null);
  const {
    data: files,
    dataUpdatedAt,
    isPending,
    error,
    isFetching,
    refetch,
  } = useQuery(gameFilesQueryOptions);

  const remove = useMutation({
    mutationFn: deleteGameFile,
    onSuccess: async (result) => {
      setDeleting(null);
      toast.success(`${result.name} を消しました`);
      await queryClient.invalidateQueries({ queryKey: adminKeys.gameFiles });
    },
  });

  if (isPending) return <p className="py-6 text-muted-foreground">読み込んでいます…</p>;
  if (!files) {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="text-destructive">{error?.message}</p>
        <Button variant="outline" onClick={() => refetch()}>
          もう一度読み込む
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        ここに置いたファイルは、
        <a href="/games" className="underline">
          /games
        </a>
        で合言葉を入れた人がダウンロードできます。
      </p>
      <UploadForm existingNames={files.map((file) => file.name)} />

      <div className="flex items-center justify-end gap-3">
        <p className="text-sm leading-none text-muted-foreground">{files.length} 件</p>
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
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {files.length === 0 ? (
        <p className="py-6 text-muted-foreground">まだファイルがありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ファイル</TableHead>
              <TableHead className="text-right">大きさ</TableHead>
              <TableHead>更新した時刻</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.name}>
                <TableCell className="font-medium break-all whitespace-normal">
                  {file.name}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatBytes(file.size)}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatRecordedAt(file.uploadedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      nativeButton={false}
                      aria-label={`${file.name} をダウンロード`}
                      title="ダウンロード"
                      render={<a href={adminGameFileUrl(file.name)} download={file.name} />}
                    >
                      <Download aria-hidden="true" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      aria-label={`${file.name} を消す`}
                      title="消す"
                      onClick={() => {
                        remove.reset();
                        setDeleting(file);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <LastUpdated updatedAt={dataUpdatedAt} />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このファイルを消しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              消したファイルは元に戻せません。差し替えるだけなら、同じ名前でアップロードし直してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleting && (
            <p className="text-sm break-all">
              {deleting.name}({formatBytes(deleting.size)})
            </p>
          )}
          {remove.error && <p className="text-sm text-destructive">{remove.error.message}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>やめる</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending || !deleting}
              onClick={() => deleting && remove.mutate(deleting.name)}
            >
              {remove.isPending ? '消しています…' : '消す'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
