import { describe, expect, test } from 'vite-plus/test';
import {
  bucketLabel,
  buildPlaySeries,
  dayStart,
  defaultDay,
  labelStep,
  tickLabel,
} from './buckets';
import type { PlayBucket } from './buckets';

// 日本時間の時刻を、UNIX 時刻の秒にする
const jst = (text: string) => Date.parse(`${text}:00+09:00`) / 1000;

const base = { sourceSeconds: 600, day: '2026-11-21', nowSec: jst('2026-11-21T14:05') } as const;

const buckets: PlayBucket[] = [
  { t: jst('2026-11-21T10:10'), count: 2 },
  { t: jst('2026-11-21T10:20'), count: 1 },
  { t: jst('2026-11-21T13:50'), count: 4 },
  { t: jst('2026-11-22T11:00'), count: 3 },
];

describe('buildPlaySeries', () => {
  test('1 日は、日本時間の 0 時から 24 時を 30 分ごとに分ける', () => {
    const series = buildPlaySeries({ ...base, buckets, range: 'day', trim: false });
    expect(series.stepSeconds).toBe(1800);
    expect(series.points).toHaveLength(48);
    expect(series.points[0]!.t).toBe(jst('2026-11-21T00:00'));
    expect(series.points.at(-1)!.t).toBe(jst('2026-11-21T23:30'));
    // 10:10 と 10:20 は同じ 30 分に入る。翌日の記録は数えない
    expect(series.points.find((p) => p.t === jst('2026-11-21T10:00'))!.count).toBe(3);
    expect(series.total).toBe(7);
  });

  test('切り詰めると、最初と最後の記録が無い区切りを落とす(間の 0 は残す)', () => {
    const series = buildPlaySeries({ ...base, buckets, range: 'day', trim: true });
    expect(series.points[0]).toEqual({ t: jst('2026-11-21T10:00'), count: 3 });
    expect(series.points.at(-1)).toEqual({ t: jst('2026-11-21T13:30'), count: 4 });
    expect(series.points).toHaveLength(8);
  });

  test('3 時間は、いまを含む 10 分までの 18 本', () => {
    const series = buildPlaySeries({ ...base, buckets, range: '3h', trim: false });
    expect(series.points).toHaveLength(18);
    expect(series.points[0]!.t).toBe(jst('2026-11-21T11:10'));
    expect(series.points.at(-1)!.t).toBe(jst('2026-11-21T14:00'));
    expect(series.total).toBe(4);
  });

  test('全期間は、切り詰めなければ学祭の 2 日間を 1 時間ごとに出す', () => {
    const series = buildPlaySeries({ ...base, buckets, range: 'all', trim: false });
    expect(series.stepSeconds).toBe(3600);
    expect(series.points).toHaveLength(48);
    expect(series.total).toBe(10);

    const trimmed = buildPlaySeries({ ...base, buckets, range: 'all', trim: true });
    expect(trimmed.points[0]!.t).toBe(jst('2026-11-21T10:00'));
    expect(trimmed.points.at(-1)!.t).toBe(jst('2026-11-22T11:00'));
  });

  test('全期間が 4 日を超えたら、日本時間の 1 日ごとにまとめる', () => {
    const early = [{ t: jst('2026-11-10T23:50'), count: 5 }, ...buckets];
    const series = buildPlaySeries({ ...base, buckets: early, range: 'all', trim: true });
    expect(series.stepSeconds).toBe(86_400);
    expect(series.points[0]).toEqual({ t: jst('2026-11-10T00:00'), count: 5 });
    expect(series.points.at(-1)).toEqual({ t: jst('2026-11-22T00:00'), count: 3 });
  });

  test('記録が無ければ、切り詰めた結果は空', () => {
    const series = buildPlaySeries({ ...base, buckets: [], range: 'day', trim: true });
    expect(series.points).toEqual([]);
    expect(series.total).toBe(0);
  });
});

test('defaultDay は、学祭の前なら初日、当日ならその日、後なら最終日', () => {
  expect(defaultDay(jst('2026-11-01T12:00'))).toBe('2026-11-21');
  expect(defaultDay(jst('2026-11-22T00:00'))).toBe('2026-11-22');
  expect(defaultDay(jst('2026-11-21T23:59'))).toBe('2026-11-21');
  expect(defaultDay(jst('2026-12-01T12:00'))).toBe('2026-11-22');
  expect(dayStart('2026-11-21')).toBe(jst('2026-11-21T00:00'));
});

test('ラベルの間隔は、数が収まるいちばん細かいもの', () => {
  const day = buildPlaySeries({ ...base, buckets, range: 'day', trim: false });
  expect(labelStep(day, 8)).toBe(3 * 3600);
  const hours = buildPlaySeries({ ...base, buckets, range: '3h', trim: false });
  expect(labelStep(hours, 8)).toBe(1800);
});

test('ラベルは日本時間で、0 時だけ日付にする', () => {
  expect(tickLabel(jst('2026-11-21T13:00'), 3600)).toBe('13:00');
  expect(tickLabel(jst('2026-11-21T13:30'), 3600)).toBe('');
  expect(tickLabel(jst('2026-11-21T13:00'), 3600, true)).toBe('11/21 13:00');
  expect(tickLabel(jst('2026-11-22T00:00'), 3600)).toBe('11/22');
  expect(tickLabel(jst('2026-11-22T00:00'), 86_400)).toBe('11/22');
  expect(bucketLabel(jst('2026-11-21T13:00'), 1800)).toBe('11/21 13:00〜13:30');
  expect(bucketLabel(jst('2026-11-21T23:30'), 1800)).toBe('11/21 23:30〜24:00');
  expect(bucketLabel(jst('2026-11-21T00:00'), 86_400)).toBe('11/21');
});
