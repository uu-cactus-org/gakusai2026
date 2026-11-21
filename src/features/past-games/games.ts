import burstlike from '#/assets/past-games/burstlike.png';
import cactakun from '#/assets/past-games/cactakun.png';
import spacetraveler from '#/assets/past-games/spacetraveler.png';
import teppouUo from '#/assets/past-games/teppou-uo.png';

/** 過去のゲームの 1 件。一覧の画面(/past-games)に、カードとして並ぶ。 */
export type PastGame = {
  title: string;
  description: string;
  /** 遊べるページ(unityroom など)の URL */
  url: string;
  /** カードの左に、正方形で出す絵。正方形でない絵は、真ん中を切り抜く */
  icon: string;
  /** ドット絵なら true。引き伸ばしても、ぼかさずに出す */
  pixelated?: boolean;
};

/**
 * 過去のゲームの一覧。ゲームを足すときは、絵を src/assets/past-games に置いて、ここに 1 件書き足す。上から順に並ぶ。
 */
export const PAST_GAMES: PastGame[] = [
  {
    title: 'スペーストラベル',
    description: '重力を操作してゴールを目指すアクションゲームです',
    url: 'https://unityroom.com/games/spacetraveler_cactus',
    icon: spacetraveler,
    pixelated: true,
  },
  {
    title: 'BurstLike',
    description: 'スーパーマリオ系アクションゲーム×ローグライク',
    url: 'https://unityroom.com/games/burstlike',
    icon: burstlike,
  },
  {
    title: '鉄砲魚バトル',
    description: '水鉄砲で虫を撃ち落として食べる、テッポウウオのスコアアタック！',
    url: 'https://unityroom.com/games/teppou-uo',
    icon: teppouUo,
  },
  {
    title: 'ミニゲーム集',
    description: 'ブラウザで遊べるミニゲーム等',
    url: 'https://kareshino.github.io/HTML-game-browser/',
    // 専用の絵がないので、カクタくんの静止画で代用している
    icon: cactakun,
    pixelated: true,
  },
];
