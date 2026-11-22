import type { CSSProperties, ReactNode } from 'react';

// 1 ページに持たせる件数は、画面に並ぶ件数の何倍か。前半を映してから、後半まで下へ送る
export const SIGNAGE_SCREENS_PER_PAGE = 2;

/**
 * サイネージの表の行を並べる枠。画面に rows 件ずつ並べ、それより多いときは、ページの途中で下へ送る。
 * 1 ページを映す時間のうち、最初の 6 割は一番上で止め、次の 2 割で一番下まで送り、残りの 2 割は一番下で止める
 * (5 秒なら、0〜3 秒は上、3〜4 秒で送り、4〜5 秒は下)。動きは styles.css の signage-scroll。
 */
export function SignageScrollRows({
  rows,
  count,
  interval,
  paused,
  children,
}: {
  /** 画面に並べる件数 */
  rows: number;
  /** 今ある行の数 */
  count: number;
  /** 1 ページを映す秒数 */
  interval: number;
  paused: boolean;
  /** 行(li)。多くても rows の SIGNAGE_SCREENS_PER_PAGE 倍まで */
  children: ReactNode;
}) {
  const slots = rows * SIGNAGE_SCREENS_PER_PAGE;
  // 画面からはみ出す行の数。最後の行が画面の下端に来るところまで送る
  const overflow = Math.max(0, Math.min(count, slots) - rows);

  return (
    // ページを送るときに横へ滑らせる枠(signage-rows)。左右の余白まで広げて、画面の端から出入りさせる
    <div className="-mx-[1.5em] min-h-0 flex-1 overflow-hidden px-[1.5em] [view-transition-name:signage-rows]">
      <ol
        // 下の余白を行のすき間と同じにして、画面 1 枚ぶんが、ちょうど rows 行とすき間になるようにする
        className="grid gap-y-[0.18em] pb-[0.18em]"
        style={
          {
            height: `${SIGNAGE_SCREENS_PER_PAGE * 100}%`,
            gridTemplateRows: `repeat(${slots}, minmax(0, 1fr))`,
            '--signage-scroll-to': `${(-overflow / slots) * 100}%`,
            animation:
              overflow > 0 ? `signage-scroll ${interval}s ease-in-out forwards` : undefined,
            animationPlayState: paused ? 'paused' : 'running',
          } as CSSProperties
        }
      >
        {children}
      </ol>
    </div>
  );
}
