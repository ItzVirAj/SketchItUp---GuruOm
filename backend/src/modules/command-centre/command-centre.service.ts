import type { SupabaseClient } from '@supabase/supabase-js';
import { getDbClient } from '../../config/database';
import { logger } from '../../utils/logger';
import {
  buildCustomerRanks,
  buildHeatmap,
  buildInventoryRanks,
  buildOrderStages,
  buildStatusCounts,
  buildTrendPoints,
  buildVendorBreakdown,
  countWhere,
  getNumber,
  getString,
  hasField,
  metricValue,
  orderStatus,
  orderIsOpen,
  rowDate,
  rowsInRange,
  sumField,
} from './command-centre.aggregations';
import {
  CommandCentreFeedsResponse,
  CommandCentreOperationsResponse,
  CommandCentreRange,
  CommandCentreRow,
  CommandCentreSummaryResponse,
  CommandCentreTrendResponse,
  CountStage,
  DataSection,
  DispatchFeedItem,
  ApprovalFeedItem,
  HeatmapCell,
  InsightFeedItem,
  TableReadResult,
} from './command-centre.types';

const ORDER_DATE_KEYS = ['po_date', 'created_at'] as const;
const INVOICE_DATE_KEYS = ['date', 'created_at'] as const;
const VENDOR_DATE_KEYS = ['date', 'created_at'] as const;
const DISPATCH_DATE_KEYS = ['date', 'created_at'] as const;
const AUDIT_DATE_KEYS = ['created_at', 'when_time'] as const;

function isRow(value: unknown): value is CommandCentreRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unsupportedSection<T>(reason: string): DataSection<T> {
  return { availability: 'unsupported', value: null, reason };
}

function emptySection<T>(value: T): DataSection<T> {
  return { availability: 'empty', value, reason: null };
}

function supportedSection<T>(value: T): DataSection<T> {
  return { availability: 'supported', value, reason: null };
}

function partialSection<T>(value: T, reason: string): DataSection<T> {
  return { availability: 'partial', value, reason };
}

function sourceReason(source: TableReadResult): string {
  return source.reason ?? `${source.table} did not return a readable result.`;
}

function fieldAvailability(source: TableReadResult, fields: readonly string[]): boolean {
  return source.rows.length === 0 || fields.some((field) => hasField(source.rows, field));
}

function fieldGroupsAvailable(
  source: TableReadResult,
  groups: readonly (readonly string[])[],
): boolean {
  return groups.every((group) => fieldAvailability(source, group));
}

function sumKnownField(source: TableReadResult, rows: CommandCentreRow[], field: string): number | null {
  if (!fieldAvailability(source, [field])) return null;
  if (rows.length === 0) return 0;
  return sumField(rows, field) ?? 0;
}

function datedRows(
  source: TableReadResult,
  range: CommandCentreRange,
  dateKeys: readonly string[],
): { current: CommandCentreRow[]; previous: CommandCentreRow[] } {
  return {
    current: rowsInRange(source.rows, range.from, range.to, dateKeys),
    previous: rowsInRange(source.rows, range.compareFrom, range.compareTo, dateKeys),
  };
}

function metricFromRows(
  source: TableReadResult,
  current: CommandCentreRow[],
  previous: CommandCentreRow[],
  value: (rows: CommandCentreRow[]) => number | null,
  fields: readonly string[],
  historicalReason: string | null = null,
  requiredFieldGroups: readonly (readonly string[])[] = [],
) {
  if (!source.supported) {
    return metricValue(null, null, 'unsupported', sourceReason(source));
  }
  if (!fieldAvailability(source, fields) || !fieldGroupsAvailable(source, requiredFieldGroups)) {
    return metricValue(null, null, 'unsupported', `Required field is absent from ${source.table}.`);
  }
  const currentValue = value(current);
  const previousValue = value(previous);
  const availability = current.length === 0 && previous.length === 0 ? 'empty' : 'supported';
  return metricValue(currentValue, previousValue, availability, historicalReason);
}

