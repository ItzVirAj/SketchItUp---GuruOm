import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  ShieldCheck,
  Package,
  Truck,
  DollarSign,
  Calendar,
  Download,
  Search,
  RefreshCw,
  ArrowUpRight,
  ExternalLink,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Gauge
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { ConsoleView } from '../../../types/console';
import { useAccentTheme } from '../../../context/AccentThemeContext';

interface MetricsViewProps {
  orders?: any[];
  stock?: any[];
  jobCards?: any[];
  qcItems?: any[];
  dispatches?: any[];
  invoices?: any[];
  payables?: any[];
  productionLogs?: any[];
  machines?: any[];
  isDarkMode?: boolean;
  onNavigate?: (view: ConsoleView) => void;
  onRefresh?: () => Promise<void> | void;
}

interface DailyTrend {
  date: string;
  revenue: number;
  openOrderCount: number;
  avgOrderValue: number;
  topCustomer: string;
  rejectionRate: number;
  activeJobCards: number;
  dispatchedQty: number;
  inventoryShortages: number;
  onTimeDeliveryRate: number;
}

const parseItemTimestamp = (item: any): number => {
  if (!item) return 0;
  const raw = item.createdAt || item.date || item.poDate || item.invoiceDate || item.inspectedAt || item.loggedTimestamp || item.timestamp || item.targetDate || item.id;
  if (!raw) return 0;
  if (typeof raw === 'number') return raw > 0 ? raw : 0;
  const str = String(raw).trim();
  if (/^\d{10,13}$/.test(str)) {
    const num = parseInt(str, 10);
    if (!isNaN(num) && num > 0) return num;
  }
  const idMatch = str.match(/(?:ord|inv|jc|dsp|qc)-(\d{10,13})/i);
  if (idMatch) {
    const num = parseInt(idMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const parsed = new Date(year, month, day).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

export const MetricsView: React.FC<MetricsViewProps> = ({
  orders = [],
  stock = [],
  jobCards = [],
  qcItems = [],
  dispatches = [],
  invoices = [],
  payables = [],
  productionLogs = [],
  machines = [],
  isDarkMode = true,
  onNavigate,
  onRefresh
}) => {
  const { accent, isGreen, isBlue, isCrystal } = useAccentTheme();
  const [days, setDays] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<'all' | 'FINANCIAL' | 'PRODUCTION' | 'QUALITY' | 'INVENTORY' | 'DISPATCH'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'quality' | 'velocity'>('revenue');
  const [historyData, setHistoryData] = useState<DailyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  // Compute live aggregates from client props
  const computedMetrics = useMemo(() => {
    // 1. Orders
    const openOrders = orders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED');
    const openOrderBookValue = openOrders.reduce((sum, o) => sum + (Number(o.grossAmount) || 0), 0);
    const avgOrderValue = orders.length > 0
      ? Math.round(orders.reduce((sum, o) => sum + (Number(o.grossAmount) || 0), 0) / orders.length)
      : 0;

    // 2. Production & Machines
    const activeJCs = jobCards.filter(j =>
      j.status === 'IN_PROGRESS' || j.status === 'IN_PRODUCTION' || j.status === 'RUNNING' || j.jobStatus === 'IN_PROGRESS'
    ).length;

    const assignedMachines = new Set(
      jobCards
        .filter(j => j.status === 'IN_PROGRESS' || j.status === 'IN_PRODUCTION' || j.status === 'RUNNING' || j.jobStatus === 'IN_PROGRESS')
        .map(j => j.machine)
        .filter(Boolean)
    );
    const totalMachinesCount = machines.filter(m => m.status !== 'Inactive').length || machines.length || (activeJCs > 0 ? activeJCs : 1);
    const activeMachinesCount = assignedMachines.size > 0 ? assignedMachines.size : (activeJCs > 0 ? Math.min(activeJCs, totalMachinesCount) : 0);
    const machineUtilization = totalMachinesCount > 0 ? Number(((activeMachinesCount / totalMachinesCount) * 100).toFixed(1)) : 0;

    // 3. Quality & Inspections
    const totalQc = qcItems.length;
    const passQc = qcItems.filter(q => q.qcStatus === 'PASS' || q.qcStatus === 'PASSED').length;
    const qcPassRate = totalQc > 0 ? Number(((passQc / totalQc) * 100).toFixed(1)) : (jobCards.length > 0 ? 100 : 0);
    const qcHoldCount = qcItems.filter(q => q.qcStatus === 'QC_HOLD' || q.qcStatus === 'REJECTED' || q.qcStatus === 'REWORK').length;
    const firstPassYield = qcPassRate;

    // 4. Inventory Shortages
    const shortagesCount = stock.filter(s => s.status === 'SHORTAGE' || s.status === 'CRITICAL' || (s.available != null && Number(s.available) < 0)).length;

    // 5. Invoices & Receivables
    const totalInvoicedValue = invoices.reduce((sum, i) => sum + (Number(i.totalAmount || i.amount) || 0), 0);
    const overdueReceivables = invoices.filter(i => i.status === 'OVERDUE').reduce((acc, i) => acc + (Number(i.balanceAmount ?? i.totalAmount ?? i.amount) || 0), 0);
    const monthlyRevenueRunrate = totalInvoicedValue > 0 ? totalInvoicedValue : openOrderBookValue;

    // 6. Dispatches & OTIF
    const pendingDispatches = dispatches.filter(d => d.status === 'PENDING' || d.status === 'IN_TRANSIT' || d.status === 'DISPATCH_READY').length;
    const evaluatedDispatches = dispatches.filter(d => d.status === 'DELIVERED' || d.status === 'DISPATCHED');
    let onTimeCount = 0;
    evaluatedDispatches.forEach(d => {
      const linkedOrder = orders.find(o => o.poNo === d.orderPo);
      if (!linkedOrder || !linkedOrder.deliveryDate) {
        onTimeCount++;
      } else {
        const dTime = parseItemTimestamp(d);
        const promisedTime = new Date(linkedOrder.deliveryDate).getTime();
        if (dTime <= promisedTime) {
          onTimeCount++;
        }
      }
    });
    const otifRate = evaluatedDispatches.length > 0
      ? Number(((onTimeCount / evaluatedDispatches.length) * 100).toFixed(1))
      : (orders.length > 0 ? 100 : 0);

    return {
      openOrderBookValue,
      avgOrderValue,
      openOrdersCount: openOrders.length,
      activeJCs,
      activeMachinesCount,
      totalMachinesCount,
      machineUtilization,
      totalQc,
      passQc,
      qcPassRate,
      qcHoldCount,
      firstPassYield,
      shortagesCount,
      overdueReceivables,
      pendingDispatches,
      monthlyRevenueRunrate,
      otifRate
    };
  }, [orders, stock, jobCards, qcItems, dispatches, invoices, machines]);

  // Compute live trends data strictly from overall website data
  const fetchMetricsData = async (selectedDays: number) => {
    setIsLoading(true);
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (err) {
        console.warn('onRefresh error:', err);
      }
    }

    const trends: DailyTrend[] = [];
    const now = new Date();
    const msPerDay = 86400000;
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - selectedDays + 1).getTime();

    for (let i = 0; i < selectedDays; i++) {
      const dayStart = startTime + i * msPerDay;
      const dayEnd = dayStart + msPerDay;
      const dateObj = new Date(dayStart);
      const label = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      // Invoices or orders recorded on this exact day
      const dayInvoices = invoices.filter(inv => {
        const t = parseItemTimestamp(inv);
        return t >= dayStart && t < dayEnd;
      });
      const dayOrders = orders.filter(o => {
        const t = parseItemTimestamp(o);
        return t >= dayStart && t < dayEnd;
      });

      const dayRevenue = dayInvoices.length > 0
        ? dayInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount || inv.amount) || 0), 0)
        : dayOrders.reduce((sum, o) => sum + (Number(o.grossAmount) || 0), 0);

      // Orders active up to this day
      const ordersUpToDay = orders.filter(o => {
        const t = parseItemTimestamp(o);
        return (t === 0 || t <= dayEnd) && o.status !== 'CANCELLED';
      });
      const openOrderCount = ordersUpToDay.filter(o => o.status !== 'CLOSED').length;
      const avgOrderVal = ordersUpToDay.length > 0
        ? Math.round(ordersUpToDay.reduce((sum, o) => sum + (Number(o.grossAmount) || 0), 0) / ordersUpToDay.length)
        : 0;

      // Real top customer from actual orders up to this day
      const customerTotals: Record<string, number> = {};
      ordersUpToDay.forEach(o => {
        if (o.customerName) {
          customerTotals[o.customerName] = (customerTotals[o.customerName] || 0) + (Number(o.grossAmount) || 0);
        }
      });
      const topCustomer = Object.entries(customerTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      // Real QC rejection rate on or up to this day
      const qcUpToDay = qcItems.filter(q => {
        const t = parseItemTimestamp(q);
        return t === 0 || t <= dayEnd;
      });
      const rejectedCount = qcUpToDay.filter(q => q.qcStatus === 'REJECTED' || q.qcStatus === 'QC_HOLD').length;
      const rejectionRate = qcUpToDay.length > 0
        ? Number(((rejectedCount / qcUpToDay.length) * 100).toFixed(1))
        : 0;

      // Real active job cards on this day
      const activeJCs = jobCards.filter(j => {
        const t = parseItemTimestamp(j);
        return (t === 0 || t <= dayEnd) && (j.status === 'IN_PROGRESS' || j.status === 'IN_PRODUCTION' || j.status === 'SCHEDULED' || j.jobStatus === 'IN_PROGRESS');
      }).length;

      // Real dispatched qty on this day
      const dayDispatches = dispatches.filter(d => {
        const t = parseItemTimestamp(d);
        return t >= dayStart && t < dayEnd;
      });
      const dispatchedQty = dayDispatches.reduce((sum, d) => {
        const lineQty = d.lines?.reduce((s: number, l: any) => s + (Number(l.qty) || 0), 0) || 0;
        return sum + (lineQty || 1);
      }, 0);

      trends.push({
        date: label,
        revenue: dayRevenue,
        openOrderCount,
        avgOrderValue: avgOrderVal,
        topCustomer,
        rejectionRate,
        activeJobCards: activeJCs,
        dispatchedQty,
        inventoryShortages: computedMetrics.shortagesCount,
        onTimeDeliveryRate: computedMetrics.otifRate
      });
    }

    setHistoryData(trends);
    setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMetricsData(days);
  }, [days, computedMetrics]);

  const fmtCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  // Standard Metric Definitions Registry
  const metricsRegistry = useMemo(() => [
    {
      code: 'MTR-FIN-01',
      name: 'Open Order Book Value',
      category: 'FINANCIAL' as const,
      valueStr: fmtCurrency(computedMetrics.openOrderBookValue),
      targetStr: '₹3,000,000+',
      trend: computedMetrics.openOrderBookValue > 0 ? 'UP' as const : 'STABLE' as const,
      trendPct: `${computedMetrics.openOrdersCount} Active POs`,
      status: computedMetrics.openOrderBookValue > 0 ? 'HEALTHY' as const : 'OPTIMAL' as const,
      description: 'Cumulative monetary valuation of active confirmed customer POs in factory pipeline.',
      viewKey: 'orders' as ConsoleView
    },
    {
      code: 'MTR-FIN-02',
      name: 'Estimated Monthly Run-Rate',
      category: 'FINANCIAL' as const,
      valueStr: fmtCurrency(computedMetrics.monthlyRevenueRunrate),
      targetStr: '₹2,000,000+',
      trend: computedMetrics.monthlyRevenueRunrate > 0 ? 'UP' as const : 'STABLE' as const,
      trendPct: `${invoices.length} Invoices Issued`,
      status: computedMetrics.monthlyRevenueRunrate > 0 ? 'OPTIMAL' as const : 'ACTIVE' as const,
      description: 'Projected monthly billing based on confirmed order delivery schedules and invoiced amounts.',
      viewKey: 'invoices' as ConsoleView
    },
    {
      code: 'MTR-ORD-03',
      name: 'Active Customer POs',
      category: 'PRODUCTION' as const,
      valueStr: `${computedMetrics.openOrdersCount} Orders`,
      targetStr: '15-25 POs',
      trend: 'STABLE' as const,
      trendPct: `${orders.length} Total POs`,
      status: computedMetrics.openOrdersCount > 0 ? 'ACTIVE' as const : 'HEALTHY' as const,
      description: 'Total live purchase orders in machining and inspection cycles.',
      viewKey: 'orders' as ConsoleView
    },
    {
      code: 'MTR-PRD-04',
      name: 'Active Job Cards (Spindles)',
      category: 'PRODUCTION' as const,
      valueStr: `${computedMetrics.activeJCs} Active`,
      targetStr: '12-20 JCs',
      trend: computedMetrics.activeJCs > 0 ? 'UP' as const : 'STABLE' as const,
      trendPct: `${jobCards.length} Total JCs`,
      status: computedMetrics.activeJCs > 0 ? 'HEALTHY' as const : 'OPTIMAL' as const,
      description: 'Live CNC turning, VMC, and subcontracted route cards being processed.',
      viewKey: 'production' as ConsoleView
    },
    {
      code: 'MTR-PRD-05',
      name: 'Machine Utilization (OEE)',
      category: 'PRODUCTION' as const,
      valueStr: `${computedMetrics.machineUtilization}%`,
      targetStr: '≥ 85.0%',
      trend: computedMetrics.machineUtilization >= 80 ? 'UP' as const : 'STABLE' as const,
      trendPct: `${computedMetrics.activeMachinesCount}/${computedMetrics.totalMachinesCount} Machines Engaged`,
      status: computedMetrics.machineUtilization >= 85 ? 'OPTIMAL' as const : computedMetrics.machineUtilization >= 50 ? 'HEALTHY' as const : 'WARNING' as const,
      description: 'Operational spindle availability and runtime efficiency across shopfloor machines.',
      viewKey: 'production' as ConsoleView
    },
    {
      code: 'MTR-QLT-06',
      name: 'First-Pass QC Pass Rate',
      category: 'QUALITY' as const,
      valueStr: `${computedMetrics.qcPassRate}%`,
      targetStr: '≥ 98.0%',
      trend: computedMetrics.qcPassRate >= 95 ? 'UP' as const : 'DOWN' as const,
      trendPct: `${computedMetrics.passQc}/${computedMetrics.totalQc || 1} Passed Lots`,
      status: computedMetrics.qcPassRate >= 98 ? 'OPTIMAL' as const : computedMetrics.qcPassRate >= 90 ? 'HEALTHY' as const : 'WARNING' as const,
      description: 'Percentage of manufactured parts passing stage inspection on the first iteration.',
      viewKey: 'qc' as ConsoleView
    },
    {
      code: 'MTR-QLT-07',
      name: 'QC & NCR Quarantine Hold',
      category: 'QUALITY' as const,
      valueStr: `${computedMetrics.qcHoldCount} Lots`,
      targetStr: '0 Lots',
      trend: computedMetrics.qcHoldCount > 0 ? 'DOWN' as const : 'STABLE' as const,
      trendPct: computedMetrics.qcHoldCount > 0 ? 'Action Needed' : 'Cleared',
      status: computedMetrics.qcHoldCount > 0 ? 'WARNING' as const : 'OPTIMAL' as const,
      description: 'Job card batches flagged for dimensional deviations awaiting rework or waiver.',
      viewKey: 'pdi' as ConsoleView
    },
    {
      code: 'MTR-INV-08',
      name: 'Inventory Raw Material Shortages',
      category: 'INVENTORY' as const,
      valueStr: `${computedMetrics.shortagesCount} SKUs`,
      targetStr: '0 SKUs',
      trend: computedMetrics.shortagesCount > 0 ? 'UP' as const : 'STABLE' as const,
      trendPct: computedMetrics.shortagesCount > 0 ? 'Deficit' : 'Optimal',
      status: computedMetrics.shortagesCount > 0 ? 'CRITICAL' as const : 'OPTIMAL' as const,
      description: 'Critical bill of material items where available stock cannot fulfill release demand.',
      viewKey: 'inventory' as ConsoleView
    },
    {
      code: 'MTR-DSP-09',
      name: 'On-Time In-Full Delivery (OTIF)',
      category: 'DISPATCH' as const,
      valueStr: `${computedMetrics.otifRate}%`,
      targetStr: '≥ 95.0%',
      trend: computedMetrics.otifRate >= 90 ? 'UP' as const : 'STABLE' as const,
      trendPct: `${dispatches.length} Challans Evaluated`,
      status: computedMetrics.otifRate >= 95 ? 'OPTIMAL' as const : 'WARNING' as const,
      description: 'Orders dispatched on or prior to client committed delivery date.',
      viewKey: 'dispatch' as ConsoleView
    },
    {
      code: 'MTR-FIN-10',
      name: 'Overdue Receivables',
      category: 'FINANCIAL' as const,
      valueStr: fmtCurrency(computedMetrics.overdueReceivables),
      targetStr: '< ₹100,000',
      trend: computedMetrics.overdueReceivables > 0 ? 'UP' as const : 'STABLE' as const,
      trendPct: computedMetrics.overdueReceivables > 0 ? 'Overdue' : 'Healthy',
      status: computedMetrics.overdueReceivables > 0 ? 'WARNING' as const : 'OPTIMAL' as const,
      description: 'Invoices beyond client payment credit cycle awaiting settlement.',
      viewKey: 'invoices' as ConsoleView
    }
  ], [computedMetrics, invoices.length, orders.length, jobCards.length, dispatches.length]);

  const filteredRegistry = useMemo(() => {
    return metricsRegistry.filter(m => {
      const matchCat = activeTab === 'all' || m.category === activeTab;
      const matchQuery =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [metricsRegistry, activeTab, searchQuery]);

  const exportCSV = () => {
    const headers = ['Code', 'Name', 'Category', 'Current Value', 'Target', 'Status', 'Trend', 'Description'];
    const rows = filteredRegistry.map(m => [
      m.code,
      `"${m.name}"`,
      m.category,
      `"${m.valueStr}"`,
      `"${m.targetStr}"`,
      m.status,
      m.trendPct,
      `"${m.description}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `guruom_metrics_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'HEALTHY':
      case 'ACTIVE':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'FINANCIAL': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'PRODUCTION': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'QUALITY': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'INVENTORY': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'DISPATCH': return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 pb-12 font-sans">
      {/* Header Bar */}
      <section className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
        isDarkMode
          ? isCrystal
            ? 'border-white/10 bg-gradient-to-b from-[#181C24] via-[#10131A] to-[#0A0C10] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6)]'
            : isGreen
              ? 'border-emerald-500/20 bg-gradient-to-b from-[#0D241B] via-[#081711] to-[#030B07] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(16,185,129,0.12)]'
              : 'border-blue-500/20 bg-gradient-to-b from-[#0a1836] via-[#071126] to-[#030712] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(21,93,252,0.15)]'
          : isCrystal
            ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] text-slate-950 shadow-[0_16px_40px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.95)]'
            : isGreen
              ? 'border-emerald-600/30 bg-gradient-to-b from-[#0A7E58] via-[#086B4A] to-[#044F36] text-white shadow-[0_16px_40px_rgba(10,126,88,0.22)]'
              : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 py-6 sm:py-7">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                isDarkMode
                  ? 'bg-white/10 border border-white/15 text-white'
                  : isCrystal
                    ? 'bg-slate-900/[0.06] border border-slate-900/10 text-slate-800'
                    : 'bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs'
              }`}>
                <span className={`h-2 w-2 rounded-full animate-pulse ${
                  isCrystal && !isDarkMode ? 'bg-emerald-500' : isGreen ? 'bg-emerald-400' : 'bg-sky-400'
                }`} />
                <span>Operational Telemetry &amp; Performance</span>
              </span>
              <span className={`text-sm font-semibold ${isCrystal && !isDarkMode ? 'text-slate-400' : 'text-white/80'}`}>•</span>
              <span className={`text-xs sm:text-sm font-semibold ${isCrystal && !isDarkMode ? 'text-slate-600' : 'text-white/95'}`}>
                {days}D Rolling Window
              </span>
            </div>

            <h1 className={`text-3xl sm:text-[32px] font-black tracking-tight leading-tight ${
              isCrystal && !isDarkMode ? 'text-slate-950' : 'text-white'
            }`}>
              Metrics &amp; Executive Analytics
            </h1>

            <p className={`text-xs sm:text-sm font-medium leading-relaxed max-w-2xl ${
              isCrystal && !isDarkMode ? 'text-slate-600' : 'text-white/95'
            }`}>
              Real-time factory velocity, plant OEE, quality yields, and longitudinal business trends.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Timeframe Selector Pill Toggle */}
            <div className={`p-1 rounded-full border backdrop-blur-md flex items-center gap-1 ${
              !isDarkMode && isCrystal
                ? 'border-slate-300/80 bg-slate-200/50'
                : isDarkMode ? 'border-white/15 bg-white/[0.06]' : 'border-white/25 bg-white/20'
            }`}>
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    days === d
                      ? !isDarkMode && isCrystal
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'bg-white text-slate-900 shadow-sm'
                      : !isDarkMode && isCrystal
                        ? 'text-slate-600 hover:text-slate-900'
                        : isDarkMode ? 'text-white/70 hover:text-white' : 'text-white/90 hover:text-white'
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>

            {/* Refresh Action Button */}
            <button
              type="button"
              onClick={() => fetchMetricsData(days)}
              disabled={isLoading}
              title="Refresh Live Telemetry"
              className={`inline-flex h-11 items-center gap-2 rounded-full border text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm disabled:opacity-50 px-4 backdrop-blur-md ${
                !isDarkMode && isCrystal
                  ? 'border-slate-300/80 bg-white/80 hover:bg-white text-slate-700'
                  : 'border-white/20 bg-white/10 hover:bg-white/15 text-white'
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{lastRefreshed}</span>
            </button>

            {/* Export CSV CTA Button */}
            <button
              type="button"
              onClick={exportCSV}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-bold transition-all active:scale-[0.96] cursor-pointer shadow-lg bg-[#181920] hover:bg-[#252730] text-white border border-white/10"
            >
              <Download className="w-4 h-4 text-white" />
              <span className="text-white">Export CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* Top 4 KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Order Book Value */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Order Book Value</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {fmtCurrency(computedMetrics.openOrderBookValue)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{computedMetrics.openOrdersCount} active customer POs</span>
            </div>
          </div>
        </div>

        {/* Card 2: Plant Velocity (Active JCs & OEE) */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Shopfloor Spindles (OEE)</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Gauge className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {computedMetrics.machineUtilization}%
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Activity className="w-3.5 h-3.5" />
              <span>{computedMetrics.activeJCs} Active Job Cards running ({computedMetrics.activeMachinesCount}/{computedMetrics.totalMachinesCount} machines)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Quality First-Pass Yield */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Quality Pass Rate</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {computedMetrics.qcPassRate}%
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{computedMetrics.qcHoldCount === 0 ? '0 Inspection Holds' : `${computedMetrics.qcHoldCount} Lots in QA Hold`}</span>
            </div>
          </div>
        </div>

        {/* Card 4: OTIF Fulfillment */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">On-Time Delivery (OTIF)</span>
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {computedMetrics.otifRate}%
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-cyan-600 dark:text-cyan-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{computedMetrics.shortagesCount === 0 ? 'No material bottlenecks' : `${computedMetrics.shortagesCount} SKU shortages`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Section */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span>Historical Trend Analytics</span>
              <span className="text-xs font-normal text-slate-400">({days} Day Rolling Window)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live progression curves queried directly from overall factory operations data.
            </p>
          </div>

          <div className={`p-1 rounded-full border flex items-center gap-1 ${
            isDarkMode ? 'border-white/15 bg-white/[0.06]' : 'border-slate-300/80 bg-slate-200/50'
          }`}>
            {[
              { key: 'revenue', label: 'Revenue & Orders' },
              { key: 'quality', label: 'Quality & Rejection %' },
              { key: 'velocity', label: 'Dispatch & Output' },
            ].map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => setChartMetric(m.key as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  chartMetric === m.key
                    ? isDarkMode ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-950 text-white shadow-xs'
                    : isDarkMode ? 'text-white/70 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'revenue' ? (
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} opacity={0.6} />
                <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} />
                <YAxis
                  stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Daily Value']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            ) : chartMetric === 'quality' ? (
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRej" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} opacity={0.6} />
                <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} />
                <YAxis
                  stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val}%`, 'Rejection Rate']}
                />
                <Area type="monotone" dataKey="rejectionRate" stroke="#A855F7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRej)" />
              </AreaChart>
            ) : (
              <BarChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} opacity={0.6} />
                <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} />
                <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="dispatchedQty" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Units Dispatched" />
                <Bar dataKey="activeJobCards" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Active JCs" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics Registry Table Section */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'border-slate-200 bg-white shadow-xs'
      }`}>
        {/* Table Toolbar */}
        <div className={`p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-white'
        }`}>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Standardized Operational Metrics Catalog
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live indicators linked to respective operational modules and state machine gates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter Pills */}
            <div className={`p-1 rounded-full border flex items-center gap-1 ${
              isDarkMode ? 'border-white/15 bg-white/[0.06]' : 'border-slate-300/80 bg-slate-200/50'
            }`}>
              {(['all', 'FINANCIAL', 'PRODUCTION', 'QUALITY', 'INVENTORY', 'DISPATCH'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full capitalize transition-all cursor-pointer ${
                    activeTab === cat
                      ? isDarkMode ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-950 text-white shadow-xs'
                      : isDarkMode ? 'text-white/70 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat.toLowerCase()}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search metrics..."
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-full border outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-950/60 border-slate-800 text-white placeholder-slate-500 focus:border-slate-400'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400 shadow-sm'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
            }`}>
              <tr>
                <th className="py-3 px-4 font-semibold">Metric Code & Name</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Current Value</th>
                <th className="py-3 px-4 font-semibold">Benchmark Target</th>
                <th className="py-3 px-4 font-semibold">Trend</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredRegistry.map(m => (
                <tr
                  key={m.code}
                  className={`transition-colors ${
                    isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-blue-500 dark:text-blue-400">
                        {m.code}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {m.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 max-w-sm truncate">
                      {m.description}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getCategoryColor(m.category)}`}>
                      {m.category}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {m.valueStr}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {m.targetStr}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      {m.trend === 'UP' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      ) : m.trend === 'DOWN' ? (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      <span className={`text-[11px] font-medium ${
                        m.trend === 'UP' ? 'text-emerald-500' : m.trend === 'DOWN' ? 'text-rose-500' : 'text-blue-500'
                      }`}>
                        {m.trendPct}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(m.status)}`}>
                      {m.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate(m.viewKey)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                          isDarkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filteredRegistry.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No matching metrics found. Try adjusting your search or category filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MetricsView;
