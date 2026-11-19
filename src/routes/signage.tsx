import { Link, createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { z } from 'zod';
import { Button } from '#/components/ui/button';
import { SIGNAGE_BOARDS } from '#/features/signage/boards';
import { GameBackdrop } from '#/features/water-shooting/backdrop';

// 会場のモニターごとに URL で変えられる設定。読めない値は既定に戻す。
const searchSchema = z.object({
  // 1 ページを映す秒数
  interval: z.coerce.number().int().min(3).max(300).default(10).catch(10),
  // 1 ページに並べる件数
  rows: z.coerce.number().int().min(3).max(20).default(10).catch(10),
  // 1 つのボードで送るページ数の上限(既定は 10 件 × 3 ページで 30 位まで)
  pages: z.coerce.number().int().min(1).max(20).default(3).catch(3),
});

type Search = z.infer<typeof searchSchema>;

const DEFAULT_SEARCH = { interval: 10, rows: 10, pages: 3 } as const satisfies Search;

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

function Signage() {
  const { interval, rows, pages } = Route.useSearch();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  useScreenWakeLock();

  const [slide, setSlide] = useState({ board: 0, page: 0 });
  const [paused, setPaused] = useState(false);
  // ボードごとのページ数。ボードがデータを読んでから知らせてくる
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});

  const board = SIGNAGE_BOARDS[slide.board] ?? SIGNAGE_BOARDS[0];
  const pageCount = pageCounts[board.id] ?? 1;
  // 記録が消されてページが減っても、無いページを映さない
  const page = Math.min(slide.page, pageCount - 1);

  const reportPageCount = useCallback(
    (count: number) =>
      setPageCounts((prev) => (prev[board.id] === count ? prev : { ...prev, [board.id]: count })),
    [board.id],
  );

  // 次(+1)か前(-1)へ送る。ボードの端まで行ったら、隣のボードへ移る
  const step = (delta: 1 | -1) => {
    const nextPage = page + delta;
    if (nextPage >= 0 && nextPage < pageCount) {
      setSlide({ board: slide.board, page: nextPage });
      return;
    }
    const nextBoard = (slide.board + delta + SIGNAGE_BOARDS.length) % SIGNAGE_BOARDS.length;
    const nextBoardPages = pageCounts[SIGNAGE_BOARDS[nextBoard]?.id ?? ''] ?? 1;
    setSlide({ board: nextBoard, page: delta > 0 ? 0 : nextBoardPages - 1 });
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

  return (
    <div
      className={`dark fixed inset-0 flex flex-col overflow-hidden text-foreground ${
        isFullscreen ? 'cursor-none' : ''
      }`}
      // 文字の大きさを画面に合わせる。行数が増えたら、その分だけ小さくする
      style={{ fontSize: `min(${45 / rows}vh, 2vw)` }}
    >
      {/* ページを送るたびに、次のステージの背景へ切り替える */}
      <GameBackdrop stage={slide.board + page} scroll dim={0.55} />

      <header className="flex items-baseline gap-[0.8em] px-[1.5em] pt-[0.4em] pb-[0.2em]">
        <h1 className="font-display text-[2.2em] leading-none text-primary">{board.title}</h1>
        <p className="text-[0.9em]">{board.subtitle}</p>
        {paused && <p className="text-[0.7em] text-muted-foreground">一時停止中</p>}
      </header>

      <main className="min-h-0 flex-1">
        <board.Component
          key={board.id}
          page={page}
          rows={rows}
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

      {/* 操作。全画面のあいだは隠す(キーでの操作は効く) */}
      {!isFullscreen && (
        <div className="absolute top-3 right-3 flex items-center gap-2 text-sm">
          <Button variant="outline" size="sm" render={<Link to="/" />} nativeButton={false}>
            もどる
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPaused((prev) => !prev)}>
            {paused ? '再開' : '一時停止'}
          </Button>
          <Button size="sm" onClick={toggleFullscreen}>
            全画面にする
          </Button>
        </div>
      )}
    </div>
  );
}
