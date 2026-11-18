import { Hono } from 'hono';
import { adminApp } from './admin';
import { devicesApp } from './devices';

const app = new Hono<{ Bindings: Env }>()
  .basePath('/api')
  .route('/devices', devicesApp)
  .route('/admin', adminApp);

export type AppType = typeof app;
export default app;
