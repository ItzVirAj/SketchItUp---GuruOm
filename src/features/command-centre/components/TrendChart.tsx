import React, { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
  AreaChart as RechartsAreaChart,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../components/ui/chart';
import { TrendPoint } from '../types';
import { formatCurrency, formatPeriodLabel } from '../utils/formatters';

interface TrendChartProps {
  selected: TrendPoint[];
  comparison: TrendPoint[];
  granularity: 'day' | 'week' | 'month';
}

interface TrendDatum {
  period: string;
  invoiced: number;
  collected: number;
  previousInvoiced: number | null;
}

const chartConfig = {
  invoiced: {
    label: 'Invoiced',
    theme: {
      light: '#2563eb',
      dark: '#60a5fa',
    },
  },
  collected: {
    label: 'Collected',
    theme: {
      light: '#10b981',
      dark: '#34d399',
    },
  },
  previousInvoiced: {
    label: 'Previous Period',
    theme: {
      light: '#94a3b8',
      dark: '#64748b',
    },
  },
} satisfies ChartConfig;

export function TrendChart({ selected, comparison, granularity }: TrendChartProps) {
  const chartData = useMemo<TrendDatum[]>(() => selected.map((point, index) => ({
    period: point.period,
    invoiced: point.invoiced,
    collected: point.collected,
    previousInvoiced: comparison[index]?.invoiced ?? null,
  })), [comparison, selected]);

  if (chartData.length === 0) return null;

  return (
    <ChartContainer
      className="cc-trend-recharts h-[280px] w-full"
      config={chartConfig}
      role="img"
      aria-label="Invoiced and collected trend comparing selected and previous periods"
      tabIndex={0}
    >
      <RechartsAreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="fillInvoiced" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-invoiced)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-invoiced)" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="fillCollected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-collected)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-collected)" stopOpacity={0.0} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200/60 dark:stroke-slate-800/60" />

        <XAxis
          dataKey="period"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) => formatPeriodLabel(value, granularity)}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={58}
          tickFormatter={(value: number) => formatCurrency(value)}
        />

        <ChartTooltip
          cursor={{ stroke: 'var(--color-invoiced)', strokeDasharray: '3 3', strokeOpacity: 0.35 }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatPeriodLabel(String(value), granularity)}
              formatter={(value, name) => {
                const key = String(name);
                const cfg = chartConfig[key as keyof typeof chartConfig];
                return (
                  <div className="flex w-full min-w-[150px] items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {cfg?.label || key}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(Number(value))}
                    </span>
                  </div>
                );
              }}
            />
          }
        />

        <ChartLegend content={<ChartLegendContent className="pt-3 text-xs font-medium" />} />

        <Area
          type="monotone"
          dataKey="invoiced"
          name="invoiced"
          stroke="var(--color-invoiced)"
          fill="url(#fillInvoiced)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--color-invoiced)' }}
        />

        <Area
          type="monotone"
          dataKey="collected"
          name="collected"
          stroke="var(--color-collected)"
          fill="url(#fillCollected)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--color-collected)' }}
        />

        <Line
          type="monotone"
          dataKey="previousInvoiced"
          name="previousInvoiced"
          stroke="var(--color-previousInvoiced)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          connectNulls={false}
          dot={false}
          activeDot={false}
        />
      </RechartsAreaChart>
    </ChartContainer>
  );
}
