export type CommandCentreGranularity = 'day' | 'week' | 'month';

export type SectionAvailability =
  | 'supported'
  | 'empty'
  | 'partial'
  | 'unsupported';

export interface CommandCentreRange {
  from: string;
  to: string;
  compareFrom: string;
  compareTo: string;
  granularity: CommandCentreGranularity;
}

export interface CommandCentreRow {
  [key: string]: unknown;
}

export interface TableReadResult {
  table: string;
  supported: boolean;
  rows: CommandCentreRow[];
  reason: string | null;
}

export interface MetricValue {
  availability: SectionAvailability;
  current: number | null;
  previous: number | null;
  deltaPct: number | null;
  reason: string | null;
}

export interface DataSection<T> {
  availability: SectionAvailability;
  value: T | null;
  reason: string | null;
}

export interface CommandCentreSummaryResponse {
  range: CommandCentreRange;
  updatedAt: string;
  metrics: {
    revenue: MetricValue;
    receivables: MetricValue;
    openOrders: MetricValue;
    productionOutput: MetricValue;
    dispatches: MetricValue;
    payables: MetricValue;
    lowStock: MetricValue;
  };
}

export interface TrendPoint {
  period: string;
  invoiced: number;
  collected: number;
}

export interface TrendSeries {
  selected: TrendPoint[];
  comparison: TrendPoint[];
}

export interface CommandCentreTrendResponse {
  range: CommandCentreRange;
  updatedAt: string;
  series: DataSection<TrendSeries>;
}

export interface CountStage {
  key: string;
  label: string;
  count: number;
}

export interface HeatmapCell {
  weekday: number;
  hour: number;
  count: number;
}

export interface InventoryRank {
  itemId: string | null;
  code: string | null;
  description: string | null;
  onHand: number | null;
  reorderLevel: number | null;
  shortage: number | null;
  status: string | null;
}

export interface QualityBreakdown {
  qc: Record<string, number>;
  pdi: Record<string, number>;
}

export interface VendorBreakdown {
  status: string;
  amount: number;
  balance: number;
  count: number;
}

export interface CustomerRank {
  customer: string;
  value: number;
  sharePct: number;
  orderCount: number;
}

export interface CommandCentreOperationsResponse {
  range: CommandCentreRange;
  updatedAt: string;
  funnel: DataSection<CountStage[]>;
  productionHeatmap: DataSection<HeatmapCell[]>;
  inventory: DataSection<InventoryRank[]>;
  quality: DataSection<QualityBreakdown>;
  vendors: DataSection<VendorBreakdown[]>;
  customers: DataSection<CustomerRank[]>;
  pipeline: DataSection<CountStage[]>;
}

export interface OrderFeedItem {
  id: string | null;
  poNo: string | null;
  customer: string | null;
  status: string | null;
  amount: number | null;
  date: string | null;
}

export interface DispatchFeedItem {
  id: string | null;
  challanNo: string | null;
  orderPo: string | null;
  status: string | null;
  date: string | null;
}

export interface ApprovalFeedItem {
  id: string | null;
  title: string | null;
  type: string | null;
  requestedBy: string | null;
  amount: number | null;
  status: string | null;
  createdAt: string | null;
}

export interface ActivityFeedItem {
  id: string | null;
  actor: string | null;
  action: string | null;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string | null;
}

export interface InsightFeedItem {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  source: string;
  entityId: string | null;
  date: string | null;
}

export interface CommandCentreFeedsResponse {
  range: CommandCentreRange;
  updatedAt: string;
  orders: DataSection<OrderFeedItem[]>;
  dispatches: DataSection<DispatchFeedItem[]>;
  approvals: DataSection<ApprovalFeedItem[]>;
  activity: DataSection<ActivityFeedItem[]>;
  insights: DataSection<InsightFeedItem[]>;
}
