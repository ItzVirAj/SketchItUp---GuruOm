import React, { useMemo, useState } from 'react';
import { TrendPoint } from '../types';
import { formatCurrency, formatPeriodLabel } from '../utils/formatters';

interface TrendChartProps {
  selected: TrendPoint[];
  comparison: TrendPoint[];
  granularity: 'day' | 'week' | 'month';
}

interface HoverPoint {
  index: number;
  x: number;
  point: TrendPoint;
  compare: TrendPoint | undefined;
}

export function TrendChart({ selected, comparison, granularity }: TrendChartProps) {
  const [hover, setHover] = useState<HoverPoint | null>(null);
  const chart = useMemo(() => {
    const width = 760;
    const height = 260;
    const left = 14;
    const right = 14;
    const top = 18;
    const bottom = 30;
    const values = [...selected, ...comparison].flatMap(point => [point.invoiced, point.collected]);
    const max = Math.max(...values, 1);
    const xFor = (index: number) => left + (index / Math.max(selected.length - 1, 1)) * (width - left - right);
    const yFor = (value: number) => top + (1 - value / max) * (height - top - bottom);
    const pathFor = (key: 'invoiced' | 'collected', points: TrendPoint[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index).toFixed(2)} ${yFor(point[key]).toFixed(2)}`).join(' ');
    const area = selected.length > 1
      ? `${pathFor('invoiced', selected)} L ${xFor(selected.length - 1)} ${height - bottom} L ${xFor(0)} ${height - bottom} Z`
      : '';
    return { width, height, bottom, max, xFor, yFor, pathFor, area };
  }, [selected, comparison]);

  if (selected.length === 0) return null;

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * chart.width;
    const index = Math.max(0, Math.min(selected.length - 1, Math.round(((x - 14) / (chart.width - 28)) * (selected.length - 1))));
    setHover({ index, x: chart.xFor(index), point: selected[index], compare: comparison[index] });
  };

  return (
    <div className="cc-trend-wrap">
      <div className="cc-chart-legend" aria-label="Trend legend">
        <span><i className="cc-legend-dot is-accent" /> Selected period</span>
        <span><i className="cc-legend-dot is-muted" /> Previous period</span>
      </div>
      <svg
        className="cc-trend-chart"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label="Invoiced and collected trend comparing selected and previous periods"
        tabIndex={0}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover({ index: selected.length - 1, x: chart.xFor(selected.length - 1), point: selected[selected.length - 1], compare: comparison[selected.length - 1] })}
        onBlur={() => setHover(null)}
      >
        <title>Invoiced versus collected</title>
        {[0, 0.5, 1].map(level => {
          const y = 18 + level * (chart.height - 48);
          return <line key={level} x1="14" x2="746" y1={y} y2={y} className="cc-chart-grid-line" />;
        })}
        {chart.area && <path d={chart.area} className="cc-chart-area" />}
        {comparison.length > 0 && <path d={chart.pathFor('invoiced', comparison)} className="cc-chart-line cc-chart-line-compare" />}
        <path d={chart.pathFor('invoiced', selected)} className="cc-chart-line cc-chart-line-primary" />
        {selected.length > 1 && <path d={chart.pathFor('collected', selected)} className="cc-chart-line cc-chart-line-collection" />}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1="14" y2={chart.height - chart.bottom} className="cc-chart-crosshair" />
            <circle cx={hover.x} cy={chart.yFor(hover.point.invoiced)} r="4" className="cc-chart-point" />
          </>
        )}
        <text x="14" y="250" className="cc-chart-axis">{formatPeriodLabel(selected[0].period, granularity)}</text>
        <text x="746" y="250" textAnchor="end" className="cc-chart-axis">{formatPeriodLabel(selected[selected.length - 1].period, granularity)}</text>
      </svg>
      {hover && (
        <div className="cc-chart-tooltip" style={{ left: `${Math.min(Math.max((hover.x / chart.width) * 100, 16), 84)}%` }}>
          <strong>{formatPeriodLabel(hover.point.period, granularity)}</strong>
          <span>Invoiced {formatCurrency(hover.point.invoiced)}</span>
          <span>Collected {formatCurrency(hover.point.collected)}</span>
          {hover.compare && <span className="is-muted">Previous {formatCurrency(hover.compare.invoiced)}</span>}
        </div>
      )}
    </div>
  );
}
