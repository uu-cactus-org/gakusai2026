import heavy from '#/assets/water-shooting/player_heavy.png';
import medium from '#/assets/water-shooting/player_medium.png';
import slim from '#/assets/water-shooting/player_slim.png';
import { difficultyLabel, playerLabel } from './labels';

// 色は、ゲームのタイトル画面の難易度カードと同じ(Unity 側の RunSelectionMenu)
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'rgb(108 235 191)',
  normal: 'rgb(108 195 255)',
  hard: 'rgb(255 190 100)',
  extreme: 'rgb(255 106 145)',
};

const PLAYER_SPRITES: Record<string, string> = { slim, medium, heavy };

// 1〜3 位は、金・銀・銅
const RANK_COLORS: Record<number, string> = {
  1: 'rgb(255 224 121)',
  2: 'rgb(216 228 240)',
  3: 'rgb(250 182 102)',
};

export const rankColor = (rank: number): string | undefined => RANK_COLORS[rank];

/** 難易度。ゲームと同じ色を付ける。知らない難易度は、色なしで出す。 */
export function DifficultyLabel({ value }: { value: string }) {
  return <span style={{ color: DIFFICULTY_COLORS[value] }}>{difficultyLabel(value)}</span>;
}

/** キャラ。ゲームの絵を添える。知らないキャラは、名前だけ出す。 */
export function PlayerLabel({ value, showName = true }: { value: string; showName?: boolean }) {
  const sprite = PLAYER_SPRITES[value];
  return (
    // inline-flex だと絵の下端が文字のベースラインに乗って、行の中で上に寄る。flex にして箱ごと中央に置かせる
    <span className="flex items-center gap-[0.3em]">
      {sprite && <img src={sprite} alt="" className="pixelated size-[2em] shrink-0" />}
      {(showName || !sprite) && playerLabel(value)}
    </span>
  );
}
