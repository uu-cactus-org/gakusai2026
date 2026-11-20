import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowRight, Gamepad2, Monitor } from 'lucide-react';
import type { ReactNode } from 'react';
import { FestivalBackdrop } from '#/features/home/backdrop';
import { FestivalFooter } from '#/features/home/footer';
import { Podium } from '#/features/home/podium';
import { FESTIVAL_THEME } from '#/features/home/theme';
import { Cactakun } from '#/features/uu-jump/cactakun';
import { useDocumentTheme } from '#/lib/use-document-theme';
import player from '#/assets/water-shooting/player_medium.png';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  useDocumentTheme(FESTIVAL_THEME);

  return (
    // main を伸ばして、フッターを画面の下へ寄せる
    <div className="flex min-h-dvh flex-col">
      <FestivalBackdrop />
      {/* 上は、背景の旗のガーランドに重ならないだけ空ける */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-20 pb-4 sm:px-6 sm:pt-28">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col items-start gap-4">
            <p className="festival-outline bg-festival-green px-3 text-2xl leading-[1.6] text-white shadow-[4px_4px_0_#1f6b28]">
              情報研究会 CACTUS
            </p>
            <h1 className="festival-title text-4xl leading-[1.25] sm:text-5xl">
              <span className="block text-primary">峰ヶ丘祭2026</span>
              <span className="block">スコアランキング</span>
            </h1>
          </div>
          {/* 背の低いスマホでは、縦に収まるよう表彰台を出さない */}
          <div className="self-center max-md:[@media(max-height:780px)]:hidden md:self-auto">
            <Podium />
          </div>
        </header>

        {/* 広い画面では 2 つのゲームを横に並べて、縦に収める */}
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <li>
            <GameLink
              to="/water-shooting"
              shadow="shadow-[6px_6px_0_#6cc3ff]"
              icon={<img src={player} alt="" className="pixelated size-[60px]" />}
              title={
                <span className="font-display text-3xl leading-none text-primary">
                  WaterShooting
                </span>
              }
              description="スコアランキングを見る"
            />
          </li>
          <li>
            <GameLink
              to="/uu-jump"
              shadow="shadow-[6px_6px_0_#42b147]"
              icon={<Cactakun className="size-16" />}
              title={
                <span
                  className="uu-jump-title font-['DotGothic16'] text-3xl leading-none"
                  style={{ '--uu-jump-edge': '2px' } as React.CSSProperties}
                >
                  UU-JUMP
                </span>
              }
              description="タイムランキングを見る"
            />
          </li>
        </ul>

        <Link
          to="/past-games"
          className="flex items-center justify-between gap-3 border-2 border-foreground bg-card px-4 py-2.5 shadow-[6px_6px_0_#ffe079] transition-transform hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <span className="flex items-center gap-3">
            <Gamepad2 aria-hidden="true" className="size-6 shrink-0 text-primary" />
            過去のゲームはこちら
          </span>
          <ArrowRight aria-hidden="true" className="size-6 shrink-0 text-primary" />
        </Link>

        {/* 会場のモニター向けの表示。来場者が押すものではないので、小さく置く */}
        <div className="flex items-center justify-between gap-4">
          {/* 部員向けの zip の配布。合言葉が要るので、目立たせずに端へ置く */}
          <Link
            to="/games"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            部員用
          </Link>
          <Link
            to="/signage"
            className="flex items-center gap-2 border-2 border-foreground bg-card px-3 py-1.5 text-sm shadow-[4px_4px_0_#ff6a91] transition-transform hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Monitor aria-hidden="true" className="size-4" />
            サイネージ表示
          </Link>
        </div>
      </main>
      <FestivalFooter />
    </div>
  );
}

/** ランキングへのリンク。色つきの影を付けた板で、押すと影のほうへ沈む。 */
function GameLink({
  to,
  shadow,
  icon,
  title,
  description,
}: {
  to: '/water-shooting' | '/uu-jump';
  /** 影の色を決めるクラス */
  shadow: string;
  /** 左に置くキャラの絵 */
  icon?: ReactNode;
  title: ReactNode;
  description: string;
}) {
  return (
    <Link
      to={to}
      className={`flex h-full items-center gap-3 border-2 border-foreground bg-card p-3 sm:gap-4 sm:p-4 transition-transform hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none ${shadow}`}
    >
      {icon && <span className="flex w-16 shrink-0 justify-center">{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        {title}
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-6 shrink-0 text-primary" />
    </Link>
  );
}
