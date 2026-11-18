import { Hono } from 'hono';
import { adminApp } from './admin';
import { devicesApp } from './devices';
import { waterShootingApp } from './water-shooting';

const app = new Hono<{ Bindings: Env }>()
  .basePath('/api')
  .route('/devices', devicesApp)
  .route('/water-shooting', waterShootingApp)
  .route('/admin', adminApp);

export type AppType = typeof app;
export default app;
