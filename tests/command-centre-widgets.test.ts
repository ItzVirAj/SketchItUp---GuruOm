// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { KpiCard } from '../src/features/command-centre/components/KpiCard';
import { TrendChart } from '../src/features/command-centre/components/TrendChart';
import { WidgetState } from '../src/features/command-centre/components/WidgetState';

afterEach(() => cleanup());

describe('Command Centre widget states', () => {
  it('renders a layout-preserving loading skeleton', () => {
    render(React.createElement(WidgetState, { status: 'loading', children: null }));
    expect(screen.getByLabelText('Loading widget')).toBeTruthy();
  });

  it('renders an actionable inline error state', () => {
    render(React.createElement(WidgetState, {
      status: 'error',
      error: 'Network unavailable',
      onRetry: () => undefined,
      children: null
    }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
    expect(screen.getByText('Network unavailable')).toBeTruthy();
  });

  it('renders a real KPI value and explicit empty comparison', () => {
    render(React.createElement(KpiCard, {
      label: 'Open orders',
      metric: { availability: 'supported', current: 12, previous: null, deltaPct: null, reason: null },
      icon: React.createElement('span', null, 'O'),
      kind: 'number'
    }));
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('No comparison')).toBeTruthy();
  });

  it('renders an accessible data trend with both series', () => {
    render(React.createElement(TrendChart, {
      granularity: 'day',
      selected: [
        { period: '2026-10-01', invoiced: 100, collected: 40 },
        { period: '2026-10-02', invoiced: 150, collected: 110 }
      ],
      comparison: [
        { period: '2026-09-29', invoiced: 80, collected: 30 },
        { period: '2026-09-30', invoiced: 120, collected: 90 }
      ]
    }));
    expect(screen.getByRole('img', { name: /invoiced and collected trend/i })).toBeTruthy();
    expect(screen.getByText('Selected period')).toBeTruthy();
    expect(screen.getByText('Previous period')).toBeTruthy();
  });
});