function countMetric(
  source: TableReadResult,
  current: CommandCentreRow[],
  previous: CommandCentreRow[],
  predicate: (row: CommandCentreRow) => boolean,
  fields: readonly string[] = [],
  requiredFieldGroups: readonly (readonly string[])[] = [],
) {
  return metricFromRows(
    source,
    current,
    previous,
    (rows) => countWhere(rows, predicate),
    fields,
    null,
    requiredFieldGroups,
  );
}

function rangeFor<T>(
  source: TableReadResult,
  range: CommandCentreRange,
  dateKeys: readonly string[],
  builder: (rows: CommandCentreRow[]) => T,
  fields: readonly string[] = [],
): DataSection<T> {
  if (!source.supported) return unsupportedSection(sourceReason(source));
  if ((fields.length > 0 && !fieldAvailability(source, fields)) || !fieldAvailability(source, dateKeys)) {
    return unsupportedSection(`Required field is absent from ${source.table}.`);
  }
  const rows = rowsInRange(source.rows, range.from, range.to, dateKeys);
  const value = builder(rows);
  return rows.length === 0 ? emptySection(value) : supportedSection(value);
}

function currentSource<T>(
  source: TableReadResult,
  builder: (rows: CommandCentreRow[]) => T,
  fields: readonly string[] = [],
): DataSection<T> {
  if (!source.supported) return unsupportedSection(sourceReason(source));
  if (!fieldAvailability(source, fields)) {
    return unsupportedSection(`Required field is absent from ${source.table}.`);
  }
  const value = builder(source.rows);
  return source.rows.length === 0 ? emptySection(value) : supportedSection(value);
}

function makeOrderFeed(source: TableReadResult, range: CommandCentreRange) {
  return rangeFor(source, range, ORDER_DATE_KEYS, (rows) => rows
    .sort((a, b) => (rowDate(b, ORDER_DATE_KEYS) ?? '').localeCompare(rowDate(a, ORDER_DATE_KEYS) ?? ''))
    .slice(0, 20)
    .map((row) => ({
      id: getString(row, 'id'),
      poNo: getString(row, 'po_no'),
      customer: getString(row, 'customer_name'),
      status: getString(row, 'stage') ?? getString(row, 'status'),
      amount: getNumber(row, 'gross_amount'),
      date: rowDate(row, ORDER_DATE_KEYS),
    })), ['id', 'po_no', 'customer_name', 'status']);
}

function makeDispatchFeed(source: TableReadResult, range: CommandCentreRange): DataSection<DispatchFeedItem[]> {
  return rangeFor(source, range, DISPATCH_DATE_KEYS, (rows) => rows
    .sort((a, b) => (rowDate(b, DISPATCH_DATE_KEYS) ?? '').localeCompare(rowDate(a, DISPATCH_DATE_KEYS) ?? ''))
    .slice(0, 20)
    .map((row) => ({
      id: getString(row, 'id'),
      challanNo: getString(row, 'challan_no'),
      orderPo: getString(row, 'order_po'),
      status: getString(row, 'status'),
      date: rowDate(row, DISPATCH_DATE_KEYS),
    })), ['id', 'challan_no', 'order_po', 'status']);
}

function makeApprovalFeed(source: TableReadResult, range: CommandCentreRange): DataSection<ApprovalFeedItem[]> {
  if (!source.supported) return unsupportedSection(sourceReason(source));
  if (!fieldAvailability(source, ['created_at', 'timestamp'])) {
    return unsupportedSection('Approval date is absent from pending_approvals.');
  }
  const rows = rowsInRange(source.rows, range.from, range.to, ['created_at', 'timestamp']);
  const pending = rows.filter((row) => {
    const status = getString(row, 'status');
    return status === null || status.toUpperCase() === 'PENDING_OWNER_APPROVAL';
  });
  const value = pending
    .sort((a, b) => (rowDate(b, ['created_at', 'timestamp']) ?? '').localeCompare(rowDate(a, ['created_at', 'timestamp']) ?? ''))
    .slice(0, 20)
    .map((row) => ({
      id: getString(row, 'id'),
      title: getString(row, 'title'),
      type: getString(row, 'type'),
      requestedBy: getString(row, 'requested_by'),
      amount: getNumber(row, 'amount'),
      status: getString(row, 'status'),
      createdAt: getString(row, 'created_at') ?? getString(row, 'timestamp'),
    }));
  return pending.length === 0 ? emptySection(value) : supportedSection(value);
}

