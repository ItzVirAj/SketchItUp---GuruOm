import {
  CommandCentreGranularity,
  CommandCentreRange,
  CommandCentreRow,
  CustomerRank,
  HeatmapCell,
  MetricValue,
  TrendPoint,
  VendorBreakdown,
} from './command-centre.types';

const DAY_MS = 86_400_000;

export const ORDER_PIPELINE_STAGES = [
  { key: 'po_received', label: 'PO received', statuses: ['PO_RECEIVED', 'DRAFT'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['CONFIRMED', 'MATERIAL_VERIFIED'] },
  { key: 'in_production', label: 'In production', statuses: ['IN_PRODUCTION', 'JOB_RELEASED'] },
  { key: 'in_qc', label: 'In QC', statuses: ['READY_FOR_QC', 'QC_REPORT_UPLOADED', 'QC_HOLD'] },
  { key: 'ready_for_dispatch', label: 'Ready for dispatch', statuses: ['READY_FOR_DISPATCH', 'PDI_COMPLETE'] },
  { key: 'dispatched', label: 'Dispatched', statuses: ['DISPATCHED', 'DELIVERED', 'CLOSED'] },
] as const;

export function getString(row: CommandCentreRow, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function getNumber(row: CommandCentreRow, key: string): number | null {
  const value = row[key];
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function hasField(rows: CommandCentreRow[], key: string): boolean {
  return rows.some((row) => Object.prototype.hasOwnProperty.call(row, key));
}

export function dateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

export function rowDate(row: CommandCentreRow, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = dateOnly(row[key]);
    if (value) return value;
  }
  return null;
}

export function rowsInRange(
  rows: CommandCentreRow[],
  from: string,
  to: string,
  dateKeys: readonly string[],
): CommandCentreRow[] {
  return rows.filter((row) => {
    const date = rowDate(row, dateKeys);
    return date !== null && date >= from && date <= to;
  });
}

export function isInRange(value: string | null, from: string, to: string): boolean {
  return value !== null && value >= from && value <= to;
}

export function percentageDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
}

export function metricValue(
  current: number | null,
  previous: number | null,
  availability: MetricValue['availability'],
  reason: string | null = null,
): MetricValue {
  return {
    availability,
    current,
    previous,
    deltaPct: percentageDelta(current, previous),
    reason,
  };
}

export function sumField(rows: CommandCentreRow[], key: string): number | null {
  if (!hasField(rows, key)) return null;
  let total = 0;
  for (const row of rows) {
    const value = getNumber(row, key);
    if (value !== null) total += value;
  }
  return total;
}

export function countWhere(
  rows: CommandCentreRow[],
  predicate: (row: CommandCentreRow) => boolean,
): number {
  return rows.reduce((count, row) => count + (predicate(row) ? 1 : 0), 0);
}

export function normalizedStatus(row: CommandCentreRow, keys: readonly string[]): string | null {
  for (const key of keys) {
    const status = getString(row, key);
    if (status) return status.toUpperCase();
  }
  return null;
}

export function orderStatus(row: CommandCentreRow): string | null {
  return normalizedStatus(row, ['stage', 'status']);
}

export function orderIsOpen(row: CommandCentreRow): boolean {
  const status = orderStatus(row);
  return status !== 'CLOSED' && status !== 'CANCELLED';
}

export function buildOrderStages(rows: CommandCentreRow[]): Array<{ key: string; label: string; count: number }> {
  return ORDER_PIPELINE_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: countWhere(rows, (row) => {
      const status = orderStatus(row);
      return status !== null && stage.statuses.some((allowed) => allowed === status);
    }),
  }));
}

function startOfWeek(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - (day === 0 ? 6 : day - 1));
  return value.toISOString().slice(0, 10);
}

export function periodKey(date: string, granularity: CommandCentreGranularity): string {
  if (granularity === 'day') return date;
  if (granularity === 'month') return date.slice(0, 7);
  return startOfWeek(date);
}

function nextPeriod(value: string, granularity: CommandCentreGranularity): string {
  if (granularity === 'month') {
    const [year, month] = value.split('-').map(Number);
    const next = new Date(Date.UTC(year, month, 1));
    return next.toISOString().slice(0, 7);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + (granularity === 'week' ? 7 : 1));
  return date.toISOString().slice(0, 10);
}

function firstPeriod(from: string, granularity: CommandCentreGranularity): string {
  return periodKey(from, granularity);
}

