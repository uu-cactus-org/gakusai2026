import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import heavy from '#/assets/water-shooting/player_heavy.png';
import medium from '#/assets/water-shooting/player_medium.png';
import slim from '#/assets/water-shooting/player_slim.png';

const SPRITES = [slim, medium, heavy];

// 絵は 30×30。にじまないよう、整数倍で出す
const SPRITE_PX = 30;
// 絵の中で、頭が向いている角度(度)。絵は頭が上なので -90。頭を進む方へ向けるのに使う
const HEAD_ANGLE = -90;
// 1 秒に進む距離。画面の対角線に対する割合で決めるので、画面の大きさによらず横切る時間がそろう(35〜55 秒ほど)
const SPEED_MIN = 0.018;
const SPEED_MAX = 0.03;
// 次の 1 体を出すまでの間。前の 1 体が横切る時間に対する割合。
// 1 より小さいと 2 体が重なり、大きいと誰もいない間ができる。だいたい 1 体はいる、くらいにしている
const GAP_MIN = 0.5;
const GAP_MAX = 1.15;
// 回りながら進む 1 体が出る間(秒)。平均でこの間に 1 体になるよう、出すたびに確率で決める
const SPIN_EVERY_SECONDS = 600;
// 回る速さ。1 回転にかける秒数
const SPIN_TURN_SECONDS = 0.4;

type Drifter = {
  id: number;
  sprite: string;
  size: number;
  from: string;
  to: string;
  /** 絵を回す角度(度) */
  rotate: number;
  seconds: number;
  /** 回りながら進むときの、回る向き。ふつうに進むときは null */
  spin: 'normal' | 'reverse' | null;
};

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** 画面の外のどこかの辺から入り、画面の中ほどを通って、反対側へ抜ける 1 体を決める。 */
function createDrifter(id: number): Drifter {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const size = SPRITE_PX * (width < 640 ? 2 : 3);

  // 絵がすっかり隠れる位置を、出入りの境にする(絵の左上の座標で考える)
  const left = -size;
  const right = width;
  const top = -size;
  const bottom = height;

  // 入る場所。4 辺のどれかの上の、どこか
  const side = Math.floor(Math.random() * 4);
  const startX = side === 0 ? left : side === 1 ? right : between(left, right);
  const startY = side === 2 ? top : side === 3 ? bottom : between(top, bottom);

  // 画面の中ほどの 1 点を目がけて進む。端をかすめるだけの通り方を避ける
  const aimX = between(width * 0.2, width * 0.8) - size / 2;
  const aimY = between(height * 0.2, height * 0.8) - size / 2;
  const length = Math.hypot(aimX - startX, aimY - startY);
  const dirX = (aimX - startX) / length;
  const dirY = (aimY - startY) / length;

  // そのまま進んで、反対側の境に届くまでの距離
  const reachX = dirX > 0 ? (right - startX) / dirX : dirX < 0 ? (left - startX) / dirX : Infinity;
  const reachY = dirY > 0 ? (bottom - startY) / dirY : dirY < 0 ? (top - startY) / dirY : Infinity;
  const distance = Math.min(reachX, reachY);

  const speed = Math.hypot(width, height) * between(SPEED_MIN, SPEED_MAX);
  return {
    id,
    sprite: SPRITES[Math.floor(Math.random() * SPRITES.length)] ?? slim,
    size,
    from: `${startX}px ${startY}px`,
    to: `${startX + dirX * distance}px ${startY + dirY * distance}px`,
    rotate: (Math.atan2(dirY, dirX) * 180) / Math.PI - HEAD_ANGLE,
    seconds: distance / speed,
    spin: null,
  };
}

/**
 * ゲームのキャラを、画面の中に漂わせる。3 種類からランダムに選び、向きもばらばらに、頭を先にして横切らせる。
 * いつも誰かがいるほどではなく、ぱっと見ればだいたいどこかにいる、くらいの間で出す。
 * 10 分に 1 体くらい、勢いよく回りながら横切るものが混じる。
 * 背景の幕の下に置くので、背景と同じ暗さになる。
 */
export function DriftingPlayers() {
  const [drifters, setDrifters] = useState<Drifter[]>([]);

  // 番号は作り直しをまたいで続ける。開発中の差し替えで effect が動き直しても、残っている 1 体と重ならない
  const nextId = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const spawn = () => {
      const drifter = createDrifter(nextId.current++);
      const gapSeconds = drifter.seconds * between(GAP_MIN, GAP_MAX);
      // 次の 1 体までの間が長いほど当たりやすくして、出す間隔によらず、平均の間をそろえる
      if (Math.random() < gapSeconds / SPIN_EVERY_SECONDS) {
        drifter.spin = Math.random() < 0.5 ? 'normal' : 'reverse';
      }
      setDrifters((prev) => [...prev, drifter]);
      timer = setTimeout(spawn, gapSeconds * 1000);
    };
    // 開いてすぐは誰もいないので、最初の 1 体は早めに出す
    timer = setTimeout(spawn, 800);
    return () => clearTimeout(timer);
  }, []);

  return drifters.map((drifter) => {
    const style: CSSProperties & { '--drift-from': string; '--drift-to': string } = {
      '--drift-from': drifter.from,
      '--drift-to': drifter.to,
      width: drifter.size,
      height: drifter.size,
      animation: `water-shooting-drift ${drifter.seconds}s linear forwards`,
    };
    return (
      <div
        key={drifter.id}
        className="absolute top-0 left-0"
        style={style}
        // 画面の外へ抜けたら片づける
        onAnimationEnd={() => setDrifters((prev) => prev.filter((d) => d.id !== drifter.id))}
      >
        <img
          src={drifter.sprite}
          alt=""
          className="pixelated size-full"
          style={
            drifter.spin
              ? {
                  animation: `water-shooting-spin ${SPIN_TURN_SECONDS}s linear infinite ${drifter.spin}`,
                }
              : { rotate: `${drifter.rotate}deg` }
          }
        />
      </div>
    );
  });
}
