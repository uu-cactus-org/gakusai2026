import { barY, defineChart } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';
import { bucketLabel, labelStep, tickLabel } from './buckets';
import type { PlaySeries } from './buckets';

// 横軸に置くラベルの数の上限。スマホの幅でも重ならない数
const MAX_LABELS = 8;

/**
 * プレイ数の棒グラフ。横軸は時間(日本時間)、縦軸はその区切りのプレイ数。
 * 色と書体は、囲んでいる画面の見た目(theme-xxx)に従う。
 */
export default function PlayCountChart({
  series,
  ariaLabel,
}: {
  series: PlaySeries;
  ariaLabel: string;
}) {
  const definition = useMemo(() => {
    const { points, stepSeconds } = series;
    const step = labelStep(series, MAX_LABELS);
    const peak = Math.max(1, ...points.map((point) => point.count));
    const ticks = points.filter((point) => tickLabel(point.t, step) !== '').map((point) => point.t);

    return defineChart({
      marks: [
        barY(points, {
          x: 't',
          y: 'count',
          fill: 'var(--primary)',
          // 棒が多いときは、すき間を詰める
          inset: points.length > 60 ? 0 : 1,
        }),
      ],
      scales: {
        x: {
          scale: () =>
            scaleBand<number>()
              .domain(points.map((point) => point.t))
              .padding(0.1),
          axis: {
            ticks: {
              values: ticks,
              // 左端のラベルには日付も付ける。時刻だけでは、どの日か分からないので
              format: (t) => tickLabel(t, step, t === ticks[0]),
            },
          },
        },
        y: {
          // 少ない回数でも、目盛りが小数にならないようにする
          scale: scaleLinear().domain([0, Math.max(4, peak)]),
          nice: true,
          grid: true,
          axis: {
            ticks: { format: (value) => (Number.isInteger(value) ? String(value) : '') },
          },
        },
      },
      // 棒が無い(0 回の)区切りでも、その時間を指せるようにする
      focus: 'nearest-x',
      maxFocusDistance: Number.POSITIVE_INFINITY,
      tooltip: {
        use: tooltip,
        items: [
          { channel: 'x', label: '時間', text: (point) => bucketLabel(point.datum.t, stepSeconds) },
          { channel: 'y', label: 'プレイ数', text: (point) => `${point.datum.count} 回` },
        ],
      },
    });
  }, [series]);

  return <Chart definition={definition} height={320} ariaLabel={ariaLabel} />;
}