function makeActivityFeed(source: TableReadResult, range: CommandCentreRange) {
  return rangeFor(source, range, AUDIT_DATE_KEYS, (rows) => rows
    .sort((a, b) => (rowDate(b, AUDIT_DATE_KEYS) ?? '').localeCompare(rowDate(a, AUDIT_DATE_KEYS) ?? ''))
    .slice(0, 30)
    .map((row) => ({
      id: getString(row, 'id'),
      actor: getString(row, 'actor_email') ?? getString(row, 'user_name'),
      action: getString(row, 'action'),
      entity: getString(row, 'entity_type') ?? getString(row, 'entity'),
      entityId: getString(row, 'entity_id'),
      details: getString(row, 'details'),
      createdAt: getString(row, 'created_at') ?? getString(row, 'when_time'),
    })));
}

function makeInsights(
  range: CommandCentreRange,
  orders: TableReadResult,
  invoices: TableReadResult,
  stock: TableReadResult,
  qc: TableReadResult,
  pdi: TableReadResult,
): DataSection<InsightFeedItem[]> {
  const sources = [orders, invoices, stock, qc, pdi];
  const availableSources = sources.filter((source) => source.supported);
  if (availableSources.length === 0) {
    return unsupportedSection('No insight source tables are available.');
  }

  const insights: InsightFeedItem[] = [];
  const orderRows = rowsInRange(orders.rows, range.from, range.to, ORDER_DATE_KEYS);
  if (orders.supported) {
    for (const row of orderRows) {
      const dueDate = rowDate(row, ['delivery_date']);
      const status = orderStatus(row);
      if (dueDate && dueDate < range.to && status !== 'DELIVERED' && status !== 'CLOSED' && status !== 'CANCELLED') {
        insights.push({
          severity: 'warning',
          title: 'Delivery date has passed',
          detail: `${getString(row, 'po_no') ?? getString(row, 'id') ?? 'Order'} is past its committed delivery date.`,
          source: 'customer_orders',
          entityId: getString(row, 'id'),
          date: dueDate,
        });
      }
    }
  }

  if (invoices.supported) {
    const invoiceRows = rowsInRange(invoices.rows, range.from, range.to, INVOICE_DATE_KEYS);
    for (const row of invoiceRows) {
      const dueDate = rowDate(row, ['due_date']);
      const status = getString(row, 'status')?.toUpperCase();
      const balance = getNumber(row, 'balance_amount');
      if (dueDate && dueDate < range.to && status !== 'PAID' && balance !== null && balance > 0) {
        insights.push({
          severity: 'critical',
          title: 'Receivable is overdue',
          detail: `${getString(row, 'invoice_no') ?? getString(row, 'id') ?? 'Invoice'} has an unpaid balance.`,
          source: 'customer_invoices',
          entityId: getString(row, 'id'),
          date: dueDate,
        });
      }
    }
  }

  if (stock.supported) {
    for (const row of stock.rows) {
      const onHand = getNumber(row, 'on_hand') ?? getNumber(row, 'current_stock');
      const reorderLevel = getNumber(row, 'reorder_level');
      const status = getString(row, 'status')?.toUpperCase();
      if (status === 'SHORTAGE' || status === 'CRITICAL' || (onHand !== null && reorderLevel !== null && onHand <= reorderLevel)) {
        insights.push({
          severity: 'critical',
          title: 'Inventory needs replenishment',
          detail: `${getString(row, 'code') ?? getString(row, 'id') ?? 'Stock item'} is at or below its reorder level.`,
          source: 'stock_items',
          entityId: getString(row, 'id'),
          date: rowDate(row, ['updated_at']),
        });
      }
    }
  }

  for (const [source, rows, statusKey] of [
    [qc, qc.rows, 'qc_status'],
    [pdi, pdi.rows, 'pdi_status'],
  ] as const) {
    if (!source.supported) continue;
    const relevantRows = rowsInRange(rows, range.from, range.to, ['created_at', 'inspected_at', 'report_date']);
    for (const row of relevantRows) {
      const status = getString(row, statusKey)?.toUpperCase();
      if (status === 'QC_HOLD' || status === 'REWORK' || status === 'REJECTED') {
        insights.push({
          severity: 'critical',
          title: 'Quality item is blocked',
          detail: `${getString(row, 'job_no') ?? getString(row, 'id') ?? 'Inspection'} is in ${status}.`,
          source: source.table,
          entityId: getString(row, 'id'),
          date: rowDate(row, ['created_at', 'inspected_at', 'report_date']),
        });
      }
    }
  }

  insights.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  if (availableSources.length < sources.length) {
    return partialSection(
      insights.slice(0, 30),
      'Some insight source tables are unavailable; the list may be incomplete.',
    );
  }
  return insights.length === 0 ? emptySection([]) : supportedSection(insights.slice(0, 30));
}

