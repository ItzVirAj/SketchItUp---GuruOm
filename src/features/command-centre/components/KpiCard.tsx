import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { MetricValue } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface KpiCardProps {
  label: string;
  metric: MetricValue | undefined;
  icon: React.ReactNode;
  kind: 'currency' | 'number' | 'percent';
  href?: string;
  sparkline?: number[];
  onOpen?: () => void;
}

export function KpiCard({ label, metric, icon, kind, href, sparkline = [], onOpen }: KpiCardProps) {
  const value = metric?.current;
  const delta = metric?.deltaPct;
  const formatValue = kind === 'currency' ? formatCurrency : kind === 'percent' ? formatPercent : formatNumber;
  const positive = delta !== null && delta !== undefined && delta > 0;
  const negative = delta !== null && delta !== undefined && delta < 0;

  return (
    <article className="cc-card cc-kpi-card">
      <div className="cc-kpi-topline">
        <span className="cc-kpi-icon" aria-hidden="true">{icon}</span>
        <span className="cc-kpi-label">{label}</span>
        {href && <button type="button" className="cc-kpi-link" onClick={onOpen}>View</button>}
      </div>
      <div className="cc-kpi-value tabular-nums">{formatValue(value)}</div>
      <div className="cc-kpi-foot">
        {delta === null || delta === undefined ? (
          <span className="cc-kpi-muted"><Minus size={13} aria-hidden="true" /> No comparison</span>
        ) : (
          <span className={`cc-delta ${positive ? 'is-positive' : negative ? 'is-negative' : 'is-neutral'}`}>
            {positive ? <ArrowUpRight size={13} aria-hidden="true" /> : negative ? <ArrowDownRight size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}
            {formatPercent(Math.abs(delta))}
          </span>
        )}
        <span className="cc-kpi-caption">vs previous period</span>
        {sparkline.length > 1 && <Sparkline values={sparkline} />}
      </div>
      {metric?.availability === 'partial' && <p className="cc-kpi-note">Partial data</p>}
    </article>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 48;
    const y = 17 - ((value - min) / span) * 13;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="cc-sparkline" viewBox="0 0 48 18" role="img" aria-label="Period trend">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
