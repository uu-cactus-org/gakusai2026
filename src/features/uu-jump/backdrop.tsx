import school from '#/assets/uu-jump/bg_school.png';

/**
 * ゲームのタイトル画面の絵(校舎)を、画面いっぱいに敷く。題字の部分は切り落としてある。
 * 上に載せる文字と表が読めるよう、絵の縁取りと同じ焦げ茶の幕を掛ける。濃さは WaterShooting の背景と同じ。
 */
export function UuJumpBackdrop({ dim = 0.7 }: { dim?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="pixelated absolute inset-0 bg-cover bg-bottom"
        style={{ backgroundImage: `url(${school})` }}
      />
      <div className="absolute inset-0 bg-foreground" style={{ opacity: dim }} />
    </div>
  );
}
