/**
 * Generic "group by purchase order" logic for inspection queues (QC, PDI), so a 50-line PO is ONE row
 * with an at-a-glance summary instead of 50 separate rows flooding the page.
 *
 * Aggregates (counts, progress) always cover EVERY item of the PO, so the summary stays truthful while a
 * filter is active; `visible` holds only the items that match the filter.
 */

export type InspectionBucket = 'PASS' | 'PENDING' | 'HOLD' | 'REJECTED';

/** Bar / legend order. */
export const INSPECTION_BUCKETS: InspectionBucket[] = ['PASS', 'PENDING', 'HOLD', 'REJECTED'];

/** Maps QC statuses (PASS/PASSED, QC_HOLD, REJECTED, PENDING) and PDI statuses (PASS, FAIL, PENDING) to one scale. */
export function inspectionBucket(status?: string | null): InspectionBucket {
  const s = String(status || '').toUpperCase();
  if (s === 'PASS' || s === 'PASSED') return 'PASS';
  if (s === 'QC_HOLD' || s === 'PDI_HOLD' || s === 'HOLD') return 'HOLD';
  if (s === 'REJECTED' || s === 'FAIL' || s === 'FAILED') return 'REJECTED';
  return 'PENDING';
}

export interface PoGroup<T> {
  key: string;
  orderPo: string;
  /** every item of the PO (drives the summary) */
  items: T[];
  /** items matching the active filters (what gets listed) */
  visible: T[];
  total: number;
  counts: Record<InspectionBucket, number>;
  /** on hold or rejected: something a supervisor should look at first */
  needsAttention: boolean;
}

export interface GroupByPoOptions<T> {
  getPo: (item: T) => string | undefined | null;
  bucketOf: (item: T) => InspectionBucket;
  matches?: (item: T) => boolean;
}

export function groupByPo<T>(items: T[], opts: GroupByPoOptions<T>): PoGroup<T>[] {
  const { getPo, bucketOf, matches } = opts;

  // Map keeps first-seen order, so groups follow the order of the input list ("most recent first" if the input is).
  const byPo = new Map<string, T[]>();
  for (const item of items) {
    const key = String(getPo(item) ?? '').trim() || '(no PO)';
    const list = byPo.get(key);
    if (list) list.push(item); else byPo.set(key, [item]);
  }

  const groups: PoGroup<T>[] = [];
  byPo.forEach((all, key) => {
    const visible = matches ? all.filter(matches) : all;
    if (visible.length === 0) return;
    const counts: Record<InspectionBucket, number> = { PASS: 0, PENDING: 0, HOLD: 0, REJECTED: 0 };
    for (const item of all) counts[bucketOf(item)]++;
    groups.push({
      key, orderPo: key, items: all, visible, total: all.length, counts,
      needsAttention: counts.HOLD > 0 || counts.REJECTED > 0
    });
  });
  return groups;
}

export type PoGroupSort = 'recent' | 'attention' | 'pending';

export function sortPoGroups<T>(groups: PoGroup<T>[], mode: PoGroupSort): PoGroup<T>[] {
  const idx = new Map(groups.map((g, i) => [g.key, i]));
  const byRecent = (a: PoGroup<T>, b: PoGroup<T>) => idx.get(a.key)! - idx.get(b.key)!;
  const out = [...groups];
  if (mode === 'attention') out.sort((a, b) => Number(b.needsAttention) - Number(a.needsAttention) || byRecent(a, b));
  else if (mode === 'pending') out.sort((a, b) => b.counts.PENDING - a.counts.PENDING || byRecent(a, b));
  else out.sort(byRecent);
  return out;
}

/** Within a PO, work that needs action comes first. Stable: items in the same bucket keep their order. */
const ROW_PRIORITY: Record<InspectionBucket, number> = { PENDING: 0, HOLD: 1, REJECTED: 2, PASS: 3 };
export function orderRows<T>(rows: T[], bucketOf: (item: T) => InspectionBucket): T[] {
  return rows
    .map((r, i) => ({ r, i, p: ROW_PRIORITY[bucketOf(r)] }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map(x => x.r);
}
