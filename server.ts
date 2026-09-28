import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
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
import adminRoutes from './backend/src/modules/admin/admin.routes';
import copilotRoutes from './backend/src/modules/copilot/copilot.routes';
import metricsRoutes from './backend/src/modules/metrics/metrics.routes';


import { checkRbacRoleConsistency } from './backend/src/utils/rbacConsistencyCheck';
import { getRedisClient, closeRedis } from './backend/src/lib/redis';
import { logger } from './backend/src/utils/logger';

dotenv.config();

// ESM-safe __dirname.
// Works under tsx/Vite and also when bundled by esbuild into CommonJS.
const __dirname = (() => {
  try {
    if (
      typeof import.meta !== 'undefined' &&
      typeof import.meta.url === 'string'
    ) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch (_) {
    // Fall through to launch-path resolution.
  }

  return path.dirname(process.argv[1] || '.');
})();

async function startServer() {
  // Initialize shared Redis fast-layer connection gracefully.
  getRedisClient();

  const app = express();

  const PORT = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  // Canonical health handler shared by both endpoints.
  const handleHealth = (
    _req: express.Request,
    res: express.Response
  ) => {
    res.status(200).json({
      status: 'ok',
      service: 'guruom-owner-os',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };

  // Immediate health endpoints for Render/load balancers.
  app.get('/health', handleHealth);
  app.get('/api/health', handleHealth);

  // ============================================================================
  // SECURITY HEADERS
  // ============================================================================

  // CSP is deliberately disabled because this server also serves the Vite SPA
  // and Vite HMR in development. The remaining Helmet protections are enabled.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    })
  );

  // ============================================================================
  // CORS
  // ============================================================================

  const allowedOrigins = (
    process.env.FRONTEND_ORIGIN ||
    'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Requests without an Origin header are allowed.
        // This covers curl, health checks, server-to-server requests, etc.
        if (!origin) {
          return callback(null, true);
        }

        // Fail-closed CORS:
        // only explicitly configured frontend origins are allowed.
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'), false);
      },

      credentials: true,

      methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ],

      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
      ],
    })
  );

  // ============================================================================
  // CORE EXPRESS MIDDLEWARE
  // ============================================================================

  app.use(express.json());
  app.use(cookieParser());

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  app.use('/api/v1/auth', authRoutes);

  // ============================================================================
  // METRICS
  // ============================================================================

  app.use('/api/v1/metrics', metricsRoutes);



  // ============================================================================
  // BUSINESS REST API
  // ============================================================================

  // First Batch — Masters, Orders, Inventory
  app.use('/api/v1/masters', mastersRoutes);
  app.use('/api/v1/orders', ordersRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);

  // Second Batch — GRN, BOM, Purchasing
  app.use('/api/v1/grn', grnRoutes);
  app.use('/api/v1/bom', bomRoutes);
  app.use('/api/v1/purchasing', purchasingRoutes);

  // Third Batch — Production, Job Cards, QC, PDI
  app.use('/api/v1/production', productionRoutes);
  app.use('/api/v1/jobcards', productionRoutes);
  app.use('/api/v1/qc', qcRoutes);
  app.use('/api/v1/pdi', qcRoutes);

  // Fourth Batch — Dispatch, Finished Goods, Outwork
  app.use('/api/v1/dispatch', dispatchRoutes);
  app.use('/api/v1/finished-goods', finishedGoodsRoutes);
  app.use('/api/v1/outwork', outworkRoutes);

  // Fifth Batch — Finance
  app.use('/api/v1/invoices', invoicesRoutes);
  app.use('/api/v1/vendor-bills', vendorBillsRoutes);

  // Sixth Batch — Governance
  app.use('/api/v1/audit', auditRoutes);
  app.use('/api/v1/approvals', approvalsRoutes);

  // Seventh Batch — Notifications
  app.use('/api/v1/notifications', notificationsRoutes);

  // ============================================================================
  // HR MODULE
  // ============================================================================

  // Meetings
  app.use('/api/v1/meetings', meetingsRoutes);

  // Tasks
  app.use('/api/v1/tasks', tasksRoutes);

  // Task Templates
  app.use('/api/v1/task-templates', taskTemplatesRoutes);

  // Leave / Time-Off
  app.use('/api/v1/leave', leaveRoutes);
  app.use('/api/leave', leaveRoutes);

  // Attendance / Shift Log
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/attendance', attendanceRoutes);

  // Certifications
  app.use('/api/v1/certifications', certificationsRoutes);
  app.use('/api/certifications', certificationsRoutes);

  // Employee Certifications
  app.use(
    '/api/v1/employee-certifications',
    employeeCertificationsRoutes
  );
  app.use(
    '/api/employee-certifications',
    employeeCertificationsRoutes
  );

  // Company Announcements
  app.use('/api/v1/announcements', announcementsRoutes);
  app.use('/api/announcements', announcementsRoutes);

  // Employee Master
  app.use('/api/v1/employees', employeesRoutes);

  // ============================================================================
  // FILE STORAGE / ATTACHMENTS
  // ============================================================================

  app.use('/api/v1/attachments', attachmentsRoutes);

  // ============================================================================
  // ADMIN / PLATFORM GOVERNANCE
  // ============================================================================

  // Keep the API admin route under /api/v1.
  //
  // Do NOT mount /admin here because /admin belongs to the SPA's
  // client-side routing and intercepting it with Express would break
  // the frontend admin page.
  app.use('/api/v1/admin', adminRoutes);

  // ============================================================================
  // AI OWNER COPILOT
  // ============================================================================

  app.use('/api/v1/copilot', copilotRoutes);

  // ============================================================================
  // DEVELOPMENT TESTING ROUTES
  // ============================================================================

  // Never expose the testing dashboard in production.
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/v1/testing', testingRoutes);
  }

  // ============================================================================
  // GEMINI ENDPOINT
  // ============================================================================

  /*
   * The old unauthenticated:
   *
   * POST /api/gemini/analyze
   *
   * endpoint has intentionally been removed.
   *
   * It exposed GEMINI_API_KEY-backed AI functionality without authentication
   * or rate limiting, which could allow anonymous callers to consume the
   * project's Gemini quota/budget.
   *
   * The current AI functionality is mounted through:
   *
   * POST /api/v1/copilot
   *
   * using the dedicated Copilot module.
   *
   * If Gemini functionality is ever reintroduced, it must be protected with
   * authentication, permissions and rate limiting before being exposed.
   */

  // ============================================================================
  // VITE / STATIC FRONTEND
  // ============================================================================

  if (process.env.NODE_ENV !== 'production') {
    // Development:
    // Run Vite in middleware mode so Express and Vite share the same server.
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production:
    // Serve the compiled Vite frontend.
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
      ? path.join(process.cwd(), 'dist')
      : path.resolve(__dirname);

    app.use(express.static(distPath));

    // SPA fallback.
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res
          .status(200)
          .send('GuruOm OS service is operational.');
      }
    });
  }

  // ============================================================================
  // GLOBAL ERROR HANDLER
  // ============================================================================

  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logger.error(
        '⚠️ [Server Error]:',
        err?.message || err
      );

      if (res.headersSent) {
        return;
      }

      res.status(err?.status || 500).json({
        error: err?.name || 'InternalServerError',
        message:
          err?.message ||
          'An unexpected error occurred',
      });
    }
  );

  // ============================================================================
  // START SERVER
  // ============================================================================

  const server = app.listen(
    PORT,
    '0.0.0.0',
    () => {
      logger.info(
        `Server listening on http://0.0.0.0:${PORT}`
      );
    }
  );

  // ============================================================================
  // RBAC CONSISTENCY CHECK
  // ============================================================================

  // Non-fatal drift check between rbacMatrix.ts and the DB roles table.
  // It never blocks server startup and never crashes the process.
  checkRbacRoleConsistency().catch((err) => {
    logger.warn(
      '[RBAC Consistency Check] Unexpected error running the check itself:',
      err
    );
  });

  // ============================================================================
  // GRACEFUL SHUTDOWN
  // ============================================================================

  const shutdown = async () => {
    logger.info(
      'Shutting down server gracefully...'
    );

    server.close(async () => {
      await closeRedis();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// ==============================================================================
// SERVER STARTUP
// ==============================================================================

startServer().catch((err) => {
  logger.error(
    '❌ Fatal Server Startup Error:',
    err
  );

  process.exit(1);
});