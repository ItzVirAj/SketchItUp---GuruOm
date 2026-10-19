import React, { useMemo } from 'react';
import { TrendPoint } from '../types';
import { formatCurrency, formatPeriodLabel } from '../utils/formatters';
import { LineChart, type LineChartDatum, type LineChartSeries } from './line-chart/line-chart';

export interface TrendChartProps {
  selected: TrendPoint[];
  comparison: TrendPoint[];
  granularity: 'day' | 'week' | 'month';
}

const seriesConfig: LineChartSeries[] = [
  {
    key: 'invoiced',
    label: 'Invoiced',
    color: '#3b82f6',
    area: true,
  },
  {
    key: 'collected',
    label: 'Collected',
    color: '#10b981',
    area: true,
  },
  {
    key: 'previousInvoiced',
    label: 'Previous Period',
    color: '#94a3b8',
    dashed: true,
    area: false,
  },
];

export function TrendChart({ selected, comparison, granularity }: TrendChartProps) {
  const chartData = useMemo<LineChartDatum[]>(() => {
    return selected.map((point, index) => ({
      key: point.period,
      label: formatPeriodLabel(point.period, granularity),
      axisLabel: formatPeriodLabel(point.period, granularity),
      values: {
        invoiced: point.invoiced,
        collected: point.collected,
        previousInvoiced: comparison[index]?.invoiced ?? undefined,
      },
    }));
  }, [comparison, granularity, selected]);

  if (chartData.length === 0) return null;

  return (
    <div className="cc-trend-container w-full">
      <LineChart
        data={chartData}
        series={seriesConfig}
        label="Invoiced and collected trend comparing selected and previous periods"
        categoryLabel={granularity === 'month' ? 'Month' : granularity === 'week' ? 'Week' : 'Day'}
        height={260}
        formatValue={(value) => formatCurrency(value)}
        formatTick={(value) => formatCurrency(value)}
        curve="smooth"
        role="img"
        dataChart="chart-trend"
        className="w-full"
      />
    </div>
  );
}

export { LineChart };
