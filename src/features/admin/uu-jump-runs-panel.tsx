import { FilterSelect } from '#/components/filter-select';
import { formatClearTime } from '#/features/uu-jump/runs';
import { adminKeys, deleteUuJumpRun, fetchUuJumpRuns, setUuJumpRunTest } from './api';
import type { AdminUuJumpRun } from './api';
import { ALL, RunsBoard } from './runs-board';
import type { RunColumn } from './runs-board';

const SORT_OPTIONS = [
  { value: 'createdAt', label: '新しい順' },
  { value: 'clearSeconds', label: 'タイムが短い順' },
] as const;

const COLUMNS: RunColumn<AdminUuJumpRun>[] = [
  { head: 'マップ', cell: (run) => run.mapName },
  { head: 'タイム', numeric: true, strong: true, cell: (run) => formatClearTime(run.clearSeconds) },
  { head: 'ジャンプ', numeric: true, cell: (run) => `${run.jumpCount} 回` },
];

/** UU-JUMP の記録の一覧と、ランキングから外す・戻す・消す。 */
export function UuJumpRunsPanel() {
  return (
    <RunsBoard
      queryKey={adminKeys.uuJumpRuns}
      fetchRuns={fetchUuJumpRuns}
      setTest={setUuJumpRunTest}
      deleteRun={deleteUuJumpRun}
      sortOptions={SORT_OPTIONS}
      initialExtra={{} as { map?: string }}
      extraFilter={({ extra, setExtra, data }) => (
        <FilterSelect
          label="マップ"
          value={extra.map ?? ALL}
          // 選択肢は、一覧の応答に入っているマップの名前
          options={[
            { value: ALL, label: 'すべて' },
            ...(data?.maps ?? []).map((name) => ({ value: name, label: name })),
          ]}
          onChange={(value) => setExtra({ map: value === ALL ? undefined : value })}
        />
      )}
      columns={COLUMNS}
    />
  );
}
