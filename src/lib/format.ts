const scoreFormat = new Intl.NumberFormat('ja-JP');

/** スコアを 3 桁区切りにする。例: 18750 → "18,750" */
export function formatScore(score: number): string {
  return scoreFormat.format(score);
}

/** プレイ時間(秒)を「分:秒」にする。1 時間以上は「時:分:秒」。秒より下は切り捨てる。 */
export function formatPlayTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

const recordedAtFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** 記録した時刻を、見ている端末の設定によらず日本時間で出す。例: "11/21 13:12" */
export function formatRecordedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return recordedAtFormat.format(date);
}

/** 経った時間(ミリ秒)を「n秒前」「n分前」「n時間前」にする。端数は切り捨てる。 */
export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  return `${Math.floor(minutes / 60)}時間前`;
}
