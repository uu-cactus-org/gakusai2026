// 1〜3 位のメダルの色(金、銀、銅)。焦げ茶の字と縁取りを載せる
const MEDAL_COLORS = ['rgb(249 208 60)', 'rgb(205 212 220)', 'rgb(222 150 92)'];

const medalColor = (rank: number): string | undefined => MEDAL_COLORS[rank - 1];

/** 1〜3 位の行に敷く、メダルの色を薄めた地。4 位からは何も敷かない。 */
export const medalTint = (rank: number): string | undefined => {
  const color = medalColor(rank);
  return color && `color-mix(in srgb, ${color} 22%, transparent)`;
};

/**
 * 順位。1〜3 位は、メダルの色の四角に入れる。
 * 大きさは文字の大きさ(em)で決まるので、サイネージでも画面と一緒に伸び縮みする。
 */
export function RankBadge({ rank }: { rank: number }) {
  const color = medalColor(rank);
  return (
    <span
      className={`inline-flex h-[1.1em] min-w-[1.1em] items-center justify-center px-[0.15em] font-digits leading-none tabular-nums ${
        color ? 'border-[0.08em] border-foreground shadow-[0.08em_0.08em_0_var(--foreground)]' : ''
      }`}
      style={{ backgroundColor: color }}
    >
      {rank}
    </span>
  );
}
