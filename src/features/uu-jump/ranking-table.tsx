import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table';
import { formatRecordedAt } from '#/lib/format';
import { formatClearTime } from './runs';
import type { UuJumpRun } from './runs';

// 1〜3 位の色(金、銀、銅)。白い地の上で読める濃さにしている
const RANK_COLORS = ['rgb(176 128 0)', 'rgb(104 112 124)', 'rgb(160 90 40)'];

/** UU-JUMP のランキングの表。速い順。狭い画面では、マップと記録した時刻を隠す。 */
export function UuJumpRankingTable({ runs }: { runs: UuJumpRun[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">順位</TableHead>
          <TableHead className="text-right">タイム</TableHead>
          <TableHead className="text-right">ジャンプ</TableHead>
          <TableHead className="hidden sm:table-cell">マップ</TableHead>
          <TableHead>PC</TableHead>
          <TableHead className="hidden sm:table-cell">記録した時刻</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell
              className="text-right text-xl font-bold tabular-nums"
              style={{ color: RANK_COLORS[run.rank - 1] }}
            >
              {run.rank}
            </TableCell>
            <TableCell className="text-right text-xl tabular-nums">
              {formatClearTime(run.clearSeconds)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{run.jumpCount} 回</TableCell>
            <TableCell className="hidden sm:table-cell">{run.mapName}</TableCell>
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
