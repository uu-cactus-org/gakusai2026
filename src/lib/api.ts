import { hc } from 'hono/client';
import type { AppType } from '#/worker/index';

/** Worker の API を、経路と応答の型つきで呼ぶ。 */
// ブラウザのキャッシュは使わない。開いたままの画面(サイネージ)が、古い応答を使い回さないようにする
export const api = hc<AppType>(window.location.origin, { init: { cache: 'no-store' } }).api;
