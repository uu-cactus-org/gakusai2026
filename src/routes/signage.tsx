import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { Maximize, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { z } from 'zod';
import { Button } from '#/components/ui/button';
import { SIGNAGE_BOARDS } from '#/features/signage/boards';
import { useDocumentTheme } from '#/lib/use-document-theme';
import { usePageTitle } from '#/lib/use-page-title';

// 会場のモニターごとに URL で変えられる設定。読めない値は既定に戻す。
const searchSchema = z.object({
  // 1 ページを映す秒数
  interval: z.coerce.number().int().min(3).max(300).default(10).catch(10),
  // 画面に一度に並べる件数。UU-JUMP は、1 ページにこの 2 倍を持たせて、ページの途中で下へ送る
  rows: z.coerce.number().int().min(3).max(20).default(10).catch(10),
  // 1 つのボードで送るページ数の上限(既定は 10 件 × 3 ページで 30 位まで)
  pages: z.coerce.number().int().min(1).max(20).default(3).catch(3),
  // 画面の中央に 16:9 の枠を取り、その中に描く。余りは黒く塗る。
  // 4:3 の iPad をミラーリングで 16:9 のモニターへ出し、モニターのズームで枠を画面いっぱいにするときに使う
  wide: z.coerce.boolean().default(false).catch(false),
});

type Search = z.infer<typeof searchSchema>;

const DEFAULT_SEARCH = {
  interval: 10,
  rows: 10,
  pages: 3,
  wide: false,
} as const satisfies Search;

export const Route = createFileRoute('/signage')({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(DEFAULT_SEARCH)] },
  component: Signage,
});

/** 全画面かどうかと、その切り替え。 */
function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => document.fullscreenElement !== null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(() => {
    // 全画面にできない環境(埋め込みなど)では、何もしない
    const done = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    done.catch(() => {});
  }, []);

  return { isFullscreen, toggle };
}

/** 映している間、画面が消灯やスリープに入らないようにする。対応していないブラウザでは何もしない。 */
function useScreenWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // 省電力モードなどで断られることがある。表示は続ける
      }
    };

    // タブが裏に回るとロックが外れるので、戻ってきたら取り直す
    document.addEventListener('visibilitychange', request);
    void request();
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
    };
  }, []);
}

// ゲームが切り替わるときに、幕を下ろす時間と上げる時間(それぞれ)
const FADE_MS = 300;

