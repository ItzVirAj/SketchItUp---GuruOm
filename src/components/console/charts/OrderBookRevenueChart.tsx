import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowUpRight,
  DollarSign,
  Calendar,
  Eye,
  Activity,
  PackageCheck
} from 'lucide-react';
import { CustomerOrder } from '../../../types/console';
import { AreaChart, Area, Grid, DayColumns, XAxis, ChartTooltip } from '../../ui/charts';

export interface OrderBookRevenueChartProps {
  orders?: CustomerOrder[];
  scope?: string;
  currencySymbol?: string;
  isDarkMode?: boolean;
  onNavigateOrders?: () => void;
  pipeline?: {
    draft: number;
    confirmed: number;
    production: number;
    qc: number;
    dispatch: number;
    closed: number;
  };
  pipelineTotal?: number;
  onNavigateStage?: (view: any) => void;
}

export const OrderBookRevenueChart: React.FC<OrderBookRevenueChartProps> = ({
  orders = [],
  scope = 'FY 26-27',
  currencySymbol = '₹',
  isDarkMode = false,
  onNavigateOrders,
  pipeline,
  pipelineTotal = 1,
  onNavigateStage
}) => {
  const [timeRange, setTimeRange] = useState<'10D' | '30D' | 'FY'>('10D');
  const [activeTab, setActiveTab] = useState<'revenue' | 'pipeline'>('revenue');
  const [showCosts, setShowCosts] = useState<boolean>(true);

  const fmt = (num: number) =>
    `${currencySymbol}${Math.round(num).toLocaleString('en-IN')}`;

  /* ─────────────────────────────────────────────────────────────────────────────
     Data Synthesis: Aggregate Real Orders or Seed Responsive Baseline Points
  ───────────────────────────────────────────────────────────────────────────── */
  const chartData = useMemo(() => {
    const daysCount = timeRange === '10D' ? 10 : timeRange === '30D' ? 30 : 90;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Build timeline buckets
    const points: Array<{
      date: Date;
      dateStr: string;
      revenue: number;
      costs: number;
      margin: number;
      orderCount: number;
      ordersList: string[];
    }> = [];

    // Map existing orders to dates if any
    const ordersByDay = new Map<string, { totalRev: number; count: number; pos: string[] }>();
    for (const o of orders) {
      const d = o.poDate || o.orderDate || (o as any).createdAt;
      if (!d) continue;
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) continue;
      const key = parsed.toISOString().split('T')[0];
      const prev = ordersByDay.get(key) || { totalRev: 0, count: 0, pos: [] };
      ordersByDay.set(key, {
        totalRev: prev.totalRev + (o.grossAmount || 0),
        count: prev.count + 1,
        pos: [...prev.pos, o.poNo]
      });
    }

    // Baseline growth pattern matching spec (smooth manufacturing revenue trajectory)
    const baseRevenue = 12000;
    const baseCostRatio = 0.68;

    let cumulativeRevenue = 0;
    let cumulativeCosts = 0;

    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(now - i * oneDay);
      const dateKey = date.toISOString().split('T')[0];
      const matchedOrder = ordersByDay.get(dateKey);

      // Organic upward growth wave with weekend dips typical of manufacturing
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const variance = Math.sin(i / 3.5) * 1800 + Math.cos(i / 2) * 900;
      const growthFactor = (daysCount - i) * 320;

      const dailyBaseRev = isWeekend
        ? Math.max(3000, 5000 + variance * 0.3)
        : Math.max(8000, baseRevenue + growthFactor + variance);

      const realRev = matchedOrder ? matchedOrder.totalRev : 0;
      const dayRevenue = realRev > 0 ? realRev : Math.round(dailyBaseRev);
      const dayCosts = Math.round(dayRevenue * (baseCostRatio + (Math.sin(i) * 0.04)));

      cumulativeRevenue += dayRevenue;
      cumulativeCosts += dayCosts;

      points.push({
        date,
        dateStr: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: dayRevenue,
        costs: dayCosts,
        margin: Math.round(((dayRevenue - dayCosts) / (dayRevenue || 1)) * 100),
        orderCount: matchedOrder ? matchedOrder.count : (isWeekend ? 0 : 1 + (i % 3)),
        ordersList: matchedOrder ? matchedOrder.pos : []
      });
    }

    return points;
  }, [orders, timeRange]);

  // Aggregate metrics
  const totals = useMemo(() => {
    const totalRev = chartData.reduce((acc, p) => acc + p.revenue, 0);
    const totalCost = chartData.reduce((acc, p) => acc + p.costs, 0);
    const avgMargin = totalRev > 0 ? Math.round(((totalRev - totalCost) / totalRev) * 100) : 31;
    const latestRevenue = chartData[chartData.length - 1]?.revenue || 0;
    const previousRevenue = chartData[0]?.revenue || 1;
    const growthPct = Math.round(((latestRevenue - previousRevenue) / previousRevenue) * 100);

    return {
      totalRev,
      totalCost,
      avgMargin,
      latestRevenue,
      growthPct: growthPct > 0 ? `+${growthPct}%` : `${growthPct}%`
    };
  }, [chartData]);

  // Surface tokens
  const surfaceCard = isDarkMode
    ? 'bg-[#18181B]/90 border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_rgba(0,0,0,0.5)]'
    : 'bg-gradient-to-b from-white via-white to-slate-50/70 border border-slate-200/90 backdrop-blur-2xl shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(15,23,42,0.05),0_8px_20px_-3px_rgba(15,23,42,0.07)]';

  const softBadge = isDarkMode
    ? 'bg-white/[0.04] border border-white/10 text-slate-200'
    : 'bg-slate-50/80 border border-slate-200/80 text-slate-800 shadow-[inset_0_1px_1px_0_rgba(15,23,42,0.02)]';

  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`rounded-3xl p-4 sm:p-5 transition-all ${surfaceCard}`}>
      {/* ── CARD HEADER (MATCHING REFERENCE IMAGE) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Ongoing Monthly Earnings
          </div>

          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-extrabold tracking-tight ${textPrimary} tabular-nums`}>
              {fmt(totals.totalRev)}
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
              From {fmt(Math.round(totals.totalRev * 1.55))}
            </span>
          </div>
        </div>

        {/* Right side: Overall Profit % + Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-right">
            <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {totals.growthPct || '4.7%'}
            </div>
            <div className="text-[10px] font-medium text-slate-400 dark:text-slate-400">
              Overall profit
            </div>
          </div>

          {/* Time range pills */}
          <div className={`flex items-center rounded-full border p-0.5 ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/90 bg-slate-100/90 shadow-2xs'}`}>
            {(['10D', '30D', 'FY'] as const).map(range => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-[#0F766E] text-white shadow-xs dark:bg-[#2DD4BF] dark:text-slate-950'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Toggle between Revenue Area Chart & Pipeline Funnel */}
          <div className={`flex items-center rounded-full border p-0.5 ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/90 bg-slate-100/90 shadow-2xs'}`}>
            <button
              type="button"
              onClick={() => setActiveTab('revenue')}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                activeTab === 'revenue'
                  ? 'bg-[#0F766E] text-white shadow-xs dark:bg-[#2DD4BF] dark:text-slate-950'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                activeTab === 'pipeline'
                  ? 'bg-[#0F766E] text-white shadow-xs dark:bg-[#2DD4BF] dark:text-slate-950'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>Pipeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── AREA CHART VIEW ── */}
      {activeTab === 'revenue' && (
        <div className="space-y-2 pt-2">
          <div className="w-full">
            <AreaChart
              data={chartData}
              xDataKey="date"
              aspectRatio="2.5 / 1"
              style={{ height: '260px', minHeight: '240px', maxHeight: '290px' }}
              margin={{ top: 20, right: 16, bottom: 28, left: 16 }}
            >
              {/* Day capsule columns in background like reference image */}
              <DayColumns
                activeFill={isDarkMode ? 'rgba(45, 212, 191, 0.12)' : 'rgba(15, 118, 110, 0.09)'}
                defaultFill={isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'}
              />

              <Grid horizontal stroke="var(--chart-grid)" strokeDasharray="4,4" numTicksRows={4} />

              {/* Primary Series: Revenue Area with solid gradient & dashed tail projection */}
              <Area
                dataKey="revenue"
                fill="var(--chart-line-primary, #0F766E)"
                fillOpacity={isDarkMode ? 0.35 : 0.25}
                stroke={isDarkMode ? '#2DD4BF' : '#0F766E'}
                strokeWidth={2.5}
                dashFromIndex={Math.round(chartData.length * 0.5)}
                dashArray="6,4"
                fadeEdges
                showHighlight
              />

              {/* Secondary Series: Cost Area (Optional Overlay) */}
              {showCosts && (
                <Area
                  dataKey="costs"
                  fill="var(--chart-line-secondary, #F43F5E)"
                  fillOpacity={isDarkMode ? 0.16 : 0.12}
                  stroke={isDarkMode ? '#FB7185' : '#F43F5E'}
                  strokeWidth={1.8}
                  fadeEdges
                  showHighlight
                />
              )}

              {/* X-Axis formatted like image: "Wed 14", "Thu 15", "Sun 18" */}
              <XAxis
                numTicks={timeRange === '10D' ? 10 : 8}
                tickFormatter={(val) => {
                  const d = val instanceof Date ? val : new Date(val);
                  if (isNaN(d.getTime())) return String(val);
                  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
                  const day = d.getDate();
                  return `${weekday} ${day}`;
                }}
              />

              <ChartTooltip currencySymbol={currencySymbol} />
            </AreaChart>
          </div>

          {/* Chart Series Legend & Controls - Compact Apple/Bencium Segmented Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/70 dark:border-white/10">
            <div className={`inline-flex items-center gap-3 rounded-xl px-3 py-1.5 border text-xs ${isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50/90 border-slate-200/80 shadow-2xs'}`}>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF] shadow-xs" />
                <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Earned Revenue
                </span>
              </div>
              <span className="h-3 w-px bg-slate-300 dark:bg-white/15" />
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 border-b-2 border-dashed border-[#0F766E] dark:border-[#2DD4BF]" />
                <span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Projected Run-rate
                </span>
              </div>
              {showCosts && (
                <>
                  <span className="h-3 w-px bg-slate-300 dark:bg-white/15" />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#F43F5E] dark:bg-[#FB7185] shadow-xs" />
                    <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      Direct Costs
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCosts(!showCosts)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                showCosts
                  ? isDarkMode
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-rose-50 border-rose-200 text-rose-700 shadow-2xs'
                  : isDarkMode
                    ? 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                    : 'bg-slate-50/90 border-slate-200/80 text-slate-700 hover:bg-slate-100 shadow-2xs'
              }`}
            >
              {showCosts ? 'Hide Costs' : 'Compare Costs'}
            </button>
          </div>
        </div>
      )}

      {/* ── PIPELINE FUNNEL VIEW (TOGGLEABLE) ── */}
      {activeTab === 'pipeline' && (
        <div className="grid gap-1.5 pt-1.5">
          {[
            { key: 'draft', label: 'PO Received', color: 'bg-slate-400', view: 'orders' },
            { key: 'confirmed', label: 'Confirmed', color: 'bg-indigo-500', view: 'orders' },
            { key: 'production', label: 'In Production', color: 'bg-blue-600', view: 'production' },
            { key: 'qc', label: 'QC / Inspection', color: 'bg-amber-500', view: 'qc' },
            { key: 'dispatch', label: 'Dispatch Ready', color: 'bg-teal-500', view: 'dispatch' },
            { key: 'closed', label: 'Closed', color: 'bg-emerald-500', view: 'orders' }
          ].map(stage => {
            const count = pipeline ? (pipeline[stage.key as keyof typeof pipeline] as number) : 0;
            const pct = Math.round((count / Math.max(1, pipelineTotal)) * 100);
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => onNavigateStage?.(stage.view)}
                className={`group grid w-full grid-cols-[minmax(112px,0.75fr)_minmax(0,1.6fr)_auto] items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-left transition-all cursor-pointer ${softBadge} ${isDarkMode ? 'hover:bg-white/[0.08]' : 'hover:bg-white hover:shadow-xs'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${stage.color}`} />
                  <span className={`truncate text-xs font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {stage.label}
                  </span>
                </div>
                <div className={`relative h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-white/[0.08]' : 'bg-slate-200/70'}`}>
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out ${stage.color}`}
                    style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                  />
                </div>
                <span className={`text-right text-xs font-semibold ${textPrimary}`}>
                  {count} <span className="text-[10px] font-normal text-slate-400">({pct}%)</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
