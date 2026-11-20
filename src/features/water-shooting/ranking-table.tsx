import { Popover } from '@base-ui/react/popover';
import { Info } from 'lucide-react';
import { Fragment } from 'react';
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
import { playerLabel, resultLabel } from './labels';
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

/** スマホ向けの行をタップしたときに出す、行に載せなかった項目。 */
function RunDetails({ run }: { run: WaterShootingRun }) {
  const items: [label: string, value: string][] = [
    ['キャラ', playerLabel(run.player)],
    ['ステージ', stageText(run)],
    ['タイム', formatPlayTime(run.playSeconds)],
    ['PC', run.deviceName],
    ['記録した時刻', formatRecordedAt(run.createdAt)],
  ];
  return (
    <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
      {items.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right tabular-nums">{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/**
 * スマホ向け。列を並べると横にはみ出すので、行には順位・キャラの絵・スコア・難易度・結果だけを載せる。
 * 残りの項目は、行をタップ(マウスなら重ねる)と出る小窓に入れる。
 */
function NarrowList({ runs }: { runs: WaterShootingRun[] }) {
  return (
    <ol className="divide-y divide-border/50">
      {runs.map((run) => (
        // 色を枠の端まで敷くため、枠の内側の余白の分だけ左右にはみ出させて、同じだけ余白を持たせる
        <li key={run.id} className="-mx-3 sm:-mx-4" style={{ backgroundColor: rankTint(run.rank) }}>
          <Popover.Root>
            <Popover.Trigger
              openOnHover
              delay={150}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-foreground/10 sm:px-4"
            >
              <span
                className="w-7 shrink-0 text-center font-display text-2xl tabular-nums"
                style={{ color: rankColor(run.rank) }}
              >
                {run.rank}
              </span>
              <PlayerLabel value={run.player} showName={false} className="shrink-0 text-lg" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-2xl leading-tight tabular-nums">
                  {formatScore(run.score)}
                </span>
                <span className="text-xs leading-tight">
                  <DifficultyLabel value={run.difficulty} />
                </span>
              </span>
              <ResultBadge run={run} />
              <Info aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="bottom" align="end" sideOffset={4} className="z-50">
                <Popover.Popup
                  aria-label={`${run.rank} 位の記録の詳細`}
                  className="border-2 bg-popover px-3 py-2 text-popover-foreground shadow-md outline-none"
                >
                  <RunDetails run={run} />
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
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
