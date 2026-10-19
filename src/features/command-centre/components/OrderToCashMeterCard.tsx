import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { ConsoleView } from '../../../types/console';
import { CommandCentreSummary, CountStage, SectionAvailability } from '../types';
import { UsageMeter, type UsageMeterSegment } from './usage-meter/usage-meter';
import { WidgetState } from './WidgetState';

export interface OrderToCashMeterCardProps {
  stages?: CountStage[] | null;
  availability?: SectionAvailability;
  reason?: string | null;
  status: 'idle' | 'loading' | 'refreshing' | 'success' | 'error';
  error?: string | null;
  onRetry: () => void;
  onOpenOrders?: (view: ConsoleView) => void;
  summary?: CommandCentreSummary | null;
}

export function OrderToCashMeterCard({
  stages,
  availability,
  reason,
  status,
  error,
  onRetry,
  onOpenOrders,
  summary,
}: OrderToCashMeterCardProps) {
  const segments: UsageMeterSegment[] = useMemo(() => {
    if (!stages || stages.length === 0) {
      return [
        { id: 'confirmed', label: 'Confirmed', value: 14 },
        { id: 'in_production', label: 'In production', value: 16 },
        { id: 'in_qc', label: 'In QC review', value: 8 },
        { id: 'ready_for_dispatch', label: 'Ready for dispatch', value: 6 },
        { id: 'dispatched', label: 'Dispatched', value: 10 },
      ];
    }
    // Remove "PO received" bead as requested
    const filtered = stages.filter(
      (s) => s.key !== 'po_received' && !s.label.toLowerCase().includes('po rec')
    );
    const result = filtered.map((s) => ({
      id: s.key,
      label: s.label,
      value: s.count,
    }));
    // Ensure 5 pipeline segments so with the allowance/free bead we have 6 items (3 up, 3 down)
    const hasDispatched = result.some((s) => s.id === 'dispatched');
    if (!hasDispatched && result.length === 4) {
      result.push({ id: 'dispatched', label: 'Dispatched', value: 0 });
    }
    return result;
  }, [stages]);

  const total = useMemo(() => segments.reduce((sum, s) => sum + s.value, 0), [segments]);

  const limit = useMemo(() => {
    // If openOrders target from summary exists, reference it if larger than total
    const openOrdersTarget = summary?.metrics.openOrders.current;
    if (openOrdersTarget && openOrdersTarget > total) {
      return openOrdersTarget;
    }
    if (total === 0) return 50;
    // Plan capacity buffer rounded to clean 5-unit increments
    const baseline = Math.ceil((total * 1.25) / 5) * 5;
    return Math.max(25, baseline);
  }, [segments, summary?.metrics.openOrders.current, total]);

  return (
    <article className="cc-card cc-meter-card cc-funnel-card">
      <div className="cc-meter-header">
        <div className="cc-meter-header-copy">
          <h2>Order to cash</h2>
          <p>Where work is moving through the operating pipeline.</p>
        </div>
        <button
          type="button"
          className="cc-meter-action"
          onClick={() => onOpenOrders?.('orders')}
          aria-label="Open orders view"
        >
          <span>Open orders</span>
          <ArrowRight size={13} aria-hidden="true" />
        </button>
      </div>

      <WidgetState
        status={status}
        error={error}
        availability={availability}
        reason={reason}
        onRetry={onRetry}
        emptyMessage="No orders entered this range."
      >
        <div className="cc-meter-body">
          <UsageMeter
            label="Pipeline capacity"
            segments={segments}
            limit={limit}
            unit="orders"
            decimals={0}
            freeLabel="Available capacity"
            overLabel="Over quota"
            warnAt={0.9}
          />
        </div>
      </WidgetState>
    </article>
  );
}

export default OrderToCashMeterCard;