export class CommandCentreService {
  private readonly db: SupabaseClient;

  constructor(db: SupabaseClient = getDbClient()) {
    this.db = db;
  }

  private async readTable(table: string): Promise<TableReadResult> {
    try {
      const result = await this.db.from(table).select('*');
      if (result.error) {
        logger.warn(`[CommandCentre] Unable to read ${table}: ${result.error.message}`);
        return { table, supported: false, rows: [], reason: `The ${table} source is unavailable.` };
      }
      const data: unknown = result.data;
      const rows = Array.isArray(data) ? data.filter(isRow) : [];
      return { table, supported: true, rows, reason: null };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown database error';
      logger.warn(`[CommandCentre] Unable to read ${table}: ${message}`);
      return { table, supported: false, rows: [], reason: `The ${table} source is unavailable.` };
    }
  }

  async getSummary(range: CommandCentreRange): Promise<CommandCentreSummaryResponse> {
    const [orders, invoices, productionLogs, dispatches, vendorBills, stock] = await Promise.all([
      this.readTable('customer_orders'),
      this.readTable('customer_invoices'),
      this.readTable('production_logs'),
      this.readTable('dispatch_challans'),
      this.readTable('vendor_bills'),
      this.readTable('stock_items'),
    ]);

    const orderRows = datedRows(orders, range, ORDER_DATE_KEYS);
    const invoiceRows = datedRows(invoices, range, INVOICE_DATE_KEYS);
    const productionRows = datedRows(productionLogs, range, ['logged_timestamp', 'created_at']);
    const dispatchRows = datedRows(dispatches, range, DISPATCH_DATE_KEYS);
    const vendorRows = datedRows(vendorBills, range, VENDOR_DATE_KEYS);

    const inventoryMetric = !stock.supported
      ? metricValue(null, null, 'unsupported', sourceReason(stock))
      : !fieldAvailability(stock, ['on_hand', 'current_stock']) || !fieldAvailability(stock, ['reorder_level'])
        ? metricValue(null, null, 'unsupported', 'Inventory balance or reorder_level is absent from stock_items.')
      : metricValue(
        countWhere(stock.rows, (row) => {
          const onHand = getNumber(row, 'on_hand') ?? getNumber(row, 'current_stock');
          const reorderLevel = getNumber(row, 'reorder_level');
          const status = getString(row, 'status')?.toUpperCase();
          return status === 'SHORTAGE' || status === 'CRITICAL'
            || (onHand !== null && reorderLevel !== null && onHand <= reorderLevel);
        }),
        null,
        stock.rows.length === 0 ? 'empty' : 'supported',
        'Historical inventory snapshots are not available in the current schema.',
      );

    return {
      range,
      updatedAt: new Date().toISOString(),
      metrics: {
        revenue: metricFromRows(
          invoices,
          invoiceRows.current,
          invoiceRows.previous,
          (rows) => sumKnownField(invoices, rows, 'total_amount'),
          ['total_amount'],
          null,
          [INVOICE_DATE_KEYS],
        ),
        receivables: metricFromRows(
          invoices,
          invoiceRows.current,
          invoiceRows.previous,
          (rows) => sumKnownField(invoices, rows, 'balance_amount'),
          ['balance_amount'],
          null,
          [INVOICE_DATE_KEYS],
        ),
        openOrders: countMetric(
          orders,
          orderRows.current,
          orderRows.previous,
          orderIsOpen,
          ['status', 'stage'],
          [ORDER_DATE_KEYS],
        ),
        productionOutput: metricFromRows(
          productionLogs,
          productionRows.current,
          productionRows.previous,
          (rows) => sumKnownField(productionLogs, rows, 'qty_done'),
          ['qty_done'],
          null,
          [['logged_timestamp', 'created_at']],
        ),
        dispatches: countMetric(
          dispatches,
          dispatchRows.current,
          dispatchRows.previous,
          () => true,
          ['id'],
          [DISPATCH_DATE_KEYS],
        ),
        payables: metricFromRows(
          vendorBills,
          vendorRows.current,
          vendorRows.previous,
          (rows) => sumKnownField(vendorBills, rows, 'balance_amount'),
          ['balance_amount'],
          null,
          [VENDOR_DATE_KEYS],
        ),
        lowStock: inventoryMetric,
      },
    };
  }

