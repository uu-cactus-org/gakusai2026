import type { ComponentType } from 'react';

/** サイネージが、1 つのボードに渡すもの。 */
export type SignageBoardProps = {
  /** 表示するページ(0 始まり) */
  page: number;
  /** 画面に一度に並べる件数。ボードによっては、1 ページにこの 2 倍までを持たせて、途中で下へ送る(scroll-rows.tsx) */
  rows: number;
  /** 1 ページを映す秒数 */
  interval: number;
  /** 自動送りを止めているか */
  paused: boolean;
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
  /** 題字を、ゲームのロゴに差し替える。無ければ title と subtitle を文字で出す */
  Title?: ComponentType;
  Component: ComponentType<SignageBoardProps>;
  /**
   * このボードの 1 行が、横に収まるのに要る幅(em)。列の幅・すき間・左右の余白の合計。
   * サイネージは、画面の幅がこの幅を下回らないところまで、文字を大きくする。
   * 小さいほど、縦長寄りの画面(iPad など)で文字が大きくなる。列を足したら、ここも増やす
   */
  widthEm: number;
  /** このボードを映すあいだ、ページ全体に付ける見た目のクラス。無ければ共通の見た目 */
  themeClass?: string;
  /** 画面いっぱいに敷く背景。step はページを送るたびに 1 ずつ増える */
  Backdrop?: ComponentType<{ step: number }>;
};
