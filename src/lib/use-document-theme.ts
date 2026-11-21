import { useLayoutEffect } from 'react';

/**
 * この画面を開いているあいだ、ページ全体(<html>)に見た目のクラスを付ける。
 *
 * 画面の一部ではなく <html> に付けるのは、選択肢のポップアップなど、画面の外(body の直下)に
 * 描かれる部品にも同じ見た目を当てるため。クラスを渡さなければ、共通の見た目のまま。
 */
export function useDocumentTheme(themeClass: string | undefined) {
  useLayoutEffect(() => {
    if (!themeClass) return;
    // 暗い配色の見た目は 'theme-xxx dark' のように、空白で区切って dark も渡す
    // (shadcn/ui の dark: の指定を効かせるため)
    const classes = themeClass.split(' ').filter(Boolean);
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, [themeClass]);
}

/**
 * 共通の見た目(白い地)の画面を、端末の設定に合わせて暗い配色にする。
 * 端末が暗い配色のあいだだけ、<html> に dark を付ける。開いている途中で設定が変わっても追う。
 *
 * ゲームごとの見た目(theme-xxx)は配色を自分で決めているので、これは使わない。
 */
export function useSystemColorScheme() {
  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const root = document.documentElement;
    const apply = () => root.classList.toggle('dark', query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => {
      query.removeEventListener('change', apply);
      root.classList.remove('dark');
    };
  }, []);
}
