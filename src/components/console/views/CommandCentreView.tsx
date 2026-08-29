import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Package,
  Download,
  CheckSquare,
  Sparkles,
  Zap,
  Gauge,
  Plus,
  Radio,
  Layers,
  CircleDot,
  ArrowUpRight,
  ClipboardList,
  Boxes,
  Wallet,
  Target,
  Play,
  ShoppingBag,
  CreditCard,
  Building2,
  Receipt
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
import { useUrlModal } from '../../../hooks/useUrlModal';

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
  const [tabularSearchQuery, setTabularSearchQuery] = useState('');
  const [tabularCategoryFilter, setTabularCategoryFilter] = useState('ALL');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState('ALL');
  const [localScope, setLocalScope] = useState('FY 26-27');
  const scope = externalScope ?? localScope;
  const setScope = externalSetScope ?? setLocalScope;

  const localContainerRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = containerScrollRef || localContainerRef;

  const { isRefreshing, pullDistance, isTriggered } = usePullToRefresh(activeScrollRef, {
    onRefresh: async () => {
      if (onResetAllData) await onResetAllData();
    }
  });

  const customizeModal = useUrlModal('customize-dashboard');
  const showCustomizeModal = externalShowCustomizeModal !== undefined ? externalShowCustomizeModal : customizeModal.isOpen;
  const setShowCustomizeModal = (open: boolean) => {
    if (externalSetShowCustomizeModal) externalSetShowCustomizeModal(open);
    if (open) {
      customizeModal.open();
    } else {
      customizeModal.close();
    }
  };

  const defaultVisibility = {
    showAlertsBar: true,
    showShortagesBanner: true,
    showAgentBentoGrid: true,
    showTopMetricsRow: true,
    showAnalyticsGrid: true,
    showRecentActivities: true,
    showThroughputChart: true,
    showOrderPipelineCard: true,
    showQcCard: true,
    showMachineRuntimeCard: true
  };

  const [widgetVisibility, setWidgetVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem('stratum_cmd_widgets');
      if (!saved) return defaultVisibility;
      return { ...defaultVisibility, ...JSON.parse(saved) };
    } catch {
      return defaultVisibility;
    }
  });

  const [currencySymbol] = useState(() => {
    try {
      return localStorage.getItem('stratum_currency') || '₹';
    } catch {
      return '₹';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('stratum_cmd_widgets', JSON.stringify(widgetVisibility));
    } catch {
      // ignore
    }
  }, [widgetVisibility]);

  const handleNavigate = (view: any) => {
    onNavigate?.(view);
    onNavigateView?.(view);
  };

  const toggleWidget = (key: keyof typeof widgetVisibility) => {
    setWidgetVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getScopeFilter = (dateString?: string) => {
    if (!dateString || scope === 'All-Time') return true;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return true;
    if (scope === 'FY 26-27') return date >= new Date('2026-04-01') && date <= new Date('2027-03-31T23:59:59');
    if (scope === 'FY 25-26') return date >= new Date('2025-04-01') && date <= new Date('2026-03-31T23:59:59');
    if (scope === 'Q3 2026') return date >= new Date('2026-10-01') && date <= new Date('2026-12-31T23:59:59');
    return true;
  };

  const metrics = useMemo(() => {
    const scopedOrders = orders.filter(o => getScopeFilter(o.orderDate || o.createdAt));
    const scopedInvoices = invoices.filter(i => getScopeFilter(i.invoiceDate || i.createdAt));
    const scopedDispatches = dispatches.filter(d => getScopeFilter(d.dispatchDate || d.createdAt));

    const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length;
    const qcHoldCount = qcItems.filter(q => q.qcStatus === 'QC_HOLD' || q.jobStatus === 'QC_HOLD').length;
    const itemsShortCount = stock.filter(s => s.status === 'SHORTAGE' || s.status === 'CRITICAL' || s.available < 0).length;
    const overdueDeliveriesCount = scopedOrders.filter(o => {
      if (o.status === 'CLOSED' || o.status === 'CANCELLED') return false;
      if (o.status === 'OVERDUE') return true;
      return o.dueDate ? new Date(o.dueDate) < new Date() : false;
    }).length;
    const overdueInvoicesList = scopedInvoices.filter(i => i.status === 'OVERDUE');
    const overdueReceivablesSum = overdueInvoicesList.reduce((acc, i) => acc + (i.amount || 0), 0);
    const pendingDispatchesCount = scopedDispatches.filter(d => d.status === 'PENDING' || d.status === 'IN_TRANSIT').length;
    const openOrders = scopedOrders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED');
    const openOrderBookValue = openOrders.reduce((acc, o) => acc + (o.grossAmount || 0), 0);
    const totalRevenue = scopedOrders.reduce((acc, o) => acc + (o.grossAmount || 0), 0);
    const activeJobCards = jobCards.filter(j => j.status === 'IN_PROGRESS');
    const passQcCount = qcItems.filter(q => q.qcStatus === 'PASS').length;
    const qcPassRate = qcItems.length > 0 ? ((passQcCount / qcItems.length) * 100).toFixed(1) : '98.5';
    const outstandingPayablesSum = payables.filter(p => p.status === 'UNPAID' || p.status === 'OVERDUE').reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalOutput = productionLogs.reduce((acc, p) => acc + (p.qtyDone || 0), 0);

    const pipeline = {
      draft: scopedOrders.filter(o => ['DRAFT', 'SUBMITTED', 'PO_RECEIVED'].includes((o.status || '').toUpperCase())).length,
      confirmed: scopedOrders.filter(o => ['CONFIRMED', 'APPROVED', 'RELEASED'].includes((o.status || '').toUpperCase())).length,
      production: scopedOrders.filter(o => ['IN_PRODUCTION', 'JOB_RELEASED', 'MATERIAL_CHECK', 'MATERIAL_READY'].includes((o.status || o.stage || '').toUpperCase())).length,
      qc: scopedOrders.filter(o => ['QC', 'QC_INSPECTION', 'QC_HOLD', 'READY_FOR_QC'].includes((o.status || o.stage || '').toUpperCase())).length,
      dispatch: scopedOrders.filter(o => ['READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT'].includes((o.status || o.stage || '').toUpperCase())).length,
      closed: scopedOrders.filter(o => ['CLOSED', 'COMPLETED', 'DELIVERED', 'PAID'].includes((o.status || '').toUpperCase())).length
    };

    const criticalCount = pendingApprovalsCount + qcHoldCount + itemsShortCount + overdueDeliveriesCount;

    return {
      scopedOrders,
      pendingApprovalsCount,
      qcHoldCount,
      itemsShortCount,
      overdueDeliveriesCount,
      overdueInvoicesList,
      overdueReceivablesSum,
      pendingDispatchesCount,
      openOrders,
      openOrderBookValue,
      totalRevenue,
      activeJobCards,
      qcPassRate,
      outstandingPayablesSum,
      totalOutput,
      pipeline,
      criticalCount
    };
  }, [orders, invoices, dispatches, stock, qcItems, jobCards, payables, productionLogs, approvals, scope]);

  const fmt = (num: number) =>
    `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const formattedActivities = auditLogs.map(log => ({
    time: log.when || 'Just now',
    activity: log.details || `${log.entity} status updated`,
    category: log.entity || 'System',
    user: log.user || 'Admin',
    status: log.details?.toLowerCase().includes('cancel') || log.details?.toLowerCase().includes('hold')
      ? 'Alert'
      : log.details?.toLowerCase().includes('process') || log.details?.toLowerCase().includes('created')
      ? 'Processing'
      : 'Completed'
  }));

  const filteredActivities = formattedActivities.filter(act => {
    const q = activitySearchQuery.toLowerCase();
    const matchesSearch = act.activity.toLowerCase().includes(q) || act.user.toLowerCase().includes(q);
    const matchesCategory = activityCategoryFilter === 'ALL' || act.category.toUpperCase() === activityCategoryFilter.toUpperCase();
    return matchesSearch && matchesCategory;
  });

  const allTabularMetrics = [
    { code: 'MTR-FIN-01', name: 'Open Order Book Value', category: 'FINANCIAL', valueStr: fmt(metrics.openOrderBookValue), status: 'HEALTHY', viewKey: 'orders' },
    { code: 'MTR-ORD-02', name: 'Active Customer POs', category: 'PRODUCTION', valueStr: `${metrics.openOrders.length} POs`, status: 'ACTIVE', viewKey: 'orders' },
    { code: 'MTR-INV-06', name: 'Inventory Shortages', category: 'INVENTORY', valueStr: `${metrics.itemsShortCount} SKUs`, status: metrics.itemsShortCount > 0 ? 'CRITICAL' : 'OPTIMAL', viewKey: 'inventory' },
    { code: 'MTR-FIN-12', name: 'Overdue Receivables', category: 'FINANCIAL', valueStr: fmt(metrics.overdueReceivablesSum), status: 'DUE', viewKey: 'invoices' },
    { code: 'MTR-FIN-13', name: 'Vendor Payables', category: 'FINANCIAL', valueStr: fmt(metrics.outstandingPayablesSum), status: 'OK', viewKey: 'payables' },
    { code: 'MTR-QLT-04', name: 'QC Pass Rate', category: 'QUALITY', valueStr: `${metrics.qcPassRate}%`, status: 'OPTIMAL', viewKey: 'qc' },
    { code: 'MTR-PRD-03', name: 'Active Job Cards', category: 'PRODUCTION', valueStr: `${metrics.activeJobCards.length} Active`, status: 'RUNNING', viewKey: 'production' }
  ];

  const filteredTabularMetrics = allTabularMetrics.filter(m => {
    const q = tabularSearchQuery.toLowerCase();
    const matchesQuery = m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    const matchesCat = tabularCategoryFilter === 'ALL' || m.category === tabularCategoryFilter;
    return matchesQuery && matchesCat;
  });

  const handleExportTabularCSV = () => {
    const headers = ['Metric Code', 'Metric Name', 'Category', 'Value', 'Status'];
    const rows = filteredTabularMetrics.map(m => [m.code, `"${m.name}"`, m.category, `"${m.valueStr}"`, m.status]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Command_Centre_Metrics_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const recentOrders = metrics.scopedOrders.slice(0, 6);
  const pipelineTotal = (Object.values(metrics.pipeline) as number[]).reduce((a, b) => a + b, 0) || 1;

  const cardBase = isDarkMode
    ? 'bg-[#16181D]/95 border-white/[0.07]'
    : 'bg-white border-slate-200 shadow-md shadow-slate-300/40';

  const AlertPill = ({
    count,
    label,
    sub,
    icon: Icon,
    tone,
    onClick
  }: {
    count: number | string;
    label: string;
    sub: string;
    icon: React.ElementType;
    tone: 'rose' | 'amber' | 'emerald' | 'sky' | 'violet';
    onClick: () => void;
  }) => {
    const tones = {
      rose: 'from-rose-500/15 to-rose-600/5 border-rose-500/25 text-rose-600 dark:text-rose-300',
      amber: 'from-amber-500/15 to-amber-600/5 border-amber-500/25 text-amber-600 dark:text-amber-300',
      emerald: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/25 text-emerald-600 dark:text-emerald-300',
      sky: 'from-sky-500/15 to-sky-600/5 border-sky-500/25 text-sky-600 dark:text-sky-300',
      violet: 'from-violet-500/15 to-violet-600/5 border-violet-500/25 text-violet-600 dark:text-violet-300'
    };
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group min-w-[168px] shrink-0 rounded-2xl border bg-gradient-to-br p-3.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${tones[tone]}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-lg font-black tabular-nums leading-none">{count}</div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-wide truncate">{label}</div>
            <div className="mt-0.5 text-[10px] opacity-70 truncate">{sub}</div>
          </div>
          <div className="rounded-xl bg-black/5 dark:bg-white/10 p-2">
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </button>
    );
  };

  const KpiCard = ({
    label,
    value,
    hint,
    delta,
    icon: Icon,
    badge,
    tone = 'blue',
    onClick
  }: {
    label: string;
    value: string;
    hint: string;
    delta?: string;
    icon: React.ElementType;
    badge?: string;
    tone?: 'blue' | 'rose' | 'amber' | 'emerald' | 'purple';
    onClick: () => void;
  }) => {
    const toneStyles = {
      blue: {
        iconBg: isDarkMode ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border-[var(--accent-primary)]/30' : 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)] border-[var(--accent-primary)]/20',
        glow: 'from-[var(--accent-primary)]/15',
        deltaTone: 'text-emerald-500'
      },
      rose: {
        iconBg: isDarkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-600 border-rose-200',
        glow: 'from-rose-500/15',
        deltaTone: 'text-rose-500'
      },
      amber: {
        iconBg: isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-600 border-amber-200',
        glow: 'from-amber-500/15',
        deltaTone: 'text-amber-500'
      },
      emerald: {
        iconBg: isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200',
        glow: 'from-emerald-500/15',
        deltaTone: 'text-emerald-500'
      },
      purple: {
        iconBg: isDarkMode ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-200',
        glow: 'from-purple-500/15',
        deltaTone: 'text-purple-500'
      }
    };

    const currentTone = toneStyles[tone] || toneStyles.blue;

    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex flex-col justify-between min-h-[148px] overflow-hidden rounded-[22px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] cursor-pointer ${cardBase}`}
      >
        <div className={`absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br ${currentTone.glow} to-transparent opacity-60 blur-xl pointer-events-none transition-opacity group-hover:opacity-100`} />
        
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
              {badge && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                  isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {badge}
                </span>
              )}
            </div>
            <p className={`mt-2 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
            <p className={`mt-1 text-xs leading-snug ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{hint}</p>
          </div>

          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-110 shadow-xs ${currentTone.iconBg}`}>
            <Icon className="w-5 h-5 stroke-[2.25]" />
          </div>
        </div>

        {delta && (
          <div className={`relative mt-3 flex items-center gap-1.5 text-[11px] font-mono font-bold ${currentTone.deltaTone} pt-2 border-t ${
            isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'
          }`}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{delta}</span>
            <ArrowUpRight className="ml-auto w-4 h-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div ref={localContainerRef} className="relative space-y-4 pb-6 font-sans">

      {/* Pull-to-refresh */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{ height: `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` }}
          className="flex items-center justify-center overflow-hidden transition-all md:hidden"
        >
          <div className="flex items-center gap-2 rounded-full border border-[var(--accent-border-light)] bg-[var(--accent-soft-light)] px-3.5 py-1.5 text-xs font-semibold dark:bg-[var(--accent-soft-dark)]">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing…' : isTriggered ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}

      {/* ── HERO HEADER ── */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10">
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-br from-[#0B0D12] via-[#12151C] to-[#0F1420]' : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900'}`} />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #5B75F8 0%, transparent 45%), radial-gradient(circle at 80% 60%, #22D3EE 0%, transparent 40%)' }} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwIDYuNjI3LTUuMzczIDEyLTEyIDEycy0xMi01LjM3My0xMi0xMiA1LjM3My0xMiAxMi0xMiAxMiA1LjM3MyAxMiAxMnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wMyIvPjwvZz48L3N2Zz4=')] opacity-30" />

        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  {isRealtimeStreaming ? 'Live Operations' : 'Paused'}
                </span>
                {metrics.criticalCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-[11px] font-bold text-rose-200">
                    <AlertTriangle className="h-3 w-3" />
                    {metrics.criticalCount} items need attention
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  Executive Command Centre
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm text-slate-300">
                  Real-time visibility across orders, shopfloor, quality gates, and finance — scoped to <span className="font-semibold text-white">{scope}</span>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                className="h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white outline-none backdrop-blur-sm cursor-pointer"
              >
                <option value="FY 26-27" className="text-slate-900">FY 26-27</option>
                <option value="FY 25-26" className="text-slate-900">FY 25-26</option>
                <option value="Q3 2026" className="text-slate-900">Q3 2026</option>
                <option value="All-Time" className="text-slate-900">All Time</option>
              </select>

              <button
                type="button"
                onClick={() => setMode(m => (m === 'charts' ? 'numbers' : 'charts'))}
                className="h-10 rounded-xl border border-white/15 bg-white/10 px-3.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/15 cursor-pointer flex items-center gap-1.5"
              >
                {mode === 'charts' ? <BarChart3 className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
                {mode === 'charts' ? 'Visual' : 'Tabular'}
              </button>

              <button
                type="button"
                onClick={() => setShowCustomizeModal(true)}
                className="h-10 w-10 rounded-xl border border-white/15 bg-white/10 flex items-center justify-center text-white backdrop-blur-sm transition hover:bg-white/15 cursor-pointer"
                title="Customize"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('orders')}
                className="h-10 rounded-xl bg-white px-4 text-xs font-bold text-slate-900 shadow-lg transition hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                New Order
              </button>
            </div>
          </div>

          {/* Quick stats strip inside hero */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Open POs', value: metrics.openOrders.length, icon: ShoppingCart },
              { label: 'Active JCs', value: metrics.activeJobCards.length, icon: Factory },
              { label: 'QC Pass', value: `${metrics.qcPassRate}%`, icon: ShieldCheck },
              { label: 'Parts Output', value: metrics.totalOutput.toLocaleString('en-IN'), icon: Gauge }
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <div className="mt-1 text-xl font-black text-white tabular-nums">{item.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── APPROVALS BANNER ── */}
      {metrics.pendingApprovalsCount > 0 && (
        <button
          type="button"
          onClick={() => handleNavigate('approvals')}
          className="group w-full rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 p-4 text-left transition hover:shadow-md cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-lg">
                <CheckSquare className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {metrics.pendingApprovalsCount}
                </span>
              </div>
              <div>
                <p className="text-sm font-extrabold text-rose-700 dark:text-rose-300">
                  {metrics.pendingApprovalsCount} approval{metrics.pendingApprovalsCount > 1 ? 's' : ''} awaiting sign-off
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">High-value POs and credit dispatches need your action</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-rose-500 transition group-hover:translate-x-1" />
          </div>
        </button>
      )}

      {/* ── ALERT RAIL ── */}
      {widgetVisibility.showAlertsBar && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          <AlertPill count={metrics.qcHoldCount} label="QC Holds" sub="Inspection blocked" icon={ShieldCheck} tone="amber" onClick={() => handleNavigate('qc')} />
          <AlertPill count={metrics.itemsShortCount} label="Stock Short" sub="Raw material gaps" icon={Package} tone="rose" onClick={() => handleNavigate('inventory')} />
          <AlertPill count={metrics.overdueDeliveriesCount} label="Overdue" sub="Past delivery date" icon={Clock} tone="amber" onClick={() => handleNavigate('orders')} />
          <AlertPill count={fmt(metrics.overdueReceivablesSum)} label="Receivables" sub="Customer overdue" icon={Wallet} tone="emerald" onClick={() => handleNavigate('invoices')} />
          <AlertPill count={metrics.pendingDispatchesCount} label="Dispatch" sub="Ready at dock" icon={Truck} tone="sky" onClick={() => handleNavigate('dispatch')} />
        </div>
      )}

      {/* ── TABULAR MODE ── */}
      {mode === 'numbers' && (
        <section className={`rounded-2xl border p-4 space-y-4 sm:p-5 ${cardBase}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Telemetry Registry</h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>All operational KPIs in tabular form</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  value={tabularSearchQuery}
                  onChange={e => setTabularSearchQuery(e.target.value)}
                  placeholder="Search metrics…"
                  className="w-40 bg-transparent outline-none"
                />
              </div>
              <select
                value={tabularCategoryFilter}
                onChange={e => setTabularCategoryFilter(e.target.value)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer outline-none ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-slate-50'}`}
              >
                <option value="ALL">All Categories</option>
                <option value="FINANCIAL">Financial</option>
                <option value="PRODUCTION">Production</option>
                <option value="INVENTORY">Inventory</option>
                <option value="QUALITY">Quality</option>
              </select>
              <button
                type="button"
                onClick={handleExportTabularCSV}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-xs font-bold text-white cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          </div>
          <div className={`overflow-x-auto rounded-2xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                  <th className="py-3 pr-4">Code</th>
                  <th className="py-3 pr-4">Metric</th>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4">Value</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredTabularMetrics.map(m => (
                  <tr key={m.code} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                    <td className="py-3 pr-4 font-mono text-slate-400">{m.code}</td>
                    <td className={`py-3 pr-4 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{m.name}</td>
                    <td className="py-3 pr-4 text-slate-500">{m.category}</td>
                    <td className={`py-3 pr-4 font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{m.valueStr}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">{m.status}</span>
                    </td>
                    <td className="py-3">
                      <button type="button" onClick={() => handleNavigate(m.viewKey)} className="text-[var(--accent-primary)] font-bold cursor-pointer hover:underline">
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mode === 'charts' && (
        <>
          {/* ── KPI GRID ── */}
          {widgetVisibility.showTopMetricsRow && (
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Order Book"
                value={fmt(metrics.totalRevenue || metrics.openOrderBookValue)}
                hint={`${metrics.openOrders.length} active purchase orders`}
                delta="+12% vs last period"
                badge="Revenue"
                icon={ShoppingBag}
                tone="blue"
                onClick={() => handleNavigate('orders')}
              />
              <KpiCard
                label="Material Shortages"
                value={`${metrics.itemsShortCount} SKUs`}
                hint={`${stock.length} items tracked in stores`}
                badge={metrics.itemsShortCount > 0 ? 'Action Req' : 'Optimal'}
                icon={metrics.itemsShortCount > 0 ? AlertTriangle : Boxes}
                tone={metrics.itemsShortCount > 0 ? 'rose' : 'emerald'}
                onClick={() => handleNavigate('inventory')}
              />
              <KpiCard
                label="Overdue Receivables"
                value={fmt(metrics.overdueReceivablesSum)}
                hint={`${metrics.overdueInvoicesList.length} invoices past due`}
                badge="Receivables"
                icon={Clock}
                tone={metrics.overdueReceivablesSum > 0 ? 'amber' : 'emerald'}
                onClick={() => handleNavigate('invoices')}
              />
              <KpiCard
                label="Vendor Payables"
                value={fmt(metrics.outstandingPayablesSum)}
                hint={`${payables.length} supplier bills outstanding`}
                badge="Payables"
                icon={Building2}
                tone="purple"
                onClick={() => handleNavigate('payables')}
              />
            </section>
          )}

          {/* ── MAIN BENTO ── */}
          <section className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-12">
            {/* Order Pipeline Funnel */}
            {widgetVisibility.showAnalyticsGrid && widgetVisibility.showOrderPipelineCard && (
              <div className={`lg:col-span-8 rounded-2xl border p-4 sm:p-5 ${cardBase}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      <Layers className="h-4 w-4 text-[var(--accent-primary)]" />
                      Order Lifecycle Pipeline
                    </h2>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {metrics.scopedOrders.length} orders in {scope}
                    </p>
                  </div>
                  <button type="button" onClick={() => handleNavigate('orders')} className="text-xs font-bold text-[var(--accent-primary)] cursor-pointer flex items-center gap-1">
                    View all <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid gap-2">
                  {[
                    { key: 'draft', label: 'PO Received', color: 'bg-slate-400', view: 'orders' },
                    { key: 'confirmed', label: 'Confirmed', color: 'bg-indigo-500', view: 'orders' },
                    { key: 'production', label: 'In Production', color: 'bg-blue-600', view: 'production' },
                    { key: 'qc', label: 'QC / Inspection', color: 'bg-amber-500', view: 'qc' },
                    { key: 'dispatch', label: 'Dispatch Ready', color: 'bg-teal-500', view: 'dispatch' },
                    { key: 'closed', label: 'Closed', color: 'bg-emerald-500', view: 'orders' }
                  ].map(stage => {
                    const count = metrics.pipeline[stage.key as keyof typeof metrics.pipeline] as number;
                    const pct = Math.round((count / pipelineTotal) * 100);
                    return (
                      <button
                        key={stage.key}
                        type="button"
                        onClick={() => handleNavigate(stage.view)}
                        className={`group grid w-full grid-cols-[minmax(104px,0.8fr)_minmax(0,1.6fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${isDarkMode ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/70' : 'border-slate-100 bg-slate-50/70 hover:bg-white'}`}
                      >
                        <span className={`truncate text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{stage.label}</span>
                        <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200/70'}`}>
                          <div className={`h-full rounded-full transition-all duration-700 ${stage.color}`} style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }} />
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-400">{count} <span className="text-[10px]">({pct}%)</span></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plant Health Ring */}
            <div className={`lg:col-span-4 rounded-2xl border p-4 sm:p-5 flex flex-col ${cardBase}`}>
              <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Radio className="h-4 w-4 text-emerald-500" />
                Plant Health
              </h2>
              <p className={`text-xs mt-0.5 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Live shopfloor telemetry</p>

              <div className="flex flex-1 flex-col items-center justify-center py-2">
                <div className="relative">
                  <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke="url(#healthGrad)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${Number(metrics.qcPassRate) * 3.27} 327`}
                    />
                    <defs>
                      <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#5B75F8" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{metrics.qcPassRate}%</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">QC Pass</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Active JCs', value: metrics.activeJobCards.length },
                  { label: 'QC Items', value: qcItems.length },
                  { label: 'Output', value: metrics.totalOutput }
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-2.5 text-center ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                    <div className="text-[9px] font-bold uppercase text-slate-400">{s.label}</div>
                    <div className={`text-sm font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleNavigate('production')}
                className="mt-4 w-full rounded-xl bg-[var(--accent-primary)]/10 py-2.5 text-xs font-bold text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Open Shopfloor
              </button>
            </div>

            {/* Recent Orders */}
            <div className={`lg:col-span-6 rounded-2xl border p-4 sm:p-5 ${cardBase}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <ClipboardList className="h-4 w-4 text-[var(--accent-primary)]" />
                  Recent Orders
                </h2>
                <button type="button" onClick={() => handleNavigate('orders')} className="text-xs font-bold text-[var(--accent-primary)] cursor-pointer">View all →</button>
              </div>
              <div className="space-y-2">
                {recentOrders.length === 0 ? (
                  <p className={`text-xs py-8 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No orders in this scope yet</p>
                ) : (
                  recentOrders.map(order => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => onSelectOrder?.(order.id || order.poNo)}
                      className={`group w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition hover:border-[var(--accent-primary)]/40 cursor-pointer ${isDarkMode ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60' : 'border-slate-100 bg-slate-50/50 hover:bg-white'}`}
                    >
                      <div className="min-w-0">
                        <div className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{order.poNo}</div>
                        <div className="text-[11px] text-slate-400 truncate">{order.customerName}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{fmt(order.grossAmount || 0)}</div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">{(order.status || order.stage || 'DRAFT').replace(/_/g, ' ')}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Active Job Cards */}
            <div className={`lg:col-span-6 rounded-2xl border p-4 sm:p-5 ${cardBase}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Factory className="h-4 w-4 text-blue-500" />
                  Active Job Cards
                </h2>
                <button type="button" onClick={() => handleNavigate('production')} className="text-xs font-bold text-blue-500 cursor-pointer">Shopfloor →</button>
              </div>
              <div className="space-y-2">
                {(metrics.activeJobCards.length > 0 ? metrics.activeJobCards : jobCards).slice(0, 5).map((jc, i) => (
                  <div
                    key={jc.id || i}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'}`}
                  >
                    <div className="min-w-0">
                      <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{jc.jobCardNo || `JC-${i + 1}`}</div>
                      <div className="text-[11px] text-slate-400 truncate">{jc.partDescription || jc.partCode || 'Precision component'}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-500">{jc.status || 'IN_PROGRESS'}</span>
                  </div>
                ))}
                {jobCards.length === 0 && (
                  <p className={`text-xs py-8 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No job cards scheduled</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`lg:col-span-12 rounded-2xl border p-3.5 sm:p-4 ${cardBase}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Quick Actions</h2>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Module shortcuts</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                {[
                  { label: 'Orders', icon: ShoppingCart, view: 'orders', color: 'text-blue-500' },
                  { label: 'Production', icon: Factory, view: 'production', color: 'text-indigo-500' },
                  { label: 'Inventory', icon: Package, view: 'inventory', color: 'text-rose-500' },
                  { label: 'QC Gate', icon: ShieldCheck, view: 'qc', color: 'text-amber-500' },
                  { label: 'Dispatch', icon: Truck, view: 'dispatch', color: 'text-teal-500' },
                  { label: 'Invoices', icon: DollarSign, view: 'invoices', color: 'text-emerald-500' },
                  { label: 'Approvals', icon: CheckSquare, view: 'approvals', color: 'text-rose-500' },
                  { label: 'AI Swarm', icon: Sparkles, view: 'command-centre', color: 'text-violet-500' }
                ].map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleNavigate(action.view)}
                      className={`flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition hover:-translate-y-0.5 cursor-pointer ${isDarkMode ? 'border-slate-800 bg-slate-900/50 hover:bg-slate-800' : 'border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm'}`}
                    >
                      <Icon className={`h-5 w-5 ${action.color}`} />
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── AI AGENT GRID ── */}
          {widgetVisibility.showAgentBentoGrid && (
            <section className="space-y-2.5">
              <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 ${isDarkMode ? 'border-white/[0.07] bg-[#16181D]/95' : 'border-slate-200/80 bg-white shadow-sm'}`}>
                <div className="flex min-w-0 items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-violet-500" />
                  <h2 className={`truncate text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Autonomous AI Agents</h2>
                </div>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-500">LIVE</span>
              </div>
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
            </section>
          )}

          {/* ── ACTIVITY FEED ── */}
          {widgetVisibility.showRecentActivities && (
            <section className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${cardBase}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
                    Factory Activity Stream
                  </h2>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Real-time audit trail across all modules</p>
                </div>
                <div className="flex gap-2">
                  <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={activitySearchQuery}
                      onChange={e => setActivitySearchQuery(e.target.value)}
                      placeholder="Search…"
                      className="w-32 sm:w-48 bg-transparent outline-none"
                    />
                  </div>
                  <select
                    value={activityCategoryFilter}
                    onChange={e => setActivityCategoryFilter(e.target.value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer outline-none ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <option value="ALL">All</option>
                    <option value="ORDER">Order</option>
                    <option value="INVENTORY">Inventory</option>
                    <option value="SYSTEM">System</option>
                  </select>
                </div>
              </div>

              <div className="space-y-0">
                {filteredActivities.slice(0, 10).map((act, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 py-3.5 ${idx > 0 ? `border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}` : ''}`}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${act.status === 'Alert' ? 'bg-rose-500/10 text-rose-500' : act.status === 'Processing' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      <CircleDot className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{act.activity}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400 font-mono">{act.time} · {act.user} · {act.category}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${act.status === 'Alert' ? 'bg-rose-500/10 text-rose-500' : act.status === 'Processing' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {act.status}
                    </span>
                  </div>
                ))}
                {filteredActivities.length === 0 && (
                  <p className={`py-8 text-center text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No activities match your filter</p>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── CUSTOMIZE MODAL ── */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowCustomizeModal(false)} className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <div className={`relative z-10 w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl ${isDarkMode ? 'bg-[#16181D] border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[var(--accent-primary)]" />
                <h3 className="font-bold">Customize Dashboard</h3>
              </div>
              <button type="button" onClick={() => setShowCustomizeModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className={`rounded-2xl border p-3.5 ${isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <AccentColorSelector isDarkMode={isDarkMode} />
              </div>

              <div className={`rounded-2xl border p-3.5 space-y-2 ${isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Display Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['charts', 'numbers'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`min-h-[44px] rounded-xl text-xs font-bold border cursor-pointer flex items-center justify-center gap-2 transition ${
                        mode === m
                          ? 'bg-[var(--accent-primary)] text-white border-transparent'
                          : isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {m === 'charts' ? <BarChart3 className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                      {m === 'charts' ? 'Visual' : 'Tabular'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`flex items-center justify-between rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <div className="text-xs font-bold">Realtime Feed</div>
                  <div className="text-[11px] text-slate-500">Auto-update every 5s</div>
                </div>
                <button type="button" onClick={onToggleRealtimeStreaming} className="cursor-pointer">
                  <div className={`w-11 h-6 rounded-full p-0.5 transition ${isRealtimeStreaming ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`h-5 w-5 rounded-full bg-white transition-transform ${isRealtimeStreaming ? 'translate-x-5' : ''}`} />
                  </div>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Visible Widgets</label>
                {[
                  { key: 'showAlertsBar', label: 'Alert Rail' },
                  { key: 'showTopMetricsRow', label: 'KPI Cards' },
                  { key: 'showAnalyticsGrid', label: 'Analytics Grid' },
                  { key: 'showOrderPipelineCard', label: 'Order Pipeline' },
                  { key: 'showAgentBentoGrid', label: 'AI Agent Grid' },
                  { key: 'showRecentActivities', label: 'Activity Stream' }
                ].map(item => {
                  const key = item.key as keyof typeof widgetVisibility;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleWidget(key)}
                      className={`w-full flex items-center justify-between rounded-xl border p-2.5 text-xs font-medium cursor-pointer ${isDarkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}
                    >
                      <span>{item.label}</span>
                      {widgetVisibility[key] ? <Eye className="h-4 w-4 text-[var(--accent-primary)]" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                    </button>
                  );
                })}
              </div>

              {onResetAllData && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset all data to factory defaults?')) {
                      onResetAllData();
                      setShowCustomizeModal(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 p-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Factory Data
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCustomizeModal(false)}
              className="w-full rounded-xl bg-[var(--accent-primary)] py-2.5 text-xs font-bold text-white cursor-pointer"
            >
              Save & Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandCentreView;
