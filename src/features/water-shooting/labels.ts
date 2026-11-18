// 表記はゲームのタイトル画面に合わせる(Unity 側の RunSelection.DifficultyName / PlayerName)。
// API は一覧にない値も受け付けるので、知らない値はそのまま出す。

export const DIFFICULTIES = ['easy', 'normal', 'hard', 'extreme'] as const;
export const PLAYERS = ['slim', 'medium', 'heavy'] as const;
export const RESULTS = ['cleared', 'game_over'] as const;

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: 'むずかしい',
  extreme: 'げきむず',
};

const PLAYER_LABELS: Record<string, string> = {
  slim: '細',
  medium: '中',
  heavy: '太',
};

const RESULT_LABELS: Record<string, string> = {
  cleared: 'クリア',
  game_over: 'ゲームオーバー',
};

export const difficultyLabel = (value: string) => DIFFICULTY_LABELS[value] ?? value;
export const playerLabel = (value: string) => PLAYER_LABELS[value] ?? value;
export const resultLabel = (value: string) => RESULT_LABELS[value] ?? value;