function Signage() {
  usePageTitle('サイネージ');
  const { interval, rows, pages, wide } = Route.useSearch();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  useScreenWakeLock();

  const [slide, setSlide] = useState({ board: 0, page: 0 });
  const [paused, setPaused] = useState(false);
  // ボードごとのページ数。ボードがデータを読んでから知らせてくる
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});

  const board = SIGNAGE_BOARDS[slide.board] ?? SIGNAGE_BOARDS[0];
  useDocumentTheme(board.themeClass);
  const pageCount = pageCounts[board.id] ?? 1;
  // 記録が消されてページが減っても、無いページを映さない
  const page = Math.min(slide.page, pageCount - 1);

  const reportPageCount = useCallback(
    (count: number) =>
      setPageCounts((prev) => (prev[board.id] === count ? prev : { ...prev, [board.id]: count })),
    [board.id],
  );

  // 別のボードへ移るときの行き先。入っているあいだ、黒い幕を下ろす。幕が下りきったら映すものを替えて、幕を上げる
  const [fadingTo, setFadingTo] = useState<{ board: number; page: number } | null>(null);
  useEffect(() => {
    if (!fadingTo) return;
    const timer = setTimeout(() => {
      setSlide(fadingTo);
      setFadingTo(null);
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [fadingTo]);

  // 次(+1)か前(-1)へ送る。ボードの端まで行ったら、隣のボードへ移る
  const step = (delta: 1 | -1) => {
    // 幕を下ろしているあいだは、送らない
    if (fadingTo) return;
    const nextPage = page + delta;
    if (nextPage >= 0 && nextPage < pageCount) {
      setSlide({ board: slide.board, page: nextPage });
      return;
    }
    const nextBoard = (slide.board + delta + SIGNAGE_BOARDS.length) % SIGNAGE_BOARDS.length;
    const nextBoardPages = pageCounts[SIGNAGE_BOARDS[nextBoard]?.id ?? ''] ?? 1;
    const next = { board: nextBoard, page: delta > 0 ? 0 : nextBoardPages - 1 };
    // ボードが 1 つだけなら、同じボードの端へ回るだけなので、幕は下ろさない
    if (nextBoard === slide.board) setSlide(next);
    else setFadingTo(next);
  };

  // 自動送り。手で送ったときも、そこから数え直す
  const advance = useEffectEvent(() => step(1));
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(advance, interval * 1000);
    return () => clearTimeout(timer);
  }, [paused, interval, slide]);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    switch (event.key) {
      case 'ArrowRight':
        step(1);
        break;
      case 'ArrowLeft':
        step(-1);
        break;
      case ' ':
        setPaused((prev) => !prev);
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      default:
        return;
    }
    event.preventDefault();
  });
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 画面の左 1/4 を押したら前へ、右 1/4 を押したら次へ送る。タッチのモニターやマウスだけの席で使う
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    // 右上のボタンは、ボタンの働きだけをさせる
    if ((event.target as Element).closest('button')) return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - left) / width;
    if (x < 0.25) step(-1);
    else if (x > 0.75) step(1);
  };

  // 描く枠の大きさ。wide のときは、画面に収まるいちばん大きい 16:9
  const frameWidth = wide ? 'min(100vw, 100vh * 16 / 9)' : '100vw';
  const frameHeight = wide ? 'min(100vh, 100vw * 9 / 16)' : '100vh';

  const frame = (
    <div
      // 続けて押しても、文字の選択や、ダブルタップでの拡大が起きないようにする。
      // wide のときは、背景(fixed で敷いている)も枠の中に収まるよう、枠を fixed の基準にする(contain)
      className={`flex touch-manipulation flex-col overflow-hidden text-foreground select-none ${
        wide ? 'relative contain-layout contain-paint' : 'fixed inset-0'
      } ${isFullscreen ? 'cursor-none' : ''}`}
      onClick={onClick}
      style={
        {
          width: wide ? `calc(${frameWidth})` : undefined,
          height: wide ? `calc(${frameHeight})` : undefined,
          // 文字の大きさを、枠いっぱいまで大きくする。縦は行が、横はボードの列が収まるところまで。
          // 縦に要る高さ(em)は、1 行あたり 2.08(行 1.9 + すき間)と、題字・見出し・ページの点で 4.75
          fontSize: `min(calc(${frameHeight} / ${rows * 2.08 + 4.75}), calc(${frameWidth} / ${board.widthEm}))`,
          // 流れる背景が、1 枚ぶんの幅を枠の高さから出せるようにする
          '--backdrop-height': wide ? `calc(${frameHeight})` : undefined,
        } as CSSProperties
      }
    >
      {board.Backdrop && <board.Backdrop step={slide.board + page} />}

      <header className="flex items-baseline gap-[0.8em] px-[1.5em] pt-[0.4em] pb-[0.2em]">
        {board.Title ? (
          <board.Title />
        ) : (
          <>
            <h1 className="font-display text-[2.2em] leading-none text-primary">{board.title}</h1>
            <p className="text-[0.9em]">{board.subtitle}</p>
          </>
        )}
        {/* 止めていないあいだも、見えないまま場所を取らせる。出し入れすると、題字の行の高さが変わって表が上下に動く */}
        <p className={`text-[0.7em] text-muted-foreground ${paused ? '' : 'invisible'}`}>
          一時停止中
        </p>
      </header>

      <main className="min-h-0 flex-1">
        <board.Component
          key={board.id}
          page={page}
          rows={rows}
          interval={interval}
          paused={paused}
          maxPages={pages}
          onPageCount={reportPageCount}
        />
      </main>

      <footer className="flex flex-col gap-[0.3em] pt-[0.3em]">
        <div
          className="flex justify-center gap-[0.4em]"
          aria-label={`${page + 1} / ${pageCount} ページ`}
        >
          {Array.from({ length: pageCount }, (_, i) => (
            <span key={i} className={`size-[0.35em] ${i === page ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        {/* 次のページへ送るまでの残り。key を変えて、送るたびに最初から動かす */}
        <div className="h-[0.15em] bg-muted">
          <div
            key={`${slide.board}-${slide.page}`}
            className="h-full origin-left bg-primary"
            style={{
              animation: `signage-progress ${interval}s linear forwards`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        </div>
      </footer>

      {/* ゲームが切り替わるときの幕。背景ごと隠す */}
      <div
        className="pointer-events-none absolute inset-0 bg-black transition-opacity ease-linear"
        style={{ opacity: fadingTo ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        aria-hidden="true"
      />

      {/* 操作。全画面のあいだは隠す(キーでの操作は効く) */}
      {!isFullscreen && (
        <div className="absolute top-3 right-3 flex items-center gap-2 text-sm">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={paused ? '再開' : '一時停止'}
            title={paused ? '再開' : '一時停止'}
            onClick={() => setPaused((prev) => !prev)}
          >
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </Button>
          <Button size="sm" onClick={toggleFullscreen}>
            <Maximize aria-hidden="true" />
            全画面
          </Button>
        </div>
      )}
    </div>
  );

  if (!wide) return frame;
  return <div className="fixed inset-0 grid place-items-center bg-black">{frame}</div>;
}
