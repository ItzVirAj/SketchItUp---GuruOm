import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Hash, 
  AlertTriangle, 
  Check, 
  Clock, 
  DollarSign, 
  ShoppingCart, 
  Factory, 
  ShieldCheck, 
  Truck, 
  SlidersHorizontal, 
  ChevronRight, 
  RefreshCw, 
  X, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Activity, 
  ArrowRight, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Box, 
  Package, 
  Layers3, 
  Download,
  CheckSquare,
  Sparkles,
  Zap,
  Gauge,
  CircleDot,
  Plus
} from 'lucide-react';
import { 
  CustomerOrder, 
  StockItem, 
  QCInspection, 
  JobCard, 
  DispatchChallan,
  CustomerInvoice,
  VendorBill,
  ProductionLogReport,
  AuditLogEntry,
  PendingApproval
} from '../../../types/console';
import { AgentBentoGrid } from '../AgentBentoGrid';
import { AccentColorSelector } from '../AccentColorSelector';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';

interface CommandCentreViewProps {
  orders?: CustomerOrder[];
  stock?: StockItem[];
  qcItems?: QCInspection[];
  jobCards?: JobCard[];
  shortages?: any[];
  dispatches?: DispatchChallan[];
  invoices?: CustomerInvoice[];
  payables?: VendorBill[];
  productionLogs?: ProductionLogReport[];
  pdiQueue?: any[];
  machines?: any[];
  users?: any[];
  auditLogs?: AuditLogEntry[];
  approvals?: PendingApproval[];
  containerScrollRef?: React.RefObject<HTMLElement | null>;
  isDarkMode?: boolean;
  isRealtimeStreaming?: boolean;
  onToggleRealtimeStreaming?: () => void;
  onResetAllData?: () => void;
  onNavigateView?: (view: any) => void;
  onNavigate?: (view: any) => void;
  onSelectOrder?: (orderId: string) => void;
  showCustomizeModal?: boolean;
  setShowCustomizeModal?: (show: boolean) => void;
  scope?: string;
  setScope?: (scope: string) => void;
}

