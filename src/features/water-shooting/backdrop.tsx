import { useEffect, useState } from 'react';
import back1 from '#/assets/water-shooting/bg_stage1_back.png';
import middle1 from '#/assets/water-shooting/bg_stage1_middle.png';
import back2 from '#/assets/water-shooting/bg_stage2_back.png';
import middle2 from '#/assets/water-shooting/bg_stage2_middle.png';
import back3 from '#/assets/water-shooting/bg_stage3_back.png';
import middle3 from '#/assets/water-shooting/bg_stage3_middle.png';
import back4 from '#/assets/water-shooting/bg_stage4_back.png';
import middle4 from '#/assets/water-shooting/bg_stage4_middle.png';
import back5 from '#/assets/water-shooting/bg_stage5_back.png';
import middle5 from '#/assets/water-shooting/bg_stage5_middle.png';

// ゲームの各ステージの背景(奥と手前)
const STAGES = [
  { back: back1, middle: middle1 },
  { back: back2, middle: middle2 },
  { back: back3, middle: middle3 },
  { back: back4, middle: middle4 },
  { back: back5, middle: middle5 },
];

export const BACKDROP_STAGE_COUNT = STAGES.length;

function Layer({ image, seconds }: { image: string; seconds: number | null }) {
  return (
    <div
      className="backdrop-layer pixelated absolute inset-0 bg-size-[auto_100%] bg-repeat-x"
      style={{
        backgroundImage: `url(${image})`,
        animation: seconds === null ? undefined : `backdrop-scroll ${seconds}s linear infinite`,
      }}
    />
  );
}

/**
 * ゲームのステージの背景を、画面いっぱいに敷く。文字が読めるよう、上から暗い幕を掛ける。
 * stage を変えると、ゆっくり切り替わる。
 */
export function GameBackdrop({
  stage,
  scroll = false,
  dim = 0.7,
}: {
  /** どのステージの背景か(0 始まり)。範囲を超えたら先頭へ戻る */
  stage: number;
  /** ゲームと同じように、横へ流すか */
  scroll?: boolean;
  /** 幕の濃さ(0〜1) */
  dim?: number;
}) {
  const active = ((stage % STAGES.length) + STAGES.length) % STAGES.length;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {STAGES.map(({ back, middle }, i) => (
        <div
          key={back}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          {/* 手前のほうを速く流して、奥行きを出す */}
          <Layer image={back} seconds={scroll ? 240 : null} />
          <Layer image={middle} seconds={scroll ? 120 : null} />
        </div>
      ))}
      <div className="absolute inset-0 bg-background" style={{ opacity: dim }} />
    </div>
  );
}

const ROTATE_MS = 30_000;

const randomStage = () => Math.floor(Math.random() * STAGES.length);

/**
 * ステージの背景を、ランダムに選んで敷く。30 秒ごとに、今とは別のステージへ切り替える。
 */
export function RotatingGameBackdrop({ scroll, dim }: { scroll?: boolean; dim?: number }) {
  const [stage, setStage] = useState(randomStage);

  useEffect(() => {
    const timer = setInterval(() => {
      // 1 〜 (枚数 - 1) だけずらすと、必ず今とは別のステージになる
      setStage((prev) => prev + 1 + Math.floor(Math.random() * (STAGES.length - 1)));
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  return <GameBackdrop stage={stage} scroll={scroll} dim={dim} />;
}

/** サイネージ用の背景。ページを送るたびに、次のステージの背景へ切り替える。 */
export function WaterShootingSignageBackdrop({ step }: { step: number }) {
  return <GameBackdrop stage={step} scroll dim={0.55} />;
}
