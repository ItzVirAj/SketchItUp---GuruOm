import express from 'express';
import path from 'path';
import fs from 'fs';
<<<<<<< HEAD
import { GoogleGenAI } from '@google/genai';
import cookieParser from 'cookie-parser';
import cors from 'cors';
=======
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
>>>>>>> backup-old-main
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
<<<<<<< HEAD
import attachmentsRoutes from './backend/src/modules/attachments/attachments.routes';
import testingRoutes from './backend/src/modules/testing/testing.routes';
import adminRoutes from './backend/src/modules/admin/admin.routes';
import { getRedisClient, closeRedis } from './backend/src/lib/redis';
import copilotRoutes from './backend/src/modules/copilot/copilot.routes';
import metricsRoutes from './backend/src/modules/metrics/metrics.routes';


dotenv.config();

const __dirname = path.dirname(process.argv[1] || __filename || '.');
=======
import meetingsRoutes from './backend/src/modules/meetings/meetings.routes';
import tasksRoutes from './backend/src/modules/tasks/tasks.routes';
import taskTemplatesRoutes from './backend/src/modules/tasks/task-templates.routes';
import leaveRoutes from './backend/src/modules/leave/leave.routes';
import attendanceRoutes from './backend/src/modules/attendance/attendance.routes';
import certificationsRoutes from './backend/src/modules/certifications/certifications.routes';
import employeeCertificationsRoutes from './backend/src/modules/employeeCertifications/employeeCertifications.routes';
import announcementsRoutes from './backend/src/modules/announcements/announcements.routes';
import employeesRoutes from './backend/src/modules/employees/employees.routes';
import attachmentsRoutes from './backend/src/modules/attachments/attachments.routes';
import testingRoutes from './backend/src/modules/testing/testing.routes';
import { checkRbacRoleConsistency } from './backend/src/utils/rbacConsistencyCheck';
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
>>>>>>> backup-old-main

