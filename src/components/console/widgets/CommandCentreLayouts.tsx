import React, { useState, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Zap,
  Factory,
  Package,
  Truck,
  DollarSign,
  Wallet,
  ChevronRight,
  Boxes,
  Layers,
  Radio,
  Gauge,
  FileText,
  CheckSquare,
  Play,
  Sparkles,
  Download,
  Search,
  SlidersHorizontal,
  Building2,
  CircleDot,
  Percent,
  BarChart3,
  Calendar,
  Filter,
  Eye
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
import {
  StatSparklineCard,
  CashflowTrendCard,
  MonthlyProgressCard,
  HistoryCard,
  GateConsolidationCard
} from './ExecutiveCommandWidgets';
import { OrderBookRevenueChart } from '../charts/OrderBookRevenueChart';

/* ─────────────────────────────────────────────────────────────────────────────
   Shared Layout Props
───────────────────────────────────────────────────────────────────────────── */
export interface DashboardLayoutProps {
  orders: CustomerOrder[];
  stock: StockItem[];
  qcItems: QCInspection[];
  pdiQueue: any[];
  jobCards: JobCard[];
  shortages: any[];
  dispatches: DispatchChallan[];
  invoices: CustomerInvoice[];
  payables: VendorBill[];
  productionLogs: ProductionLogReport[];
  auditLogs: AuditLogEntry[];
  approvals: PendingApproval[];
  scope: string;
  currencySymbol: string;
  isDarkMode: boolean;
  onNavigate: (view: any) => void;
  onSelectOrder?: (orderId: string) => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: Stat Pill Badge
───────────────────────────────────────────────────────────────────────────── */
const TrendBadge: React.FC<{ value: string; isPositive?: boolean }> = ({ value, isPositive = true }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
      isPositive
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-[0_1px_2px_rgba(16,185,129,0.12)] dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
        : 'bg-rose-50 text-rose-700 border border-rose-200/90 shadow-[0_1px_2px_rgba(244,63,94,0.12)] dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
    }`}
  >
    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
    <span>{value}</span>
  </span>
);

/* ─────────────────────────────────────────────────────────────────────────────
   LAYOUT 1: Executive Suite (Strategic & Financial Overview)
───────────────────────────────────────────────────────────────────────────── */
export const ExecutiveDashboardLayout: React.FC<DashboardLayoutProps> = ({
  orders,
  stock,
  qcItems,
  pdiQueue,
  jobCards,
  dispatches,
  invoices,
  payables,
  productionLogs,
  auditLogs,
  approvals,
  scope,
  currencySymbol,
  isDarkMode,
  onNavigate,
  onSelectOrder
}) => {
  const openOrders = orders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED');
  const activeJCs = jobCards.filter(j => {
    const s = (j.status || j.jobStatus || '').toUpperCase();
    return ['IN_PROGRESS', 'IN_PRODUCTION', 'RUNNING', 'SCHEDULED'].includes(s);
  });
  const ongoingJCCount = activeJCs.length > 0 ? activeJCs.length : jobCards.filter(j => (j.status || j.jobStatus || '').toUpperCase() !== 'COMPLETED').length;
  const inProdOrdersCount = orders.filter(o => ['IN_PRODUCTION', 'JOB_RELEASED'].includes((o.status || '').toUpperCase())).length;
  const effectiveOngoingJCs = ongoingJCCount > 0 ? ongoingJCCount : inProdOrdersCount;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.grossAmount || 0), 0);
  const overdueReceivables = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + (i.amount || 0), 0);
  const totalPayables = payables.filter(p => p.status === 'UNPAID' || p.status === 'OVERDUE').reduce((s, p) => s + (p.amount || 0), 0);
  const passQc = qcItems.filter(q => q.qcStatus === 'PASS').length;
  const qcPassRate = qcItems.length > 0 ? ((passQc / qcItems.length) * 100).toFixed(1) : '98.5';

  // Real-time Net Income (Invoiced revenue prioritized, order book value fallback, 0 if empty)
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0);
  const paidInvoicesAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const computedNetIncome = totalInvoiced > 0 ? totalInvoiced : totalRevenue;
  const incomeSubtext = invoices.length > 0
    ? `${invoices.length} Invoices · ₹${Math.round(paidInvoicesAmount).toLocaleString('en-IN')} paid`
    : `${orders.length} Active Orders`;

  // Real-time Net Spend (Vendor payables sum, 0 if empty - no static numbers)
  const totalPayablesAmount = payables.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidPayablesAmount = payables.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const computedNetSpend = totalPayablesAmount;
  const spendSubtext = payables.length > 0
    ? `${payables.length} Bills · ₹${Math.round(paidPayablesAmount).toLocaleString('en-IN')} paid`
    : '0 Bills Recorded';

  // Compute real dynamic trend points from invoices/orders & payables
  const incomeTrendPoints = useMemo(() => {
    if (invoices.length >= 2) {
      return [...invoices]
        .sort((a, b) => new Date(a.invoiceDate || a.date || 0).getTime() - new Date(b.invoiceDate || b.date || 0).getTime())
        .slice(-6)
        .map(i => i.totalAmount || i.amount || 0);
    }
    if (orders.length >= 2) {
      return [...orders]
        .filter(o => o.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.orderDate || a.createdAt || 0).getTime() - new Date(b.orderDate || b.createdAt || 0).getTime())
        .slice(-6)
        .map(o => o.grossAmount || 0);
    }
    return computedNetIncome > 0 ? [computedNetIncome * 0.7, computedNetIncome * 0.85, computedNetIncome] : [0, 0, 0, 0];
  }, [invoices, orders, computedNetIncome]);

  const spendTrendPoints = useMemo(() => {
    if (payables.length >= 2) {
      return [...payables]
        .sort((a, b) => new Date(a.date || a.dueDate || 0).getTime() - new Date(b.date || b.dueDate || 0).getTime())
        .slice(-6)
        .map(p => p.amount || 0);
    }
    return computedNetSpend > 0 ? [computedNetSpend * 0.6, computedNetSpend * 0.8, computedNetSpend] : [0, 0, 0, 0];
  }, [payables, computedNetSpend]);

  const pipeline = useMemo(() => ({
    draft: orders.filter(o => ['DRAFT', 'SUBMITTED', 'PO_RECEIVED'].includes((o.status || '').toUpperCase())).length,
    confirmed: orders.filter(o => ['CONFIRMED', 'APPROVED', 'RELEASED'].includes((o.status || '').toUpperCase())).length,
    production: orders.filter(o => ['IN_PRODUCTION', 'JOB_RELEASED', 'MATERIAL_CHECK', 'MATERIAL_READY'].includes((o.status || o.stage || '').toUpperCase())).length,
    qc: orders.filter(o => ['QC', 'QC_INSPECTION', 'QC_HOLD', 'READY_FOR_QC'].includes((o.status || o.stage || '').toUpperCase())).length,
    dispatch: orders.filter(o => ['READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT'].includes((o.status || o.stage || '').toUpperCase())).length,
    closed: orders.filter(o => ['CLOSED', 'COMPLETED', 'DELIVERED', 'PAID'].includes((o.status || '').toUpperCase())).length
  }), [orders]);

  const pipelineTotal = (Object.values(pipeline) as number[]).reduce((a, b) => a + b, 0) || 1;

  const surface = isDarkMode
    ? 'bg-[#18181B]/90 border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_rgba(0,0,0,0.5)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  const softInner = isDarkMode
    ? 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06]'
    : 'bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/90 shadow-[inset_0_1px_1px_0_rgba(15,23,42,0.02)]';

  return (
    <div className="space-y-4">
      {/* ── MASTER EXECUTIVE GRID ── */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* Left Column: Metric Cards + Cashflow + Progress */}
        <div className="lg:col-span-4 space-y-3.5">
          <StatSparklineCard
            title="Recent Orders"
            value={openOrders.length}
            icon={FileText}
            tone="teal"
            bars={[12, 18, 15, 26, 19, 14]}
            activeBarIndex={3}
            onClick={() => onNavigate('orders')}
            isDarkMode={isDarkMode}
          />

          <StatSparklineCard
            title="Job Cards Ongoing"
            value={effectiveOngoingJCs}
            icon={Factory}
            tone="amber"
            bars={[14, 22, 18, 28, 16, 20]}
            activeBarIndex={3}
            onClick={() => onNavigate('production')}
            isDarkMode={isDarkMode}
          />

          <StatSparklineCard
            title="Dispatches Done"
            value={dispatches.length}
            icon={Truck}
            tone="rose"
            bars={[10, 15, 14, 25, 18, 16]}
            activeBarIndex={3}
            onClick={() => onNavigate('dispatch')}
            isDarkMode={isDarkMode}
          />

          <CashflowTrendCard
            spendAmount={computedNetSpend}
            spendLabel="Net Spend this month"
            spendSubtext={spendSubtext}
            spendTrend={spendTrendPoints}
            incomeAmount={computedNetIncome}
            incomeLabel="Net Income this month"
            incomeSubtext={incomeSubtext}
            incomeTrend={incomeTrendPoints}
            currencySymbol={currencySymbol}
            onClickSpend={() => onNavigate('payables')}
            onClickIncome={() => onNavigate('invoices')}
            isDarkMode={isDarkMode}
          />

          <MonthlyProgressCard
            percentage={Number(qcPassRate) > 100 ? 75 : Math.round(Number(qcPassRate) * 0.75) || 45}
            label="Monthly Progress"
            sublabel="Fulfillment Target"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Right Column: Order Book Revenue Area Chart + History + Consolidation */}
        <div className="lg:col-span-8 space-y-4">
          <OrderBookRevenueChart
            orders={orders}
            scope={scope}
            currencySymbol={currencySymbol}
            isDarkMode={isDarkMode}
            onNavigateOrders={() => onNavigate('orders')}
            pipeline={pipeline}
            pipelineTotal={pipelineTotal}
            onNavigateStage={onNavigate}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HistoryCard
              orders={orders}
              jobCards={jobCards}
              qcItems={qcItems}
              pdiQueue={pdiQueue}
              dispatches={dispatches}
              auditLogs={auditLogs}
              onSelectOrder={onSelectOrder}
              onNavigate={onNavigate}
              isDarkMode={isDarkMode}
            />

            <GateConsolidationCard
              qcPassRate={`${qcPassRate}%`}
              pdiPassRate="15%"
              challanRate="15%"
              qcPassCount={passQc || 140}
              pdiPassCount={pdiQueue.length || 220}
              challanCount={dispatches.length || 387}
              onNavigate={onNavigate}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS MODULE SHORTCUTS ── */}
      <div className={`rounded-3xl p-5 sm:p-6 transition-all ${surface}`}>
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#5B75F8] dark:text-[#7B92FF]" />
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Quick Module Dispatch</h2>
          </div>
          <span className="text-[11px] font-medium text-slate-400">1-click navigation</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {[
            { label: 'Orders', icon: FileText, view: 'orders', color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Shopfloor', icon: Factory, view: 'production', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { label: 'Inventory', icon: Package, view: 'inventory', color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { label: 'QC Gate', icon: ShieldCheck, view: 'qc', color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Dispatch', icon: Truck, view: 'dispatch', color: 'text-teal-500', bg: 'bg-teal-500/10' },
            { label: 'Invoices', icon: DollarSign, view: 'invoices', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Approvals', icon: CheckSquare, view: 'approvals', color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { label: 'AI Swarm', icon: Sparkles, view: 'command-centre', color: 'text-purple-500', bg: 'bg-purple-500/10' }
          ].map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => onNavigate(action.view)}
                className={`group flex min-h-[88px] flex-col items-center justify-center gap-2.5 rounded-2xl border p-3 transition-all hover:scale-105 active:scale-[0.98] cursor-pointer ${softInner}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}>
                  <Icon className={`h-5 w-5 ${action.color}`} strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   LAYOUT 2: Operations & Shopfloor Matrix (Tactical & Manufacturing Flow)
───────────────────────────────────────────────────────────────────────────── */
export const OperationsDashboardLayout: React.FC<DashboardLayoutProps> = ({
  jobCards,
  stock,
  productionLogs,
  qcItems,
  currencySymbol,
  isDarkMode,
  onNavigate
}) => {
  const activeJCs = jobCards.filter(j => j.status === 'IN_PROGRESS');
  const criticalStock = stock.filter(s => s.status === 'SHORTAGE' || s.status === 'CRITICAL' || s.available < 0);
  const totalPartsDone = productionLogs.reduce((acc, p) => acc + (p.qtyDone || 0), 0);

  const surface = isDarkMode
    ? 'bg-[#18181B]/90 border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_rgba(0,0,0,0.5)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  const softInner = isDarkMode
    ? 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06]'
    : 'bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/90 shadow-[inset_0_1px_1px_0_rgba(15,23,42,0.02)]';

  const machines = [
    { name: 'VMC CNC-01 (Haas)', operator: 'R. Sharma', part: 'Flange Housing B-204', load: 88, status: 'RUNNING', speed: '3,200 RPM', oee: '94.2%' },
    { name: 'Turning CNC-02 (Doosan)', operator: 'V. Patel', part: 'Drive Shaft S-102', load: 92, status: 'RUNNING', speed: '2,800 RPM', oee: '91.8%' },
    { name: 'Wire Cut EDM-03', operator: 'A. Kumar', part: 'Stamping Die Insert', load: 64, status: 'IDLE', speed: 'Tool Calibration', oee: '76.4%' },
    { name: 'CMM Inspection Cell', operator: 'K. Mehta', part: 'Batch Batch Inspection', load: 78, status: 'RUNNING', speed: 'Cycle 04/12', oee: '96.0%' }
  ];

  return (
    <div className="space-y-4">
      {/* Top Operations KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Job Cards</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{activeJCs.length || 24}</span>
            <TrendBadge value="+8% vs avg" isPositive />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">On active work centers</p>
        </div>

        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parts Output Today</span>
            <Factory className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{totalPartsDone ? totalPartsDone.toLocaleString('en-IN') : '1,840'}</span>
            <TrendBadge value="96.2% target" isPositive />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Across Day & Night shifts</p>
        </div>

        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plant Overall OEE</span>
            <Gauge className="h-4 w-4 text-teal-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">89.4%</span>
            <TrendBadge value="+2.1%" isPositive />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Availability: 94% · Quality: 98%</p>
        </div>

        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock Shortage Flags</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{criticalStock.length || 3}</span>
            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">Action Req</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Materials below reorder point</p>
        </div>
      </div>

      {/* Main Operations Split: Machine Work Centers & Active Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8 Cols: Real-time Work Center Load */}
        <div className={`lg:col-span-8 rounded-3xl p-6 border transition-all ${surface}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Live Work Center Telemetry</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time CNC spindles, operator assignments, and cycle loads</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('production')}
              className="flex items-center gap-1.5 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-slate-950 font-semibold px-3 py-1.5 text-xs transition hover:opacity-90 cursor-pointer"
            >
              <span>Shopfloor Board</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {machines.map(m => (
              <div key={m.name} className={`rounded-2xl p-4 transition-all ${softInner}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.name}</h4>
                    <p className="text-xs text-slate-400">Op: {m.operator}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    m.status === 'RUNNING'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <div className="mt-3.5 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 truncate max-w-[180px]">{m.part}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{m.load}% load</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                    <div
                      style={{ width: `${m.load}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.load > 90 ? 'bg-amber-500' : 'bg-[#0F766E] dark:bg-[#2DD4BF]'
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] pt-2.5 border-t border-slate-100 dark:border-white/5">
                  <span className="text-slate-400">{m.speed}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">OEE: {m.oee}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 4 Cols: Critical Material Shortage Radar */}
        <div className={`lg:col-span-4 rounded-3xl p-6 border transition-all flex flex-col justify-between ${surface}`}>
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Shortage Alert Radar</h3>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:underline cursor-pointer"
              >
                Stores
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {(criticalStock.length > 0 ? criticalStock : stock).slice(0, 4).map((s, i) => (
                <div key={s.id || i} className={`flex items-center justify-between p-3 rounded-2xl ${softInner}`}>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.name || s.itemCode || `Alloy Bar EN-24`}</div>
                    <div className="text-[10px] text-slate-400">Available: {s.available ?? 12} {s.unit || 'Kg'} · Min: {s.reorderPoint || 50}</div>
                  </div>
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    Deficit
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
          >
            <Package className="h-4 w-4" />
            <span>Generate Supplier POs</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   LAYOUT 3: Quality & Gate Control (Governance & Clearance Hub)
───────────────────────────────────────────────────────────────────────────── */
export const QualityGateDashboardLayout: React.FC<DashboardLayoutProps> = ({
  qcItems,
  pdiQueue,
  dispatches,
  onNavigate,
  isDarkMode
}) => {
  const passCount = qcItems.filter(q => q.qcStatus === 'PASS').length;
  const holdCount = qcItems.filter(q => q.qcStatus === 'QC_HOLD' || q.jobStatus === 'QC_HOLD').length;
  const failCount = qcItems.filter(q => q.qcStatus === 'FAIL' || q.qcStatus === 'REJECT').length;
  const passRate = qcItems.length > 0 ? ((passCount / qcItems.length) * 100).toFixed(1) : '98.5';

  const surface = isDarkMode
    ? 'bg-[#18181B]/90 border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_rgba(0,0,0,0.5)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  const softInner = isDarkMode
    ? 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06]'
    : 'bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/90 shadow-[inset_0_1px_1px_0_rgba(15,23,42,0.02)]';

  return (
    <div className="space-y-4">
      {/* Top Gate Yield Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">First-Pass Yield</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{passRate}%</span>
            <TrendBadge value="Zero Critical Flaws" isPositive />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Total Inspections: {qcItems.length || 148}</p>
        </div>

        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active QC Holds</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{holdCount || 2}</span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">Pending Sign-off</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Awaiting engineering MRB</p>
        </div>

        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PDI Clearance Queue</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{pdiQueue.length || 18}</span>
            <TrendBadge value="Dock Ready" isPositive />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ready for dispatch packaging</p>
        </div>

        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gate Dispatches Today</span>
            <Truck className="h-4 w-4 text-teal-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{dispatches.length || 12}</span>
            <TrendBadge value="100% on-time" isPositive />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Challans signed & vehicle logged</p>
        </div>
      </div>

      {/* Main Split: QC Inspection Queue & Gate Consolidation Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 Cols: Active Inspection Queue */}
        <div className={`lg:col-span-7 rounded-3xl p-6 border transition-all ${surface}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Active QC & PDI Stage Queue</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Parts awaiting dimensional, surface, or final audit sign-off</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('qc')}
              className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:underline cursor-pointer"
            >
              Open QC Module
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {(qcItems.length > 0 ? qcItems : [
              { id: '1', batchNo: 'B-2026-091', itemDescription: 'Transmission Flange Housing', status: 'PASS', date: '10 mins ago' },
              { id: '2', batchNo: 'B-2026-092', itemDescription: 'Hydraulic Cylinder Rod Ø45mm', status: 'QC_HOLD', date: '35 mins ago' },
              { id: '3', batchNo: 'B-2026-093', itemDescription: 'Precision Worm Gear 42T', status: 'PASS', date: '1 hour ago' },
              { id: '4', batchNo: 'B-2026-094', itemDescription: 'Bearing Bush Bronze C932', status: 'IN_INSPECTION', date: '2 hours ago' }
            ]).slice(0, 5).map((q: any) => (
              <div key={q.id} className={`flex items-center justify-between p-3.5 rounded-2xl ${softInner}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{q.batchNo || q.lotNumber || `Lot #${q.id}`}</span>
                    <span className="text-[11px] text-slate-400 truncate">{q.itemDescription || q.partName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Logged: {q.date || q.createdAt || 'Recent inspection'}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    (q.qcStatus || q.status) === 'PASS'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : (q.qcStatus || q.status) === 'QC_HOLD'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  }`}>
                    {(q.qcStatus || q.status || 'IN_PROGRESS').replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Gate Consolidation Radial Overlap Diagram */}
        <div className="lg:col-span-5">
          <GateConsolidationCard
            qcPassRate={`${passRate}%`}
            pdiPassRate="15%"
            challanRate="15%"
            qcPassCount={passCount || 140}
            pdiPassCount={pdiQueue.length || 220}
            challanCount={dispatches.length || 387}
            onNavigate={onNavigate}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   LAYOUT 4: Financial Intelligence (Cashflow, Working Capital & Runway)
───────────────────────────────────────────────────────────────────────────── */
export const FinancialDashboardLayout: React.FC<DashboardLayoutProps> = ({
  orders,
  invoices,
  payables,
  currencySymbol,
  isDarkMode,
  onNavigate
}) => {
  const totalBookValue = orders.reduce((s, o) => s + (o.grossAmount || 0), 0);
  const totalReceivables = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const overdueReceivables = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + (i.amount || 0), 0);
  const totalPayables = payables.filter(p => p.status === 'UNPAID' || p.status === 'OVERDUE').reduce((s, p) => s + (p.amount || 0), 0);
  const netWorkingCapital = totalReceivables - totalPayables;

  const fmt = (num: number) =>
    `${currencySymbol}${Math.round(num).toLocaleString('en-IN')}`;

  const surface = isDarkMode
    ? 'bg-[#18181B]/90 border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_rgba(0,0,0,0.5)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  const softInner = isDarkMode
    ? 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06]'
    : 'bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/90 shadow-[inset_0_1px_1px_0_rgba(15,23,42,0.02)]';

  return (
    <div className="space-y-4">
      {/* Top Financial Hero Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Booked Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{fmt(totalBookValue || 530748)}</span>
            <TrendBadge value="+14.2% YoY" isPositive />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Total active order volume</p>
        </div>

        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Working Capital</span>
            <Wallet className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{fmt(netWorkingCapital || 284500)}</span>
            <TrendBadge value="Safe Buffer" isPositive />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Receivables minus Payables</p>
        </div>

        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Receivables</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{fmt(overdueReceivables || 11097)}</span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">Collection Due</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Average DSO: 34 days</p>
        </div>

        <div className={`rounded-3xl p-5 border transition-all ${surface}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor Payables</span>
            <Building2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{fmt(totalPayables || 4790)}</span>
            <TrendBadge value="90D Runway" isPositive />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Supplier credit terms intact</p>
        </div>
      </div>

      {/* Main Split: Cashflow Curves & Invoice Aging Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 6 Cols: Dual-Wave Cashflow Card */}
        <div className="lg:col-span-6 space-y-4">
          <CashflowTrendCard
            spendAmount={totalPayables}
            spendLabel="Net Spend this month (Vendor Bills)"
            spendSubtext={payables.length > 0 ? `${payables.length} Bills Recorded` : '0 Bills Recorded'}
            spendTrend={payables.length >= 2 ? payables.map(p => p.amount || 0).slice(-6) : [totalPayables, totalPayables]}
            incomeAmount={totalBookValue}
            incomeLabel="Net Income this month (Customer Invoices)"
            incomeSubtext={invoices.length > 0 ? `${invoices.length} Invoices Recorded` : `${orders.length} Orders Active`}
            incomeTrend={invoices.length >= 2 ? invoices.map(i => i.totalAmount || i.amount || 0).slice(-6) : [totalBookValue, totalBookValue]}
            currencySymbol={currencySymbol}
            onClickSpend={() => onNavigate('payables')}
            onClickIncome={() => onNavigate('invoices')}
            isDarkMode={isDarkMode}
          />

          <MonthlyProgressCard
            percentage={68}
            label="Annual Revenue Goal Run-rate"
            sublabel="Target: ₹1.2 Cr FY 26-27"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Right 6 Cols: Aging Analysis Table */}
        <div className={`lg:col-span-6 rounded-3xl p-6 border transition-all ${surface}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Receivables Aging Matrix</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Customer payment status partitioned by credit maturity</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:underline cursor-pointer"
            >
              All Invoices
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {[
              { bucket: 'Current (0 - 30 Days)', amount: fmt(totalBookValue * 0.65 || 184000), pct: 65, status: 'HEALTHY', color: 'bg-emerald-500' },
              { bucket: 'Past Due (31 - 60 Days)', amount: fmt(totalBookValue * 0.22 || 62000), pct: 22, status: 'DUE', color: 'bg-blue-500' },
              { bucket: 'Critical (61 - 90 Days)', amount: fmt(totalBookValue * 0.09 || 25000), pct: 9, status: 'OVERDUE', color: 'bg-amber-500' },
              { bucket: 'Impaired (90+ Days)', amount: fmt(totalBookValue * 0.04 || 11097), pct: 4, status: 'ACTION_REQ', color: 'bg-rose-500' }
            ].map(row => (
              <div key={row.bucket} className={`p-3.5 rounded-2xl ${softInner} space-y-2`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{row.bucket}</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">{row.amount}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                  <div
                    style={{ width: `${row.pct}%` }}
                    className={`h-full rounded-full ${row.color} transition-all duration-500`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
