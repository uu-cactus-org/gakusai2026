import { queryOptions } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api } from '#/lib/api';

const admin = api.admin;
const waterShootingRunsApi = admin['water-shooting'].runs;

export type AdminWaterShootingRuns = InferResponseType<typeof waterShootingRunsApi.$get, 200>;
export type AdminWaterShootingRun = AdminWaterShootingRuns['runs'][number];
export type AdminDevice = InferResponseType<typeof admin.devices.$get, 200>['devices'][number];

const uuJumpRunsApi = admin['uu-jump'].runs;

export type AdminUuJumpRuns = InferResponseType<typeof uuJumpRunsApi.$get, 200>;
export type AdminUuJumpRun = AdminUuJumpRuns['runs'][number];

/** テスト扱いの記録を、出すか、それだけにするか、除くか。 */
export type TestFilter = 'all' | 'only' | 'exclude';

/** どのゲームの記録の一覧にも共通の引数。並べ替えの種類だけ、ゲームごとに違う。 */
export type AdminRunsBaseParams<Sort extends string> = {
  limit: number;
  offset: number;
  sort: Sort;
  test: TestFilter;
  deviceId?: string;
};

export type AdminWaterShootingRunsParams = AdminRunsBaseParams<'createdAt' | 'score'> & {
  result?: 'cleared' | 'game_over';
};

export type AdminUuJumpRunsParams = AdminRunsBaseParams<'createdAt' | 'clearSeconds'> & {
  map?: string;
};

/** 失敗した応答を、画面に出せる文にする。 */
async function failure(
  res: { status: number; json: () => Promise<unknown> },
  what: string,
): Promise<Error> {
  if (res.status === 403) {
    return new Error(
      `${what}: ログインが切れているか、権限がありません。ページを読み込み直してください。`,
    );
  }
  let detail = '';
  try {
    const body: unknown = await res.json();
    if (typeof body === 'object' && body !== null && 'error' in body) {
      detail = typeof body.error === 'string' ? body.error : '';
    }
  } catch {
    // 本文が JSON でないときは、状態コードだけ出す
  }
  return new Error(`${what} (${res.status})${detail ? `: ${detail}` : ''}`);
}

export const adminKeys = {
  all: ['admin'] as const,
  me: ['admin', 'me'] as const,
  devices: ['admin', 'devices'] as const,
  gameFiles: ['admin', 'games'] as const,
  waterShootingRuns: (params: AdminWaterShootingRunsParams) =>
    ['admin', 'water-shooting', 'runs', params] as const,
  uuJumpRuns: (params: AdminUuJumpRunsParams) => ['admin', 'uu-jump', 'runs', params] as const,
};

export const meQueryOptions = queryOptions({
  queryKey: adminKeys.me,
  queryFn: async () => {
    const res = await admin.me.$get();
    if (!res.ok) throw await failure(res, 'ログインを確認できませんでした');
    return res.json();
  },
  retry: false,
});

export const devicesQueryOptions = queryOptions({
  queryKey: adminKeys.devices,
  queryFn: async () => {
    const res = await admin.devices.$get();
    if (!res.ok) throw await failure(res, 'PC の一覧を取得できませんでした');
    return (await res.json()).devices;
  },
});

export async function fetchWaterShootingRuns(params: AdminWaterShootingRunsParams) {
  const res = await waterShootingRunsApi.$get({
    query: {
      limit: String(params.limit),
      offset: String(params.offset),
      sort: params.sort,
      test: params.test,
      deviceId: params.deviceId,
      result: params.result,
    },
  });
  if (!res.ok) throw await failure(res, '記録の一覧を取得できませんでした');
  return res.json();
}

export async function renameDevice({ id, name }: { id: string; name: string }) {
  const res = await admin.devices[':id'].$patch({ param: { id }, json: { name } });
  if (!res.ok) throw await failure(res, '表示名を変えられませんでした');
  return res.json();
}

export async function setWaterShootingRunTest({ id, test }: { id: number; test: boolean }) {
  const res = await waterShootingRunsApi[':id'].$patch({
    param: { id: String(id) },
    json: { test },
  });
  if (!res.ok) throw await failure(res, '記録を更新できませんでした');
  return res.json();
}

