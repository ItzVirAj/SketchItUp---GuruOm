import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './backend/src/modules/auth/auth.routes';
import mastersRoutes from './backend/src/modules/masters/masters.routes';
import ordersRoutes from './backend/src/modules/orders/orders.routes';
import inventoryRoutes from './backend/src/modules/inventory/inventory.routes';
import grnRoutes from './backend/src/modules/grn/grn.routes';
import bomRoutes from './backend/src/modules/bom/bom.routes';
import purchasingRoutes from './backend/src/modules/purchasing/purchasing.routes';
import productionRoutes from './backend/src/modules/production/production.routes';
import qcRoutes from './backend/src/modules/qc/qc.routes';
import dispatchRoutes from './backend/src/modules/dispatch/dispatch.routes';
import finishedGoodsRoutes from './backend/src/modules/finished-goods/finished-goods.routes';
import outworkRoutes from './backend/src/modules/outwork/outwork.routes';
import invoicesRoutes from './backend/src/modules/invoices/invoices.routes';
import vendorBillsRoutes from './backend/src/modules/vendor-bills/vendor-bills.routes';
import auditRoutes from './backend/src/modules/audit/audit.routes';
import approvalsRoutes from './backend/src/modules/approvals/approvals.routes';
import notificationsRoutes from './backend/src/modules/notifications/notifications.routes';
import meetingsRoutes from './backend/src/modules/meetings/meetings.routes';
import attachmentsRoutes from './backend/src/modules/attachments/attachments.routes';
import testingRoutes from './backend/src/modules/testing/testing.routes';
import adminRoutes from './backend/src/modules/admin/admin.routes';
import { getRedisClient, closeRedis } from './backend/src/lib/redis';
import { logger } from './backend/src/utils/logger';

dotenv.config(); // Reload environment configuration on server watch restart

// ESM-safe __dirname (M-06). import.meta.url is the standards-based ESM equivalent of
// __dirname and works under tsx / Vite. esbuild's CJS bundle rewrites import.meta, so
// we fall back to the launch script path (process.argv[1]) there instead of relying
// on __filename, which does not exist in native ESM.
const __dirname = (() => {
  try {
    if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string') {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch (_) { /* fall through to launch-path resolution */ }
  return path.dirname(process.argv[1] || '.');
})();

async function startServer() {
  // Initialize shared Redis fast-layer connection gracefully
  getRedisClient();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Immediate Health Check Endpoints (for Render proxy and load balancers).
  // /health and /api/health share one canonical JSON handler to avoid drift (L-02).
  const handleHealth = (_req: unknown, res: { status(code: number): any; json(body: unknown): any }) => {
    res.status(200).json({
      status: 'ok',
      service: 'guruom-owner-os',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  };
  app.get('/health', handleHealth);
  app.get('/api/health', handleHealth);

  // CORS Configuration for Credentialed Requests (Cookies & JWTs)
  const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000')
    .split(',')
    .map(o => o.trim());

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin, health checks)
      if (!origin) return callback(null, true);
      // Fail-closed credentialed CORS (C-04): ONLY origins explicitly listed in
      // FRONTEND_ORIGIN are allowed; everything else is rejected. Never key this
      // behaviour off NODE_ENV, which would default to an insecure open state.
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  }));

  app.use(express.json());
  app.use(cookieParser());

  // Mount Custom JWT Auth Module
  app.use('/api/v1/auth', authRoutes);

  // Mount First Batch Business REST API Modules
  app.use('/api/v1/masters', mastersRoutes);
  app.use('/api/v1/orders', ordersRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);

  // Mount Second Batch Business REST API Modules (GRN, BOM, Purchasing)
  app.use('/api/v1/grn', grnRoutes);
  app.use('/api/v1/bom', bomRoutes);
  app.use('/api/v1/purchasing', purchasingRoutes);

  // Mount Third Batch Business REST API Modules (Production & QC/PDI)
  app.use('/api/v1/production', productionRoutes);
  app.use('/api/v1/jobcards', productionRoutes);
  app.use('/api/v1/qc', qcRoutes);
  app.use('/api/v1/pdi', qcRoutes);

  // Mount Fourth Batch Business REST API Modules (Dispatch, Finished Goods, Outwork)
  app.use('/api/v1/dispatch', dispatchRoutes);
  app.use('/api/v1/finished-goods', finishedGoodsRoutes);
  app.use('/api/v1/outwork', outworkRoutes);

  // Mount Fifth Batch Finance REST API Modules (Invoices & Vendor Bills)
  app.use('/api/v1/invoices', invoicesRoutes);
  app.use('/api/v1/vendor-bills', vendorBillsRoutes);

  // Mount Sixth Batch Governance REST API Modules (Audit Logs & Approvals)
  app.use('/api/v1/audit', auditRoutes);
  app.use('/api/v1/approvals', approvalsRoutes);

  // Mount Seventh Batch Realtime Notification System (SSE Stream & Resend Email Service)
  app.use('/api/v1/notifications', notificationsRoutes);

  // Mount HR Module — Meetings submodule (scheduler + reminders, not a meeting platform)
  app.use('/api/v1/meetings', meetingsRoutes);

  // Mount Eighth Batch File Storage & Attachment Management
  app.use('/api/v1/attachments', attachmentsRoutes);

  // Mount Dedicated ServerAdmin Platform Maker Governance Module
  // (H-03) mounted under /api/v1 only; the bare /admin path belongs to the
  // client-side SPA router and must not be intercepted by the API router.
  app.use('/api/v1/admin', adminRoutes);

  // Mount Developer Workflow Testing Dashboard Router
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/v1/testing', testingRoutes);
  }

  // Gemini Executive AI Copilot API
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
      }
      const { prompt, context } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are Stratum AI Executive Copilot, an advanced business analytics and workspace intelligence assistant. Provide precise, actionable, data-driven answers in clean markdown format. Keep tone professional, concise, and executive-ready. Focus on metric trends, anomaly resolution, team performance, and strategic growth.`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nContext Data: ${JSON.stringify(context || {})}\n\nUser Prompt: ${prompt}` }]
          }
        ]
      });
      res.json({ text: response.text });
    } catch (err: any) {
      logger.error('Gemini API Error:', err);
      res.status(500).json({ error: err.message || 'Failed to process AI request' });
    }
  });

  // Vite middleware in development vs Static Assets in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
      ? path.join(process.cwd(), 'dist')
      : path.resolve(__dirname);

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('GuruOm OS service is operational.');
      }
    });
  }

  // Global Error Handler Middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('⚠️ [Server Error]:', err.message || err);
    if (res.headersSent) return;
    res.status(err.status || 500).json({
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred'
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down server gracefully...');
    server.close(async () => {
      await closeRedis();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  logger.error('❌ Fatal Server Startup Error:', err);
  process.exit(1);
});
