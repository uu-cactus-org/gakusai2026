import { Link } from '@tanstack/react-router';

/**
 * トップとライセンスの画面の下に置く、リンクと著作権の表示。
 * 床の見た目(festival-floor)は、このフッター自身の地として持つ。背景の絵には床を描いていない。
 * 画面の下へ寄せるのは、置く側の役目(縦に並べた枠の最後に置き、上の main を伸ばす)。
 */
export function FestivalFooter() {
  return (
    <footer className="festival-floor festival-title flex flex-col items-center gap-0.5 px-4 py-2.5 text-sm text-muted-foreground sm:gap-2 sm:py-4">
      <nav className="flex gap-6">
        <Link to="/licenses" className="underline underline-offset-4 hover:text-foreground">
          ライセンス
        </Link>
        <a
          href="https://uucactus.com"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          uucactus.com
        </a>
      </nav>
      <small className="text-sm">© 2026 情報研究会 CACTUS</small>
    </footer>
  );
}
