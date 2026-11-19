import { describe, expect, test } from 'vite-plus/test';
import { formatClearTime } from './runs';

describe('formatClearTime', () => {
  test('分、秒、百分の一秒で出す', () => {
    expect(formatClearTime(83.456)).toBe('1:23.45');
    expect(formatClearTime(5)).toBe('0:05.00');
  });

  test('負の値は 0 にする', () => {
    expect(formatClearTime(-1)).toBe('0:00.00');
  });
});
