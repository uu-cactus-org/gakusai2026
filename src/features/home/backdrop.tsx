import { useEffect, useRef } from 'react';

// 旗と紙吹雪の色
const PARTY = ['#ffe079', '#ff6a91', '#6cc3ff', '#8be28b', '#ebf7ff', '#c79bff'];
// 空の色。上から下へ
const SKY = ['#080f20', '#0c1731', '#122144', '#1a2d5a', '#253a72', '#31478a'];
// 色の段を網点でぼかすための並び(4×4 のベイヤー)
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// 花火。x と y は、空の広さに対する割合。r は半径(ドット)
const FIREWORKS = [
  { x: 0.9, y: 0.52, r: 17, rays: 16, colors: ['#fff3c2', '#ffe079', '#ff9d4d'] },
  { x: 0.52, y: 0.15, r: 10, rays: 12, colors: ['#ffd3e0', '#ff6a91', '#c2407a'] },
  { x: 0.07, y: 0.44, r: 10, rays: 12, colors: ['#d8f0ff', '#6cc3ff', '#3a7fd0'] },
  { x: 0.3, y: 0.62, r: 7, rays: 10, colors: ['#e2ffd8', '#8be28b', '#3fa860'] },
  { x: 0.94, y: 0.74, r: 8, rays: 10, colors: ['#eadcff', '#c79bff', '#7e55c9'] },
  { x: 0.05, y: 0.82, r: 6, rays: 10, colors: ['#fff3c2', '#ffe079', '#ff9d4d'] },
];

/** 種から決まる乱数。描き直しても、同じ大きさなら同じ絵になる */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 夜空、花火、紙吹雪、旗のガーランドを、ドット絵として描く。1 ドットを unit px に引き伸ばして見せる。 */
function draw(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 狭い画面では、絵が大きくなりすぎないようドットを小さくする
  const unit = window.innerWidth < 640 ? 4 : 6;
  const width = Math.ceil(window.innerWidth / unit);
  const height = Math.ceil(window.innerHeight / unit);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width * unit}px`;
  canvas.style.height = `${height * unit}px`;

  const random = createRandom(20261119);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const dot = (x: number, y: number, color: string, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };

  // 空
  for (let y = 0; y < height; y++) {
    const t = (y / height) * (SKY.length - 1);
    const i = Math.floor(t);
    const next = Math.min(i + 1, SKY.length - 1);
    for (let x = 0; x < width; x++) {
      dot(x, y, (t - i) * 16 > BAYER[y % 4][x % 4] ? SKY[next] : SKY[i]);
    }
  }

  // 遠くの星
  for (let n = 0; n < (width * height) / 250; n++) {
    dot(random() * width, random() * (height - 4), pick(['#506e91', '#6f8fb5', '#b0cfe1']));
  }

  // 花火。狭い画面では小さくする
  const shrink = width < 120 ? 0.75 : 1;
  for (const { x, y, r, rays, colors } of FIREWORKS) {
    const cx = x * width;
    const cy = y * height;
    const radius = r * shrink;
    for (let k = 0; k < rays; k++) {
      const angle = (k / rays) * Math.PI * 2 + 0.2;
      for (let d = radius * 0.3; d <= radius; d += 1) {
        // 外側は 1 つ飛ばしにして、散っていくように見せる
        if (d > radius * 0.55 && Math.round(d) % 2) continue;
        const color = d < radius * 0.5 ? colors[0] : d < radius * 0.8 ? colors[1] : colors[2];
        // 外へ行くほど、少し垂れる
        dot(
          cx + Math.cos(angle) * d,
          cy + Math.sin(angle) * d * 0.95 + (d * d) / (radius * 14),
          color,
        );
      }
    }
    dot(cx, cy, '#ffffff');
  }

  // 紙吹雪
  for (let n = 0; n < (width * height) / 160; n++) {
    const x = Math.floor(random() * width);
    const y = Math.floor(20 + random() * (height - 22));
    const color = pick(PARTY);
    const shape = random();
    if (shape < 0.3) dot(x, y, color, 2, 1);
    else if (shape < 0.5) dot(x, y, color, 1, 2);
    else dot(x, y, color);
  }

  // 旗のガーランド。画面の幅に合わせて、たるみの数を決める
  const swags = Math.max(2, Math.round(width / 66));
  let flag = 0;
  for (let s = 0; s < swags; s++) {
    const x0 = Math.round((s * width) / swags);
    const x1 = Math.round(((s + 1) * width) / swags);
    const yAt = (x: number) => 2 + 8 * Math.sin((Math.PI * (x - x0)) / (x1 - x0));
    for (let x = x0; x <= x1; x++) dot(x, yAt(x), '#b0cfe1');
    // 旗を、たるみの中で左右に寄らないよう真ん中にそろえる
    const count = Math.floor((x1 - x0 - 2) / 9);
    const start = x0 + Math.round((x1 - x0 - (count * 9 - 2)) / 2);
    for (let k = 0; k < count; k++, flag++) {
      const x = start + k * 9;
      const y = Math.round(yAt(x + 3)) + 1;
      const color = PARTY[flag % PARTY.length];
      [7, 7, 5, 5, 3, 3, 1].forEach((w, row) => dot(x + (7 - w) / 2, y + row, color, w, 1));
      dot(x, y, 'rgb(255 255 255 / 0.45)', 7, 1);
    }
  }
}

/**
 * トップの背景。OGP の画像と同じ、夜空に花火と旗のガーランドの絵を、画面いっぱいに敷く。
 * 画面の大きさが変わったら、その大きさで描き直す。
 */
export function FestivalBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const redraw = () => draw(canvas);
    redraw();
    window.addEventListener('resize', redraw);
    return () => window.removeEventListener('resize', redraw);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
      aria-hidden="true"
    >
      <canvas ref={ref} className="pixelated absolute top-0 left-0" />
      {/* 上に載せる文字が読みやすいよう、暗い幕を掛ける */}
      <div className="absolute inset-0 bg-background opacity-30" />
    </div>
  );
}
