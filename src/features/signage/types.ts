import type { ComponentType } from 'react';

/** サイネージが、1 つのボードに渡すもの。 */
export type SignageBoardProps = {
  /** 表示するページ(0 始まり) */
  page: number;
  /** 1 ページに並べる件数 */
  rows: number;
  /** このボードで送るページ数の上限 */
  maxPages: number;
  /** 今あるページ数が分かったら知らせる。サイネージはこの数だけ送ってから次のボードへ進む */
  onPageCount: (pageCount: number) => void;
};

/** サイネージで順に映す 1 枚。ゲームのランキング 1 つが 1 ボード。 */
export type SignageBoard = {
  id: string;
  title: string;
  subtitle: string;
  Component: ComponentType<SignageBoardProps>;
  /** このボードを映すあいだ、ページ全体に付ける見た目のクラス。無ければ共通の見た目 */
  themeClass?: string;
  /** 画面いっぱいに敷く背景。step はページを送るたびに 1 ずつ増える */
  Backdrop?: ComponentType<{ step: number }>;
};