export const CommandCentreView: React.FC<CommandCentreViewProps> = ({
  orders = [],
  stock = [],
  qcItems = [],
  jobCards = [],
  dispatches = [],
  invoices = [],
  payables = [],
  productionLogs = [],
  pdiQueue = [],
  machines = [],
  users = [],
  auditLogs = [],
  approvals = [],
  containerScrollRef,
  isDarkMode = false,
  isRealtimeStreaming = true,
  onToggleRealtimeStreaming,
  onResetAllData,
  onNavigateView,
  onNavigate,
  onSelectOrder,
  showCustomizeModal: externalShowCustomizeModal,
  setShowCustomizeModal: externalSetShowCustomizeModal,
  scope: externalScope,
  setScope: externalSetScope
}) => {
  const [mode, setMode] = useState<'charts' | 'numbers'>('charts');
  
  // Mobile Executive Tab Switcher: 'pulse' | 'orders' | 'shopfloor' | 'finance' | 'swarm'
  const [mobileSectionTab, setMobileSectionTab] = useState<'pulse' | 'orders' | 'shopfloor' | 'finance' | 'swarm'>('pulse');

  const [tabularSearchQuery, setTabularSearchQuery] = useState<string>('');
  const [tabularCategoryFilter, setTabularCategoryFilter] = useState<string>('ALL');
  const [tabularDensity, setTabularDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [localScope, setLocalScope] = useState<string>('FY 26-27');
  const scope = externalScope ?? localScope;
  const setScope = externalSetScope ?? setLocalScope;

  const localContainerRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = containerScrollRef || localContainerRef;

  // Mobile Native Pull-to-Refresh
  const { isRefreshing, pullDistance, isTriggered } = usePullToRefresh(activeScrollRef, {
    onRefresh: async () => {
      if (onResetAllData) {
        await onResetAllData();
      }
    }
  });

  const [localShowCustomizeModal, setLocalShowCustomizeModal] = useState<boolean>(false);
  const showCustomizeModal = externalShowCustomizeModal ?? localShowCustomizeModal;
  const setShowCustomizeModal = externalSetShowCustomizeModal ?? setLocalShowCustomizeModal;

  // Timeframe selector for charts
  const [topProductsTimeframe, setTopProductsTimeframe] = useState<string>('June');
  const [salesAnalyticsTimeframe, setSalesAnalyticsTimeframe] = useState<string>('June');

  // Search & Filter state for Recent Activities Table
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>('');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>('ALL');

  const defaultVisibility = {
    showAlertsBar: true,
    showShortagesBanner: true,
    showAgentBentoGrid: true,
    showTopMetricsRow: true,
    showAnalyticsGrid: true,
    showRecentActivities: true,
    showThroughputChart: true,
    showQcCard: true,
    showMachineRuntimeCard: true,
    showOrderPipelineCard: true
  };

  const [widgetVisibility, setWidgetVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem('stratum_cmd_widgets');
      if (!saved) return defaultVisibility;
      const parsed = JSON.parse(saved);
      return {
        ...defaultVisibility,
        ...parsed,
        showAgentBentoGrid: parsed.showAgentBentoGrid ?? true,
        showTopMetricsRow: parsed.showTopMetricsRow ?? true,
        showAnalyticsGrid: parsed.showAnalyticsGrid ?? true,
        showRecentActivities: parsed.showRecentActivities ?? true
      };
    } catch {
      return defaultVisibility;
    }
  });

  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    try {
      return localStorage.getItem('stratum_currency') || '₹';
    } catch {
      return '₹';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('stratum_cmd_widgets', JSON.stringify(widgetVisibility));
    } catch (e) {
      // ignore
    }
  }, [widgetVisibility]);

  useEffect(() => {
    try {
      localStorage.setItem('stratum_currency', currencySymbol);
    } catch (e) {
      // ignore
    }
  }, [currencySymbol]);

  const handleNavigate = (view: any) => {
    if (onNavigate) onNavigate(view);
    if (onNavigateView) onNavigateView(view);
  };

  const toggleWidget = (key: keyof typeof widgetVisibility) => {
    setWidgetVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // =========================================================================
  // REALTIME SCOPED CALCULATIONS
  // =========================================================================
  const getScopeFilter = (dateString?: string) => {
    if (!dateString || scope === 'All-Time') return true;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return true;
    
    if (scope === 'FY 26-27') {
      return date >= new Date('2026-04-01T00:00:00') && date <= new Date('2027-03-31T23:59:59');
    }
    if (scope === 'FY 25-26') {
      return date >= new Date('2025-04-01T00:00:00') && date <= new Date('2026-03-31T23:59:59');
    }
    if (scope === 'Q3 2026') {
      return date >= new Date('2026-10-01T00:00:00') && date <= new Date('2026-12-31T23:59:59');
    }
    return true;
  };

  const scopedOrders = orders.filter(o => getScopeFilter(o.orderDate || o.createdAt));
  const scopedInvoices = invoices.filter(i => getScopeFilter(i.invoiceDate || i.createdAt));
  const scopedJobCards = jobCards.filter(j => getScopeFilter(j.createdAt || j.targetDate));
  const scopedDispatches = dispatches.filter(d => getScopeFilter(d.dispatchDate || d.createdAt));

  // Pending Approvals count
  const pendingApprovalsList = approvals.filter(a => a.status === 'PENDING');
  const pendingApprovalsCount = pendingApprovalsList.length;

  const qcHoldCount = qcItems.filter(q => q.qcStatus === 'QC_HOLD' || q.jobStatus === 'QC_HOLD').length;
  
  const shortItemsList = stock.filter(s => s.status === 'SHORTAGE' || s.status === 'CRITICAL' || s.available < 0);
  const itemsShortCount = shortItemsList.length;

  const overdueDeliveriesCount = scopedOrders.filter(o => {
    if (o.status === 'CLOSED' || o.status === 'CANCELLED') return false;
    if (o.status === 'OVERDUE') return true;
    if (o.dueDate) {
      return new Date(o.dueDate) < new Date();
    }
    return false;
  }).length;

  const overdueInvoicesList = scopedInvoices.filter(i => i.status === 'OVERDUE');
  const overdueReceivablesSum = overdueInvoicesList.reduce((acc, i) => acc + (i.amount || 0), 0);

  const pendingDispatchesCount = scopedDispatches.filter(d => d.status === 'PENDING' || d.status === 'IN_TRANSIT').length;

  // Realtime Live Order & Revenue Metrics
  const openOrders = scopedOrders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED');
  const totalOrdersNum = scopedOrders.length > 0 ? scopedOrders.length : (scope === 'FY 25-26' ? 940 : scope === 'Q3 2026' ? 380 : 1305);
  const activeOrdersNum = openOrders.length > 0 ? openOrders.length : (scope === 'FY 25-26' ? 760 : scope === 'Q3 2026' ? 310 : 1230);

  const realTotalRevenueSum = scopedOrders.reduce((acc, o) => acc + (o.grossAmount || 0), 0);
  const openOrderBookValue = openOrders.reduce((acc, o) => acc + (o.grossAmount || 0), 0);
  const totalSalesRevenueVal = realTotalRevenueSum > 0 ? realTotalRevenueSum : (openOrderBookValue > 0 ? openOrderBookValue : (scope === 'FY 25-26' ? 98000 : scope === 'Q3 2026' ? 42000 : 125000));

  // Order Status Breakdown
  const completedOrdersNum = scopedOrders.length > 0 ? scopedOrders.filter(o => o.status === 'CLOSED' || o.status === 'DISPATCHED').length : Math.round(totalOrdersNum * 0.78);
  const processingOrdersNum = scopedOrders.length > 0 ? scopedOrders.filter(o => o.status === 'IN_PRODUCTION' || o.status === 'CONFIRMED' || o.status === 'PARTIALLY_DISPATCHED').length : Math.round(totalOrdersNum * 0.15);
  const cancelledOrdersNum = scopedOrders.length > 0 ? scopedOrders.filter(o => o.status === 'CANCELLED').length : Math.round(totalOrdersNum * 0.05);
  const returnedOrdersNum = qcHoldCount > 0 ? qcHoldCount : Math.round(totalOrdersNum * 0.02);

  const completedPct = totalOrdersNum > 0 ? Math.round((completedOrdersNum / totalOrdersNum) * 100) : 78;
  const processingPct = totalOrdersNum > 0 ? Math.round((processingOrdersNum / totalOrdersNum) * 100) : 15;
  const cancelledPct = totalOrdersNum > 0 ? Math.round((cancelledOrdersNum / totalOrdersNum) * 100) : 5;
  const returnedPct = totalOrdersNum > 0 ? Math.round((returnedOrdersNum / totalOrdersNum) * 100) : 2;

  const inProdOrdersVal = scopedOrders.filter(o => o.status === 'IN_PRODUCTION' || o.status === 'CONFIRMED' || o.status === 'PARTIALLY_DISPATCHED').reduce((acc, o) => acc + (o.grossAmount || 0), 0);
  const processingRevenueVal = inProdOrdersVal > 0 ? inProdOrdersVal : 6900;

  const totalMonthlyPartsOutput = productionLogs.reduce((acc, p) => acc + (p.qtyDone || 0), 0);

  const passQcCount = qcItems.filter(q => q.qcStatus === 'PASS').length;
  const totalQcInspected = qcItems.length;
  const qcPassRate = totalQcInspected > 0 ? ((passQcCount / totalQcInspected) * 100).toFixed(1) : '98.5';

  const outstandingPayablesSum = payables.filter(p => p.status === 'UNPAID' || p.status === 'OVERDUE').reduce((acc, p) => acc + (p.amount || 0), 0);

  // Currency Formatter
  const fmt = (num: number) => {
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Top Selling Products
  const productSalesMap: Record<string, number> = {};
  orders.forEach(o => {
    if (o.partDescription) {
      productSalesMap[o.partDescription] = (productSalesMap[o.partDescription] || 0) + (o.orderedQty || 1);
    }
  });
  stock.forEach(s => {
    if (s.description && !productSalesMap[s.description]) {
      productSalesMap[s.description] = Math.round(s.onHand * 2.5);
    }
  });

  const dynamicTopProducts = Object.entries(productSalesMap).slice(0, 5).map(([name, sales], idx) => ({
    name,
    sales: Math.min(1000, Math.max(200, sales * 15)),
    active: idx === 0
  }));

  // Activity stream
  const formattedActivities = auditLogs.map(log => ({
    time: log.when || 'Just now',
    activity: log.details || `${log.entity} status updated`,
    category: log.entity || 'System',
    user: log.user || 'Admin',
    status: log.details?.toLowerCase().includes('completed') || log.details?.toLowerCase().includes('pass') 
      ? 'Completed' 
      : log.details?.toLowerCase().includes('process') || log.details?.toLowerCase().includes('created') 
      ? 'Processing' 
      : log.details?.toLowerCase().includes('cancel') || log.details?.toLowerCase().includes('hold') 
      ? 'Cancelled' 
      : 'Completed'
  }));

  const filteredActivities = formattedActivities.filter(act => {
    const matchesSearch = act.activity.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
                          act.user.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
                          act.category.toLowerCase().includes(activitySearchQuery.toLowerCase());
    const matchesCategory = activityCategoryFilter === 'ALL' || act.category.toUpperCase() === activityCategoryFilter.toUpperCase();
    return matchesSearch && matchesCategory;
  });

  const allTabularMetrics = [
    {
      code: 'MTR-FIN-01',
      name: 'Open Order Book Value',
      category: 'FINANCIAL',
      valueStr: fmt(openOrderBookValue),
      status: openOrderBookValue > 0 ? 'HEALTHY' : 'NEUTRAL',
      statusBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Target ₹5.0M',
      delta: '+14.2% MoM',
      deltaType: 'up',
      viewKey: 'orders',
      actionLabel: 'Open Orders'
    },
    {
      code: 'MTR-ORD-02',
      name: 'Active Customer Purchase Orders',
      category: 'PRODUCTION',
      valueStr: `${openOrders.length} POs`,
      status: openOrders.length > 0 ? 'ACTIVE' : 'IDLE',
      statusBadge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
      target: 'Scope: ' + scope,
      delta: `${openOrders.filter(o => o.status === 'IN_PRODUCTION').length} In Prod`,
      deltaType: 'neutral',
      viewKey: 'orders',
      actionLabel: 'View Orders'
    },
    {
      code: 'MTR-INV-06',
      name: 'Inventory Items in Shortage',
      category: 'INVENTORY',
      valueStr: `${itemsShortCount} SKUs`,
      status: itemsShortCount > 0 ? 'CRITICAL' : 'OPTIMAL',
      statusBadge: itemsShortCount > 0 ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Threshold: 0 Short',
      delta: itemsShortCount > 0 ? 'Reorder Needed' : 'Stock Healthy',
      deltaType: itemsShortCount > 0 ? 'down' : 'up',
      viewKey: 'inventory',
      actionLabel: 'View Stock'
    },
    {
      code: 'MTR-FIN-12',
      name: 'Outstanding Accounts Receivable',
      category: 'FINANCIAL',
      valueStr: fmt(overdueReceivablesSum),
      status: overdueReceivablesSum > 0 ? 'DUE' : 'CLEAR',
      statusBadge: overdueReceivablesSum > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Target: ₹0 Due',
      delta: `${overdueInvoicesList.length} Overdue`,
      deltaType: overdueReceivablesSum > 0 ? 'down' : 'up',
      viewKey: 'invoices',
      actionLabel: 'Receivables'
    },
    {
      code: 'MTR-FIN-13',
      name: 'Accounts Payable (Vendor Bills)',
      category: 'FINANCIAL',
      valueStr: fmt(payables.reduce((a, b) => a + (b.balanceAmount || 0), 0)),
      status: payables.some(p => p.status === 'OVERDUE') ? 'OVERDUE' : 'OK',
      statusBadge: payables.some(p => p.status === 'OVERDUE') ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
      target: 'Credit Net 30',
      delta: `${payables.length} Bills`,
      deltaType: 'neutral',
      viewKey: 'payables',
      actionLabel: 'Payables'
    },
    {
      code: 'MTR-QLT-04',
      name: 'QC Quality Pass Rate Index',
      category: 'QUALITY',
      valueStr: `${qcPassRate}%`,
      status: Number(qcPassRate) >= 95 ? 'OPTIMAL' : 'ATTENTION',
      statusBadge: Number(qcPassRate) >= 95 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      target: 'Benchmark: 98.0%',
      delta: '+2.1% MoM',
      deltaType: 'up',
      viewKey: 'qc',
      actionLabel: 'View QC'
    },
    {
      code: 'MTR-PRD-03',
      name: 'In-Progress Shopfloor Job Cards',
      category: 'PRODUCTION',
      valueStr: `${jobCards.filter(j => j.status === 'IN_PROGRESS').length} Active`,
      status: 'RUNNING',
      statusBadge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      target: 'Capacity Target: 10',
      delta: `${jobCards.length} Total JC`,
      deltaType: 'neutral',
      viewKey: 'production',
      actionLabel: 'Job Cards'
    }
  ];

  const filteredTabularMetrics = allTabularMetrics.filter(m => {
    const q = tabularSearchQuery.toLowerCase();
    const matchesQuery = m.code.toLowerCase().includes(q) ||
                          m.name.toLowerCase().includes(q) ||
                          m.status.toLowerCase().includes(q) ||
                          m.target.toLowerCase().includes(q);
    const matchesCat = tabularCategoryFilter === 'ALL' || m.category === tabularCategoryFilter;
    return matchesQuery && matchesCat;
  });

  const handleExportTabularCSV = () => {
    const headers = ['Metric Code', 'Metric Name', 'Category', 'Current Telemetry Value', 'Status', 'Target/Benchmark', 'Period Delta'];
    const rows = filteredTabularMetrics.map(m => [
      m.code,
      `"${m.name.replace(/"/g, '""')}"`,
      m.category,
      `"${m.valueStr.replace(/"/g, '""')}"`,
      m.status,
      `"${m.target.replace(/"/g, '""')}"`,
      `"${m.delta.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Command_Centre_Tabular_Metrics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={localContainerRef} className="space-y-3.5 sm:space-y-5 font-sans select-none pb-4">
      
      {/* ── MOBILE PULL-TO-REFRESH INDICATOR ── */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          style={{ height: `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` }}
          className="flex md:hidden items-center justify-center transition-all duration-150 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] text-xs font-semibold shadow-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : isTriggered ? 'rotate-180 transition-transform' : ''}`} />
            <span>{isRefreshing ? 'Updating dashboard...' : isTriggered ? 'Release to refresh' : 'Pull down to refresh'}</span>
          </div>
        </div>
      )}

      {/* ── TOP MOBILE CONTROL BAR & SEGMENTED TABS (VISIBLE ON MOBILE < md) ── */}
      <div className="block md:hidden space-y-2.5">
        {/* Compact Header Badge with Mode & Scope */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Live Command
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="h-8 px-2.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="FY 26-27">FY 26-27</option>
              <option value="FY 25-26">FY 25-26</option>
              <option value="Q3 2026">Q3 2026</option>
              <option value="All-Time">All Time</option>
            </select>

            <button
              onClick={() => setShowCustomizeModal(true)}
              className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Customize Widgets"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Swipeable / Scrollable Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth">
          {[
            { id: 'pulse', label: 'Pulse', icon: Zap },
            { id: 'orders', label: 'Orders', icon: ShoppingCart },
            { id: 'shopfloor', label: 'Plant & QC', icon: Factory },
            { id: 'finance', label: 'Finance', icon: DollarSign },
            { id: 'swarm', label: 'AI Swarm', icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mobileSectionTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileSectionTab(tab.id as any)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white shadow-sm shadow-[var(--accent-shadow)]'
                    : 'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PINNED TOP APPROVALS QUEUE BANNER (OWNER HIGH-PRIORITY ACTION) ── */}
      {pendingApprovalsCount > 0 && (
        <div 
          onClick={() => handleNavigate('approvals')}
          className="relative overflow-hidden rounded-2xl border border-rose-300 dark:border-rose-800/80 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white font-black shrink-0 shadow-xs">
                <CheckSquare className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-bold">
                  {pendingApprovalsCount}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-rose-700 dark:text-rose-400 tracking-tight truncate">
                    {pendingApprovalsCount} Approvals Pending
                  </span>
                  <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase bg-rose-500 text-white rounded-md shrink-0">
                    Urgent
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                  High-value POs & credit dispatches waiting for sign-off
                </p>
              </div>
            </div>

            <button
              type="button"
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs transition-all cursor-pointer"
            >
              <span>Action</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── MOBILE VIEWPORT SECTION SWITCHER (< md) ──                             */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3.5">
        
        {/* TAB 1: PULSE (DEFAULT HIGH-IMPACT DASHBOARD) */}
        {mobileSectionTab === 'pulse' && (
          <div className="space-y-3.5 animate-fade-in">
            
            {/* Horizontal Operational Alert Strip */}
            <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
              <button 
                onClick={() => handleNavigate('qc')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{qcHoldCount} QC Holds</span>
              </button>

              <button 
                onClick={() => handleNavigate('inventory')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{itemsShortCount} Short SKUs</span>
              </button>

              <button 
                onClick={() => handleNavigate('orders')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{overdueDeliveriesCount} Overdue</span>
              </button>

              <button 
                onClick={() => handleNavigate('invoices')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{fmt(overdueReceivablesSum)} Overdue</span>
              </button>

              <button 
                onClick={() => handleNavigate('dispatch')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
              >
                <Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{pendingDispatchesCount} Ready Dock</span>
              </button>
            </div>

            {/* Executive 2x2 Matrix KPI Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Metric 1: Order Book */}
              <div 
                onClick={() => handleNavigate('orders')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Book</span>
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {fmt(totalSalesRevenueVal)}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                  <span>{activeOrdersNum} Active POs</span>
                  <span className="text-emerald-500 font-bold">+12%</span>
                </div>
              </div>

              {/* Metric 2: Shortages */}
              <div 
                onClick={() => handleNavigate('inventory')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shortages</span>
                  <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className={`text-xl font-black tracking-tight ${
                  itemsShortCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}>
                  {itemsShortCount} SKUs
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                  <span>{stock.length} Tracked</span>
                  <span className={itemsShortCount > 0 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                    {itemsShortCount > 0 ? 'Reorder' : 'Healthy'}
                  </span>
                </div>
              </div>

              {/* Metric 3: Overdue Receivables */}
              <div 
                onClick={() => handleNavigate('invoices')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receivables</span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {fmt(overdueReceivablesSum)}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                  <span>{overdueInvoicesList.length} Invoices</span>
                  <span className="text-amber-500 font-bold">Overdue</span>
                </div>
              </div>

              {/* Metric 4: Vendor Payables */}
              <div 
                onClick={() => handleNavigate('payables')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payables</span>
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Factory className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {fmt(outstandingPayablesSum)}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                  <span>{payables.length} Bills</span>
                  <span className="text-indigo-500 font-bold">Net 30</span>
                </div>
              </div>

            </div>

            {/* Quick Actions Strip */}
            <div className="grid grid-cols-4 gap-2">
              <button 
                onClick={() => handleNavigate('orders')}
                className={`min-h-[46px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-center active:scale-95 transition-all shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <Plus className="w-4 h-4 text-blue-500" />
                <span className="text-[9px] font-bold truncate w-full">+ Order</span>
              </button>

              <button 
                onClick={() => handleNavigate('approvals')}
                className={`min-h-[46px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-center active:scale-95 transition-all shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <CheckSquare className="w-4 h-4 text-rose-500" />
                <span className="text-[9px] font-bold truncate w-full">Approvals</span>
              </button>

              <button 
                onClick={() => handleNavigate('inventory')}
                className={`min-h-[46px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-center active:scale-95 transition-all shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-[9px] font-bold truncate w-full">Shortages</span>
              </button>

              <button 
                onClick={() => handleNavigate('dispatch')}
                className={`min-h-[46px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-center active:scale-95 transition-all shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <Truck className="w-4 h-4 text-teal-500" />
                <span className="text-[9px] font-bold truncate w-full">Dock</span>
              </button>
            </div>

            {/* Live Plant Health Summary Card */}
            <div className={`p-4 rounded-2xl border space-y-3 shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">Live Plant Health</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {qcPassRate}% QC PASS
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-[9px] text-slate-400 uppercase font-semibold">Active JCs</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {jobCards.filter(j => j.status === 'IN_PROGRESS').length}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-[9px] text-slate-400 uppercase font-semibold">QC Inspected</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {qcItems.length}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-[9px] text-slate-400 uppercase font-semibold">Output Done</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {totalMonthlyPartsOutput}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Factory Events */}
            <div className={`p-4 rounded-2xl border space-y-2.5 shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">Recent Activities</span>
                <span className="text-[10px] font-mono text-slate-400">Live Feed</span>
              </div>

              <div className="space-y-2">
                {filteredActivities.slice(0, 3).map((act, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white truncate text-[11px]">{act.activity}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{act.time} • {act.user}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      act.status === 'Completed'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {act.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: ORDERS & SALES */}
        {mobileSectionTab === 'orders' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Pipeline Status */}
            <div className={`p-4 rounded-2xl border space-y-3 shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Order Pipeline Breakdown</span>
                <span className="text-[11px] font-mono text-slate-400">{totalOrdersNum} Total POs</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400">Completed ({completedOrdersNum})</span>
                    <span className="font-mono">{completedPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completedPct}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-900 dark:text-white font-bold">In Shopfloor ({processingOrdersNum})</span>
                    <span className="font-mono">{processingPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${processingPct}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400">QC Holds ({returnedOrdersNum})</span>
                    <span className="font-mono">{returnedPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${returnedPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Selling Products */}
            <div className={`p-4 rounded-2xl border space-y-3 shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs font-bold text-slate-900 dark:text-white">Top Products Volume</span>
              <div className="space-y-2.5">
                {dynamicTopProducts.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{item.sales} Units</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.active ? 'bg-blue-600' : 'bg-blue-300 dark:bg-slate-600'}`}
                        style={{ width: `${(item.sales / 1000) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PLANT & QC */}
        {mobileSectionTab === 'shopfloor' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Throughput Chart */}
            <div className={`p-4 rounded-2xl border space-y-3 shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Monthly Parts Output</span>
                <span className="text-[11px] font-mono text-teal-600 font-bold">{totalMonthlyPartsOutput} Done</span>
              </div>
              <div className="h-36 w-full">
                <svg className="w-full h-full" viewBox="0 0 500 160">
                  <path
                    d="M 60,110 C 100,105 130,95 150,90 C 180,85 210,80 240,75 C 270,80 300,80 330,75 C 370,70 410,60 450,45"
                    fill="none"
                    stroke="#0D9488"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle cx="450" cy="45" r="6" fill="#0D9488" stroke="#ffffff" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* Active Job Cards */}
            <div className={`p-4 rounded-2xl border space-y-2.5 shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Active Shopfloor Job Cards</span>
                <button onClick={() => handleNavigate('production')} className="text-xs text-blue-500 font-bold">
                  View All →
                </button>
              </div>
              <div className="space-y-2">
                {jobCards.slice(0, 3).map((jc, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{jc.jobCardNo || `JC-2026-${i+1}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{jc.partDescription || 'Precision Component'}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {jc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FINANCE & P&L */}
        {mobileSectionTab === 'finance' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Overdue Receivables Ageing */}
            <div className={`p-4 rounded-2xl border space-y-3 shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Overdue Receivables</span>
                <span className="text-xs font-black text-amber-500 font-mono">{fmt(overdueReceivablesSum)}</span>
              </div>
              <div className="space-y-2">
                {overdueInvoicesList.slice(0, 3).map((inv, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{inv.customerName || 'OEM Client'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{inv.invoiceNo}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 dark:text-white font-mono">{fmt(inv.amount || 0)}</div>
                      <div className="text-[9px] text-rose-500 font-bold">OVERDUE</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vendor Bills */}
            <div className={`p-4 rounded-2xl border space-y-3 shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Vendor Payables</span>
                <span className="text-xs font-black text-indigo-500 font-mono">{fmt(outstandingPayablesSum)}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {payables.length} total supplier bills logged for raw material & external plating.
              </p>
              <button 
                onClick={() => handleNavigate('payables')}
                className="w-full min-h-[44px] rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Open Disbursements Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: AI SWARM */}
        {mobileSectionTab === 'swarm' && (
          <div className="space-y-3.5 animate-fade-in">
            <AgentBentoGrid
              orders={orders}
              stock={stock}
              qcItems={qcItems}
              jobCards={jobCards}
              dispatches={dispatches}
              invoices={invoices}
              payables={payables}
              productionLogs={productionLogs}
              auditLogs={auditLogs}
              isRealtimeStreaming={isRealtimeStreaming}
              currencySymbol={currencySymbol}
              isDarkMode={isDarkMode}
              onNavigateView={handleNavigate}
            />
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP UNIFIED GRID (≥ md) ──                                         */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-5">
        
        {/* ── SECTION 1: OPERATIONAL ALERTS BAR ── */}
        {widgetVisibility.showAlertsBar && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* 1. QC Holds */}
              <div 
                onClick={() => handleNavigate('qc')}
                className="min-h-[48px] bg-[#FFF8E7] dark:bg-[#38260B] border border-[#FCD34D] dark:border-[#B45309] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-500 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="bg-[#FDE68A] dark:bg-[#78350F] text-[#78350F] dark:text-[#FEF3C7] font-black px-2 py-1 rounded-lg text-xs font-mono shrink-0">
                    {qcHoldCount}
                  </span>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-xs font-bold text-[#78350F] dark:text-[#FDE68A] truncate">QC HOLDS</span>
                    <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 truncate">Stage inspection hold</span>
                  </div>
                </div>
                <AlertTriangle className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
              </div>

              {/* 2. Items Short */}
              <div 
                onClick={() => handleNavigate('inventory')}
                className="min-h-[48px] bg-[#FFF1F2] dark:bg-[#45101C] border border-[#FDA4AF] dark:border-[#BE123C] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-rose-500 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="bg-[#FECDD3] dark:bg-[#881337] text-[#881337] dark:text-[#FFE4E6] font-black px-2 py-1 rounded-lg text-xs font-mono shrink-0">
                    {itemsShortCount}
                  </span>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-xs font-bold text-[#881337] dark:text-[#FECDD3] truncate">ITEMS SHORT</span>
                    <span className="text-[10px] text-rose-700/80 dark:text-rose-300/80 truncate">Raw materials needed</span>
                  </div>
                </div>
                <AlertTriangle className="w-4 h-4 text-[#E11D48] dark:text-[#FB7185] shrink-0" />
              </div>

              {/* 3. Overdue Deliveries */}
              <div 
                onClick={() => handleNavigate('orders')}
                className="min-h-[48px] bg-[#FFF8E7] dark:bg-[#38260B] border border-[#FCD34D] dark:border-[#B45309] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-500 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="bg-[#FDE68A] dark:bg-[#78350F] text-[#78350F] dark:text-[#FEF3C7] font-black px-2 py-1 rounded-lg text-xs font-mono shrink-0">
                    {overdueDeliveriesCount}
                  </span>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-xs font-bold text-[#78350F] dark:text-[#FDE68A] truncate">OVERDUE DELIVERIES</span>
                    <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 truncate">Past customer target date</span>
                  </div>
                </div>
                <Clock className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
              </div>

              {/* 4. Overdue Receivables */}
              <div 
                onClick={() => handleNavigate('invoices')}
                className="min-h-[48px] bg-[#ECFDF5] dark:bg-[#0C3327] border border-[#6EE7B7] dark:border-[#059669] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="bg-[#A7F3D0] dark:bg-[#064E3B] text-[#064E3B] dark:text-[#D1FAE5] font-black px-2 py-1 rounded-lg text-[11px] font-mono shrink-0">
                    {fmt(overdueReceivablesSum)}
                  </span>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-xs font-bold text-[#064E3B] dark:text-[#A7F3D0] truncate">OVERDUE REC.</span>
                    <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 truncate">Customer credit overdue</span>
                  </div>
                </div>
                <DollarSign className="w-4 h-4 text-[#059669] dark:text-[#34D399] shrink-0" />
              </div>

              {/* 5. Pending Dispatches */}
              <div 
                onClick={() => handleNavigate('dispatch')}
                className="min-h-[48px] bg-[#F0FDFA] dark:bg-[#0F3634] border border-[#5EEAD4] dark:border-[#0D9488] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-teal-500 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="bg-[#99F6E4] dark:bg-[#134E4A] text-[#134E4A] dark:text-[#CCFBF1] font-black px-2 py-1 rounded-lg text-xs font-mono shrink-0">
                    {pendingDispatchesCount}
                  </span>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-xs font-bold text-[#134E4A] dark:text-[#99F6E4] truncate">PENDING DISPATCHES</span>
                    <span className="text-[10px] text-teal-700/80 dark:text-teal-300/80 truncate">Challans ready for dock</span>
                  </div>
                </div>
                <Truck className="w-4 h-4 text-[#0D9488] dark:text-[#2DD4BF] shrink-0" />
              </div>

            </div>
          </div>
        )}

        {/* ── SECTION 2: TOP KPI CARDS ROW (4-COL GRID ON DESKTOP) ── */}
        {widgetVisibility.showTopMetricsRow && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Priority 1: Active Orders */}
            <div 
              onClick={() => handleNavigate('orders')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99] group ${
                isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[var(--accent-primary)]">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Open Order Book</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className={`text-3xl font-black tracking-tight font-sans ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {fmt(totalSalesRevenueVal)}
                </span>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400">
                  12% <TrendingUp className="w-3 h-3" />
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>{activeOrdersNum} Active POs in pipe</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Tap to view POs →</span>
              </div>
            </div>

            {/* Priority 2: Raw Material Shortages */}
            <div 
              onClick={() => handleNavigate('inventory')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99] group ${
                isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Material Shortages</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className={`text-3xl font-black tracking-tight font-sans ${
                  itemsShortCount > 0 ? 'text-rose-600 dark:text-rose-400' : isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {itemsShortCount > 0 ? itemsShortCount : 0} SKUs
                </span>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  itemsShortCount > 0 
                    ? 'text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400' 
                    : 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400'
                }`}>
                  {itemsShortCount > 0 ? 'Action Needed' : 'Stock Optimal'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>{stock.length} Total tracked parts</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">Reorder list →</span>
              </div>
            </div>

            {/* Priority 3: Receivables Ageing */}
            <div 
              onClick={() => handleNavigate('invoices')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99] group ${
                isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Overdue Receivables</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className={`text-3xl font-black tracking-tight font-sans ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {fmt(overdueReceivablesSum)}
                </span>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400">
                  {overdueInvoicesList.length} Due
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Customer payment queue</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Collections →</span>
              </div>
            </div>

            {/* Priority 4: Outstanding Payables */}
            <div 
              onClick={() => handleNavigate('payables')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99] group ${
                isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500">
                    <Factory className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Vendor Payables</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className={`text-3xl font-black tracking-tight font-sans ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {fmt(outstandingPayablesSum)}
                </span>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400">
                  {payables.length} Bills
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Raw material bills</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Disbursements →</span>
              </div>
            </div>

          </div>
        )}

        {/* ── SECTION 3: ANALYTICS & CHARTS GRID ── */}
        {widgetVisibility.showAnalyticsGrid && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Card 1: Top Selling Products */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Top Selling Products
                </h3>
                <select
                  value={topProductsTimeframe}
                  onChange={(e) => setTopProductsTimeframe(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs border outline-none font-semibold cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="June">June</option>
                  <option value="May">May</option>
                  <option value="Q3 2026">Q3 2026</option>
                </select>
              </div>

              <div className="pt-4 pb-2">
                <div className="flex items-end justify-between gap-3 h-44 px-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  {dynamicTopProducts.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-t-xl overflow-hidden flex flex-col justify-end h-full relative">
                        <div 
                          className={`w-full transition-all duration-500 rounded-t-xl ${
                            item.active 
                              ? 'bg-blue-600 dark:bg-blue-500 shadow-md shadow-blue-500/20' 
                              : 'bg-blue-100 dark:bg-slate-700 group-hover:bg-blue-300 dark:group-hover:bg-slate-600'
                          }`}
                          style={{ height: `${(item.sales / 1000) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 truncate max-w-full text-center">
                        {item.name.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between px-2 pt-2 text-[10px] font-mono text-slate-400">
                  <span>1K</span>
                  <span>500</span>
                  <span>0</span>
                </div>
              </div>
            </div>

            {/* Card 2: Order Pipeline */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-2xs relative ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Order Pipeline Status
                </h3>
                <span className="text-xs text-slate-400 font-mono">{totalOrdersNum} Scoped</span>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs gap-3">
                  <span className="w-20 text-slate-500 font-medium">Completed</span>
                  <div className="flex-1 h-6 bg-blue-50 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-200 dark:bg-slate-700 rounded-full" style={{ width: `${completedPct}%` }} />
                  </div>
                  <span className="w-10 text-right font-bold text-slate-400 text-[11px]">{completedOrdersNum}</span>
                </div>

                <div className="flex items-center justify-between text-xs gap-3">
                  <span className="w-20 text-slate-900 dark:text-slate-100 font-bold">In Shopfloor</span>
                  <div className="flex-1 h-6 bg-blue-50 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${processingPct}%` }} />
                  </div>
                  <span className="w-10 text-right font-bold text-slate-900 dark:text-white text-[11px]">{processingOrdersNum}</span>
                </div>

                <div className="flex items-center justify-between text-xs gap-3">
                  <span className="w-20 text-slate-500 font-medium">QC Hold</span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 dark:bg-amber-600 rounded-full" style={{ width: `${returnedPct}%` }} />
                  </div>
                  <span className="w-10 text-right font-bold text-slate-400 text-[11px]">{returnedOrdersNum}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Channel Performance */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
            }`}>
              <div>
                <h3 className={`font-bold text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Channel Performance
                </h3>
                <div className={`text-2xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {fmt(totalSalesRevenueVal)}
                </div>
              </div>

              <div className="relative flex flex-col items-center justify-center my-2">
                <svg className="w-52 h-32" viewBox="0 0 200 110">
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="20"
                    strokeLinecap="round"
                    className="dark:stroke-slate-800"
                  />
                  <path
                    d="M 20 100 A 80 80 0 0 1 100 20"
                    fill="none"
                    stroke="#93c5fd"
                    strokeWidth="20"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 105 20 A 80 80 0 0 1 178 95"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="20"
                    strokeLinecap="round"
                  />
                </svg>
                
                <div className="absolute top-[58px] flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">TOTAL ORDERS:</span>
                  <span className={`text-xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {totalOrdersNum.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>OEM Clients</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span>Export Market</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── AUTONOMOUS AI AGENT WORKSPACE (BENTO GRID) ── */}
        {widgetVisibility.showAgentBentoGrid && (
          <AgentBentoGrid
            orders={orders}
            stock={stock}
            qcItems={qcItems}
            jobCards={jobCards}
            dispatches={dispatches}
            invoices={invoices}
            payables={payables}
            productionLogs={productionLogs}
            auditLogs={auditLogs}
            isRealtimeStreaming={isRealtimeStreaming}
            currencySymbol={currencySymbol}
            isDarkMode={isDarkMode}
            onNavigateView={handleNavigate}
          />
        )}

        {/* ── RECENT ACTIVITIES DATA TABLE ── */}
        {widgetVisibility.showRecentActivities && (
          <div className={`rounded-2xl border p-5 space-y-4 shadow-2xs ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Recent Activities
              </h3>

              <div className="flex items-center gap-2.5">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs w-64 ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}>
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    className="bg-transparent outline-none w-full"
                  />
                </div>

                <select
                  value={activityCategoryFilter}
                  onChange={(e) => setActivityCategoryFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer outline-none ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="ALL">All Categories</option>
                  <option value="ORDER">Order</option>
                  <option value="INVENTORY">Inventory</option>
                  <option value="SYSTEM">System</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className={`border-b font-semibold text-[11px] text-slate-400 uppercase tracking-wider ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                  }`}>
                    <th className="py-3 px-4">Time ↕</th>
                    <th className="py-3 px-4">Activities</th>
                    <th className="py-3 px-4">Category ↕</th>
                    <th className="py-3 px-4">User ↕</th>
                    <th className="py-3 px-4 text-center">Status ↕</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredActivities.slice(0, 8).map((act, index) => (
                    <tr key={index} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{act.time}</td>
                      <td className={`py-3.5 px-4 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{act.activity}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-500">{act.category}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-500">{act.user}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                          act.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{act.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── CUSTOMIZE MODAL ── */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          <div 
            onClick={() => setShowCustomizeModal(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          />
          <div className={`relative w-full max-w-md rounded-2xl border p-5 sm:p-6 space-y-4 font-sans z-10 shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[var(--accent-primary)]" />
                <h3 className="font-bold text-base">Customize Command Centre</h3>
              </div>
              <button 
                onClick={() => setShowCustomizeModal(false)} 
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              
              {/* Accent Color Customization */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                <AccentColorSelector isDarkMode={isDarkMode} />
              </div>

              {/* Display Mode Selection */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Command Centre Display Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('charts')}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      mode === 'charts'
                        ? 'bg-[var(--accent-primary)] text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Visual Charts</span>
                  </button>
                  <button
                    onClick={() => setMode('numbers')}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      mode === 'numbers'
                        ? 'bg-[var(--accent-primary)] text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Hash className="w-4 h-4" />
                    <span>Tabular Numbers</span>
                  </button>
                </div>
              </div>

              {/* Realtime Stream Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="font-bold text-xs">Realtime Telemetry Feed</div>
                  <div className="text-[11px] text-slate-500">Auto-updates shopfloor sensors every 5s</div>
                </div>
                <button
                  onClick={onToggleRealtimeStreaming}
                  className="w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer min-h-[44px] flex items-center"
                >
                  <div className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    isRealtimeStreaming ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      isRealtimeStreaming ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </button>
              </div>

              {/* Toggle Widget Visibilities */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Visible Dashboard Widgets</label>
                
                {[
                  { key: 'showAlertsBar', label: 'Operational Alerts Bar' },
                  { key: 'showShortagesBanner', label: 'Material Shortages Warning Banner' },
                  { key: 'showAgentBentoGrid', label: 'Autonomous AI Agent Command Grid' },
                  { key: 'showTopMetricsRow', label: 'Top Telemetry Metric Cards' },
                  { key: 'showAnalyticsGrid', label: 'Middle Analytics & Pipeline Grid' },
                  { key: 'showRecentActivities', label: 'Recent Activities' },
                  { key: 'showThroughputChart', label: 'Production Throughput Trend Line Chart' }
                ].map((item) => {
                  const key = item.key as keyof typeof widgetVisibility;
                  const isVis = widgetVisibility[key];
                  return (
                    <div 
                      key={key} 
                      onClick={() => toggleWidget(key)}
                      className="min-h-[44px] flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs font-medium"
                    >
                      <span>{item.label}</span>
                      {isVis ? (
                        <Eye className="w-4 h-4 text-[var(--accent-primary)]" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reset Factory Seed Data */}
              {onResetAllData && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => {
                      if (window.confirm('Reset all stored data to factory defaults?')) {
                        onResetAllData();
                        setShowCustomizeModal(false);
                      }
                    }}
                    className="min-h-[44px] w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset All Data to Factory Defaults</span>
                  </button>
                </div>
              )}

            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
              >
                Save & Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CommandCentreView;
