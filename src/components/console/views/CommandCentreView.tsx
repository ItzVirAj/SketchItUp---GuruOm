import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart3,
  Hash,
  LayoutDashboard,
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
  ArrowUpRight,
  ClipboardList,
  Boxes,
  Wallet,
  Target,
  Play,
  ShoppingBag,
  CreditCard,
  Building2,
  Receipt,
  FileText
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
import { OrderBookRevenueChart } from '../charts/OrderBookRevenueChart';
import {
  StatSparklineCard,
  CashflowTrendCard,
  MonthlyProgressCard,
  HistoryCard,
  GateConsolidationCard
} from '../widgets/ExecutiveCommandWidgets';
import {
  ExecutiveDashboardLayout,
  OperationsDashboardLayout,
  QualityGateDashboardLayout,
  FinancialDashboardLayout
} from '../widgets/CommandCentreLayouts';
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

const SectionTitle: React.FC<{
  icon: React.ElementType;
  title: string;
  sub?: string;
  accent?: string;
  action?: React.ReactNode;
  isDarkMode?: boolean;
}> = ({ icon: Icon, title, sub, accent, action, isDarkMode = true }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div className="flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent || 'bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] border border-[var(--accent-border-light)] dark:bg-[var(--accent-soft-dark)] dark:text-[var(--accent-text-dark)] dark:border-[var(--accent-border-dark)] shadow-2xs'}`}>
        <Icon className="h-4.5 w-4.5 stroke-[2]" />
      </div>
      <div>
        <h2 className={`text-[15px] font-bold tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
        {sub && <p className={`mt-0.5 text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{sub}</p>}
      </div>
    </div>
    {action}
  </div>
);

