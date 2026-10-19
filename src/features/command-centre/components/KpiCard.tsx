import React from 'react';
import { MetricValue } from '../types';
import { formatPercent } from '../utils/formatters';
import { MetricCard } from './metric-card/metric-card';

export interface KpiCardProps {
  label: string;
  metric: MetricValue | undefined;
  icon: React.ReactNode;
  kind: 'currency' | 'number' | 'percent';
  href?: string;
  sparkline?: number[];
  onOpen?: () => void;
}

export function KpiCard({ label, metric, icon, kind, href, sparkline, onOpen }: KpiCardProps) {
  const value = metric?.current ?? 0;
  const delta = metric?.deltaPct;
  const hasDelta = delta !== null && delta !== undefined;
  const change = hasDelta
    ? `${delta > 0 ? '+' : ''}${formatPercent(delta)}`
    : undefined;
  const context = hasDelta ? 'vs previous period' : 'No comparison';
  const prefix = kind === 'currency' ? '₹' : undefined;
  const suffix = kind === 'percent' ? '%' : undefined;
  const note = metric?.availability === 'partial' ? 'Partial data' : undefined;

  return (
    <MetricCard
      label={label}
      value={value}
      prefix={prefix}
      suffix={suffix}
      context={context}
      change={change}
      icon={icon}
      sparkline={sparkline}
      href={href}
      onOpen={onOpen}
      note={note}
    />
  );
}

export { MetricCard } from './metric-card/metric-card';
