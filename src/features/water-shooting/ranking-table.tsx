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
import { DifficultyLabel, PlayerLabel, rankColor, rankTint } from './run-labels';
import type { WaterShootingRun } from './ranking';

const WIDEST_RESULT_LABEL = resultLabel('game_over');

function ResultBadge({ run }: { run: WaterShootingRun }) {
  return (
    <Badge variant={run.result === 'cleared' ? 'default' : 'outline'}>
      {/* いちばん長い表記を、見えないまま高さ 0 で下に置いて、どの結果でもバッジの幅をそろえる */}
      <span className="flex flex-col items-center px-0.5">
        {resultLabel(run.result)}
        <span aria-hidden="true" className="invisible h-0">
          {WIDEST_RESULT_LABEL}
        </span>
      </span>
    </Badge>
  );
}

const stageText = (run: WaterShootingRun) => `${run.reachedStage} / ${run.totalStages}`;

// 表は枠の端まで広げるので、両端の列に、枠の内側の余白を持たせる
const EDGE = '[&>*:first-child]:pl-6 [&>*:last-child]:pr-6';

/** 幅のある画面向けの表。 */
function WideTable({ runs }: { runs: WaterShootingRun[] }) {
  return (
    <Table>
      <TableHeader>
        {/* 見出しの行は、背景が透けない地にして、記録の行より少し濃く見せる */}
        <TableRow className={`bg-background hover:bg-background ${EDGE}`}>
          <TableHead className="text-center">順位</TableHead>
          <TableHead className="text-right">スコア</TableHead>
          <TableHead className="text-center">難易度</TableHead>
          <TableHead className="text-center">キャラ</TableHead>
          <TableHead className="text-center">結果</TableHead>
          <TableHead className="text-center">ステージ</TableHead>
          <TableHead className="text-center">タイム</TableHead>
          <TableHead className="text-center">PC</TableHead>
          <TableHead className="text-center">記録した時刻</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow
            key={run.id}
            className={`border-border/50 ${EDGE}`}
            style={{ backgroundColor: rankTint(run.rank) }}
          >
            <TableCell
              className="text-center font-display text-xl tabular-nums"
              style={{ color: rankColor(run.rank) }}
            >
              {run.rank}
            </TableCell>
            <TableCell className="text-right font-display text-xl tabular-nums">
              {formatScore(run.score)}
            </TableCell>
            <TableCell className="text-center">
              <DifficultyLabel value={run.difficulty} />
            </TableCell>
            <TableCell>
              <PlayerLabel value={run.player} className="justify-center" />
            </TableCell>
            <TableCell className="text-center">
              <ResultBadge run={run} />
            </TableCell>
            <TableCell className="tabular-nums text-center">{stageText(run)}</TableCell>
            <TableCell className="text-center tabular-nums">
              {formatPlayTime(run.playSeconds)}
            </TableCell>
            <TableCell className="text-center">{run.deviceName}</TableCell>
            <TableCell className="text-center text-muted-foreground tabular-nums">
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
    <ol className="divide-y divide-border/50">
      {runs.map((run) => (
        // 色を枠の端まで敷くため、枠の内側の余白の分だけ左右にはみ出させて、同じだけ余白を持たせる
        <li
          key={run.id}
          className="-mx-3 flex items-center gap-3 px-3 py-3 sm:-mx-4 sm:px-4"
          style={{ backgroundColor: rankTint(run.rank) }}
        >
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
