import { Link, createFileRoute } from '@tanstack/react-router';
import { GameBackdrop } from '#/features/water-shooting/backdrop';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <GameBackdrop stage={2} />
      <h1 className="text-3xl text-primary">学祭2026 ランキング</h1>
      <ul className="flex flex-col gap-3">
        <li>
          <Link
            to="/water-shooting"
            className="block border-2 bg-background/80 p-4 hover:border-primary"
          >
            <span className="block font-display text-3xl">WaterShooting</span>
            <span className="text-sm text-muted-foreground">スコアランキングを見る</span>
          </Link>
        </li>
        <li>
          <Link to="/signage" className="block border-2 bg-background/80 p-4 hover:border-primary">
            <span className="block text-xl">サイネージ表示</span>
            <span className="text-sm text-muted-foreground">
              会場のモニター向け。全画面で、ランキングを自動で送ります
            </span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
