/**
 * UU-JUMP の記録 1 件。
 *
 * データの持ち方はまだ決めていない。ゲームが送ろうとしている値(マップ名、クリアまでの秒数、
 * ジャンプの回数)から、画面に要りそうな形を仮に置いている。API を決めたら、ここを合わせる。
 */
export type UuJumpRun = {
  id: number;
  rank: number;
  mapName: string;
  clearSeconds: number;
  jumpCount: number;
  deviceName: string;
  createdAt: string;
};

/** クリアまでの時間を「分:秒.百分の一秒」にする。例: 83.456 → "1:23.45" */
export function formatClearTime(seconds: number): string {
  const centis = Math.max(0, Math.floor(seconds * 100));
  const m = Math.floor(centis / 6000);
  const s = String(Math.floor((centis % 6000) / 100)).padStart(2, '0');
  const c = String(centis % 100).padStart(2, '0');
  return `${m}:${s}.${c}`;
}

const SAMPLE_VALUES: [clearSeconds: number, jumpCount: number, deviceName: string][] = [
  [48.21, 61, 'PC1'],
  [52.87, 58, 'PC3'],
  [55.02, 73, 'PC2'],
  [61.4, 66, 'PC1'],
  [67.93, 80, 'PC4'],
  [74.15, 92, 'PC2'],
  [83.45, 101, 'PC3'],
  [95.6, 118, 'PC4'],
];

// 見た目を確かめるための仮の記録。ローカル開発(vp dev)でだけ出す。本番には出さない。
export const SAMPLE_RUNS: UuJumpRun[] = SAMPLE_VALUES.map(
  ([clearSeconds, jumpCount, deviceName], i) => ({
    id: i + 1,
    rank: i + 1,
    mapName: 'マップ0',
    clearSeconds,
    jumpCount,
    deviceName,
    createdAt: new Date(Date.UTC(2026, 10, 21, 3, 10 + i * 7)).toISOString(),
  }),
);
