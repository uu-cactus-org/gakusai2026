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

// 見出しの行は、れんがの茶色の地に、生成りの字。TableHead が持つ字の色に勝たせるため ! を付ける
const HEAD = 'text-primary-foreground!';

// 1〜3 位の行。メダルの色の地(--row-tint)を敷き、マウスを重ねたら、ほかの行と同じように少し色を変える。
// 地を style で直接塗ると、hover の色が効かなくなるので、変数で渡してクラスで塗る
const TINTED_ROW =
  'bg-(--row-tint) hover:bg-[color-mix(in_srgb,var(--row-tint),var(--foreground)_10%)]';

/** UU-JUMP のランキングの表。速い順。マップは画面の側で選ぶので、列には出さない。狭い画面では、記録した時刻を隠す。行の高さは、WaterShooting の表と同じ。 */
export function UuJumpRankingTable({ runs }: { runs: UuJumpRun[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-0 bg-primary hover:bg-primary">
          <TableHead className={`${HEAD} text-center`}>順位</TableHead>
          <TableHead className={`${HEAD} text-center`}>タイム</TableHead>
          <TableHead className={`${HEAD} text-center`}>ジャンプ</TableHead>
          <TableHead className={`${HEAD} text-center`}>PC</TableHead>
          <TableHead className={`${HEAD} hidden text-center sm:table-cell`}>記録した時刻</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => {
          const tint = medalTint(run.rank);
          return (
            <TableRow
              key={run.id}
              className={`h-11 border-border/50 ${tint ? TINTED_ROW : ''}`}
              style={tint ? ({ '--row-tint': tint } as React.CSSProperties) : undefined}
            >
              <TableCell className="text-center text-2xl leading-none">
                <RankBadge rank={run.rank} />
              </TableCell>
              <TableCell className="text-center font-digits text-2xl leading-none tabular-nums">
                {formatClearTime(run.clearSeconds)}
              </TableCell>
              <TableCell>
                {/* 絵と回数をまとめて、列の中央に寄せる */}
                <span className="flex items-center justify-center gap-1 tabular-nums">
                  <Cactakun still className="size-[2em]" />
                  {run.jumpCount} 回
                </span>
              </TableCell>
              <TableCell className="text-center">{run.deviceName}</TableCell>
              <TableCell className="hidden text-center text-muted-foreground tabular-nums sm:table-cell">
                {formatRecordedAt(run.createdAt)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
