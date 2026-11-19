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
