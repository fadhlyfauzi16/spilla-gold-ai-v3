import 'dotenv/config';

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { marketRouter } from './server/routes/marketRoutes.js';
import { fundamentalRouter } from './server/routes/fundamentalRoutes.js';
import { dashboardRouter } from './server/routes/dashboardRoutes.js';
import { newsRouter } from './server/routes/newsRoutes.js';
import { calendarRouter } from './server/routes/calendarRoutes.js';
import { systemRouter } from './server/routes/systemRoutes.js';
import { healthRouter } from './server/routes/healthRoutes.js';
import { eaRouter } from './server/routes/eaRoutes.js';
import { authRouter } from './server/routes/authRoutes.js';
import { adminRouter } from './server/routes/adminRoutes.js';
import { copytradeRouter } from './server/routes/copytradeRoutes.js';
import { telegramRouter } from './server/routes/telegramRoutes.js';

import {
  technicalRouter,
  sentimentRouter,
  riskRouter,
  recommendationRouter,
  aiRouter,
  historyRouter,
  collectorsRouter,
  settingsRouter,
  logsRouter,
} from './server/routes/analysisRoutes.js';

import { snapshotRouter } from './server/routes/snapshotRoutes.js';
import { copilotRouter } from './server/routes/copilotRoutes.js';
import { tradeRouter } from './server/routes/tradeRoutes.js';
import { mt5WorkerRouter } from './server/routes/mt5WorkerRoutes.js';
import {
  creditRouter,
  adminCreditRouter,
} from './server/routes/creditRoutes.js';

// ======================================================
// CRYPTO AI ENGINE — ISOLATED INDODAX MODULE
// ======================================================
import { indodaxRouter } from './server/routes/indodaxRoutes.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: '10mb',
    }),
  );

  // ======================================================
  // HEALTH CHECK
  // ======================================================
  app.use('/api/health', healthRouter);

  // ======================================================
  // EXISTING MT5 EXECUTION SYSTEM
  // DO NOT MIX WITH INDODAX EXECUTION
  // ======================================================

  // MT5 Execution Bridge Queue
  app.use('/api/trade', tradeRouter);

  // MT5 Multi-User Worker & Heartbeat
  app.use('/api/mt5', mt5WorkerRouter);

  // ======================================================
  // EXISTING SPILLA AI CREDIT SYSTEM
  // ======================================================
  app.use('/api/credit', creditRouter);
  app.use('/api/admin/credit', adminCreditRouter);

  // ======================================================
  // EXISTING AUTH / ADMIN / COPY TRADE
  // ======================================================
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);

  // ======================================================
  // TELEGRAM NOTIFICATION GATEWAY — ADMIN ONLY
  // ======================================================
  app.use(
    '/api/admin/telegram',
    telegramRouter,
  );

  app.use('/api/copytrade', copytradeRouter);

  // ======================================================
  // EXISTING AI COPILOT
  // ======================================================
  app.use('/api/copilot', copilotRouter);

  // ======================================================
  // NEW CRYPTO AI ENGINE — INDODAX
  // ISOLATED FROM MT5
  // ======================================================
  app.use('/api/crypto', indodaxRouter);
  app.use('/api/indodax', indodaxRouter);

  // ======================================================
  // EXISTING CORE API ENDPOINTS
  // ======================================================
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/fundamental', fundamentalRouter);
  app.use('/api/technical', technicalRouter);
  app.use('/api/sentiment', sentimentRouter);
  app.use('/api/risk', riskRouter);
  app.use('/api/recommendation', recommendationRouter);

  // Existing EA / MT5 data
  app.use('/api/ea', eaRouter);
  app.use('/api/mt5-data', eaRouter);

  app.use('/api/snapshot', snapshotRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/news', newsRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/system', systemRouter);

  // ======================================================
  // EXISTING HELPER ENDPOINTS
  // ======================================================
  app.use('/api/market', marketRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/collectors', collectorsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/logs', logsRouter);

  // ======================================================
  // FRONTEND — DEVELOPMENT / PRODUCTION
  // ======================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(
      process.cwd(),
      'dist',
    );

    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(
        path.join(distPath, 'index.html'),
      );
    });
  }

  // ======================================================
  // START SERVER
  // ======================================================
  app.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `SPILLA GOLD Analysis Engine running on http://0.0.0.0:${PORT}`,
      );
    },
  );
}

startServer();