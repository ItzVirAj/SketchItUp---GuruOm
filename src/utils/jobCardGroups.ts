import type { CustomerOrder, JobCard } from '../types/console';
import { computeBulkLineStates, type BulkLineState } from './bulkRelease';

/**
 * Groups job cards by purchase order for the Job Cards screen, so a 50-line PO is ONE row
 * (with an at-a-glance health summary) instead of 50 separate cards flooding the page.
 *
 * Aggregates (counts, progress, overdue...) are always computed from EVERY card of the PO so the
 * summary stays truthful while a filter is active; `visible` holds only the cards matching the filter.
 */

export type JobCardBucket = 'COMPLETED' | 'RUNNING' | 'QC_HOLD' | 'NOT_STARTED';

/** Same precedence the card/row pills use: hold, then running, then done, otherwise not started. */
export function bucketOf(jc: Pick<JobCard, 'jobStatus' | 'status'>): JobCardBucket {
  const js = String(jc.jobStatus || '').toUpperCase();
  const st = String(jc.status || '').toUpperCase();
  if (js === 'QC_HOLD' || st === 'QC_HOLD') return 'QC_HOLD';
  if (js === 'IN_PROGRESS' || st === 'RUNNING' || st === 'IN_PROGRESS') return 'RUNNING';
  if (js === 'COMPLETED' || st === 'COMPLETED' || js === 'DONE' || st === 'DONE') return 'COMPLETED';
  return 'NOT_STARTED';
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function isOverdue(jc: Pick<JobCard, 'targetDate' | 'jobStatus' | 'status'>, now: Date = new Date()): boolean {
  if (!jc.targetDate || bucketOf(jc) === 'COMPLETED') return false;
  const t = new Date(jc.targetDate).getTime();
  return Number.isFinite(t) && t < startOfDay(now);
}

/** QC hold, an open NCR, or past its target date: the cards a supervisor should look at first. */
export function needsAttention(jc: JobCard, now: Date = new Date()): boolean {
  return bucketOf(jc) === 'QC_HOLD' || !!jc.hasOpenNcr || isOverdue(jc, now);
}

export interface JobCardGroup {
  key: string;
  orderPo: string;
  customerName?: string;
  /** every card of the PO (used for the summary) */
  cards: JobCard[];
  /** cards matching the active filters (what gets listed) */
  visible: JobCard[];
  total: number;
  counts: Record<JobCardBucket, number>;
  opsDone: number;
  opsTotal: number;
  overdue: number;
  ncr: number;
  /** earliest target date among cards that are not completed */
  nextDue?: string;
  needsAttention: boolean;
  /** order lines that still have quantity not released to job cards (only when the order is known) */
  unreleasedLines?: number;
  unreleasedLineItems?: BulkLineState[];
}

export type GroupSort = 'recent' | 'due' | 'attention';

export interface GroupOptions {
  orders?: CustomerOrder[];
  matches?: (jc: JobCard) => boolean;
  now?: Date;
}

export function groupJobCardsByOrder(cards: JobCard[], opts: GroupOptions = {}): JobCardGroup[] {
  const { orders = [], matches, now = new Date() } = opts;
  const orderByRef = new Map<string, CustomerOrder>();
  for (const o of orders) {
    if (o.poNo) orderByRef.set(o.poNo, o);
    if (o.id) orderByRef.set(o.id, o);
  }

  // Map preserves first-seen order; the API returns newest first, so groups come out "most recent PO first".
  const byPo = new Map<string, JobCard[]>();
  for (const jc of cards) {
    const key = jc.orderPo || '(no PO)';
    const list = byPo.get(key);
    if (list) list.push(jc); else byPo.set(key, [jc]);
  }

  const groups: JobCardGroup[] = [];
  byPo.forEach((all, key) => {
    const visible = matches ? all.filter(matches) : all;
    if (visible.length === 0) return;

    const counts: Record<JobCardBucket, number> = { COMPLETED: 0, RUNNING: 0, QC_HOLD: 0, NOT_STARTED: 0 };
    let opsDone = 0, opsTotal = 0, overdue = 0, ncr = 0;
    let nextDue: string | undefined;
    for (const jc of all) {
      counts[bucketOf(jc)]++;
      for (const op of jc.operations || []) {
        opsTotal++;
        if (op.opStatus === 'COMPLETED') opsDone++;
      }
      if (isOverdue(jc, now)) overdue++;
      if (jc.hasOpenNcr) ncr++;
      if (jc.targetDate && bucketOf(jc) !== 'COMPLETED') {
        if (!nextDue || new Date(jc.targetDate).getTime() < new Date(nextDue).getTime()) nextDue = jc.targetDate;
      }
    }

    const order = orderByRef.get(key);
    // Route cards are irrelevant here: only "how many lines still have unreleased quantity".
    const lineStates = order ? computeBulkLineStates(order, all, []) : [];
    const unreleasedLineItems = lineStates.filter(l => l.remainingQty > 0);
    const unreleasedLines = unreleasedLineItems.length;

    groups.push({
      key,
      orderPo: key,
      customerName: order?.customerName,
      cards: all,
      visible,
      total: all.length,
      counts,
      opsDone,
      opsTotal,
      overdue,
      ncr,
      nextDue,
      needsAttention: counts.QC_HOLD > 0 || ncr > 0 || overdue > 0,
      unreleasedLines,
      unreleasedLineItems
    });
  });

  return groups;
}

export function sortGroups(groups: JobCardGroup[], mode: GroupSort): JobCardGroup[] {
  const idx = new Map(groups.map((g, i) => [g.key, i]));
  const byRecent = (a: JobCardGroup, b: JobCardGroup) => (idx.get(a.key)! - idx.get(b.key)!);
  const dueTs = (g: JobCardGroup) => (g.nextDue ? new Date(g.nextDue).getTime() : Number.POSITIVE_INFINITY);
  const out = [...groups];
  if (mode === 'due') out.sort((a, b) => dueTs(a) - dueTs(b) || byRecent(a, b));
  else if (mode === 'attention') out.sort((a, b) => Number(b.needsAttention) - Number(a.needsAttention) || byRecent(a, b));
  else out.sort(byRecent);
  return out;
}
