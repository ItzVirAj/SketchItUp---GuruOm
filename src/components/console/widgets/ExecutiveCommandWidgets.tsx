import React, { useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Truck,
  Package,
  Layers,
  Sparkles,
  Receipt,
  Boxes
} from 'lucide-react';
import { CustomerOrder, AuditLogEntry, JobCard, QCInspection, DispatchChallan } from '../../../types/console';

/* ─────────────────────────────────────────────────────────────────────────────
   1. StatSparklineCard (Top-Left Cards from Reference Image)
   Recent Sign-ups (3,488), Upcoming Trials (2,067), Restorations (690)
───────────────────────────────────────────────────────────────────────────── */
export interface StatSparklineCardProps {
  title: string;
  value: number | string;
  icon?: React.ElementType;
  tone?: 'teal' | 'amber' | 'rose' | 'blue';
  bars?: number[];
  activeBarIndex?: number;
  onClick?: () => void;
  isDarkMode?: boolean;
}

export const StatSparklineCard: React.FC<StatSparklineCardProps> = ({
  title,
  value,
  icon: Icon = FileText,
  tone = 'teal',
  bars = [12, 18, 15, 26, 19, 14],
  activeBarIndex = 3,
  onClick,
  isDarkMode = false
}) => {
  const toneConfigs = {
    teal: {
      bgIcon: isDarkMode
        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-[0_1px_2px_rgba(16,185,129,0.12)]',
      activeBar: 'bg-[#0F766E] dark:bg-[#2DD4BF]',
      barMuted: isDarkMode ? 'bg-white/10' : 'bg-slate-200/80'
    },
    amber: {
      bgIcon: isDarkMode
        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
        : 'bg-amber-50 text-amber-700 border border-amber-200/90 shadow-[0_1px_2px_rgba(245,158,11,0.12)]',
      activeBar: 'bg-[#D97706] dark:bg-[#F59E0B]',
      barMuted: isDarkMode ? 'bg-white/10' : 'bg-slate-200/80'
    },
    rose: {
      bgIcon: isDarkMode
        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
        : 'bg-rose-50 text-rose-700 border border-rose-200/90 shadow-[0_1px_2px_rgba(244,63,94,0.12)]',
      activeBar: 'bg-[#E11D48] dark:bg-[#FB7185]',
      barMuted: isDarkMode ? 'bg-white/10' : 'bg-slate-200/80'
    },
    blue: {
      bgIcon: isDarkMode
        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
        : 'bg-blue-50 text-blue-700 border border-blue-200/90 shadow-[0_1px_2px_rgba(59,130,246,0.12)]',
      activeBar: 'bg-[#3B82F6] dark:bg-[#60A5FA]',
      barMuted: isDarkMode ? 'bg-white/10' : 'bg-slate-200/80'
    }
  };

  const currentTone = toneConfigs[tone] || toneConfigs.teal;

  const cardSurface = isDarkMode
    ? 'bg-[#18181B]/90 border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.4)] hover:bg-[#202026] hover:border-white/25'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)] hover:border-slate-300 hover:shadow-[inset_0_1px_0_0_#ffffff,0_4px_12px_rgba(15,23,42,0.08),0_16px_32px_-4px_rgba(15,23,42,0.1)] hover:-translate-y-0.5';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-3xl border p-4 sm:p-5 text-left transition-all duration-200 active:scale-[0.99] cursor-pointer ${cardSurface}`}
    >
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
        {title}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${currentTone.bgIcon}`}>
            <Icon className="h-4.5 w-4.5 stroke-[2]" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </div>
        </div>

        {/* 6-Bar Mini Sparkline Chart */}
        <div className="flex items-end gap-1.5 h-7">
          {bars.map((height, i) => {
            const isHighlighted = i === activeBarIndex;
            return (
              <span
                key={i}
                style={{ height: `${height}px` }}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isHighlighted ? `${currentTone.activeBar} shadow-xs` : currentTone.barMuted
                }`}
              />
            );
          })}
        </div>
      </div>
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   2. CashflowTrendCard (Middle-Left from Reference Image: Net Spend & Net Income)
───────────────────────────────────────────────────────────────────────────── */
export interface CashflowTrendCardProps {
  spendAmount: number;
  spendLabel?: string;
  spendSubtext?: string;
  spendTrend?: number[];
  incomeAmount: number;
  incomeLabel?: string;
  incomeSubtext?: string;
  incomeTrend?: number[];
  currencySymbol?: string;
  onClickSpend?: () => void;
  onClickIncome?: () => void;
  isDarkMode?: boolean;
}