export const CommandCentreView: React.FC<CommandCentreViewProps> = ({
  orders = [],
  stock = [],
  qcItems = [],
  pdiQueue = [],
  jobCards = [],
  shortages = [],
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
  type CommandCentreLayoutMode = 'executive' | 'operations' | 'quality' | 'financial' | 'numbers' | 'charts';
  const [mode, setMode] = useState<CommandCentreLayoutMode>(() => {
    try {
      const saved = localStorage.getItem('stratum_cmd_layout') as CommandCentreLayoutMode;
      if (['executive', 'operations', 'quality', 'financial', 'numbers'].includes(saved)) {
        return saved;
      }
      return 'executive';
    } catch {
      return 'executive';
    }
  });

  const handleSetMode = (newMode: CommandCentreLayoutMode) => {
    setMode(newMode);
    try {
      localStorage.setItem('stratum_cmd_layout', newMode);
    } catch {
      // ignore
    }
  };
  const [tabularSearchQuery, setTabularSearchQuery] = useState('');
  const [tabularCategoryFilter, setTabularCategoryFilter] = useState('ALL');
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
    URL.revokeObjectURL(url);
  };

  const recentOrders = metrics.scopedOrders.slice(0, 6);
  const pipelineTotal = (Object.values(metrics.pipeline) as number[]).reduce((a, b) => a + b, 0) || 1;

  /* ─────────────────────────────  DESIGN TOKENS  ───────────────────────────── */

  const surface = isDarkMode
    ? 'bg-[#18181B]/90 border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_rgba(0,0,0,0.5)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  const softInner = isDarkMode 
    ? 'bg-white/[0.04] border border-white/10 hover:border-white/20' 
    : 'bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/90 shadow-[inset_0_1px_1px_0_rgba(15,23,42,0.02)]';
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textMuted = isDarkMode ? 'text-slate-300' : 'text-slate-500';
  const textFaint = isDarkMode ? 'text-slate-400' : 'text-slate-400';

  /* ─────────────────────────────  SUB-COMPONENTS  ───────────────────────────── */

  const AlertPill = ({ count, label, sub, icon: Icon, tone, onClick }: {
    count: number | string; label: string; sub: string; icon: React.ElementType;
    tone: 'rose' | 'amber' | 'emerald' | 'sky' | 'violet'; onClick: () => void;
  }) => {
    const tones: Record<string, { border: string; icon: string; text: string }> = {
      rose: {
        border: 'border-rose-500/30',
        icon: isDarkMode ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-700 border border-rose-200/90 shadow-[0_1px_2px_rgba(244,63,94,0.12)]',
        text: isDarkMode ? 'text-rose-400' : 'text-rose-700'
      },
      amber: {
        border: 'border-amber-500/30',
        icon: isDarkMode ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700 border border-amber-200/90 shadow-[0_1px_2px_rgba(245,158,11,0.12)]',
        text: isDarkMode ? 'text-amber-400' : 'text-amber-700'
      },
      emerald: {
        border: 'border-emerald-500/30',
        icon: isDarkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-[0_1px_2px_rgba(16,185,129,0.12)]',
        text: isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
      },
      sky: {
        border: 'border-blue-500/30',
        icon: isDarkMode ? 'bg-blue-500/15 text-[#5B75F8] dark:text-[#7B92FF]' : 'bg-blue-50 text-blue-700 border border-blue-200/90 shadow-[0_1px_2px_rgba(59,130,246,0.12)]',
        text: isDarkMode ? 'text-[#7B92FF]' : 'text-blue-700'
      },
      violet: {
        border: 'border-purple-500/30',
        icon: isDarkMode ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-700 border border-purple-200/90 shadow-[0_1px_2px_rgba(147,51,234,0.12)]',
        text: isDarkMode ? 'text-purple-400' : 'text-purple-700'
      }
    };
    const t = tones[tone] || tones.sky;
    
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex min-w-[190px] shrink-0 items-center gap-3.5 rounded-2xl border px-4 py-3 text-left transition-all backdrop-blur-2xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
          isDarkMode 
            ? 'bg-[#18181B]/90 border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_20px_rgba(0,0,0,0.35)] hover:bg-[#202026] hover:border-white/25' 
            : 'bg-gradient-to-b from-white via-white to-slate-50/70 border-slate-200/90 shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_rgba(15,23,42,0.04),0_6px_16px_-2px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:shadow-[inset_0_1px_0_0_#ffffff,0_4px_12px_rgba(15,23,42,0.08)]'
        } ${t.border}`}
      >
        <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.icon} transition-transform`}>
          <Icon className="h-4.5 w-4.5 stroke-[2]" />
          {count !== 0 && count !== '0' && count !== '₹0' && (
            <span className="absolute -right-1 -top-1 flex h-2 w-2 animate-pulse rounded-full bg-current" />
          )}
        </div>
        
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className={`text-xl font-bold tracking-tight text-slate-900 dark:text-white`}>
              {count}
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className={`text-xs font-semibold ${t.text} truncate`}>
            {label}
          </div>
          <div className={`text-[10px] text-slate-400 dark:text-slate-400 truncate`}>
            {sub}
          </div>
        </div>
      </button>
    );
  };

  const KpiCard = ({ label, value, hint, delta, icon: Icon, badge, tone = 'blue', onClick }: {
    label: string; value: string; hint: string; delta?: string; icon: React.ElementType;
    badge?: string; tone?: 'blue' | 'rose' | 'amber' | 'emerald' | 'purple'; onClick: () => void;
  }) => {
    const toneStyles: Record<string, { icon: string; text: string }> = {
      blue: {
        icon: isDarkMode ? 'bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF]' : 'bg-blue-50 text-blue-700 border border-blue-200/90 shadow-[0_1px_2px_rgba(59,130,246,0.12)]',
        text: isDarkMode ? 'text-[#7B92FF]' : 'text-blue-700'
      },
      rose: {
        icon: isDarkMode ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-rose-50 text-rose-700 border border-rose-200/90 shadow-[0_1px_2px_rgba(244,63,94,0.12)]',
        text: isDarkMode ? 'text-rose-400' : 'text-rose-700'
      },
      amber: {
        icon: isDarkMode ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-amber-50 text-amber-700 border border-amber-200/90 shadow-[0_1px_2px_rgba(245,158,11,0.12)]',
        text: isDarkMode ? 'text-amber-400' : 'text-amber-700'
      },
      emerald: {
        icon: isDarkMode ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-[0_1px_2px_rgba(16,185,129,0.12)]',
        text: isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
      },
      purple: {
        icon: isDarkMode ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-purple-50 text-purple-700 border border-purple-200/90 shadow-[0_1px_2px_rgba(147,51,234,0.12)]',
        text: isDarkMode ? 'text-purple-400' : 'text-purple-700'
      }
    };
    const t = toneStyles[tone] || toneStyles.blue;

    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex min-h-[140px] flex-col justify-between rounded-3xl border p-5 text-left transition-all backdrop-blur-2xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
          isDarkMode 
            ? 'bg-[#18181B]/90 border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.45)] hover:bg-[#202026] hover:border-white/25' 
            : 'bg-gradient-to-b from-white via-white to-slate-50/70 border-slate-200/90 shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)] hover:border-slate-300 hover:shadow-[inset_0_1px_0_0_#ffffff,0_4px_12px_rgba(15,23,42,0.08),0_16px_32px_-4px_rgba(15,23,42,0.1)]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 tracking-wide">
                {label}
              </span>
              {badge && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.icon}`}>
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {value}
            </p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
            <Icon className="h-5 w-5 stroke-[2]" />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {hint}
          </p>
          {delta && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="h-3 w-3" />
              {delta}
            </span>
          )}
        </div>
      </button>
    );
  };

  const statusChip = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('critical') || s.includes('due') || s === 'alert')
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
    if (s.includes('run') || s.includes('active') || s.includes('process'))
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
    if (s.includes('optimal') || s.includes('healthy') || s.includes('ok') || s.includes('complete'))
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
    return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20';
  };

  /* ─────────────────────────────  RENDER  ───────────────────────────── */

  return (
    <div ref={localContainerRef} className="relative space-y-6 pb-12 font-sans overflow-hidden">

      {/* ── Apple HIG Atmospheric Ambient Gradient Mesh Background ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Top Center Radiant Glow (dynamic brand accent) */}
        <div className="absolute -top-32 left-1/2 h-[550px] w-full max-w-5xl -translate-x-1/2 bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(0,122,255,0.20),transparent_70%)] blur-3xl" />
        
        {/* Top-Right Secondary Atmospheric Orb (Electric Violet/Purple) */}
        <div className="absolute -top-12 -right-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.14),transparent_65%)] blur-3xl" />
        
        {/* Mid-Left Emerald Factory Operations Aura */}
        <div className="absolute top-[38%] -left-28 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.10),transparent_65%)] blur-3xl" />
        
        {/* Bottom-Right Sapphire Cashflow Glow */}
        <div className="absolute -bottom-24 right-1/4 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_65%)] blur-3xl" />
      </div>

      {/* Pull-to-refresh */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{ height: `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` }}
          className="flex items-center justify-center overflow-hidden transition-ui md:hidden"
        >
          <div className="flex items-center gap-2 rounded-full border border-[var(--accent-border-light)] bg-[var(--accent-soft-light)] px-3.5 py-1.5 text-xs font-semibold dark:bg-[var(--accent-soft-dark)]">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing' : isTriggered ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}

      {/* ══════════════  APPLE HIG EXECUTIVE WINDOW HEADER  ══════════════ */}
      <section className={`relative overflow-hidden rounded-3xl border transition-all backdrop-blur-2xl ${
        isDarkMode
          ? 'bg-gradient-to-b from-[#1c1c22]/95 via-[#16161b]/95 to-[#121216]/95 border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_24px_60px_rgba(0,0,0,0.6)] text-white'
          : 'bg-gradient-to-b from-white via-white to-slate-50/80 border-slate-200/90 shadow-[inset_0_1px_0_0_#ffffff,0_2px_4px_rgba(15,23,42,0.04),0_12px_28px_-4px_rgba(15,23,42,0.08)] text-slate-900'
      }`}>
        {/* Apple Inset Specular Ambient Highlight */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(0,122,255,0.22),transparent_70%)] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.15),transparent_70%)] blur-2xl" />
        <div className="relative p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    {isRealtimeStreaming && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${isRealtimeStreaming ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </span>
                  <span>{isRealtimeStreaming ? 'Live Operations' : 'Paused'}</span>
                </span>
                {metrics.criticalCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{metrics.criticalCount} attention items</span>
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Executive Command Centre
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Real-time visibility across orders, shopfloor, quality gates, and finance — scoped to{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{scope}</span>.
                </p>
              </div>
            </div>

            {/* Apple Window Toolbar Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                className={`h-9 cursor-pointer rounded-full border px-3.5 text-xs font-semibold outline-none transition-all ${
                  isDarkMode 
                    ? 'border-white/10 bg-black/60 text-slate-200 hover:border-white/20' 
                    : 'border-slate-200/90 bg-white text-slate-800 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <option value="All-Time">All-Time</option>
                <option value="FY 26-27">FY 26-27</option>
                <option value="FY 25-26">FY 25-26</option>
                <option value="Q3 2026">Q3 2026</option>
              </select>

              {/* Layout Switcher Pill Group */}
              <div className={`flex items-center rounded-full border p-1 ${
                isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/90 bg-slate-100/90 shadow-2xs'
              }`}>
                {[
                  { id: 'executive', label: 'Executive', icon: LayoutDashboard },
                  { id: 'operations', label: 'Shopfloor', icon: Factory },
                  { id: 'quality', label: 'Quality', icon: ShieldCheck },
                  { id: 'financial', label: 'Finance', icon: Wallet },
                  { id: 'numbers', label: 'Tabular', icon: Hash }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = mode === item.id || (mode === 'charts' && item.id === 'executive');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSetMode(item.id as any)}
                      className={`flex h-7.5 px-3 items-center gap-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--accent-primary)] text-white shadow-sm shadow-[var(--accent-shadow)]'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowCustomizeModal(true)}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-all active:scale-95 ${
                  isDarkMode 
                    ? 'border-white/10 bg-black/60 text-slate-300 hover:text-white hover:bg-white/10' 
                    : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                }`}
                title="Customize Dashboard"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('orders')}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--accent-primary)] hover:opacity-90 active:scale-[0.98] px-4 text-xs font-semibold text-white shadow-sm shadow-[var(--accent-shadow)] transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Order</span>
              </button>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-5 border-t border-slate-200/70 dark:border-white/10">
            {[
              { label: 'Open POs', value: metrics.openOrders.length, icon: ShoppingCart, tone: 'text-[#5B75F8] dark:text-[#7B92FF]', bg: 'bg-blue-50 text-blue-700 border border-blue-200/90 dark:bg-blue-500/10 dark:text-[#7B92FF] dark:border-blue-500/20' },
              { label: 'Active JCs', value: metrics.activeJobCards.length, icon: Factory, tone: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/90 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' },
              { label: 'QC Pass Rate', value: `${metrics.qcPassRate}%`, icon: ShieldCheck, tone: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
              { label: 'Parts Output', value: metrics.totalOutput.toLocaleString('en-IN'), icon: Gauge, tone: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 text-amber-700 border border-amber-200/90 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' }
            ].map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all ${
                    isDarkMode ? 'border-white/10 bg-black/50 hover:border-white/20' : 'border-slate-200/70 bg-slate-50/70 shadow-[inset_0_1px_1px_0_rgba(15,23,42,0.02)]'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${item.bg}`}>
                    <Icon className="h-5 w-5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.label}</div>
                    <div className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">{item.value}</div>
                  </div>
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
          className={`group w-full rounded-3xl border border-rose-500/30 p-4 text-left transition-all backdrop-blur-2xl flex items-center justify-between gap-3 cursor-pointer ${
            isDarkMode 
              ? 'bg-[#1c1417]/90 hover:bg-[#26191e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_32px_rgba(0,0,0,0.4)]' 
              : 'bg-gradient-to-r from-rose-50/90 via-rose-50/70 to-white border-rose-200/90 hover:border-rose-300 shadow-[inset_0_1px_0_0_#ffffff,0_2px_8px_rgba(244,63,94,0.08)]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300">
                {metrics.pendingApprovalsCount} approval{metrics.pendingApprovalsCount > 1 ? 's' : ''} awaiting sign-off
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">High-value POs and credit dispatches need your action</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
            <span>Review</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>
      )}


      {/* ══════════════  TABULAR MODE  ══════════════ */}
      {mode === 'numbers' && (
        <section className={`space-y-4 rounded-3xl border p-5 ${surface}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle icon={Target} title="Telemetry Registry" sub="All operational KPIs in tabular form" isDarkMode={isDarkMode} />
            <div className="flex flex-wrap items-center gap-2">
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${softInner}`}>
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  value={tabularSearchQuery}
                  onChange={e => setTabularSearchQuery(e.target.value)}
                  placeholder="Search metrics"
                  className={`w-40 bg-transparent outline-none text-xs ${textPrimary}`}
                />
              </div>
              <select
                value={tabularCategoryFilter}
                onChange={e => setTabularCategoryFilter(e.target.value)}
                className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium outline-none ${softInner} ${textPrimary}`}
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
                className="flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] hover:opacity-90 active:scale-[0.98] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs shadow-[var(--accent-shadow)] transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          <div className={`overflow-x-auto rounded-2xl border ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-white'}`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-xs font-semibold ${isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-300' : 'border-slate-200/80 bg-slate-50/80 text-slate-600'}`}>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                {filteredTabularMetrics.map(m => (
                  <tr key={m.code} className={`transition-all ${isDarkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-slate-50/70'}`}>
                    <td className="px-4 py-3 font-mono text-slate-400">{m.code}</td>
                    <td className={`px-4 py-3 font-medium ${textPrimary}`}>{m.name}</td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-400">{m.category}</td>
                    <td className={`px-4 py-3 font-bold ${textPrimary}`}>{m.valueStr}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusChip(m.status)}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleNavigate(m.viewKey)}
                        className="inline-flex items-center gap-1 font-semibold text-[#5B75F8] dark:text-[#7B92FF] transition hover:underline cursor-pointer"
                      >
                        <span>Open</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(mode === 'executive' || mode === 'charts') && (
        <ExecutiveDashboardLayout
          orders={orders}
          stock={stock}
          qcItems={qcItems}
          pdiQueue={pdiQueue}
          jobCards={jobCards}
          shortages={shortages}
          dispatches={dispatches}
          invoices={invoices}
          payables={payables}
          productionLogs={productionLogs}
          auditLogs={auditLogs}
          approvals={approvals}
          scope={scope}
          currencySymbol={currencySymbol}
          isDarkMode={isDarkMode}
          onNavigate={handleNavigate}
          onSelectOrder={onSelectOrder}
        />
      )}

      {mode === 'operations' && (
        <OperationsDashboardLayout
          orders={orders}
          stock={stock}
          qcItems={qcItems}
          pdiQueue={pdiQueue}
          jobCards={jobCards}
          shortages={shortages}
          dispatches={dispatches}
          invoices={invoices}
          payables={payables}
          productionLogs={productionLogs}
          auditLogs={auditLogs}
          approvals={approvals}
          scope={scope}
          currencySymbol={currencySymbol}
          isDarkMode={isDarkMode}
          onNavigate={handleNavigate}
          onSelectOrder={onSelectOrder}
        />
      )}

      {mode === 'quality' && (
        <QualityGateDashboardLayout
          orders={orders}
          stock={stock}
          qcItems={qcItems}
          pdiQueue={pdiQueue}
          jobCards={jobCards}
          shortages={shortages}
          dispatches={dispatches}
          invoices={invoices}
          payables={payables}
          productionLogs={productionLogs}
          auditLogs={auditLogs}
          approvals={approvals}
          scope={scope}
          currencySymbol={currencySymbol}
          isDarkMode={isDarkMode}
          onNavigate={handleNavigate}
          onSelectOrder={onSelectOrder}
        />
      )}

      {mode === 'financial' && (
        <FinancialDashboardLayout
          orders={orders}
          stock={stock}
          qcItems={qcItems}
          pdiQueue={pdiQueue}
          jobCards={jobCards}
          shortages={shortages}
          dispatches={dispatches}
          invoices={invoices}
          payables={payables}
          productionLogs={productionLogs}
          auditLogs={auditLogs}
          approvals={approvals}
          scope={scope}
          currencySymbol={currencySymbol}
          isDarkMode={isDarkMode}
          onNavigate={handleNavigate}
          onSelectOrder={onSelectOrder}
        />
      )}

          {/* ══════════════  AI AGENT GRID  ══════════════ */}
          {widgetVisibility.showAgentBentoGrid && (
            <section className="space-y-3">
              <div className={`flex flex-wrap items-center justify-between gap-2 rounded-3xl border px-4 py-3.5 ${surface}`}>
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
                shortages={shortages}
                qcItems={qcItems}
                pdiQueue={pdiQueue}
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


      {/* ══════════════  CUSTOMIZE MODAL  ══════════════ */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowCustomizeModal(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" />
          <div className={`relative z-10 w-full max-w-md space-y-4 rounded-2xl border p-6 shadow-2xl backdrop-blur-2xl ${isDarkMode ? 'border-white/10 bg-slate-900/95 text-white' : 'border-slate-200/80 bg-white/95 text-slate-900'}`}>
            <div className="flex items-center justify-between border-b pb-3.5 border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] dark:bg-[var(--accent-soft-dark)] dark:text-[var(--accent-text-dark)]">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold tracking-tight">Customize Dashboard</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              <div className={`rounded-xl border p-3.5 ${softInner}`}>
                <AccentColorSelector isDarkMode={isDarkMode} />
              </div>

              <div className={`space-y-2 rounded-xl border p-3.5 ${softInner}`}>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dashboard Layout Preset</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'executive', label: 'Executive', icon: Sparkles },
                    { id: 'operations', label: 'Operations', icon: Factory },
                    { id: 'quality', label: 'Quality', icon: ShieldCheck },
                    { id: 'financial', label: 'Financial', icon: DollarSign },
                    { id: 'numbers', label: 'Tabular', icon: Hash }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = mode === tab.id || (mode === 'charts' && tab.id === 'executive');
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleSetMode(tab.id as any)}
                        className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'border-transparent bg-[#0F766E] text-white shadow-xs dark:bg-[#2DD4BF] dark:text-slate-950'
                            : isDarkMode
                              ? 'border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                              : 'border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`flex items-center justify-between rounded-xl border p-3.5 ${softInner}`}>
                <div>
                  <div className="text-xs font-semibold">Realtime Feed</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">Auto-update every 5s</div>
                </div>
                <button type="button" onClick={onToggleRealtimeStreaming} className="cursor-pointer">
                  <div className={`w-11 rounded-full p-0.5 transition-colors ${isRealtimeStreaming ? 'bg-[#34C759]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${isRealtimeStreaming ? 'translate-x-5' : ''}`} />
                  </div>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Visible Widgets</label>
                {[
                  { key: 'showAlertsBar', label: 'Alert Rail' },
                  { key: 'showTopMetricsRow', label: 'KPI Cards' },
                  { key: 'showAnalyticsGrid', label: 'Analytics Grid' },
                  { key: 'showOrderPipelineCard', label: 'Order Book Revenue & Pipeline' },
                  { key: 'showAgentBentoGrid', label: 'AI Agent Grid' }
                ].map(item => {
                  const key = item.key as keyof typeof widgetVisibility;
                  const active = widgetVisibility[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleWidget(key)}
                      className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition-all cursor-pointer ${active
                          ? isDarkMode 
                            ? 'border-blue-500/30 bg-blue-500/10 text-white' 
                            : 'border-blue-500/30 bg-blue-50/60 text-slate-900'
                          : isDarkMode
                            ? 'border-white/5 text-slate-400 hover:bg-white/[0.03]'
                            : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      <span>{item.label}</span>
                      {active ? <Eye className="h-4 w-4 text-[#5B75F8] dark:text-[#7B92FF]" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-all hover:bg-rose-500/10 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset Factory Data</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCustomizeModal(false)}
              className="w-full rounded-full bg-[#5B75F8] hover:bg-[#435BE8] active:scale-[0.98] py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandCentreView;
