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

  /* ─────────────────────────────  DESIGN TOKENS  ───────────────────────────── */

  const surface = isDarkMode
    ? 'bg-[#0F1115]/80 border-white/[0.06] backdrop-blur-xl'
    : 'bg-white/90 border-slate-200/70 backdrop-blur-xl shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.12)]';

  const softInner = isDarkMode ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-slate-50/80 border-slate-100';
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const textFaint = isDarkMode ? 'text-slate-500' : 'text-slate-400';

  /* ─────────────────────────────  SUB-COMPONENTS  ───────────────────────────── */

  const SectionTitle = ({ icon: Icon, title, sub, accent, action }: {
    icon: React.ElementType; title: string; sub?: string; accent?: string; action?: React.ReactNode;
  }) => (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent || 'bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]'}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </div>
        <div>
          <h2 className={`text-[15px] font-bold leading-tight ${textPrimary}`}>{title}</h2>
          {sub && <p className={`mt-0.5 text-[11px] ${textMuted}`}>{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );

  const AlertPill = ({ count, label, sub, icon: Icon, tone, onClick }: {
    count: number | string; label: string; sub: string; icon: React.ElementType;
    tone: 'rose' | 'amber' | 'emerald' | 'sky' | 'violet'; onClick: () => void;
  }) => {
    const tones: Record<string, { ring: string; icon: string; dot: string; text: string }> = {
      rose: { ring: 'hover:border-rose-400/60', icon: 'bg-rose-500/12 text-rose-500', dot: 'bg-rose-500', text: 'text-rose-500' },
      amber: { ring: 'hover:border-amber-400/60', icon: 'bg-amber-500/12 text-amber-500', dot: 'bg-amber-500', text: 'text-amber-500' },
      emerald: { ring: 'hover:border-emerald-400/60', icon: 'bg-emerald-500/12 text-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-500' },
      sky: { ring: 'hover:border-sky-400/60', icon: 'bg-sky-500/12 text-sky-500', dot: 'bg-sky-500', text: 'text-sky-500' },
      violet: { ring: 'hover:border-violet-400/60', icon: 'bg-violet-500/12 text-violet-500', dot: 'bg-violet-500', text: 'text-violet-500' }
    };
    const t = tones[tone];
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex min-w-[176px] shrink-0 items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${surface} ${t.ring}`}
      >
        <span className={`absolute left-0 top-0 h-full w-[3px] ${t.dot}`} />
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className={`text-lg font-black leading-none tabular-nums ${textPrimary}`}>{count}</div>
          <div className={`mt-1 text-[11px] font-bold uppercase tracking-wide ${textPrimary} truncate`}>{label}</div>
          <div className={`text-[10px] ${textFaint} truncate`}>{sub}</div>
        </div>
        <ChevronRight className={`ml-auto h-4 w-4 shrink-0 ${textFaint} opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100`} />
      </button>
    );
  };

  const KpiCard = ({ label, value, hint, delta, icon: Icon, badge, tone = 'blue', onClick }: {
    label: string; value: string; hint: string; delta?: string; icon: React.ElementType;
    badge?: string; tone?: 'blue' | 'rose' | 'amber' | 'emerald' | 'purple'; onClick: () => void;
  }) => {
    const toneStyles: Record<string, { iconBg: string; bar: string; glow: string; delta: string }> = {
      blue: {
        iconBg: 'bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]',
        bar: 'bg-[var(--accent-primary)]',
        glow: 'from-[var(--accent-primary)]/20',
        delta: 'text-emerald-500'
      },
      rose: { iconBg: 'bg-rose-500/12 text-rose-500', bar: 'bg-rose-500', glow: 'from-rose-500/20', delta: 'text-rose-500' },
      amber: { iconBg: 'bg-amber-500/12 text-amber-500', bar: 'bg-amber-500', glow: 'from-amber-500/20', delta: 'text-amber-500' },
      emerald: { iconBg: 'bg-emerald-500/12 text-emerald-500', bar: 'bg-emerald-500', glow: 'from-emerald-500/20', delta: 'text-emerald-500' },
      purple: { iconBg: 'bg-purple-500/12 text-purple-500', bar: 'bg-purple-500', glow: 'from-purple-500/20', delta: 'text-purple-500' }
    };
    const t = toneStyles[tone] || toneStyles.blue;

    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex min-h-[152px] flex-col justify-between overflow-hidden rounded-[20px] border p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 ${surface}`}
      >
        <span className={`absolute left-0 top-0 h-1 w-full ${t.bar} opacity-70`} />
        <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${t.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100`} />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.08em] ${textMuted}`}>{label}</span>
              {badge && (
                <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  {badge}
                </span>
              )}
            </div>
            <p className={`mt-2.5 text-[26px] font-black leading-none tracking-tight ${textPrimary}`}>{value}</p>
            <p className={`mt-2 text-xs leading-snug ${textMuted}`}>{hint}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 ${t.iconBg}`}>
            <Icon className="h-5 w-5" strokeWidth={2.3} />
          </div>
        </div>

        {delta && (
          <div className={`relative mt-3 flex items-center gap-1.5 border-t pt-2.5 text-[11px] font-mono font-bold ${t.delta} ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{delta}</span>
            <ArrowUpRight className={`ml-auto h-4 w-4 ${textFaint} opacity-0 transition group-hover:opacity-100`} />
          </div>
        )}
      </button>
    );
  };

  const statusChip = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('critical') || s.includes('due') || s === 'alert')
      return 'bg-rose-500/12 text-rose-500';
    if (s.includes('run') || s.includes('active') || s.includes('process'))
      return 'bg-amber-500/12 text-amber-500';
    if (s.includes('optimal') || s.includes('healthy') || s.includes('ok') || s.includes('complete'))
      return 'bg-emerald-500/12 text-emerald-500';
    return 'bg-slate-500/12 text-slate-400';
  };

  /* ─────────────────────────────  RENDER  ───────────────────────────── */

  return (
    <div ref={localContainerRef} className="relative space-y-4 pb-8 font-sans">

      {/* Pull-to-refresh */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{ height: `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` }}
          className="flex items-center justify-center overflow-hidden transition-all md:hidden"
        >
          <div className="flex items-center gap-2 rounded-full border border-[var(--accent-border-light)] bg-[var(--accent-soft-light)] px-3.5 py-1.5 text-xs font-semibold dark:bg-[var(--accent-soft-dark)]">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing' : isTriggered ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}

      {/* ══════════════  HERO HEADER  ══════════════ */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10">
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-[#080A0F]' : 'bg-[#0B1020]'}`} />
        {/* aurora blobs */}
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent-primary)] opacity-30 blur-[90px]" />
        <div className="absolute right-0 top-10 h-64 w-64 rounded-full bg-cyan-500 opacity-20 blur-[90px]" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-violet-600 opacity-20 blur-[90px]" />
        {/* fine grid */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at top, black, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at top, black, transparent 75%)'
          }}
        />

        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    {isRealtimeStreaming && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${isRealtimeStreaming ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                  </span>
                  {isRealtimeStreaming ? 'Live Operations' : 'Paused'}
                </span>
                {metrics.criticalCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-[11px] font-bold text-rose-200 backdrop-blur-sm">
                    <AlertTriangle className="h-3 w-3" />
                    {metrics.criticalCount} items need attention
                  </span>
                )}
              </div>

              <div>
                <h1 className="bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-[26px] font-black leading-[1.05] tracking-tight text-transparent sm:text-3xl lg:text-[40px]">
                  Executive Command Centre
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300/90">
                  Real-time visibility across orders, shopfloor, quality gates, and finance — scoped to{' '}
                  <span className="font-semibold text-white">{scope}</span>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                className="h-10 cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white outline-none backdrop-blur-md transition hover:bg-white/15"
              >
                <option value="FY 26-27" className="text-slate-900">FY 26-27</option>
                <option value="FY 25-26" className="text-slate-900">FY 25-26</option>
                <option value="Q3 2026" className="text-slate-900">Q3 2026</option>
                <option value="All-Time" className="text-slate-900">All Time</option>
              </select>

              <button
                type="button"
                onClick={() => setMode(m => (m === 'charts' ? 'numbers' : 'charts'))}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/15"
              >
                {mode === 'charts' ? <BarChart3 className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
                {mode === 'charts' ? 'Visual' : 'Tabular'}
              </button>

              <button
                type="button"
                onClick={() => setShowCustomizeModal(true)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/15"
                title="Customize"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('orders')}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                New Order
              </button>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: 'Open POs', value: metrics.openOrders.length, icon: ShoppingCart, tint: 'text-sky-300' },
              { label: 'Active JCs', value: metrics.activeJobCards.length, icon: Factory, tint: 'text-indigo-300' },
              { label: 'QC Pass', value: `${metrics.qcPassRate}%`, icon: ShieldCheck, tint: 'text-emerald-300' },
              { label: 'Parts Output', value: metrics.totalOutput.toLocaleString('en-IN'), icon: Gauge, tint: 'text-amber-300' }
            ].map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md transition hover:bg-white/[0.08]"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <Icon className={`h-3.5 w-3.5 ${item.tint}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <div className="mt-1.5 text-2xl font-black tabular-nums text-white">{item.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════  APPROVALS BANNER  ══════════════ */}
      {metrics.pendingApprovalsCount > 0 && (
        <button
          type="button"
          onClick={() => handleNavigate('approvals')}
          className="group relative w-full overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-r from-rose-500/[0.07] via-amber-500/[0.06] to-rose-500/[0.07] p-4 text-left transition hover:shadow-lg hover:shadow-rose-500/10"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-amber-500" />
          <div className="flex items-center justify-between gap-3 pl-1">
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-500/30">
                <CheckSquare className="h-5 w-5" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#0F1115]">
                  {metrics.pendingApprovalsCount}
                </span>
              </div>
              <div>
                <p className="text-sm font-extrabold text-rose-600 dark:text-rose-300">
                  {metrics.pendingApprovalsCount} approval{metrics.pendingApprovalsCount > 1 ? 's' : ''} awaiting sign-off
                </p>
                <p className={`text-xs ${textMuted}`}>High-value POs and credit dispatches need your action</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 transition group-hover:bg-rose-500 group-hover:text-white">
              Review
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </div>
        </button>
      )}

      {/* ══════════════  ALERT RAIL  ══════════════ */}
      {widgetVisibility.showAlertsBar && (
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
          <AlertPill count={metrics.qcHoldCount} label="QC Holds" sub="Inspection blocked" icon={ShieldCheck} tone="amber" onClick={() => handleNavigate('qc')} />
          <AlertPill count={metrics.itemsShortCount} label="Stock Short" sub="Raw material gaps" icon={Package} tone="rose" onClick={() => handleNavigate('inventory')} />
          <AlertPill count={metrics.overdueDeliveriesCount} label="Overdue" sub="Past delivery date" icon={Clock} tone="amber" onClick={() => handleNavigate('orders')} />
          <AlertPill count={fmt(metrics.overdueReceivablesSum)} label="Receivables" sub="Customer overdue" icon={Wallet} tone="emerald" onClick={() => handleNavigate('invoices')} />
          <AlertPill count={metrics.pendingDispatchesCount} label="Dispatch" sub="Ready at dock" icon={Truck} tone="sky" onClick={() => handleNavigate('dispatch')} />
        </div>
      )}

      {/* ══════════════  TABULAR MODE  ══════════════ */}
      {mode === 'numbers' && (
        <section className={`space-y-4 rounded-2xl border p-4 sm:p-5 ${surface}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle icon={Target} title="Telemetry Registry" sub="All operational KPIs in tabular form" />
            <div className="flex flex-wrap gap-2">
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${softInner}`}>
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  value={tabularSearchQuery}
                  onChange={e => setTabularSearchQuery(e.target.value)}
                  placeholder="Search metrics"
                  className={`w-40 bg-transparent outline-none ${textPrimary}`}
                />
              </div>
              <select
                value={tabularCategoryFilter}
                onChange={e => setTabularCategoryFilter(e.target.value)}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold outline-none ${softInner} ${textPrimary}`}
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
                className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-xs font-bold text-white transition hover:opacity-90 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          </div>
          <div className={`overflow-x-auto rounded-2xl border ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider ${isDarkMode ? 'border-white/[0.06] bg-white/[0.02] text-slate-500' : 'border-slate-100 bg-slate-50/60 text-slate-400'}`}>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.05]' : 'divide-slate-100'}`}>
                {filteredTabularMetrics.map(m => (
                  <tr key={m.code} className={`transition ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3 font-mono text-slate-400">{m.code}</td>
                    <td className={`px-4 py-3 font-semibold ${textPrimary}`}>{m.name}</td>
                    <td className="px-4 py-3 text-slate-500">{m.category}</td>
                    <td className={`px-4 py-3 font-black ${textPrimary}`}>{m.valueStr}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusChip(m.status)}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleNavigate(m.viewKey)}
                        className="flex items-center gap-1 font-bold text-[var(--accent-primary)] transition hover:gap-1.5"
                      >
                        Open <ChevronRight className="h-3.5 w-3.5" />
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
          {/* ══════════════  KPI GRID  ══════════════ */}
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

          {/* ══════════════  MAIN BENTO  ══════════════ */}
          <section className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-12">

            {/* Order Pipeline Funnel */}
            {widgetVisibility.showAnalyticsGrid && widgetVisibility.showOrderPipelineCard && (
              <div className={`rounded-2xl border p-4 sm:p-5 lg:col-span-8 ${surface}`}>
                <SectionTitle
                  icon={Layers}
                  title="Order Lifecycle Pipeline"
                  sub={`${metrics.scopedOrders.length} orders in ${scope}`}
                  action={
                    <button
                      type="button"
                      onClick={() => handleNavigate('orders')}
                      className="flex items-center gap-1 text-xs font-bold text-[var(--accent-primary)] transition hover:gap-1.5"
                    >
                      View all <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  }
                />

                <div className="grid gap-2">
                  {[
                    { key: 'draft', label: 'PO Received', color: 'bg-slate-400', glow: 'shadow-slate-400/40', view: 'orders' },
                    { key: 'confirmed', label: 'Confirmed', color: 'bg-indigo-500', glow: 'shadow-indigo-500/40', view: 'orders' },
                    { key: 'production', label: 'In Production', color: 'bg-blue-600', glow: 'shadow-blue-500/40', view: 'production' },
                    { key: 'qc', label: 'QC / Inspection', color: 'bg-amber-500', glow: 'shadow-amber-500/40', view: 'qc' },
                    { key: 'dispatch', label: 'Dispatch Ready', color: 'bg-teal-500', glow: 'shadow-teal-500/40', view: 'dispatch' },
                    { key: 'closed', label: 'Closed', color: 'bg-emerald-500', glow: 'shadow-emerald-500/40', view: 'orders' }
                  ].map((stage, i) => {
                    const count = metrics.pipeline[stage.key as keyof typeof metrics.pipeline] as number;
                    const pct = Math.round((count / pipelineTotal) * 100);
                    return (
                      <button
                        key={stage.key}
                        type="button"
                        onClick={() => handleNavigate(stage.view)}
                        className={`group grid w-full grid-cols-[minmax(112px,0.75fr)_minmax(0,1.6fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${softInner} ${isDarkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-white hover:shadow-sm'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${stage.color}`} />
                          <span className={`truncate text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{stage.label}</span>
                        </div>
                        <div className={`relative h-2.5 overflow-hidden rounded-full ${isDarkMode ? 'bg-white/[0.06]' : 'bg-slate-200/70'}`}>
                          <div
                            className={`h-full rounded-full shadow-lg transition-all duration-700 ease-out ${stage.color} ${stage.glow}`}
                            style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                        <span className={`text-right font-mono text-xs font-bold ${textPrimary}`}>
                          {count} <span className={`text-[10px] ${textFaint}`}>({pct}%)</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plant Health Ring */}
            <div className={`flex flex-col rounded-2xl border p-4 sm:p-5 lg:col-span-4 ${surface}`}>
              <SectionTitle icon={Radio} title="Plant Health" sub="Live shopfloor telemetry" accent="bg-emerald-500/12 text-emerald-500" />

              <div className="flex flex-1 flex-col items-center justify-center py-2">
                <div className="relative">
                  <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : '#e2e8f0'} strokeWidth="9" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="url(#healthGrad)"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={`${Number(metrics.qcPassRate) * 3.27} 327`}
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="60%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="var(--accent-primary)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-[32px] font-black leading-none ${textPrimary}`}>{metrics.qcPassRate}%</span>
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">QC Pass</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Active JCs', value: metrics.activeJobCards.length },
                  { label: 'QC Items', value: qcItems.length },
                  { label: 'Output', value: metrics.totalOutput }
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-2.5 text-center ${softInner}`}>
                    <div className="text-[9px] font-bold uppercase text-slate-400">{s.label}</div>
                    <div className={`mt-0.5 text-sm font-black ${textPrimary}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleNavigate('production')}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)]/10 py-2.5 text-xs font-bold text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/20 active:scale-[0.98]"
              >
                <Play className="h-3.5 w-3.5" />
                Open Shopfloor
              </button>
            </div>

            {/* Recent Orders */}
            <div className={`rounded-2xl border p-4 sm:p-5 lg:col-span-6 ${surface}`}>
              <SectionTitle
                icon={ClipboardList}
                title="Recent Orders"
                action={
                  <button
                    type="button"
                    onClick={() => handleNavigate('orders')}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--accent-primary)] transition hover:gap-1.5"
                  >
                    View all <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <div className="space-y-2">
                {recentOrders.length === 0 ? (
                  <div className={`flex flex-col items-center gap-2 py-10 text-center ${textFaint}`}>
                    <ShoppingCart className="h-7 w-7 opacity-40" />
                    <p className="text-xs">No orders in this scope yet</p>
                  </div>
                ) : (
                  recentOrders.map(order => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => onSelectOrder?.(order.id || order.poNo)}
                      className={`group flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition hover:border-[var(--accent-primary)]/40 ${softInner} ${isDarkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-white hover:shadow-sm'}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className={`truncate text-sm font-bold ${textPrimary}`}>{order.poNo}</div>
                          <div className="truncate text-[11px] text-slate-400">{order.customerName}</div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-sm font-black ${textPrimary}`}>{fmt(order.grossAmount || 0)}</div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {(order.status || order.stage || 'DRAFT').replace(/_/g, ' ')}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Active Job Cards */}
            <div className={`rounded-2xl border p-4 sm:p-5 lg:col-span-6 ${surface}`}>
              <SectionTitle
                icon={Factory}
                title="Active Job Cards"
                accent="bg-blue-500/12 text-blue-500"
                action={
                  <button
                    type="button"
                    onClick={() => handleNavigate('production')}
                    className="flex items-center gap-1 text-xs font-bold text-blue-500 transition hover:gap-1.5"
                  >
                    Shopfloor <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <div className="space-y-2">
                {(metrics.activeJobCards.length > 0 ? metrics.activeJobCards : jobCards).slice(0, 5).map((jc, i) => (
                  <div
                    key={jc.id || i}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${softInner}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <Boxes className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-bold ${textPrimary}`}>{jc.jobCardNo || `JC-${i + 1}`}</div>
                        <div className="truncate text-[11px] text-slate-400">{jc.partDescription || jc.partCode || 'Precision component'}</div>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-500/12 px-2.5 py-0.5 text-[10px] font-bold text-blue-500">
                      {jc.status || 'IN_PROGRESS'}
                    </span>
                  </div>
                ))}
                {jobCards.length === 0 && (
                  <div className={`flex flex-col items-center gap-2 py-10 text-center ${textFaint}`}>
                    <Factory className="h-7 w-7 opacity-40" />
                    <p className="text-xs">No job cards scheduled</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`rounded-2xl border p-3.5 sm:p-4 lg:col-span-12 ${surface}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[var(--accent-primary)]" />
                  <h2 className={`text-sm font-bold ${textPrimary}`}>Quick Actions</h2>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textFaint}`}>Module shortcuts</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                {[
                  { label: 'Orders', icon: ShoppingCart, view: 'orders', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Production', icon: Factory, view: 'production', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                  { label: 'Inventory', icon: Package, view: 'inventory', color: 'text-rose-500', bg: 'bg-rose-500/10' },
                  { label: 'QC Gate', icon: ShieldCheck, view: 'qc', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { label: 'Dispatch', icon: Truck, view: 'dispatch', color: 'text-teal-500', bg: 'bg-teal-500/10' },
                  { label: 'Invoices', icon: DollarSign, view: 'invoices', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Approvals', icon: CheckSquare, view: 'approvals', color: 'text-rose-500', bg: 'bg-rose-500/10' },
                  { label: 'AI Swarm', icon: Sparkles, view: 'command-centre', color: 'text-violet-500', bg: 'bg-violet-500/10' }
                ].map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleNavigate(action.view)}
                      className={`group flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-xl border p-3 transition hover:-translate-y-1 ${softInner} ${isDarkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-white hover:shadow-md'}`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.bg} transition-transform group-hover:scale-110`}>
                        <Icon className={`h-[18px] w-[18px] ${action.color}`} strokeWidth={2.2} />
                      </div>
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ══════════════  AI AGENT GRID  ══════════════ */}
          {widgetVisibility.showAgentBentoGrid && (
            <section className="space-y-2.5">
              <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 ${surface}`}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/12 text-violet-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className={`truncate text-[15px] font-bold ${textPrimary}`}>Autonomous AI Agents</h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-500">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
                  </span>
                  LIVE
                </span>
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

          {/* ══════════════  ACTIVITY FEED  ══════════════ */}
          {widgetVisibility.showRecentActivities && (
            <section className={`space-y-4 rounded-2xl border p-4 sm:p-5 ${surface}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionTitle icon={Activity} title="Factory Activity Stream" sub="Real-time audit trail across all modules" />
                <div className="flex gap-2">
                  <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${softInner}`}>
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={activitySearchQuery}
                      onChange={e => setActivitySearchQuery(e.target.value)}
                      placeholder="Search"
                      className={`w-32 bg-transparent outline-none sm:w-48 ${textPrimary}`}
                    />
                  </div>
                  <select
                    value={activityCategoryFilter}
                    onChange={e => setActivityCategoryFilter(e.target.value)}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold outline-none ${softInner} ${textPrimary}`}
                  >
                    <option value="ALL">All</option>
                    <option value="ORDER">Order</option>
                    <option value="INVENTORY">Inventory</option>
                    <option value="SYSTEM">System</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                {/* timeline spine */}
                {filteredActivities.length > 0 && (
                  <div className={`absolute bottom-4 left-[15px] top-4 w-px ${isDarkMode ? 'bg-white/[0.06]' : 'bg-slate-100'}`} />
                )}
                <div className="space-y-1">
                  {filteredActivities.slice(0, 10).map((act, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 py-2.5">
                      <div
                        className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-4 ${isDarkMode ? 'ring-[#0F1115]' : 'ring-white'} ${act.status === 'Alert'
                            ? 'bg-rose-500/12 text-rose-500'
                            : act.status === 'Processing'
                              ? 'bg-amber-500/12 text-amber-500'
                              : 'bg-emerald-500/12 text-emerald-500'
                          }`}
                      >
                        <CircleDot className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{act.activity}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                          {act.time} · {act.user} · {act.category}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${act.status === 'Alert'
                            ? 'bg-rose-500/12 text-rose-500'
                            : act.status === 'Processing'
                              ? 'bg-amber-500/12 text-amber-500'
                              : 'bg-emerald-500/12 text-emerald-500'
                          }`}
                      >
                        {act.status}
                      </span>
                    </div>
                  ))}
                </div>
                {filteredActivities.length === 0 && (
                  <div className={`flex flex-col items-center gap-2 py-10 text-center ${textFaint}`}>
                    <Activity className="h-7 w-7 opacity-40" />
                    <p className="text-xs">No activities match your filter</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* ══════════════  CUSTOMIZE MODAL  ══════════════ */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowCustomizeModal(false)} className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <div className={`relative z-10 w-full max-w-md space-y-4 rounded-3xl border p-6 shadow-2xl ${isDarkMode ? 'border-white/[0.08] bg-[#0F1115] text-white' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <h3 className="font-bold">Customize Dashboard</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-500/10 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              <div className={`rounded-2xl border p-3.5 ${softInner}`}>
                <AccentColorSelector isDarkMode={isDarkMode} />
              </div>

              <div className={`space-y-2 rounded-2xl border p-3.5 ${softInner}`}>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Display Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['charts', 'numbers'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${mode === m
                          ? 'border-transparent bg-[var(--accent-primary)] text-white shadow-md'
                          : isDarkMode
                            ? 'border-white/[0.08] bg-white/[0.03] text-slate-300'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                    >
                      {m === 'charts' ? <BarChart3 className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                      {m === 'charts' ? 'Visual' : 'Tabular'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`flex items-center justify-between rounded-2xl border p-3.5 ${softInner}`}>
                <div>
                  <div className="text-xs font-bold">Realtime Feed</div>
                  <div className="text-[11px] text-slate-500">Auto-update every 5s</div>
                </div>
                <button type="button" onClick={onToggleRealtimeStreaming}>
                  <div className={`w-11 rounded-full p-0.5 transition ${isRealtimeStreaming ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isRealtimeStreaming ? 'translate-x-5' : ''}`} />
                  </div>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Visible Widgets</label>
                {[
                  { key: 'showAlertsBar', label: 'Alert Rail' },
                  { key: 'showTopMetricsRow', label: 'KPI Cards' },
                  { key: 'showAnalyticsGrid', label: 'Analytics Grid' },
                  { key: 'showOrderPipelineCard', label: 'Order Pipeline' },
                  { key: 'showAgentBentoGrid', label: 'AI Agent Grid' },
                  { key: 'showRecentActivities', label: 'Activity Stream' }
                ].map(item => {
                  const key = item.key as keyof typeof widgetVisibility;
                  const active = widgetVisibility[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleWidget(key)}
                      className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition ${active
                          ? 'border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/[0.06]'
                          : isDarkMode
                            ? 'border-white/[0.06] hover:bg-white/[0.03]'
                            : 'border-slate-100 hover:bg-slate-50'
                        }`}
                    >
                      <span>{item.label}</span>
                      {active ? <Eye className="h-4 w-4 text-[var(--accent-primary)]" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 p-2.5 text-xs font-bold text-rose-500 transition hover:bg-rose-500/10"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Factory Data
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCustomizeModal(false)}
              className="w-full rounded-xl bg-[var(--accent-primary)] py-2.5 text-xs font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
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
