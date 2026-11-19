import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">ランキング</h1>
      <ul className="flex flex-col gap-3">
        <li>
          <Link to="/water-shooting" className="block rounded-lg border p-4 hover:bg-muted">
            <span className="block font-semibold">WaterShooting</span>
            <span className="text-sm text-muted-foreground">スコアランキングを見る</span>
          </Link>
        </li>
        <li>
          <Link to="/uu-jump" className="block rounded-lg border p-4 hover:bg-muted">
            <span className="block font-semibold">UU-JUMP</span>
            <span className="text-sm text-muted-foreground">タイムランキングを見る(準備中)</span>
          </Link>
        </li>
        <li>
          <Link to="/signage" className="block rounded-lg border p-4 hover:bg-muted">
            <span className="block font-semibold">サイネージ表示</span>
            <span className="text-sm text-muted-foreground">
              会場のモニター向け。全画面で、ランキングを自動で送ります
            </span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
