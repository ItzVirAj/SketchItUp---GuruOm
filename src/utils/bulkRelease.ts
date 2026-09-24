import type { CustomerOrder, JobCard, RouteCard } from '../types/console';

/**
 * Client-side preview of what a bulk job-card release will do for one order.
 * Mirrors the server rule in productionService.bulkReleaseJobCards: released qty is
 * summed per part code (a part repeated on two lines shares one pool), and a line is
 * releasable only while ordered qty is not yet covered by released job cards.
 * The server re-validates everything; this only drives the UI.
 */

export type BulkLineBlocker = 'ALREADY_RELEASED' | 'NO_ROUTE_CARD';

export interface BulkLineState {
  key: string;
  itemCode: string;
  description: string;
  orderQty: number;
  releasedQty: number;
  remainingQty: number;
  drawingRevision: string;
  releasable: boolean;
  blocker?: BulkLineBlocker;
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

export function computeBulkLineStates(
  order: CustomerOrder | null | undefined,
  jobCards: JobCard[],
  routeCards: RouteCard[]
): BulkLineState[] {
  if (!order?.lines?.length) return [];

  // released qty per part code for THIS order (cancelled cards do not count)
  const released = new Map<string, number>();
  for (const j of jobCards || []) {
    const sameOrder = j.orderPo === order.poNo || j.orderPo === order.id || j.orderId === order.poNo || j.orderId === order.id;
    if (!sameOrder) continue;
    if (String(j.status || j.jobStatus || '').toUpperCase() === 'CANCELLED') continue;
    const key = norm(j.partCode);
    released.set(key, (released.get(key) || 0) + Number(j.targetQty ?? j.qty ?? 0));
  }

  // If route cards could not be loaded at all we cannot pre-check them; let the server decide.
  const routeKnown = (routeCards || []).length > 0;
  const routed = new Set(
    (routeCards || []).filter(r => (r.operations || []).length > 0).map(r => norm(r.partCode))
  );

  return order.lines.map((line, idx) => {
    const key = norm(line.itemCode);
    const orderQty = Number(line.orderQty || 0);

    // attribute the part's released pool to its lines in order (first line consumes first)
    const pool = released.get(key) || 0;
    const releasedQty = Math.min(pool, orderQty);
    released.set(key, pool - releasedQty);
    const remainingQty = Math.max(orderQty - releasedQty, 0);

    let blocker: BulkLineBlocker | undefined;
    if (remainingQty <= 0) blocker = 'ALREADY_RELEASED';
    else if (routeKnown && !routed.has(key)) blocker = 'NO_ROUTE_CARD';

    return {
      key: `${line.id || 'line'}-${idx}`,
      itemCode: line.itemCode,
      description: line.itemDescription || '',
      orderQty,
      releasedQty,
      remainingQty,
      drawingRevision: line.drawingRevision || order.drawingRevision || 'REV-A',
      releasable: !blocker,
      blocker
    };
  });
}

export const countReleasableLines = (
  order: CustomerOrder | null | undefined,
  jobCards: JobCard[],
  routeCards: RouteCard[]
): number => computeBulkLineStates(order, jobCards, routeCards).filter(l => l.releasable).length;
