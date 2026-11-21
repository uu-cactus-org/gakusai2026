import { useEffect } from 'react';

/**
 * この画面を開いているあいだ、タブの題を「<画面の名前> | <サイトの名前>」にする。
 * 画面を離れたら、サイトの名前だけ(index.html の title)に戻す。トップは何も付けないので、これを使わない。
 */
export function usePageTitle(page: string) {
  useEffect(() => {
    // 読み込んだ時点の題が、サイトの名前。付け足した題を上書きで覚えてしまわないよう、最初の 1 回だけ覚える
    siteTitle ??= document.title;
    const site = siteTitle;
    document.title = `${page} | ${site}`;
    return () => {
      document.title = site;
    };
  }, [page]);
}

let siteTitle: string | undefined;