export const CashflowTrendCard: React.FC<CashflowTrendCardProps> = ({
  spendAmount,
  spendLabel = 'Net Spend this month',
  spendSubtext,
  spendTrend = [],
  incomeAmount,
  incomeLabel = 'Net Income this month',
  incomeSubtext,
  incomeTrend = [],
  currencySymbol = '₹',
  onClickSpend,
  onClickIncome,
  isDarkMode = false
}) => {
  const cardSurface = isDarkMode
    ? 'bg-[#18181B]/90 border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.4)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  const fmt = (num: number) =>
    `${currencySymbol}${Math.round(num).toLocaleString('en-IN')}`;

  // Helper to dynamically calculate smooth cubic Bézier SVG curve from actual data points
  const generateDynamicCurve = (points: number[] = [], width = 84, height = 30) => {
    const defaultY = height / 2;
    if (!points || points.length === 0) {
      return {
        strokePath: `M 0 ${defaultY} L ${width} ${defaultY}`,
        fillPath: `M 0 ${defaultY} L ${width} ${defaultY} L ${width} ${height} L 0 ${height} Z`
      };
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min;
    const paddingY = 4;
    const usableH = height - paddingY * 2;

    const coords = points.map((val, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * width;
      const y = range === 0
        ? defaultY
        : height - paddingY - ((val - min) / range) * usableH;
      return { x, y };
    });

    if (coords.length === 1) {
      const yVal = coords[0].y.toFixed(1);
      return {
        strokePath: `M 0 ${yVal} L ${width} ${yVal}`,
        fillPath: `M 0 ${yVal} L ${width} ${yVal} L ${width} ${height} L 0 ${height} Z`
      };
    }

    let strokePath = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpx = ((curr.x + next.x) / 2).toFixed(1);
      strokePath += ` C ${cpx} ${curr.y.toFixed(1)}, ${cpx} ${next.y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }

    const fillPath = `${strokePath} L ${width} ${height} L 0 ${height} Z`;
    return { strokePath, fillPath };
  };

  const spendCurve = useMemo(() => generateDynamicCurve(spendTrend), [spendTrend]);
  const incomeCurve = useMemo(() => generateDynamicCurve(incomeTrend), [incomeTrend]);

  return (
    <div className={`rounded-3xl border p-4 sm:p-5 space-y-3 transition-all ${cardSurface}`}>
      {/* Spend Row with Dynamic Teal Curve */}
      <button
        type="button"
        onClick={onClickSpend}
        className="group flex w-full items-center justify-between gap-4 text-left p-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300/80 shadow-[inset_0_1px_1px_0_rgba(15,23,42,0.02)] transition-all dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] cursor-pointer"
      >
        <div className="w-22 shrink-0">
          <svg className="w-full h-8 overflow-visible" viewBox="0 0 84 30">
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0F766E" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={spendCurve.fillPath} fill="url(#spendGrad)" />
            <path
              d={spendCurve.strokePath}
              fill="none"
              stroke="#0F766E"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="dark:stroke-[#2DD4BF]"
            />
          </svg>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {fmt(spendAmount)}
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {spendLabel}
          </div>
          {spendSubtext && (
            <div className="text-[10px] text-teal-600/90 dark:text-teal-400/90 font-medium truncate">
              {spendSubtext}
            </div>
          )}
        </div>
      </button>

      {/* Income Row with Dynamic Rose Curve */}
      <button
        type="button"
        onClick={onClickIncome}
        className="group flex w-full items-center justify-between gap-4 text-left p-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300/80 shadow-[inset_0_1px_1px_0_rgba(15,23,42,0.02)] transition-all dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] cursor-pointer"
      >
        <div className="w-22 shrink-0">
          <svg className="w-full h-8 overflow-visible" viewBox="0 0 84 30">
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={incomeCurve.fillPath} fill="url(#incomeGrad)" />
            <path
              d={incomeCurve.strokePath}
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="dark:stroke-[#FB7185]"
            />
          </svg>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {fmt(incomeAmount)}
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {incomeLabel}
          </div>
          {incomeSubtext && (
            <div className="text-[10px] text-rose-600/90 dark:text-rose-400/90 font-medium truncate">
              {incomeSubtext}
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   3. MonthlyProgressCard (Bottom-Left: 45% with Pill Progress Bar)
───────────────────────────────────────────────────────────────────────────── */
export interface MonthlyProgressCardProps {
  percentage?: number;
  label?: string;
  sublabel?: string;
  isDarkMode?: boolean;
}

export const MonthlyProgressCard: React.FC<MonthlyProgressCardProps> = ({
  percentage = 45,
  label = 'Monthly Progress',
  sublabel = 'Order Fulfilment Target',
  isDarkMode = false
}) => {
  const cardSurface = isDarkMode
    ? 'bg-[#18181B]/90 border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.4)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className={`rounded-3xl border p-4 sm:p-5 transition-all ${cardSurface}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
          {label}
        </span>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          title="Progress options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
          {clamped}%
        </div>
        <div className="relative flex-1 h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10 border border-slate-200/80 dark:border-transparent shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]">
          <div
            style={{ width: `${clamped}%` }}
            className="h-full rounded-full bg-gradient-to-r from-[#0F766E] to-[#14B8A6] dark:from-[#0F766E] dark:to-[#2DD4BF] transition-[width] duration-700 ease-out shadow-[0_1px_3px_rgba(15,118,110,0.35)]"
          />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   4. HistoryCard (Bottom-Center Timeline Feed matching "History" in Reference)
───────────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
   4. HistoryCard (Bottom-Center Order Lifecycle Feed)
   Shows real-time order states: PO Made, Job Card, QC, PDI, Dispatch.
   Filters out all login/logout and auth session logs.
───────────────────────────────────────────────────────────────────────────── */
export interface HistoryCardProps {
  orders?: CustomerOrder[];
  jobCards?: JobCard[];
  qcItems?: QCInspection[];
  pdiQueue?: any[];
  dispatches?: DispatchChallan[];
  auditLogs?: AuditLogEntry[];
  onSelectOrder?: (orderId: string) => void;
  onNavigate?: (view: any) => void;
  isDarkMode?: boolean;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({
  orders = [],
  jobCards = [],
  qcItems = [],
  pdiQueue = [],
  dispatches = [],
  auditLogs = [],
  onSelectOrder,
  onNavigate,
  isDarkMode = false
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PO_MADE' | 'JOB_CARD' | 'QC' | 'PDI' | 'DISPATCH'>('ALL');

  const cardSurface = isDarkMode
    ? 'bg-[#18181B]/90 border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.5)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  // Helper to calculate or mock relative time
  const formatTimeAgo = (ts?: string | number, fallbackIndex = 0) => {
    if (typeof ts === 'string' && ts.includes('ago')) return ts;
    if (ts) {
      const timeMs = typeof ts === 'number' ? ts : new Date(ts).getTime();
      if (!isNaN(timeMs) && timeMs > 0) {
        const diffSec = Math.max(1, Math.floor((Date.now() - timeMs) / 1000));
        if (diffSec < 60) return `${diffSec}s ago`;
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
      }
    }
    const staggeredMinutes = [4, 18, 42, 75, 130, 210, 320];
    const mins = staggeredMinutes[fallbackIndex % staggeredMinutes.length];
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  // Merge real orders, job cards, QC inspections, PDI clearances & dispatches into an order lifecycle feed
  const historyItems = useMemo(() => {
    type Stage = 'PO MADE' | 'JOB CARD' | 'QC' | 'PDI' | 'DISPATCH';
    type Category = 'PO_MADE' | 'JOB_CARD' | 'QC' | 'PDI' | 'DISPATCH';

    const list: Array<{
      id: string;
      title: string;
      sub: string;
      stage: Stage;
      category: Category;
      timeAgo: string;
      dotColor: string;
      badgeColor: string;
      targetView: 'orders' | 'production' | 'qc' | 'pdi' | 'dispatch';
      orderId?: string;
    }> = [];

    // 1. PO Made (from Orders)
    orders.slice(0, 4).forEach((o, i) => {
      const isHold = (o.status || '').includes('HOLD') || (o.status || '').includes('SHORT');
      const isClosed = (o.status || '').includes('CLOSED') || (o.status || '').includes('PAID');
      list.push({
        id: `po-${o.id || o.poNo || i}`,
        title: `PO Made · ${o.poNo}`,
        sub: `${o.customerName || 'Customer'} · ${o.status || 'Active'}`,
        stage: 'PO MADE',
        category: 'PO_MADE',
        timeAgo: formatTimeAgo(o.createdAt || o.deliveryDate, i * 2),
        dotColor: isHold ? 'bg-[#F43F5E]' : isClosed ? 'bg-[#10B981]' : 'bg-[#0284C7]',
        badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
        targetView: 'orders',
        orderId: o.id || o.poNo
      });
    });

    // 2. Job Cards (from Production Job Cards)
    jobCards.slice(0, 4).forEach((j, i) => {
      const hasNcr = j.hasOpenNcr || (j.status || '').includes('QC_HOLD');
      const isDone = (j.status || j.jobStatus || '').includes('COMPLETED');
      list.push({
        id: `jc-${j.id || j.jobNo || i}`,
        title: `Job Card · ${j.jobNo}`,
        sub: `${j.partCode || 'Part'} (${j.currentOperation || 'Machining'}) · PO: ${j.orderPo}`,
        stage: 'JOB CARD',
        category: 'JOB_CARD',
        timeAgo: formatTimeAgo(j.targetDate, i * 2 + 1),
        dotColor: hasNcr ? 'bg-[#F43F5E]' : isDone ? 'bg-[#10B981]' : 'bg-[#F59E0B]',
        badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
        targetView: 'production',
        orderId: j.orderId || j.orderPo
      });
    });

    // 3. QC Inspections (from Quality Control)
    qcItems.slice(0, 4).forEach((q, i) => {
      const isPass = q.qcStatus === 'PASS';
      const isHold = q.qcStatus === 'QC_HOLD' || q.qcStatus === 'REJECTED';
      list.push({
        id: `qc-${q.id || q.jobNo || i}`,
        title: `QC Inspection · ${q.jobNo || q.orderPo}`,
        sub: `${isPass ? 'Quality Passed' : isHold ? 'Hold / Defect Noted' : 'In-line Inspection'} · ${q.partCode || ''}`,
        stage: 'QC',
        category: 'QC',
        timeAgo: formatTimeAgo(q.inspectedAt, i * 2 + 3),
        dotColor: isHold ? 'bg-[#F43F5E]' : isPass ? 'bg-[#10B981]' : 'bg-[#0D9488]',
        badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        targetView: 'qc',
        orderId: q.orderPo
      });
    });

    // 4. PDI Clearance (from Pre-Delivery Inspection)
    pdiQueue.slice(0, 3).forEach((p, i) => {
      const isPass = p.pdiStatus === 'PASS';
      list.push({
        id: `pdi-${p.id || p.jobNo || i}`,
        title: `PDI Clearance · ${p.jobNo || p.orderPo || 'PDI'}`,
        sub: `${isPass ? 'Pre-Delivery Clearance Approved' : 'Staging Inspection'} · ${p.partCode || 'Finished Part'}`,
        stage: 'PDI',
        category: 'PDI',
        timeAgo: formatTimeAgo(p.reportDate, i * 2 + 2),
        dotColor: isPass ? 'bg-[#10B981]' : 'bg-[#8B5CF6]',
        badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
        targetView: 'pdi',
        orderId: p.orderPo
      });
    });

    // 5. Dispatches (from Dispatch Challans)
    dispatches.slice(0, 3).forEach((d, i) => {
      list.push({
        id: `dc-${d.id || d.challanNo || i}`,
        title: `Dispatch · ${d.challanNo}`,
        sub: `${d.status || 'Dispatched'} · ${d.transporter || 'Direct Delivery'} · PO: ${d.orderPo}`,
        stage: 'DISPATCH',
        category: 'DISPATCH',
        timeAgo: formatTimeAgo(d.date || d.createdAt, i * 2 + 4),
        dotColor: 'bg-[#10B981]',
        badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
        targetView: 'dispatch',
        orderId: d.orderId || d.orderPo
      });
    });

    // 6. Sanitized Operational Audit Logs (Strictly filter out login/logout/session/auth)
    auditLogs.forEach((a, i) => {
      const logText = `${a.action || ''} ${a.details || ''} ${a.entity || ''} ${a.user || ''}`.toLowerCase();
      // Drop any authentication / login / logout / session logs
      if (/login|logout|auth|session|sign in|sign out|password|token|switch user|user role/i.test(logText)) {
        return;
      }
      // Only keep operational stage updates
      const isQc = logText.includes('qc') || logText.includes('inspect') || logText.includes('ncr');
      const isDispatch = logText.includes('dispatch') || logText.includes('challan') || logText.includes('gate');
      const isJobCard = logText.includes('job') || logText.includes('machin') || logText.includes('route');
      const isOrder = logText.includes('po') || logText.includes('order');

      if (!isQc && !isDispatch && !isJobCard && !isOrder) return;

      const stage: Stage = isDispatch ? 'DISPATCH' : isQc ? 'QC' : isJobCard ? 'JOB CARD' : 'PO MADE';
      const category: Category = isDispatch ? 'DISPATCH' : isQc ? 'QC' : isJobCard ? 'JOB_CARD' : 'PO_MADE';

      list.push({
        id: `aud-${a.id || i}`,
        title: `${stage} · ${a.user || 'Production Team'}`,
        sub: a.details || `${a.action} on ${a.entity}`,
        stage,
        category,
        timeAgo: a.when || formatTimeAgo(undefined, i + 5),
        dotColor: logText.includes('reject') || logText.includes('hold') ? 'bg-[#F43F5E]' : 'bg-[#10B981]',
        badgeColor: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
        targetView: isDispatch ? 'dispatch' : isQc ? 'qc' : isJobCard ? 'production' : 'orders'
      });
    });

    // Fallback real-world operational milestones if mock data is small
    if (list.length < 5) {
      list.push(
        { id: 'f-1', title: 'PO Made · PO-2026-418', sub: 'Jakob Precision · 500 units confirmed', stage: 'PO MADE', category: 'PO_MADE', timeAgo: '12m ago', dotColor: 'bg-[#0284C7]', badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20', targetView: 'orders' },
        { id: 'f-2', title: 'Job Card · JC-0082', sub: 'Shaft CNC Turning · Operation 02 Started', stage: 'JOB CARD', category: 'JOB_CARD', timeAgo: '28m ago', dotColor: 'bg-[#F59E0B]', badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', targetView: 'production' },
        { id: 'f-3', title: 'QC Inspection · JC-0004', sub: 'CMM Dimensional Inspection Passed (0 NCR)', stage: 'QC', category: 'QC', timeAgo: '52m ago', dotColor: 'bg-[#10B981]', badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', targetView: 'qc' },
        { id: 'f-4', title: 'PDI Clearance · PDI-1049', sub: 'Final packaging & rust-preventive coat cleared', stage: 'PDI', category: 'PDI', timeAgo: '1h 15m ago', dotColor: 'bg-[#8B5CF6]', badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20', targetView: 'pdi' },
        { id: 'f-5', title: 'Dispatch · DC-2026-092', sub: 'Gate pass generated for Tata Motors consignment', stage: 'DISPATCH', category: 'DISPATCH', timeAgo: '2h ago', dotColor: 'bg-[#10B981]', badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20', targetView: 'dispatch' }
      );
    }

    if (filter === 'ALL') return list.slice(0, 6);
    return list.filter(item => item.category === filter).slice(0, 6);
  }, [orders, jobCards, qcItems, pdiQueue, dispatches, auditLogs, filter]);

  return (
    <div className={`rounded-3xl border p-5 sm:p-6 transition-all ${cardSurface}`}>
      {/* Header with Realtime live indicator & Stage filter */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </div>
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Order Flow
          </h3>
          <span className="hidden sm:inline-flex rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            Realtime
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">Stage :</span>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none transition-all ${
              isDarkMode
                ? 'border-white/10 bg-black/40 text-slate-200'
                : 'border-slate-200/90 bg-slate-100/90 text-slate-800 shadow-2xs'
            }`}
          >
            <option value="ALL">All Stages</option>
            <option value="PO_MADE">PO Made</option>
            <option value="JOB_CARD">Job Cards</option>
            <option value="QC">QC</option>
            <option value="PDI">PDI</option>
            <option value="DISPATCH">Dispatch</option>
          </select>
        </div>
      </div>

      {/* History Items matching reference layout with stage badges & colored bullet points */}
      <div className="mt-3.5 space-y-1.5">
        {historyItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No events recorded in this stage yet.
          </div>
        ) : (
          historyItems.map(item => (
            <div
              key={item.id}
              onClick={() => {
                if (item.orderId && onSelectOrder) {
                  onSelectOrder(item.orderId);
                } else if (onNavigate) {
                  onNavigate(item.targetView);
                }
              }}
              className="group flex items-center justify-between gap-3 text-xs p-2 rounded-xl border border-transparent hover:border-slate-200/80 hover:bg-slate-50/90 dark:hover:border-white/10 dark:hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${item.dotColor} shadow-xs`} />
                <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${item.badgeColor}`}>
                  {item.stage}
                </span>
                <div className="truncate">
                  <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                    {item.title}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.sub}
                  </span>
                </div>
              </div>

              <span className="shrink-0 font-medium text-[11px] text-slate-400 dark:text-slate-400 tabular-nums">
                {item.timeAgo}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   5. GateConsolidationCard (Bottom-Right: Overlapping Bubble Circles like Image)
   "implement Qc pass, PDI pass and challans passed/made like the radial chart in image"
───────────────────────────────────────────────────────────────────────────── */
export interface GateConsolidationCardProps {
  qcPassRate?: number | string;
  pdiPassRate?: number | string;
  challanRate?: number | string;
  qcPassCount?: number;
  pdiPassCount?: number;
  challanCount?: number;
  onNavigate?: (view: any) => void;
  isDarkMode?: boolean;
}

export const GateConsolidationCard: React.FC<GateConsolidationCardProps> = ({
  qcPassRate = '70%',
  pdiPassRate = '15%',
  challanRate = '15%',
  qcPassCount = 140,
  pdiPassCount = 220,
  challanCount = 387,
  onNavigate,
  isDarkMode = false
}) => {
  const [viewStyle, setViewStyle] = useState<'rings' | 'bubbles'>('rings');
  const [hoveredRing, setHoveredRing] = useState<'qc' | 'pdi' | 'dispatch' | null>(null);

  // Normalize percentages (0 to 1) for SVG circle circumference
  const qcPct = Math.min(1, Math.max(0, parseFloat(String(qcPassRate)) / 100)) || 0.70;
  const pdiPct = Math.min(1, Math.max(0, parseFloat(String(pdiPassRate)) / 100)) || 0.15;
  const challanPct = Math.min(1, Math.max(0, parseFloat(String(challanRate)) / 100)) || 0.15;

  // Ring geometry: center at (130, 85)
  const cx = 130;
  const cy = 85;

  // Ring 1 (Outer: QC First-Pass Yield)
  const r1 = 60;
  const c1 = 2 * Math.PI * r1;
  const offset1 = c1 * (1 - qcPct);

  // Ring 2 (Middle: PDI Clearance)
  const r2 = 45;
  const c2 = 2 * Math.PI * r2;
  const offset2 = c2 * (1 - pdiPct);

  // Ring 3 (Inner: Dispatch Challans)
  const r3 = 30;
  const c3 = 2 * Math.PI * r3;
  const offset3 = c3 * (1 - challanPct);

  const cardSurface = isDarkMode
    ? 'bg-[#18181B]/95 border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.5)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border-slate-200/90 shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  return (
    <div className={`rounded-3xl border p-5 sm:p-6 transition-all ${cardSurface}`}>
      {/* ── CARD HEADER (APPLE SEGMENTED CONTROLS) ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-white/10">
        <div>
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Consolidation
          </h3>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
            Fulfillment Gateways
          </p>
        </div>

        <div className={`flex items-center rounded-full border p-0.5 ${
          isDarkMode ? 'border-white/10 bg-black/50' : 'border-slate-200/90 bg-slate-100/90 shadow-2xs'
        }`}>
          <button
            type="button"
            onClick={() => setViewStyle('rings')}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
              viewStyle === 'rings'
                ? 'bg-[#0F766E] text-white shadow-xs dark:bg-[#2DD4BF] dark:text-slate-950'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Rings
          </button>
          <button
            type="button"
            onClick={() => setViewStyle('bubbles')}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
              viewStyle === 'bubbles'
                ? 'bg-[#0F766E] text-white shadow-xs dark:bg-[#2DD4BF] dark:text-slate-950'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Spheres
          </button>
        </div>
      </div>

      {/* ── APPLE SVG GRAPHIC: ACTIVITY RINGS OR VISIONOS GLASS SPHERES ── */}
      <div className="relative flex items-center justify-center py-3">
        <svg className="w-full max-w-[280px] h-44 overflow-visible" viewBox="0 0 260 170">
          <defs>
            {/* Apple Activity Rings Gradients */}
            <linearGradient id="apple-ring-teal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#2DD4BF' : '#14B8A6'} />
              <stop offset="100%" stopColor={isDarkMode ? '#0F766E' : '#0D9488'} />
            </linearGradient>

            <linearGradient id="apple-ring-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            <linearGradient id="apple-ring-rose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDA4AF" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>

            {/* Apple VisionOS 3D Frosted Glass Radial Gradients */}
            <radialGradient id="apple-glass-teal-3d" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={isDarkMode ? '#2DD4BF' : '#2DD4BF'} stopOpacity="0.95" />
              <stop offset="60%" stopColor={isDarkMode ? '#0F766E' : '#0F766E'} stopOpacity="0.95" />
              <stop offset="100%" stopColor={isDarkMode ? '#042F2E' : '#115E59'} stopOpacity="1" />
            </radialGradient>

            <radialGradient id="apple-glass-amber-3d" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#B45309" stopOpacity="1" />
            </radialGradient>

            <radialGradient id="apple-glass-rose-3d" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FECDD3" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#FB7185" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#BE123C" stopOpacity="1" />
            </radialGradient>

            {/* VisionOS Specular Rim Light */}
            <linearGradient id="apple-specular-rim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
            </linearGradient>

            {/* Soft Ambient Depth Filter */}
            <filter id="apple-depth-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor={isDarkMode ? '#000000' : '#0f172a'} floodOpacity={isDarkMode ? '0.6' : '0.12'} />
            </filter>
          </defs>

          {/* ═══════════ OPTION A: APPLE ACTIVITY RINGS ═══════════ */}
          {viewStyle === 'rings' && (
            <g>
              {/* Outer Ring 1: QC First-Pass Yield */}
              <g
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: hoveredRing && hoveredRing !== 'qc' ? 0.35 : 1 }}
                onMouseEnter={() => setHoveredRing('qc')}
                onMouseLeave={() => setHoveredRing(null)}
                onClick={() => onNavigate?.('qc')}
              >
                {/* Track */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r1}
                  fill="none"
                  stroke={isDarkMode ? 'rgba(45, 212, 191, 0.15)' : 'rgba(15, 118, 110, 0.12)'}
                  strokeWidth="9"
                />
                {/* Active Arc */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r1}
                  fill="none"
                  stroke="url(#apple-ring-teal)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={c1}
                  strokeDashoffset={offset1}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  className="transition-all duration-700 ease-out"
                />
              </g>

              {/* Middle Ring 2: PDI Clearance */}
              <g
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: hoveredRing && hoveredRing !== 'pdi' ? 0.35 : 1 }}
                onMouseEnter={() => setHoveredRing('pdi')}
                onMouseLeave={() => setHoveredRing(null)}
                onClick={() => onNavigate?.('pdi')}
              >
                {/* Track */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r2}
                  fill="none"
                  stroke={isDarkMode ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.14)'}
                  strokeWidth="9"
                />
                {/* Active Arc */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r2}
                  fill="none"
                  stroke="url(#apple-ring-amber)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={c2}
                  strokeDashoffset={offset2}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  className="transition-all duration-700 ease-out"
                />
              </g>

              {/* Inner Ring 3: Dispatch Challans */}
              <g
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: hoveredRing && hoveredRing !== 'dispatch' ? 0.35 : 1 }}
                onMouseEnter={() => setHoveredRing('dispatch')}
                onMouseLeave={() => setHoveredRing(null)}
                onClick={() => onNavigate?.('dispatch')}
              >
                {/* Track */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r3}
                  fill="none"
                  stroke={isDarkMode ? 'rgba(251, 113, 133, 0.18)' : 'rgba(244, 63, 94, 0.14)'}
                  strokeWidth="9"
                />
                {/* Active Arc */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r3}
                  fill="none"
                  stroke="url(#apple-ring-rose)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={c3}
                  strokeDashoffset={offset3}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  className="transition-all duration-700 ease-out"
                />
              </g>

              {/* Center Core Badge */}
              <g className="select-none pointer-events-none">
                <circle
                  cx={cx}
                  cy={cy}
                  r="21"
                  fill={isDarkMode ? 'rgba(24, 24, 27, 0.92)' : '#ffffff'}
                  stroke={isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(226, 232, 240, 0.9)'}
                  strokeWidth="1.5"
                  className="shadow-xs"
                />
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  className="text-xs font-extrabold tracking-tight font-sans fill-slate-900 dark:fill-white"
                >
                  {typeof qcPassRate === 'number' ? `${qcPassRate}%` : qcPassRate}
                </text>
              </g>
            </g>
          )}

          {/* ═══════════ OPTION B: APPLE VISIONOS 3D GLASS SPHERES ═══════════ */}
          {viewStyle === 'bubbles' && (
            <g filter="url(#apple-depth-shadow)">
              {/* Left Amber Glass Sphere: PDI Clearance */}
              <g
                className="cursor-pointer transition-transform duration-300 hover:scale-105 origin-center"
                onClick={() => onNavigate?.('pdi')}
              >
                <circle
                  cx="76"
                  cy="62"
                  r="34"
                  fill="url(#apple-glass-amber-3d)"
                  stroke="url(#apple-specular-rim)"
                  strokeWidth="1.5"
                />
                {/* Specular Glint */}
                <ellipse cx="68" cy="46" rx="14" ry="6" fill="#ffffff" fillOpacity="0.45" />
                <text
                  x="76"
                  y="65"
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-xs font-bold font-sans select-none tracking-tight drop-shadow-xs"
                >
                  {typeof pdiPassRate === 'number' ? `${pdiPassRate}%` : pdiPassRate}
                </text>
                <text
                  x="76"
                  y="77"
                  textAnchor="middle"
                  fill="#ffffff"
                  fillOpacity="0.8"
                  className="text-[8px] font-semibold uppercase tracking-wider font-sans select-none"
                >
                  PDI
                </text>
              </g>

              {/* Center Teal Large Glass Sphere: QC First-Pass Yield */}
              <g
                className="cursor-pointer transition-transform duration-300 hover:scale-105 origin-center"
                onClick={() => onNavigate?.('qc')}
              >
                <circle
                  cx="138"
                  cy="92"
                  r="48"
                  fill="url(#apple-glass-teal-3d)"
                  stroke="url(#apple-specular-rim)"
                  strokeWidth="1.5"
                />
                {/* Specular Glint */}
                <ellipse cx="126" cy="68" rx="20" ry="9" fill="#ffffff" fillOpacity="0.4" />
                <text
                  x="138"
                  y="96"
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-xl font-black font-sans select-none tracking-tight drop-shadow-xs"
                >
                  {typeof qcPassRate === 'number' ? `${qcPassRate}%` : qcPassRate}
                </text>
                <text
                  x="138"
                  y="110"
                  textAnchor="middle"
                  fill="#ffffff"
                  fillOpacity="0.85"
                  className="text-[9px] font-bold uppercase tracking-widest font-sans select-none"
                >
                  QC Yield
                </text>
              </g>

              {/* Right Coral / Rose Glass Sphere: Dispatch Challans */}
              <g
                className="cursor-pointer transition-transform duration-300 hover:scale-105 origin-center"
                onClick={() => onNavigate?.('dispatch')}
              >
                <circle
                  cx="196"
                  cy="82"
                  r="38"
                  fill="url(#apple-glass-rose-3d)"
                  stroke="url(#apple-specular-rim)"
                  strokeWidth="1.5"
                />
                {/* Specular Glint */}
                <ellipse cx="188" cy="64" rx="15" ry="7" fill="#ffffff" fillOpacity="0.4" />
                <text
                  x="196"
                  y="86"
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-xs font-bold font-sans select-none tracking-tight drop-shadow-xs"
                >
                  {typeof challanRate === 'number' ? `${challanRate}%` : challanRate}
                </text>
                <text
                  x="196"
                  y="98"
                  textAnchor="middle"
                  fill="#ffffff"
                  fillOpacity="0.8"
                  className="text-[8px] font-semibold uppercase tracking-wider font-sans select-none"
                >
                  Challans
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* ── BOTTOM 3 APPLE METRIC TILES ── */}
      <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-200/70 dark:border-white/10 text-center">
        {/* QC Passed Tile */}
        <button
          type="button"
          onClick={() => onNavigate?.('qc')}
          onMouseEnter={() => setHoveredRing('qc')}
          onMouseLeave={() => setHoveredRing(null)}
          className={`rounded-2xl p-2.5 border transition-all cursor-pointer ${
            hoveredRing === 'qc'
              ? isDarkMode ? 'border-teal-500/40 bg-teal-500/10 scale-[1.02]' : 'border-teal-500/40 bg-teal-50/70 scale-[1.02]'
              : isDarkMode
                ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20'
                : 'border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_0_#ffffff,0_1px_2px_rgba(15,23,42,0.03)] hover:bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="h-2 w-2 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF] shadow-xs" />
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              QC Passed
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {qcPassCount}
          </div>
          <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
            {qcPassRate}
          </div>
        </button>

        {/* PDI Pass Tile */}
        <button
          type="button"
          onClick={() => onNavigate?.('pdi')}
          onMouseEnter={() => setHoveredRing('pdi')}
          onMouseLeave={() => setHoveredRing(null)}
          className={`rounded-2xl p-2.5 border transition-all cursor-pointer ${
            hoveredRing === 'pdi'
              ? isDarkMode ? 'border-amber-500/40 bg-amber-500/10 scale-[1.02]' : 'border-amber-500/40 bg-amber-50/70 scale-[1.02]'
              : isDarkMode
                ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20'
                : 'border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_0_#ffffff,0_1px_2px_rgba(15,23,42,0.03)] hover:bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="h-2 w-2 rounded-full bg-[#F59E0B] dark:bg-[#FBBF24] shadow-xs" />
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              PDI Pass
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {pdiPassCount}
          </div>
          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
            {pdiPassRate}
          </div>
        </button>

        {/* Challans Made Tile */}
        <button
          type="button"
          onClick={() => onNavigate?.('dispatch')}
          onMouseEnter={() => setHoveredRing('dispatch')}
          onMouseLeave={() => setHoveredRing(null)}
          className={`rounded-2xl p-2.5 border transition-all cursor-pointer ${
            hoveredRing === 'dispatch'
              ? isDarkMode ? 'border-rose-500/40 bg-rose-500/10 scale-[1.02]' : 'border-rose-500/40 bg-rose-50/70 scale-[1.02]'
              : isDarkMode
                ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20'
                : 'border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_0_#ffffff,0_1px_2px_rgba(15,23,42,0.03)] hover:bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="h-2 w-2 rounded-full bg-[#FB7185] dark:bg-[#F43F5E] shadow-xs" />
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              Challans
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {challanCount}
          </div>
          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
            {challanRate}
          </div>
        </button>
      </div>
    </div>
  );
};
