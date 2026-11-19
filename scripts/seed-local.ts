// ローカルの開発サーバーに、画面の確認用の記録を入れる。
//
//   vpx scripts/seed-local.ts            WaterShooting と UU-JUMP に 45 件ずつ入れる
//   vpx scripts/seed-local.ts --count 8  件数を変える
//
// 先に `vp run db:migrate:local` と `vp run dev` を済ませておく。鍵は .dev.vars の GAME_TOKEN を使う。
// 何度実行しても、同じ記録が増えることはない(runId が同じなので)。
// 本番に試しの記録を混ぜないよう、送り先はローカルに限っている。
import { readFileSync } from 'node:fs';

const ORIGIN = 'http://localhost:3000';

const countArg = process.argv.indexOf('--count');
const count = countArg === -1 ? 45 : Number(process.argv[countArg + 1]);
if (!Number.isInteger(count) || count < 1) {
  console.error('--count には 1 以上の整数を渡してください');
  process.exit(1);
}

const token = /^GAME_TOKEN=(.+)$/m.exec(readFileSync('.dev.vars', 'utf8'))?.[1]?.trim();
if (!token) {
  console.error('.dev.vars に GAME_TOKEN がありません(.dev.vars.example を参照)');
  process.exit(1);
}

// 実行のたびに同じ並びになる乱数
let seed = 20261121;
function random(): number {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
}
const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)]!;

// 難易度と、スコアの倍率(見た目がそれらしくなる程度の値)
const DIFFICULTIES = [
  ['easy', 0.5],
  ['normal', 1],
  ['hard', 1.5],
  ['extreme', 2],
] as const;
const PLAYERS = ['slim', 'medium', 'heavy'] as const;
const TOTAL_STAGES = 5;

let failed = 0;
for (let i = 1; i <= count; i++) {
  const [difficulty, multiplier] = pick(DIFFICULTIES);
  const cleared = random() < 0.4;
  const reachedStage = cleared ? TOTAL_STAGES : 1 + Math.floor(random() * TOTAL_STAGES);
  const baseScore = Math.round((reachedStage * 4000 + random() * 6000) / 50) * 50;

  const res = await fetch(`${ORIGIN}/api/water-shooting/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      runId: `seed-${i}`,
      deviceId: `seed-pc-${1 + Math.floor(random() * 4)}`,
      result: cleared ? 'cleared' : 'game_over',
      difficulty,
      player: pick(PLAYERS),
      score: Math.round(baseScore * multiplier),
      baseScore,
      playSeconds: Math.round((reachedStage * 55 + random() * 60) * 10) / 10,
      reachedStage,
      totalStages: TOTAL_STAGES,
      test: false,
    }),
  });
  if (!res.ok) {
    failed++;
    console.error(`seed-${i}: ${res.status} ${await res.text()}`);
  }
}

// UU-JUMP の記録。マップごとに、それらしいタイムを入れる
const UU_JUMP_MAPS = [
  ['マップ0', 40],
  ['マップ1', 90],
  ['マップ2', 200],
] as const;
for (let i = 1; i <= count; i++) {
  const [mapName, baseSeconds] = pick(UU_JUMP_MAPS);
  const clearSeconds = Math.round(baseSeconds * (1 + random() * 1.5) * 100) / 100;
  const res = await fetch(`${ORIGIN}/api/uu-jump/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      runId: `seed-uu-jump-${i}`,
      deviceId: `seed-pc-${1 + Math.floor(random() * 4)}`,
      mapName,
      clearSeconds,
      jumpCount: Math.round(clearSeconds * (0.8 + random() * 0.6)),
      test: false,
    }),
  });
  if (!res.ok) {
    failed++;
    console.error(`seed-uu-jump-${i}: ${res.status} ${await res.text()}`);
  }
}

console.log(`${count * 2 - failed} 件を送りました` + (failed > 0 ? `(失敗 ${failed} 件)` : ''));
process.exit(failed > 0 ? 1 : 0);
