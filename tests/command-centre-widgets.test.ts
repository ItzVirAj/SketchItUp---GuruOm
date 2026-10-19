// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { KpiCard } from '../src/features/command-centre/components/KpiCard';
import { TrendChart } from '../src/features/command-centre/components/TrendChart';
import { WidgetState } from '../src/features/command-centre/components/WidgetState';
import { OrderToCashMeterCard } from '../src/features/command-centre/components/OrderToCashMeterCard';
import { QualityWaffleCard } from '../src/features/command-centre/components/QualityWaffleCard';
import { TaskCalendarCard } from '../src/features/command-centre/components/TaskCalendarCard';

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
    const chart = screen.getByRole('img', { name: /invoiced and collected trend/i });
    expect(chart).toBeTruthy();
    expect(chart.getAttribute('data-chart')).toContain('chart-');
  });

  it('renders the order-to-cash usage meter with stages and limit', () => {
    render(React.createElement(OrderToCashMeterCard, {
      status: 'success',
      availability: 'supported',
      reason: null,
      onRetry: () => undefined,
      stages: [
        { key: 'po_received', label: 'PO received', count: 12 },
        { key: 'confirmed', label: 'Confirmed', count: 14 },
        { key: 'in_production', label: 'In production', count: 18 }
      ]
    }));
    expect(screen.getByText('Order to cash')).toBeTruthy();
    expect(screen.getByText('Pipeline capacity')).toBeTruthy();
    expect(screen.getByText('Open orders')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy();
    expect(screen.getByText('In production')).toBeTruthy();
    expect(screen.queryByText('PO received')).toBeNull();
  });

  it('renders the quality waffle chart with QC and PDI breakdowns', () => {
    render(React.createElement(QualityWaffleCard, {
      status: 'success',
      availability: 'supported',
      reason: null,
      onRetry: () => undefined,
      quality: {
        qc: { PASS: 25, REJECT: 2, HOLD: 3 },
        pdi: { PASS: 20, REJECT: 1, HOLD: 2 }
      }
    }));
    expect(screen.getByText('Quality gate')).toBeTruthy();
    expect(screen.getAllByText('Passed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('On Hold').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rejected').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: 'QC Gate' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'PDI Gate' })).toBeTruthy();
  });

  it('renders the task calendar card with agenda list and interactive controls', () => {
    render(React.createElement(TaskCalendarCard));
    expect(screen.getByText('Calendar with agenda list')).toBeTruthy();
    expect(screen.getByTitle('Add Task in HR module')).toBeTruthy();
    expect(screen.getByLabelText('Previous month')).toBeTruthy();
    expect(screen.getByLabelText('Next month')).toBeTruthy();
  });
});
