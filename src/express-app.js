import express from 'express';
import { hypersite } from './lib/hypersite-middleware.js';

export function setupExpress({ coreStore }) {
  const app = express();

  app.use(hypersite({
    prefix: '/hyper',
    coreStore
  }));

  return app;
}
