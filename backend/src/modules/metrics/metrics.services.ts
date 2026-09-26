import { getDbClient } from '../../config/database';
import { logger } from '../../utils/logger';

export class MetricsService {
  private db = getDbClient();

  async computeSnapshotForDate(date: string) {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const [{ data: invoices }, { data: ordersPlaced }, { data: openOrders }, { data: qcRows }] = await Promise.all([
      this.db.from('customer_invoices').select('total_amount').eq('date', date),
      this.db.from('customer_orders').select('customer_name, gross_amount').eq('po_date', date),
      this.db.from('customer_orders').select('id').lte('po_date', date).gte('delivery_date', date),
      this.db.from('qc_inspections').select('qc_status').gte('created_at', dayStart).lte('created_at', dayEnd),
    ]);

    const revenue = (invoices || []).reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0);

    const placed = ordersPlaced || [];
    const avgOrderValue = placed.length
      ? placed.reduce((sum: number, o: any) => sum + Number(o.gross_amount || 0), 0) / placed.length
      : 0;

    const byCustomer: Record<string, number> = {};
    for (const o of placed as any[]) {
      byCustomer[o.customer_name] = (byCustomer[o.customer_name] || 0) + Number(o.gross_amount || 0);
    }
    const topCustomer = Object.entries(byCustomer).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const passed = (qcRows || []).filter((q: any) => q.qc_status === 'PASS').length;
    const rejected = (qcRows || []).filter((q: any) => q.qc_status === 'REJECTED').length;
    const rejectionRate = (passed + rejected) > 0 ? rejected / (passed + rejected) : 0;

    return {
      snapshot_date: date,
      revenue,
      open_order_count: (openOrders || []).length,
      avg_order_value: avgOrderValue,
      top_customer: topCustomer,
      rejection_rate: rejectionRate,
      orders_placed_count: placed.length,
      qc_inspected_count: (qcRows || []).length,
      updated_at: new Date().toISOString(),
    };
  }

  async captureSnapshot(date?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const snapshot = await this.computeSnapshotForDate(targetDate);
    const { error } = await this.db.from('daily_snapshots').upsert(snapshot, { onConflict: 'snapshot_date' });
    if (error) {
      logger.error(`[Metrics] Failed to save snapshot for ${targetDate}:`, error.message);
      throw new Error(error.message);
    }
    logger.info(`[Metrics] Snapshot captured for ${targetDate}`);
    return snapshot;
  }

  /** Computes real history for the last N days from existing timestamped data. Run once. */
  async backfillHistory(days: number) {
    const results = [];
    const today = new Date();
    for (let i = days; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      results.push(await this.captureSnapshot(d.toISOString().slice(0, 10)));
    }
    return { backfilled: results.length, from: results[0]?.snapshot_date, to: results[results.length - 1]?.snapshot_date };
  }

  async getHistory(days: number = 30) {
    const { data, error } = await this.db
      .from('daily_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(days);
    if (error) {
      logger.error('[Metrics] getHistory failed:', error.message);
      return [];
    }
    return (data || []).reverse(); // oldest → newest, matching what get_business_trends expects
  }
}

export const metricsService = new MetricsService();