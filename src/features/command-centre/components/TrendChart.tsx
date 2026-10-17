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
  invoiced: { label: 'Invoiced', color: 'var(--cc-accent)' },
  collected: { label: 'Collected', color: 'var(--cc-success)' },
  previousInvoiced: { label: 'Previous period', color: 'var(--cc-faint)' },
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
      className="cc-trend-recharts"
      config={chartConfig}
      role="img"
      aria-label="Invoiced and collected trend comparing selected and previous periods"
      tabIndex={0}
    >
      <RechartsAreaChart data={chartData} margin={{ top: 10, right: 12, bottom: 2, left: 2 }}>
        <CartesianGrid vertical={false} stroke="var(--cc-border)" strokeDasharray="3 5" />
        <XAxis
          dataKey="period"
          tickLine={false}
          axisLine={false}
          tickMargin={9}
          minTickGap={24}
          tickFormatter={(value: string) => formatPeriodLabel(value, granularity)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={7}
          width={54}
          tickFormatter={(value: number) => formatCurrency(value)}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--cc-accent)', strokeDasharray: '4 4', strokeOpacity: 0.7 }}
          content={(
            <ChartTooltipContent
              labelFormatter={(value) => formatPeriodLabel(String(value), granularity)}
              formatter={(value, name) => (
                <div className="flex min-w-[148px] items-center justify-between gap-4">
                  <span className="text-muted-foreground">{String(name)}</span>
                  <span className="text-foreground font-medium tabular-nums">{formatCurrency(Number(value))}</span>
                </div>
              )}
            />
          )}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="invoiced"
          name="Invoiced"
          stroke="var(--color-invoiced)"
          fill="var(--color-invoiced)"
          fillOpacity={0.1}
          strokeWidth={2.25}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--cc-surface)' }}
        />
        <Line
          type="monotone"
          dataKey="collected"
          name="Collected"
          stroke="var(--color-collected)"
          strokeWidth={1.8}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--cc-surface)' }}
        />
        <Line
          type="monotone"
          dataKey="previousInvoiced"
          name="Previous period"
          stroke="var(--color-previousInvoiced)"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          connectNulls={false}
          dot={false}
          activeDot={false}
        />
      </RechartsAreaChart>
    </ChartContainer>
  );
}
