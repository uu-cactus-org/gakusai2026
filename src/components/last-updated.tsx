import { useEffect, useState } from 'react';
import { formatElapsed } from '#/lib/format';

/**
 * 「最終更新 n秒前」。最後にサーバーから取れた時刻(TanStack Query の dataUpdatedAt)を渡す。
 * 邪魔にならないよう、画面の一番下に小さく出す前提。
 */
export function LastUpdated({ updatedAt }: { updatedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // まだ 1 度も取れていない
  if (updatedAt <= 0) return null;
  return (
    <p className="text-right text-xs text-muted-foreground tabular-nums">
      最終更新 {formatElapsed(now - updatedAt)}
    </p>
  );
}
