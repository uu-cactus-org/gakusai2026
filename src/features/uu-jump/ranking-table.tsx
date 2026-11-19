import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table';
import { formatRecordedAt } from '#/lib/format';
import { Cactakun } from './cactakun';
import { RankBadge, medalTint } from './rank-badge';
import { formatClearTime } from './runs';
import type { UuJumpRun } from './ranking';

// 見出しの行は、題字と同じ焦げ茶の地に黄色い字。TableHead が持つ字の色に勝たせるため ! を付ける
const HEAD = 'text-primary-foreground!';

/** UU-JUMP のランキングの表。速い順。マップは画面の側で選ぶので、列には出さない。狭い画面では、記録した時刻を隠す。 */
export function UuJumpRankingTable({ runs }: { runs: UuJumpRun[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-0 bg-primary hover:bg-primary">
          <TableHead className={`${HEAD} text-center`}>順位</TableHead>
          <TableHead className={`${HEAD} text-right`}>タイム</TableHead>
          <TableHead className={HEAD}>ジャンプ</TableHead>
          <TableHead className={HEAD}>PC</TableHead>
          <TableHead className={`${HEAD} hidden sm:table-cell`}>記録した時刻</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id} style={{ backgroundColor: medalTint(run.rank) }}>
            <TableCell className="text-center text-2xl">
              <RankBadge rank={run.rank} />
            </TableCell>
            <TableCell className="text-right font-digits text-2xl leading-none tabular-nums">
              {formatClearTime(run.clearSeconds)}
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-1 tabular-nums">
                <Cactakun still className="size-[2em]" />
                {run.jumpCount} 回
              </span>
            </TableCell>
            <TableCell>{run.deviceName}</TableCell>
            <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
              {formatRecordedAt(run.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