export function periodsForRange(
  from: string,
  to: string,
  granularity: CommandCentreGranularity,
): string[] {
  const periods: string[] = [];
  let current = firstPeriod(from, granularity);
  const last = periodKey(to, granularity);
  while (current <= last) {
    periods.push(current);
    current = nextPeriod(current, granularity);
  }
  return periods;
}

export function buildTrendPoints(
  rows: CommandCentreRow[],
  from: string,
  to: string,
  granularity: CommandCentreGranularity,
): TrendPoint[] {
  const periods = periodsForRange(from, to, granularity);
  const totals = new Map<string, { invoiced: number; collected: number }>();
  for (const period of periods) {
    totals.set(period, { invoiced: 0, collected: 0 });
  }

  for (const row of rows) {
    const date = rowDate(row, ['date', 'created_at']);
    if (!isInRange(date, from, to)) continue;
    const period = periodKey(date as string, granularity);
    const total = getNumber(row, 'total_amount');
    const paid = getNumber(row, 'paid_amount');
    const bucket = totals.get(period);
    if (!bucket) continue;
    if (total !== null) bucket.invoiced += total;
    if (paid !== null) bucket.collected += paid;
  }

  return periods.map((period) => ({ period, ...totals.get(period)! }));
}

export function buildHeatmap(rows: CommandCentreRow[], from: string, to: string): HeatmapCell[] {
  const buckets = new Map<string, HeatmapCell>();
  for (const row of rows) {
    const rawTimestamp = getString(row, 'actual_end_time')
      ?? getString(row, 'actual_start_time');
    if (!rawTimestamp) continue;
    const date = dateOnly(rawTimestamp);
    if (!isInRange(date, from, to)) continue;
    const parsed = new Date(rawTimestamp);
    if (Number.isNaN(parsed.getTime())) continue;
    const weekday = parsed.getUTCDay();
    const hour = parsed.getUTCHours();
    const key = `${weekday}:${hour}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { weekday, hour, count: 1 });
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
}

export function buildInventoryRanks(rows: CommandCentreRow[]): Array<{
  itemId: string | null;
  code: string | null;
  description: string | null;
  onHand: number | null;
  reorderLevel: number | null;
  shortage: number | null;
  status: string | null;
}> {
  return rows
    .map((row) => {
      const onHand = getNumber(row, 'on_hand') ?? getNumber(row, 'current_stock');
      const reorderLevel = getNumber(row, 'reorder_level');
      const shortage = onHand !== null && reorderLevel !== null
        ? Math.max(reorderLevel - onHand, 0)
        : null;
      return {
        itemId: getString(row, 'id'),
        code: getString(row, 'code'),
        description: getString(row, 'description') ?? getString(row, 'name'),
        onHand,
        reorderLevel,
        shortage,
        status: getString(row, 'status'),
      };
    })
    .filter((item) => item.shortage !== null && item.shortage > 0)
    .sort((a, b) => (b.shortage ?? 0) - (a.shortage ?? 0));
}

export function buildVendorBreakdown(rows: CommandCentreRow[]): VendorBreakdown[] {
  const groups = new Map<string, VendorBreakdown>();
  for (const row of rows) {
    const status = getString(row, 'status') ?? 'UNKNOWN';
    const existing = groups.get(status) ?? { status, amount: 0, balance: 0, count: 0 };
    existing.amount += getNumber(row, 'amount') ?? 0;
    existing.balance += getNumber(row, 'balance_amount') ?? 0;
    existing.count += 1;
    groups.set(status, existing);
  }
  return Array.from(groups.values()).sort((a, b) => b.balance - a.balance || b.amount - a.amount);
}

export function buildCustomerRanks(rows: CommandCentreRow[]): CustomerRank[] {
  const groups = new Map<string, CustomerRank>();
  for (const row of rows) {
    const customer = getString(row, 'customer_name');
    const value = getNumber(row, 'gross_amount');
    if (!customer || value === null) continue;
    const existing = groups.get(customer) ?? { customer, value: 0, sharePct: 0, orderCount: 0 };
    existing.value += value;
    existing.orderCount += 1;
    groups.set(customer, existing);
  }
  const total = Array.from(groups.values()).reduce((sum, item) => sum + item.value, 0);
  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      sharePct: total === 0 ? 0 : Number(((item.value / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildStatusCounts(rows: CommandCentreRow[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const status = getString(row, key);
    if (!status) continue;
    const normalized = status.toUpperCase();
    counts[normalized] = (counts[normalized] ?? 0) + 1;
  }
  return counts;
}

export function daysAgoIso(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setTime(date.getTime() - (days * DAY_MS));
  return date.toISOString().slice(0, 10);
}
