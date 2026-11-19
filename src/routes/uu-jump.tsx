import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import titleImage from '#/assets/uu-jump/menu_bg.png';
import { Button } from '#/components/ui/button';
import { Cactakun } from '#/features/uu-jump/cactakun';
import { UuJumpRankingTable } from '#/features/uu-jump/ranking-table';
import { SAMPLE_RUNS } from '#/features/uu-jump/runs';
import type { UuJumpRun } from '#/features/uu-jump/runs';
import { UU_JUMP_THEME } from '#/features/uu-jump/theme';
import { useDocumentTheme } from '#/lib/use-document-theme';

export const Route = createFileRoute('/uu-jump')({ component: UuJumpRanking });

// データの持ち方はまだ決めていないので、API は呼ばない。本番では「準備中」を出す。
// ローカル開発では、見た目を確かめられるよう仮の記録を並べる。
const runs: UuJumpRun[] = import.meta.env.DEV ? SAMPLE_RUNS : [];

function UuJumpRanking() {
  useDocumentTheme(UU_JUMP_THEME);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <div>
        <Button variant="outline" size="sm" render={<Link to="/" />} nativeButton={false}>
          <ArrowLeft aria-hidden="true" />
          一覧に戻る
        </Button>
      </div>

      {/* ゲームのタイトル画面の絵。題名(UU-JUMP)は絵の中にあるので、文字の見出しは読み上げ用だけ */}
      <header>
        <h1 className="sr-only">UU-JUMP ランキング</h1>
        <img
          src={titleImage}
          alt=""
          width={681}
          height={383}
          className="pixelated mx-auto block h-auto max-h-[50vh] w-auto max-w-full border-4 border-foreground"
        />
      </header>

      <section className="border-4 border-foreground bg-card px-3 py-4 sm:px-5">
        <div className="flex items-center gap-3 pb-3">
          <Cactakun size={48} />
          <h2 className="text-2xl font-bold whitespace-nowrap">タイムランキング</h2>
          {import.meta.env.DEV && (
            <p className="ml-auto text-right text-xs text-muted-foreground">
              仮の記録(ローカルだけ)
            </p>
          )}
        </div>
        {runs.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">ランキングは準備中です</p>
        ) : (
          <UuJumpRankingTable runs={runs} />
        )}
      </section>
    </main>
  );
}
