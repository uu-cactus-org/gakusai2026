import { FilterSelect } from '#/components/filter-select';
import { difficultyLabel, playerLabel, resultLabel } from '#/features/water-shooting/labels';
import { formatPlayTime, formatScore } from '#/lib/format';
import { adminKeys, deleteRun, fetchRuns, setRunTest } from './api';
import type { AdminRun, AdminRunsParams } from './api';
import { ALL, RunsBoard } from './runs-board';
import type { RunColumn } from './runs-board';

type Result = NonNullable<AdminRunsParams['result']>;

const SORT_OPTIONS = [
  { value: 'createdAt', label: '新しい順' },
  { value: 'score', label: 'スコアが高い順' },
] as const;

const RESULT_OPTIONS: { value: Result | typeof ALL; label: string }[] = [
  { value: ALL, label: 'すべて' },
  { value: 'cleared', label: resultLabel('cleared') },
  { value: 'game_over', label: resultLabel('game_over') },
];

const COLUMNS: RunColumn<AdminRun>[] = [
  { head: 'スコア', numeric: true, strong: true, cell: (run) => formatScore(run.score) },
  { head: '難易度', cell: (run) => difficultyLabel(run.difficulty) },
  { head: 'キャラ', cell: (run) => playerLabel(run.player) },
  { head: '結果', cell: (run) => resultLabel(run.result) },
  {
    head: 'ステージ',
    cell: (run) => (
      <span className="tabular-nums">
        {run.reachedStage} / {run.totalStages}
      </span>
    ),
  },
  { head: 'プレイ時間', numeric: true, cell: (run) => formatPlayTime(run.playSeconds) },
];

/** WaterShooting の記録の一覧と、ランキングから外す・戻す・消す。 */
export function RunsPanel() {
  return (
    <RunsBoard
      queryKey={adminKeys.runs}
      fetchRuns={fetchRuns}
      setTest={setRunTest}
      deleteRun={deleteRun}
      sortOptions={SORT_OPTIONS}
      initialExtra={{} as { result?: Result }}
      extraFilter={({ extra, setExtra }) => (
        <FilterSelect
          label="結果"
          value={extra.result ?? ALL}
          options={RESULT_OPTIONS}
          onChange={(value) => setExtra({ result: value === ALL ? undefined : value })}
        />
      )}
      columns={COLUMNS}
    />
  );
}
