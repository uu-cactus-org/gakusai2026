import type { CSSProperties } from 'react';
import sheet from '#/assets/uu-jump/cactakun_charge.png';

/**
 * ゲームの主人公(サボテン)。ジャンプをためる 4 コマの絵を、順に送って動かす。
 * 絵は横に 4 コマ並んだ 1 枚(1 コマ 32×32)。
 */
export function Cactakun({ size = 64 }: { size?: number }) {
  const style: CSSProperties & { '--cactakun-size': string } = {
    '--cactakun-size': `${size}px`,
    width: size,
    height: size,
    backgroundImage: `url(${sheet})`,
    backgroundSize: `${size * 4}px ${size}px`,
  };
  return (
    <span aria-hidden="true" className="cactakun pixelated inline-block shrink-0" style={style} />
  );
}
