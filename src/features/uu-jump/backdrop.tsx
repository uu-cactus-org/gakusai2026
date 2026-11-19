import type { ReactNode } from 'react';
import { JumpingCactakuns } from './jumping-cactakuns';
import school from '#/assets/uu-jump/bg_school.png';

/**
 * ゲームのタイトル画面の絵(校舎)を、画面いっぱいに敷く。題字は補完して消してある。
 * 上に載せる文字と表が読めるよう、絵の縁取りと同じ焦げ茶の幕を掛ける。濃さは WaterShooting の背景と同じ。
 */
export function UuJumpBackdrop({
  dim = 0.7,
  light = false,
  children,
}: {
  /** 幕の濃さ(0〜1) */
  dim?: number;
  /** 幕を明るい色にする。絵の上に、焦げ茶の文字をじかに載せるとき */
  light?: boolean;
  /** 背景の絵と幕のあいだに置くもの。幕の下なので、背景と同じ暗さになる */
  children?: ReactNode;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="pixelated absolute inset-0 bg-cover bg-bottom"
        style={{ backgroundImage: `url(${school})` }}
      />
      {children}
      <div
        className={`absolute inset-0 ${light ? 'bg-background' : 'bg-foreground'}`}
        style={{ opacity: dim }}
      />
    </div>
  );
}

/** サイネージ用の背景。題字やページの点を絵の上にじかに載せるので、明るい幕を掛ける。ランキングの画面と同じく、サボテンを跳ねさせる。 */
export function UuJumpSignageBackdrop() {
  return (
    <UuJumpBackdrop light dim={0.6}>
      <JumpingCactakuns />
    </UuJumpBackdrop>
  );
}