  async getTrend(range: CommandCentreRange): Promise<CommandCentreTrendResponse> {
    const invoices = await this.readTable('customer_invoices');
    if (!invoices.supported) {
      return { range, updatedAt: new Date().toISOString(), series: unsupportedSection(sourceReason(invoices)) };
    }
    if (!fieldAvailability(invoices, ['date', 'created_at'])
      || !fieldAvailability(invoices, ['total_amount'])
      || !fieldAvailability(invoices, ['paid_amount'])) {
      return {
        range,
        updatedAt: new Date().toISOString(),
        series: unsupportedSection('Invoice date, total_amount, or paid_amount is absent from customer_invoices.'),
      };
    }

    const selectedRows = rowsInRange(invoices.rows, range.from, range.to, INVOICE_DATE_KEYS);
    const comparisonRows = rowsInRange(invoices.rows, range.compareFrom, range.compareTo, INVOICE_DATE_KEYS);
    const value = {
      selected: buildTrendPoints(selectedRows, range.from, range.to, range.granularity),
      comparison: buildTrendPoints(comparisonRows, range.compareFrom, range.compareTo, range.granularity),
    };
    return {
      range,
      updatedAt: new Date().toISOString(),
      series: selectedRows.length === 0 && comparisonRows.length === 0
        ? emptySection({ selected: [], comparison: [] })
        : supportedSection(value),
    };
  }

