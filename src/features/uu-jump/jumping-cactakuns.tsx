import { useEffect, useRef, useState } from 'react';
import sheet from '#/assets/uu-jump/cactakun_charge.png';

// 絵は 1 コマ 32×32。にじまないよう、整数倍で出す
const SPRITE_PX = 32;
// 次の 1 体を出すまでの間(秒)。1 体が下から上へ抜けるのに 45 秒ほどかかるので、
// だいたい 1 体はいて、ときどき 2 体が重なり、ときどき誰もいない間ができる。WaterShooting の漂うキャラと同じくらい
const SPAWN_GAP_MIN = 22;
const SPAWN_GAP_MAX = 52;
// ためる時間(ミリ秒)。ばらつかせて、跳ねる間を不ぞろいにする
const CHARGE_MS_MIN = 1000;
const CHARGE_MS_MAX = 2500;
// 1 回のジャンプに掛ける時間(ミリ秒)。高さのわりに長く掛けて、ふわっと上がらせる
const JUMP_MS_MIN = 2200;
const JUMP_MS_MAX = 3200;
// 1 回のジャンプで上がる高さ(vh)と、横にずれる幅(vw)。画面に対する割合なので、画面の大きさによらず同じ回数で抜ける
const RISE_MIN = 9;
const RISE_MAX = 18;
const SIDE_MAX = 5;
// ためているあいだに沈む高さ。絵の大きさに対する割合。クラゲのように、少し沈んでからまた上がる
const SINK = 0.2;
// 横へ跳ぶときに、体を傾ける角度の上限(度)
const TILT_MAX = 12;

const between = (min: number, max: number) => min + Math.random() * (max - min);

type Pose = {
  /** 絵の中心の横の位置(vw) */
  x: number;
  /** 絵の上端の縦の位置(vh)。これに sink を足したところに描く */
  y: number;
  /** ためるたびに沈んだ分の合計(px) */
  sink: number;
  /** 傾き(度) */
  tilt: number;
  /** この姿勢へ移るのに掛ける時間(ミリ秒)と、その緩急 */
  ms: number;
  easing: string;
  /** ためているところか。ためるコマ送りを、ms と同じ長さで 1 回流す */
  charging: boolean;
  /** 何回めの動きか。ためるコマ送りを、毎回最初から流すのに使う */
  step: number;
};

/**
 * 画面の下の外から出て、ためては跳ねるのをくり返しながら、上の外へ抜けていくサボテン 1 体。
 * 跳ねる高さ・横へのずれ・ためる長さは毎回ばらばらにして、クラゲのような不ぞろいな動きにする。
 */
function JumpingCactakun({ onDone }: { onDone: () => void }) {
  const [size] = useState(() => SPRITE_PX * (window.innerWidth < 640 ? 2 : 3));
  const [pose, setPose] = useState<Pose>(() => ({
    x: between(5, 95),
    // 画面の下の外
    y: 100,
    sink: 0,
    tilt: 0,
    ms: 0,
    easing: 'linear',
    charging: false,
    step: 0,
  }));

  useEffect(() => {
    let { x, y, sink } = pose;
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;

    const charge = () => {
      // 最初の 1 回は画面の外なので、沈めず、すぐ跳ぶ
      const first = step === 0;
      const ms = first ? 300 : between(CHARGE_MS_MIN, CHARGE_MS_MAX);
      if (!first) sink += size * SINK;
      setPose({ x, y, sink, tilt: 0, ms, easing: 'ease-in-out', charging: true, step: ++step });
      timer = setTimeout(jump, ms);
    };

    const jump = () => {
      const side = between(-SIDE_MAX, SIDE_MAX);
      // 画面の横の外へは出さない
      x = Math.min(Math.max(x + side, 4), 96);
      y -= between(RISE_MIN, RISE_MAX);
      const ms = between(JUMP_MS_MIN, JUMP_MS_MAX);
      setPose({
        x,
        y,
        sink,
        tilt: (side / SIDE_MAX) * TILT_MAX,
        ms,
        // すっと出て、だんだん止まる。出だしを速くしすぎると、弾かれたように見える
        easing: 'cubic-bezier(0.3, 0.55, 0.4, 1)',
        charging: false,
        step: ++step,
      });
      // 絵の下端が画面の上の外へ抜けたら片づける
      const bottom = (y / 100) * window.innerHeight + sink + size;
      timer = setTimeout(bottom < 0 ? onDone : charge, ms);
    };

    // 最初の位置(画面の下の外)を描いてから動かし始める
    timer = setTimeout(charge, 50);
    return () => clearTimeout(timer);
    // 出てから消えるまでを 1 回だけ流す。途中の pose や onDone の変化では、やり直さない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="absolute top-0 left-0"
      style={{
        width: size,
        height: size,
        translate: `calc(${pose.x}vw - ${size / 2}px) calc(${pose.y}vh + ${pose.sink}px)`,
        rotate: `${pose.tilt}deg`,
        transition: `translate ${pose.ms}ms ${pose.easing}, rotate ${pose.ms}ms ease-out`,
      }}
    >
      <span
        // ためるたびに作り直して、コマ送りを最初から流す
        key={pose.step}
        className="pixelated block size-full bg-size-[400%_100%]"
        style={{
          backgroundImage: `url(${sheet})`,
          animation: pose.charging ? `cactakun-charge ${pose.ms}ms steps(4) 1` : undefined,
        }}
      />
    </div>
  );
}

/**
 * UU-JUMP のランキングの背景で、サボテンを跳ねさせる。下の辺のどこかから出て、上へ抜ける。
 * 背景の幕の下に置くので、背景と同じ暗さになる。
 */
export function JumpingCactakuns() {
  const [ids, setIds] = useState<number[]>([]);

  // 番号は作り直しをまたいで続ける。開発中の差し替えで effect が動き直しても、残っている 1 体と重ならない
  const nextId = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const spawn = () => {
      const id = nextId.current++;
      setIds((prev) => [...prev, id]);
      timer = setTimeout(spawn, between(SPAWN_GAP_MIN, SPAWN_GAP_MAX) * 1000);
    };
    // 開いてすぐは誰もいないので、最初の 1 体は早めに出す
    timer = setTimeout(spawn, 800);
    return () => clearTimeout(timer);
  }, []);

  return ids.map((id) => (
    <JumpingCactakun key={id} onDone={() => setIds((prev) => prev.filter((i) => i !== id))} />
  ));
}
