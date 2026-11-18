import { describe, expect, test } from 'vite-plus/test';
import { formatPlayTime, formatRecordedAt, formatScore } from './format';

describe('formatScore', () => {
  test('3 桁ごとに区切る', () => {
    expect(formatScore(0)).toBe('0');
    expect(formatScore(18750)).toBe('18,750');
    expect(formatScore(1234567)).toBe('1,234,567');
  });
});

describe('formatPlayTime', () => {
  test('分:秒にして、秒より下は切り捨てる', () => {
    expect(formatPlayTime(0)).toBe('0:00');
    expect(formatPlayTime(9.9)).toBe('0:09');
    expect(formatPlayTime(312.4)).toBe('5:12');
    expect(formatPlayTime(600)).toBe('10:00');
  });

  test('1 時間以上は時:分:秒にする', () => {
    expect(formatPlayTime(3600)).toBe('1:00:00');
    expect(formatPlayTime(3725)).toBe('1:02:05');
  });

  test('負の値は 0 として扱う', () => {
    expect(formatPlayTime(-5)).toBe('0:00');
  });
});

describe('formatRecordedAt', () => {
  test('日本時間で出す', () => {
    expect(formatRecordedAt('2026-11-21T04:12:09.000Z')).toBe('11/21 13:12');
  });

  test('日本時間で日付が変わる時刻は、翌日として出す', () => {
    expect(formatRecordedAt('2026-11-21T15:05:00.000Z')).toBe('11/22 00:05');
  });

  test('読めない値は空にする', () => {
    expect(formatRecordedAt('not a date')).toBe('');
  });
});