  async getOperations(range: CommandCentreRange): Promise<CommandCentreOperationsResponse> {
    const [orders, operations, stock, qc, pdi, vendorBills] = await Promise.all([
      this.readTable('customer_orders'),
      this.readTable('job_card_operations'),
      this.readTable('stock_items'),
      this.readTable('qc_inspections'),
      this.readTable('pdi_inspections'),
      this.readTable('vendor_bills'),
    ]);
    const orderRows = rowsInRange(orders.rows, range.from, range.to, ORDER_DATE_KEYS);
    const qualityQcRows = rowsInRange(qc.rows, range.from, range.to, ['created_at', 'inspected_at']);
    const qualityPdiRows = rowsInRange(pdi.rows, range.from, range.to, ['created_at', 'report_date']);

    const funnel: DataSection<CountStage[]> = !orders.supported
      ? unsupportedSection<CountStage[]>(sourceReason(orders))
      : !fieldAvailability(orders, ['status', 'stage']) || !fieldAvailability(orders, ORDER_DATE_KEYS)
        ? unsupportedSection<CountStage[]>('Order status/stage or order date is absent from customer_orders.')
        : orderRows.length === 0 ? emptySection([]) : supportedSection(buildOrderStages(orderRows));

    const productionHeatmap: DataSection<HeatmapCell[]> = !operations.supported
      ? unsupportedSection<HeatmapCell[]>(sourceReason(operations))
      : !fieldAvailability(operations, ['actual_start_time', 'actual_end_time'])
        ? unsupportedSection<HeatmapCell[]>('Operation timestamps are absent from job_card_operations.')
        : operations.rows.length === 0
          ? emptySection([])
          : (() => {
            const value = buildHeatmap(operations.rows, range.from, range.to);
            return value.length === 0 ? emptySection(value) : supportedSection(value);
          })();

    const inventory = !fieldAvailability(stock, ['on_hand', 'current_stock']) || !fieldAvailability(stock, ['reorder_level'])
      ? unsupportedSection<ReturnType<typeof buildInventoryRanks>>('Inventory balance or reorder_level is absent from stock_items.')
      : currentSource(stock, buildInventoryRanks, ['reorder_level']);

    const qcAvailable = qc.supported
      && fieldAvailability(qc, ['qc_status'])
      && fieldAvailability(qc, ['created_at', 'inspected_at']);
    const pdiAvailable = pdi.supported
      && fieldAvailability(pdi, ['pdi_status'])
      && fieldAvailability(pdi, ['created_at', 'report_date']);
    const qualityAvailability = Number(qcAvailable) + Number(pdiAvailable);
    const qualityValue = {
      qc: buildStatusCounts(qualityQcRows, 'qc_status'),
      pdi: buildStatusCounts(qualityPdiRows, 'pdi_status'),
    };
    const quality: DataSection<typeof qualityValue> = qualityAvailability === 0
      ? unsupportedSection<typeof qualityValue>('Neither qc_inspections nor pdi_inspections is available.')
      : qualityQcRows.length === 0 && qualityPdiRows.length === 0
        ? emptySection(qualityValue)
      : qualityAvailability === 2
          ? supportedSection(qualityValue)
          : partialSection(qualityValue, 'One quality source or its status field is unavailable.');

    const vendors = !fieldAvailability(vendorBills, ['amount']) || !fieldAvailability(vendorBills, ['balance_amount'])
      ? unsupportedSection<ReturnType<typeof buildVendorBreakdown>>('Amount or balance_amount is absent from vendor_bills.')
      : rangeFor(vendorBills, range, VENDOR_DATE_KEYS, buildVendorBreakdown, ['amount', 'balance_amount']);
    const customers = !fieldAvailability(orders, ['customer_name']) || !fieldAvailability(orders, ['gross_amount'])
      ? unsupportedSection<ReturnType<typeof buildCustomerRanks>>('Customer name or gross_amount is absent from customer_orders.')
      : rangeFor(orders, range, ORDER_DATE_KEYS, buildCustomerRanks, ['customer_name', 'gross_amount']);
    const pipeline = funnel;

    return {
      range,
      updatedAt: new Date().toISOString(),
      funnel,
      productionHeatmap,
      inventory,
      quality,
      vendors,
      customers,
      pipeline,
    };
  }

  async getFeeds(range: CommandCentreRange): Promise<CommandCentreFeedsResponse> {
    const [orders, dispatches, approvals, audit, invoices, stock, qc, pdi] = await Promise.all([
      this.readTable('customer_orders'),
      this.readTable('dispatch_challans'),
      this.readTable('pending_approvals'),
      this.readTable('audit_logs'),
      this.readTable('customer_invoices'),
      this.readTable('stock_items'),
      this.readTable('qc_inspections'),
      this.readTable('pdi_inspections'),
    ]);

    return {
      range,
      updatedAt: new Date().toISOString(),
      orders: makeOrderFeed(orders, range),
      dispatches: makeDispatchFeed(dispatches, range),
      approvals: makeApprovalFeed(approvals, range),
      activity: makeActivityFeed(audit, range),
      insights: makeInsights(range, orders, invoices, stock, qc, pdi),
    };
  }
}

export const commandCentreService = new CommandCentreService();
