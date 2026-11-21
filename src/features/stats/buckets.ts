// プレイ数のグラフに出す区切りを組み立てる。時刻はどれも UNIX 時刻の秒で、日付の境目は日本時間で決める。

/** グラフに出す期間。直近 3 時間、学祭の 1 日、全期間。 */
export const RANGES = ['3h', 'day', 'all'] as const;
export type Range = (typeof RANGES)[number];

/** 学祭の日(日本時間)。「1 日」の表示は、この日の 0 時から 24 時に合わせる。 */
export const FESTIVAL_DAYS = ['2026-11-21', '2026-11-22'] as const;
export type FestivalDay = (typeof FESTIVAL_DAYS)[number];

export type PlayBucket = { t: number; count: number };

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;
const JST_OFFSET = 9 * HOUR;

/** その日の日本時間 0 時。 */
export function dayStart(day: FestivalDay): number {
  return Date.parse(`${day}T00:00:00+09:00`) / 1000;
}

/** 今日が学祭の日ならその日。前なら初日、後なら最終日。 */
export function defaultDay(nowSec: number): FestivalDay {
  const today = FESTIVAL_DAYS.find((day) => {
    const start = dayStart(day);
    return nowSec >= start && nowSec < start + DAY;
  });
  if (today) return today;
  return nowSec < dayStart(FESTIVAL_DAYS[0]) ? FESTIVAL_DAYS[0] : FESTIVAL_DAYS.at(-1)!;
}

// 日本時間で、step 秒ごとの境目に切り下げる・切り上げる
const floorTo = (t: number, step: number) =>
  Math.floor((t + JST_OFFSET) / step) * step - JST_OFFSET;
const ceilTo = (t: number, step: number) => Math.ceil((t + JST_OFFSET) / step) * step - JST_OFFSET;

export type PlaySeries = {
  /** 棒 1 本の幅(秒) */
  stepSeconds: number;
  /** 棒。記録が無い区切りも 0 で埋めてある。出すものが無ければ空 */
  points: PlayBucket[];
  total: number;
};

/**
 * サーバーの 10 分ごとのプレイ数を、期間に合わせた幅の棒にまとめ直す。
 *
 * `trim` を付けると、最初と最後の、記録が無い区切りを落とす。
 */
export function buildPlaySeries({
  buckets,
  sourceSeconds,
  range,
  day,
  trim,
  nowSec,
}: {
  buckets: readonly PlayBucket[];
  /** buckets の 1 区切りの秒数 */
  sourceSeconds: number;
  range: Range;
  day: FestivalDay;
  trim: boolean;
  nowSec: number;
}): PlaySeries {
  let from: number;
  let to: number;
  let stepSeconds: number;

  if (range === '3h') {
    stepSeconds = 10 * MINUTE;
    // いまを含む区切りまでの 3 時間
    to = floorTo(nowSec, stepSeconds) + stepSeconds;
    from = to - 3 * HOUR;
  } else if (range === 'day') {
    stepSeconds = 30 * MINUTE;
    from = dayStart(day);
    to = from + DAY;
  } else {
    // 学祭の 2 日間。その外にも記録があれば、そこまで広げる
    from = dayStart(FESTIVAL_DAYS[0]);
    to = dayStart(FESTIVAL_DAYS.at(-1)!) + DAY;
    const first = buckets[0];
    const last = buckets.at(-1);
    if (first && last) {
      const dataFrom = first.t;
      const dataTo = last.t + sourceSeconds;
      // 幅は、実際に出す長さで決める。切り詰めるなら、記録がある範囲の長さ
      from = trim ? dataFrom : Math.min(from, dataFrom);
      to = trim ? dataTo : Math.max(to, dataTo);
    }
    stepSeconds = to - from <= 4 * DAY ? HOUR : DAY;
    from = floorTo(from, stepSeconds);
    to = ceilTo(to, stepSeconds);
  }

  const counts = Array.from({ length: Math.round((to - from) / stepSeconds) }, () => 0);
  for (const bucket of buckets) {
    if (bucket.t < from || bucket.t >= to) continue;
    counts[Math.floor((bucket.t - from) / stepSeconds)]! += bucket.count;
  }

  let start = 0;
  let end = counts.length;
  if (trim) {
    while (start < end && counts[start] === 0) start++;
    while (end > start && counts[end - 1] === 0) end--;
  }

  const points: PlayBucket[] = [];
  let total = 0;
  for (let i = start; i < end; i++) {
    points.push({ t: from + i * stepSeconds, count: counts[i]! });
    total += counts[i]!;
  }
  return { stepSeconds, points, total };
}

// 横軸のラベルを置く間隔の候補(秒)
const LABEL_STEPS = [
  10 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
  7 * DAY,
  14 * DAY,
  28 * DAY,
];

/** 横軸のラベルを置く間隔。ラベルが maxLabels 個に収まる、いちばん細かい間隔を選ぶ。 */
export function labelStep(series: PlaySeries, maxLabels: number): number {
  const span = series.points.length * series.stepSeconds;
  const candidates = LABEL_STEPS.filter((step) => step >= series.stepSeconds);
  return (
    candidates.find((step) => span / step <= maxLabels) ?? candidates.at(-1) ?? series.stepSeconds
  );
}

function jstParts(t: number) {
  const date = new Date((t + JST_OFFSET) * 1000);
  return {
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

const clock = (hour: number, minute: number) => `${hour}:${String(minute).padStart(2, '0')}`;

/**
 * 横軸のラベル。間隔に乗らない区切りは空。0 時は日付、ほかは時刻。例: "11/22"、"13:00"
 * `withDate` を付けると、時刻の前に日付も出す。例: "11/21 13:00"
 */
export function tickLabel(t: number, step: number, withDate = false): string {
  // 日をまたぐ間隔は、日本時間の 0 時を基準に数える
  if ((t + JST_OFFSET) % step !== 0) return '';
  const { month, day, hour, minute } = jstParts(t);
  const date = `${month}/${day}`;
  if (hour === 0 && minute === 0) return date;
  return withDate ? `${date} ${clock(hour, minute)}` : clock(hour, minute);
}

/** 棒 1 本が表す期間。例: "11/21 13:00〜13:30"、1 日ごとなら "11/21" */
export function bucketLabel(t: number, stepSeconds: number): string {
  const from = jstParts(t);
  const date = `${from.month}/${from.day}`;
  if (stepSeconds >= DAY) return date;
  const to = jstParts(t + stepSeconds);
  // 24 時ちょうどで終わる区切りは、翌日の 0:00 ではなく 24:00 と書く
  const toHour = to.hour === 0 && to.minute === 0 ? 24 : to.hour;
  return `${date} ${clock(from.hour, from.minute)}〜${clock(toHour, to.minute)}`;
}

/** 学祭の日を、選択肢に出す形にする。例: "11/21" */
export function dayLabel(day: FestivalDay): string {
  const { month, day: date } = jstParts(dayStart(day));
  return `${month}/${date}`;
}