async function startServer() {
  // Initialize shared Redis fast-layer connection gracefully
  getRedisClient();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

<<<<<<< HEAD
  // Immediate Health Check Endpoints (for Render proxy and load balancers)
  app.get('/health', (_req, res) => {
    res.status(200).send('OK');
  });
  app.get('/api/health', (_req, res) => {
=======
  // Immediate Health Check Endpoints (for Render proxy and load balancers).
  // /health and /api/health share one canonical JSON handler to avoid drift (L-02).
  const handleHealth = (_req: unknown, res: { status(code: number): any; json(body: unknown): any }) => {
>>>>>>> backup-old-main
    res.status(200).json({
      status: 'ok',
      service: 'guruom-owner-os',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
<<<<<<< HEAD
  });
=======
  };
  app.get('/health', handleHealth);
  app.get('/api/health', handleHealth);

  // Security headers. CSP is deliberately left DISABLED here: this server also
  // serves the Vite SPA (and in dev, Vite's HMR client), and a default-src CSP
  // would break inline styles/scripts the bundle relies on. Enabling CSP needs
  // a nonce/hash strategy worked out against the real bundle — a separate,
  // testable change rather than something to switch on blind. Everything else
  // helmet provides (X-Frame-Options/frameguard, X-Content-Type-Options,
  // Referrer-Policy, HSTS in production, X-DNS-Prefetch-Control, etc.) is safe
  // to enable as-is and costs nothing.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // Allow the SPA's assets/images to be loaded cross-origin (e.g. from a CDN
    // or a separately-hosted frontend origin) — 'same-origin' would break that.
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
>>>>>>> backup-old-main

  // CORS Configuration for Credentialed Requests (Cookies & JWTs)
  const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000')
    .split(',')
    .map(o => o.trim());

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin, health checks)
      if (!origin) return callback(null, true);
<<<<<<< HEAD
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
=======
      // Fail-closed credentialed CORS (C-04): ONLY origins explicitly listed in
      // FRONTEND_ORIGIN are allowed; everything else is rejected. Never key this
      // behaviour off NODE_ENV, which would default to an insecure open state.
      if (allowedOrigins.includes(origin)) {
>>>>>>> backup-old-main
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

<<<<<<< HEAD
  // Metrics
  app.use('/api/v1/metrics', metricsRoutes);

=======
>>>>>>> backup-old-main
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

<<<<<<< HEAD
=======
  // Mount HR Module — Meetings submodule (scheduler + reminders, not a meeting platform)
  app.use('/api/v1/meetings', meetingsRoutes);

  // Mount HR Module — Tasks submodule (internal action-item / job assignment tracker)
  app.use('/api/v1/tasks', tasksRoutes);
  // HR Module — Task Templates (bundled task creation, e.g. onboarding checklists)
  app.use('/api/v1/task-templates', taskTemplatesRoutes);
  // HR Module — Leave/Time-Off Requests
  app.use('/api/v1/leave', leaveRoutes);
  app.use('/api/leave', leaveRoutes);
  // HR Module — Attendance / Shift Log
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/attendance', attendanceRoutes);
  // HR Module — Certifications & training expiry reminders
  app.use('/api/v1/certifications', certificationsRoutes);
  app.use('/api/certifications', certificationsRoutes);
  // HR Module — Employee Certifications (distinct from QC/PDI certificates)
  app.use('/api/v1/employee-certifications', employeeCertificationsRoutes);
  app.use('/api/employee-certifications', employeeCertificationsRoutes);
  // HR Module — Company Announcements
  app.use('/api/v1/announcements', announcementsRoutes);
  app.use('/api/announcements', announcementsRoutes);
  // HR Module — Employee Master (projection of internal users only)
  app.use('/api/v1/employees', employeesRoutes);

>>>>>>> backup-old-main
  // Mount Eighth Batch File Storage & Attachment Management
  app.use('/api/v1/attachments', attachmentsRoutes);

  // Mount Dedicated ServerAdmin Platform Maker Governance Module
<<<<<<< HEAD
  app.use('/api/v1/admin', adminRoutes);
  app.use('/admin', adminRoutes);
  app.use('/api/v1/copilot', copilotRoutes);
=======
  // (H-03) mounted under /api/v1 only; the bare /admin path belongs to the
  // client-side SPA router and must not be intercepted by the API router.
  app.use('/api/v1/admin', adminRoutes);

>>>>>>> backup-old-main
  // Mount Developer Workflow Testing Dashboard Router
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/v1/testing', testingRoutes);
  }

<<<<<<< HEAD
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
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nContext Data: ${JSON.stringify(context || {})}\n\nUser Prompt: ${prompt}` }]
          }
        ]
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.status(500).json({ error: err.message || 'Failed to process AI request' });
    }
  });
=======
  // REMOVED (security): `POST /api/gemini/analyze` was mounted here with no
  // requireAuth and no rate limiting — any anonymous caller on the internet
  // could send arbitrary prompts through it and consume the GEMINI_API_KEY
  // quota/budget. Its only frontend caller (AiStudioView.tsx) is no longer
  // imported anywhere in the live console, so the endpoint had zero
  // legitimate traffic. If the AI copilot is revived, re-mount it behind
  // requireAuth + requirePermission + a rate limiter, and re-wire the
  // frontend at the same time — do not restore it unauthenticated.
>>>>>>> backup-old-main

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
<<<<<<< HEAD
    console.error('⚠️ [Server Error]:', err.message || err);
=======
    logger.error('⚠️ [Server Error]:', err.message || err);
>>>>>>> backup-old-main
    if (res.headersSent) return;
    res.status(err.status || 500).json({
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred'
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
<<<<<<< HEAD
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = async () => {
    console.log('Shutting down server gracefully...');
=======
    logger.info(`Server listening on http://0.0.0.0:${PORT}`);
  });

  // RBAC fix #1 — non-fatal drift check between rbacMatrix.ts and the DB
  // roles table. Fire-and-forget: never blocks startup, never crashes the
  // process — checkRbacRoleConsistency() catches its own DB errors and only
  // ever logs. See backend/src/utils/rbacConsistencyCheck.ts for why this is
  // a warning and not a boot-time failure.
  checkRbacRoleConsistency().catch((err) => {
    logger.warn('[RBAC Consistency Check] Unexpected error running the check itself:', err);
  });

  const shutdown = async () => {
    logger.info('Shutting down server gracefully...');
>>>>>>> backup-old-main
    server.close(async () => {
      await closeRedis();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
<<<<<<< HEAD
  console.error('❌ Fatal Server Startup Error:', err);
=======
  logger.error('❌ Fatal Server Startup Error:', err);
>>>>>>> backup-old-main
  process.exit(1);
});
