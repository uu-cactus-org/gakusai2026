import { WaterShootingSignageBackdrop } from '#/features/water-shooting/backdrop';
import { WaterShootingSignageBoard } from '#/features/water-shooting/signage-board';
import { WATER_SHOOTING_THEME } from '#/features/water-shooting/theme';
import type { SignageBoard } from './types';

// サイネージで映すボード。上から順に映し、最後まで行ったら先頭へ戻る。
// ゲームが増えたら、ここに 1 件足す。
export const SIGNAGE_BOARDS: readonly [SignageBoard, ...SignageBoard[]] = [
  {
    id: 'water-shooting',
    title: 'WaterShooting',
    subtitle: 'スコアランキング',
    Component: WaterShootingSignageBoard,
    themeClass: WATER_SHOOTING_THEME,
    Backdrop: WaterShootingSignageBackdrop,
  },
];