export async function deleteWaterShootingRun(id: number) {
  const res = await waterShootingRunsApi[':id'].$delete({ param: { id: String(id) } });
  if (!res.ok) throw await failure(res, '記録を消せませんでした');
  return res.json();
}

export async function fetchUuJumpRuns(params: AdminUuJumpRunsParams) {
  const res = await uuJumpRunsApi.$get({
    query: {
      limit: String(params.limit),
      offset: String(params.offset),
      sort: params.sort,
      test: params.test,
      deviceId: params.deviceId,
      map: params.map,
    },
  });
  if (!res.ok) throw await failure(res, '記録の一覧を取得できませんでした');
  return res.json();
}

export async function setUuJumpRunTest({ id, test }: { id: number; test: boolean }) {
  const res = await uuJumpRunsApi[':id'].$patch({ param: { id: String(id) }, json: { test } });
  if (!res.ok) throw await failure(res, '記録を更新できませんでした');
  return res.json();
}

export async function deleteUuJumpRun(id: number) {
  const res = await uuJumpRunsApi[':id'].$delete({ param: { id: String(id) } });
  if (!res.ok) throw await failure(res, '記録を消せませんでした');
  return res.json();
}

const gameFilesApi = admin.games;

export type AdminGameFile = InferResponseType<typeof gameFilesApi.$get, 200>['files'][number];

export const gameFilesQueryOptions = queryOptions({
  queryKey: adminKeys.gameFiles,
  queryFn: async () => {
    const res = await gameFilesApi.$get();
    if (!res.ok) throw await failure(res, 'ファイルの一覧を取得できませんでした');
    return (await res.json()).files;
  },
});

/** 管理画面からのダウンロードの URL。Access の内側なので、合言葉は要らない。 */
export function adminGameFileUrl(name: string): string {
  return `/api/admin/games/dl/${encodeURIComponent(name)}`;
}

export async function deleteGameFile(name: string) {
  const res = await gameFilesApi[':name'].$delete({ param: { name } });
  if (!res.ok) throw await failure(res, 'ファイルを消せませんでした');
  return res.json();
}

// Worker が 1 回で受け取れる大きさ(100MB)に収まるよう、この大きさに切って送る。
// R2 の決まりで、最後のパートを除いて、どのパートも同じ大きさにする
const UPLOAD_PART_BYTES = 50 * 1024 * 1024;

/**
 * ファイルを切って順に送り、最後に 1 つにまとめる。同じ名前のファイルは置き換わる。
 * 途中で失敗したら、最初からやり直す。onProgress には、送り終えたバイト数を渡す。
 */
export async function uploadGameFile({
  file,
  onProgress,
}: {
  file: File;
  onProgress: (sentBytes: number) => void;
}) {
  const what = `${file.name} をアップロードできませんでした`;
  if (file.size === 0) throw new Error(`${what}: 空のファイルです`);

  const started = await gameFilesApi.uploads.$post({ json: { name: file.name } });
  if (!started.ok) throw await failure(started, what);
  const { uploadId } = await started.json();

  const parts: { partNumber: number; etag: string }[] = [];
  const partCount = Math.ceil(file.size / UPLOAD_PART_BYTES);
  for (let index = 0; index < partCount; index++) {
    const start = index * UPLOAD_PART_BYTES;
    const end = Math.min(file.size, start + UPLOAD_PART_BYTES);
    // 本文をそのまま送るので、型つきのクライアントは使わない
    const res = await fetch(
      `/api/admin/games/uploads/${encodeURIComponent(uploadId)}/parts/${index + 1}?name=${encodeURIComponent(file.name)}`,
      { method: 'PUT', body: file.slice(start, end) },
    );
    if (!res.ok) throw await failure(res, what);
    parts.push((await res.json()) as { partNumber: number; etag: string });
    onProgress(end);
  }

  const completed = await gameFilesApi.uploads[':uploadId'].complete.$post({
    param: { uploadId },
    json: { name: file.name, parts },
  });
  if (!completed.ok) throw await failure(completed, what);
  return completed.json();
}
