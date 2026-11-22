import { UuJumpSignageBackdrop } from '#/features/uu-jump/backdrop';
import { UuJumpSignageBoard, UuJumpSignageTitle } from '#/features/uu-jump/signage-board';
import { UU_JUMP_THEME } from '#/features/uu-jump/theme';
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
    widthEm: 37,
    // 下へ送らず 10 件を映すだけなので、UU-JUMP より短く送る
    interval: 4,
    themeClass: WATER_SHOOTING_THEME,
    Backdrop: WaterShootingSignageBackdrop,
  },
  {
    id: 'uu-jump',
    title: 'UU-JUMP',
    subtitle: 'タイムランキング',
    Title: UuJumpSignageTitle,
    Component: UuJumpSignageBoard,
    widthEm: 29,
    themeClass: UU_JUMP_THEME,
    Backdrop: UuJumpSignageBackdrop,
  },
];
