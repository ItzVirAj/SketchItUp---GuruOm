import express, { Request, Response, NextFunction } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../backend/src/config/database', () => ({
  getDbClient: () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({ data: [], error: null }),
      }),
      insert: async () => ({ error: null }),
    }),
  }),
}));

import { requirePermission } from '../backend/src/middleware/rbac.middleware';
import { requireAuth } from '../backend/src/middleware/auth.middleware';
import {
  buildCustomerRanks,
  buildOrderStages,
  buildTrendPoints,
  metricValue,
} from '../backend/src/modules/command-centre/command-centre.aggregations';
import {
  CommandCentreQueryValidationError,
  parseCommandCentreQuery,
} from '../backend/src/modules/command-centre/command-centre.schema';
import commandCentreRoutes from '../backend/src/modules/command-centre/command-centre.routes';
import { CommandCentreService } from '../backend/src/modules/command-centre/command-centre.service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommandCentreRow } from '../backend/src/modules/command-centre/command-centre.types';

interface ResponseCapture {
  response: Response;
  statusCode: number | null;
  body: unknown;
}

function responseCapture(): ResponseCapture {
  const capture: ResponseCapture = {
    response: undefined as unknown as Response,
    statusCode: null,
    body: undefined,
  };
  const response = {
    status(code: number) {
      capture.statusCode = code;
      return response;
    },
    json(body: unknown) {
      capture.body = body;
      return response;
    },
  } as unknown as Response;
  capture.response = response;
  return capture;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('command-centre query validation', () => {
  it('uses a bounded 30-day range and equal-length prior comparison by default', () => {
    const range = parseCommandCentreQuery({}, new Date('2026-10-16T12:00:00.000Z'));

    expect(range).toEqual({
      from: '2026-09-17',
      to: '2026-10-16',
      compareFrom: '2026-08-18',
      compareTo: '2026-09-16',
      granularity: 'day',
    });
  });

  it('rejects oversized or mismatched comparison ranges', () => {
    expect(() => parseCommandCentreQuery({
      from: '2025-10-01',
      to: '2026-10-02',
    }, new Date('2026-10-16T12:00:00.000Z'))).toThrow(CommandCentreQueryValidationError);

    expect(() => parseCommandCentreQuery({
      from: '2026-10-01',
      to: '2026-10-10',
      compareFrom: '2026-09-01',
      compareTo: '2026-09-05',
    }, new Date('2026-10-16T12:00:00.000Z'))).toThrow(/same number of days/);
  });
});

describe('command-centre pure aggregations', () => {
  const invoices: CommandCentreRow[] = [
    { date: '2026-10-01', total_amount: 100, paid_amount: 40 },
    { date: '2026-10-02', total_amount: 50, paid_amount: 50 },
  ];

  it('calculates period totals and percentage deltas from real rows', () => {
    expect(buildTrendPoints(invoices, '2026-10-01', '2026-10-02', 'day')).toEqual([
      { period: '2026-10-01', invoiced: 100, collected: 40 },
      { period: '2026-10-02', invoiced: 50, collected: 50 },
    ]);
    expect(metricValue(150, 100, 'supported')).toMatchObject({
      current: 150,
      previous: 100,
      deltaPct: 50,
    });
    expect(metricValue(10, 0, 'supported').deltaPct).toBeNull();
  });

  it('keeps funnel counts and customer shares deterministic', () => {
    expect(buildOrderStages([
      { status: 'CONFIRMED' },
      { stage: 'IN_PRODUCTION' },
      { status: 'CLOSED' },
    ])).toEqual([
      { key: 'po_received', label: 'PO received', count: 0 },
      { key: 'confirmed', label: 'Confirmed', count: 1 },
      { key: 'in_production', label: 'In production', count: 1 },
      { key: 'in_qc', label: 'In QC', count: 0 },
      { key: 'ready_for_dispatch', label: 'Ready for dispatch', count: 0 },
      { key: 'dispatched', label: 'Dispatched', count: 1 },
    ]);
    expect(buildCustomerRanks([
      { customer_name: 'Acme', gross_amount: 75 },
      { customer_name: 'Acme', gross_amount: 25 },
      { customer_name: 'Beta', gross_amount: 100 },
    ])).toEqual([
      { customer: 'Acme', value: 100, sharePct: 50, orderCount: 2 },
      { customer: 'Beta', value: 100, sharePct: 50, orderCount: 1 },
    ]);
  });
});

describe('command-centre read-only data contract', () => {
  it('returns unsupported/null metrics when a source cannot be read', async () => {
    const fakeDb = {
      from(table: string) {
        return {
          select: async () => table === 'customer_invoices'
            ? {
              data: [{
                date: '2026-10-02',
                total_amount: 125,
                balance_amount: 25,
                paid_amount: 100,
              }],
              error: null,
            }
            : {
              data: null,
              error: { message: `${table} unavailable` },
            },
        };
      },
    };
    const service = new CommandCentreService(fakeDb as unknown as SupabaseClient);
    const range = parseCommandCentreQuery({
      from: '2026-10-01',
      to: '2026-10-05',
      compareFrom: '2026-09-26',
      compareTo: '2026-09-30',
    }, new Date('2026-10-16T12:00:00.000Z'));

    const response = await service.getSummary(range);
    expect(response.metrics.revenue.current).toBe(125);
    expect(response.metrics.openOrders).toMatchObject({
      availability: 'unsupported',
      current: null,
      previous: null,
    });
    expect(response.metrics.lowStock).toMatchObject({
      availability: 'unsupported',
      current: null,
    });
  });
});

describe('command-centre access contract', () => {
  it('requires authentication on the mounted endpoint', async () => {
    const app = express();
    app.use('/api/v1/command-centre', commandCentreRoutes);
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a port.');

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/command-centre/summary`);
      expect(response.status).toBe(401);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('enforces the reports VIEW_ONLY role check', async () => {
    const denied = responseCapture();
    const deniedRequest = {
      user: {
        id: 'machine-operator-1',
        email: 'operator@example.test',
        name: 'Machine Operator',
        role: 'Machine Operator',
      },
      originalUrl: '/api/v1/command-centre/summary',
      path: '/summary',
      method: 'GET',
      params: {},
      body: {},
    } as unknown as Request;
    const deniedNext: NextFunction = vi.fn();
    await requirePermission('reports', 'VIEW_ONLY')(deniedRequest, denied.response, deniedNext);
    expect(denied.statusCode).toBe(403);
    expect(deniedNext).not.toHaveBeenCalled();

    const allowed = responseCapture();
    const allowedRequest = {
      ...deniedRequest,
      user: {
        id: 'planner-1',
        email: 'planner@example.test',
        name: 'Production Planner',
        role: 'Production Planner',
      },
    } as unknown as Request;
    const allowedNext: NextFunction = vi.fn();
    await requirePermission('reports', 'VIEW_ONLY')(allowedRequest, allowed.response, allowedNext);
    expect(allowedNext).toHaveBeenCalledOnce();
    expect(allowed.statusCode).toBeNull();
  });

  it('returns 401 from requireAuth when the bearer header is absent', () => {
    const capture = responseCapture();
    const request = { headers: {} } as unknown as Request;
    const next: NextFunction = vi.fn();
    requireAuth(request, capture.response, next);
    expect(capture.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
