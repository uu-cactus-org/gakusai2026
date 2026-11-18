import { hc } from 'hono/client';
import type { AppType } from '#/worker/index';

/** Worker の API を、経路と応答の型つきで呼ぶ。 */
export const api = hc<AppType>(window.location.origin).api;
