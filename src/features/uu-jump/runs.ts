/** クリアまでの時間を「分:秒.百分の一秒」にする。例: 83.456 → "1:23.45" */
export function formatClearTime(seconds: number): string {
  const centis = Math.max(0, Math.floor(seconds * 100));
  const m = Math.floor(centis / 6000);
  const s = String(Math.floor((centis % 6000) / 100)).padStart(2, '0');
  const c = String(centis % 100).padStart(2, '0');
  return `${m}:${s}.${c}`;
}
