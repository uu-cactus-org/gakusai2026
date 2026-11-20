import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { FestivalBackdrop } from '#/features/home/backdrop';
import { FestivalFooter } from '#/features/home/footer';
import { FESTIVAL_THEME } from '#/features/home/theme';
import { PAST_GAMES } from '#/features/past-games/games';
import type { PastGame } from '#/features/past-games/games';
import { useDocumentTheme } from '#/lib/use-document-theme';

// 過去に作ったゲームへのリンク集。並べるゲームは features/past-games/games.ts にある。
export const Route = createFileRoute('/past-games')({ component: PastGames });

// カードの影の色。上から順に使い、足りなくなったら最初に戻る
const SHADOWS = ['#6cc3ff', '#42b147', '#ff6a91', '#ffe079', '#c79bff'];

function PastGames() {
  useDocumentTheme(FESTIVAL_THEME);

  return (
    <div className="flex min-h-dvh flex-col">
      <FestivalBackdrop />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-20 pb-8 sm:px-6 sm:pt-28">
        <header className="flex flex-col items-start gap-4">
          <Button variant="outline" size="sm" render={<Link to="/" />} nativeButton={false}>
            <ArrowLeft aria-hidden="true" />
            トップに戻る
          </Button>
          <h1 className="festival-title text-4xl leading-[1.25] text-primary">過去のゲーム</h1>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {PAST_GAMES.map((game, index) => (
            <li key={game.url}>
              <GameCard game={game} shadow={SHADOWS[index % SHADOWS.length]} />
            </li>
          ))}
        </ul>
      </main>
      <FestivalFooter />
    </div>
  );
}

/** ゲーム 1 件のカード。トップのリンクと同じく、押すと影のほうへ沈む。別のタブで開く。 */
function GameCard({ game, shadow }: { game: PastGame; shadow: string }) {
  return (
    <a
      href={game.url}
      target="_blank"
      rel="noreferrer"
      className="flex h-full items-start gap-4 border-2 border-foreground bg-card p-4 shadow-[6px_6px_0_var(--card-shadow)] transition-transform hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
      style={{ '--card-shadow': shadow } as React.CSSProperties}
    >
      <img
        src={game.icon}
        alt=""
        className={`size-20 shrink-0 border-2 border-foreground object-cover ${game.pixelated ? 'pixelated' : ''}`}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-2 self-stretch">
        <span className="festival-title text-2xl leading-[1.3] text-primary">{game.title}</span>
        <span className="flex-1 text-sm text-muted-foreground">{game.description}</span>
        <span className="flex items-center gap-1.5 self-end text-sm">
          {new URL(game.url).hostname}
          <ExternalLink aria-hidden="true" className="size-4 text-primary" />
        </span>
      </span>
    </a>
  );
}
