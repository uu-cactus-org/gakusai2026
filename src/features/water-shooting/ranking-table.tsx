import { Badge } from '#/components/ui/badge';
import { Skeleton } from '#/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table';
import { formatPlayTime, formatRecordedAt, formatScore } from '#/lib/format';
import { resultLabel } from './labels';
import { DifficultyLabel, PlayerLabel, rankColor } from './run-labels';
import type { WaterShootingRun } from './ranking';

function ResultBadge({ run }: { run: WaterShootingRun }) {
  return (
    <Badge variant={run.result === 'cleared' ? 'default' : 'outline'}>
      {resultLabel(run.result)}
    </Badge>
  );
}

const stageText = (run: WaterShootingRun) => `${run.reachedStage} / ${run.totalStages}`;

/** 幅のある画面向けの表。 */
function WideTable({ runs }: { runs: WaterShootingRun[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">順位</TableHead>
          <TableHead className="text-right">スコア</TableHead>
          <TableHead>難易度</TableHead>
          <TableHead>キャラ</TableHead>
          <TableHead>結果</TableHead>
          <TableHead>ステージ</TableHead>
          <TableHead className="text-right">プレイ時間</TableHead>
          <TableHead>PC</TableHead>
          <TableHead>記録した時刻</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell
              className="text-right font-display text-xl tabular-nums"
              style={{ color: rankColor(run.rank) }}
            >
              {run.rank}
            </TableCell>
            <TableCell className="text-right font-display text-xl tabular-nums">
              {formatScore(run.score)}
            </TableCell>
            <TableCell>
              <DifficultyLabel value={run.difficulty} />
            </TableCell>
            <TableCell>
              <PlayerLabel value={run.player} />
            </TableCell>
            <TableCell>
              <ResultBadge run={run} />
            </TableCell>
            <TableCell className="tabular-nums">{stageText(run)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPlayTime(run.playSeconds)}
            </TableCell>
            <TableCell>{run.deviceName}</TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {formatRecordedAt(run.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** スマホ向け。列を並べると横にはみ出すので、1 件を 2 行にまとめる。 */
function NarrowList({ runs }: { runs: WaterShootingRun[] }) {
  return (
    <ol className="divide-y">
      {runs.map((run) => (
        <li key={run.id} className="flex items-center gap-3 py-3">
          <span
            className="w-9 shrink-0 text-right font-display text-2xl tabular-nums"
            style={{ color: rankColor(run.rank) }}
          >
            {run.rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-2xl tabular-nums">{formatScore(run.score)}</span>
              <ResultBadge run={run} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              <DifficultyLabel value={run.difficulty} />
              <PlayerLabel value={run.player} />
              <span className="tabular-nums">ステージ {stageText(run)}</span>
              <span className="tabular-nums">{formatPlayTime(run.playSeconds)}</span>
              <span>{run.deviceName}</span>
              <span className="tabular-nums">{formatRecordedAt(run.createdAt)}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WaterShootingRankingTable({ runs }: { runs: WaterShootingRun[] }) {
  return (
    <>
      <div className="hidden md:block">
        <WideTable runs={runs} />
      </div>
      <div className="md:hidden">
        <NarrowList runs={runs} />
      </div>
    </>
  );
}

export function WaterShootingRankingTableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="読み込み中">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
