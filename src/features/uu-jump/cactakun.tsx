import sheet from '#/assets/uu-jump/cactakun_charge.png';

/**
 * ゲームの主人公(サボテン)。ジャンプをためる 4 コマの絵を、順に送って動かす。
 * 絵は横に 4 コマ並んだ 1 枚(1 コマ 32×32)。
 * 大きさは className で決める(size-16、size-[2em] など)。still を付けると、最初の 1 コマで止める。
 */
export function Cactakun({
  className = 'size-16',
  still = false,
}: {
  className?: string;
  still?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pixelated inline-block shrink-0 bg-size-[400%_100%] ${still ? '' : 'cactakun'} ${className}`}
      style={{ backgroundImage: `url(${sheet})` }}
    />
  );
}
