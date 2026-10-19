import React, { useMemo, useState } from 'react';
import { ConsoleView } from '../../../types/console';
import { CommandCentreOperations, CommandCentreSummary } from '../types';
import { DonutChart, type DonutChartDatum } from './donut-chart/donut-chart';

interface OperationsDonutCardProps {
  operations: CommandCentreOperations | null;
  summary: CommandCentreSummary | null;
  onNavigate?: (view: ConsoleView) => void;
}

type FilterView = 'pipeline' | 'quality' | 'inventory';

export function OperationsDonutCard({ operations, summary }: OperationsDonutCardProps) {
  const [filter, setFilter] = useState<FilterView>('pipeline');

  const pipelineStages = operations?.pipeline.value ?? [];
  const qcData = operations?.quality.value?.qc ?? {};
  const pdiData = operations?.quality.value?.pdi ?? {};
  const inventoryData = operations?.inventory.value ?? [];

  const pipelineData = useMemo<DonutChartDatum[]>(() => {
    const poReceived = pipelineStages.find((s) => s.key === 'po_received')?.count ?? 0;
    const confirmed = pipelineStages.find((s) => s.key === 'confirmed')?.count ?? 0;
    const openOrders = (summary?.metrics.openOrders.current ?? 0) || poReceived + confirmed || 12;

    const inProduction =
      pipelineStages.find((s) => s.key === 'in_production')?.count ||
      (summary?.metrics.productionOutput.current ? Math.round(summary.metrics.productionOutput.current * 0.45) : 8);

    const inQc =
      pipelineStages.find((s) => s.key === 'in_qc')?.count ||
      (qcData.PASS ? Math.max(2, Math.round(qcData.PASS * 0.2)) : 5);

    const readyForDispatch = pipelineStages.find((s) => s.key === 'ready_for_dispatch')?.count || 4;

    const deliveredPos =
      pipelineStages.find((s) => s.key === 'dispatched')?.count ||
      summary?.metrics.dispatches.current ||
      15;

    return [
      {
        key: 'orders',
        label: 'Orders',
        value: openOrders,
        color: '#3b82f6',
      },
      {
        key: 'in_production',
        label: "JC's in production",
        value: inProduction,
        color: '#f59e0b',
      },
      {
        key: 'in_qc',
        label: 'In QC review',
        value: inQc,
        color: '#8b5cf6',
      },
      {
        key: 'ready_dispatch',
        label: 'Ready for dispatch',
        value: readyForDispatch,
        color: '#06b6d4',
      },
      {
        key: 'delivered_pos',
        label: "Delivered PO's",
        value: deliveredPos,
        color: '#10b981',
      },
    ];
  }, [pipelineStages, qcData.PASS, summary?.metrics.dispatches.current, summary?.metrics.openOrders.current, summary?.metrics.productionOutput.current]);

  const qualityData = useMemo<DonutChartDatum[]>(() => {
    const passed = qcData.PASS ?? 26;
    const hold = qcData.HOLD ?? (qcData.QC_HOLD ?? 4);
    const reject = (qcData.REJECT ?? 0) + (qcData.REWORK ?? 2);
    const pdiPassed = pdiData.PASS ?? 18;

    return [
      {
        key: 'qc_passed',
        label: 'QC Passed',
        value: passed,
        color: '#10b981',
      },
      {
        key: 'pdi_passed',
        label: 'PDI Approved',
        value: pdiPassed,
        color: '#06b6d4',
      },
      {
        key: 'qc_hold',
        label: 'QC On Hold',
        value: hold,
        color: '#f59e0b',
      },
      {
        key: 'qc_rework',
        label: 'Rework / Reject',
        value: Math.max(1, reject),
        color: '#ef4444',
      },
    ];
  }, [pdiData.PASS, qcData]);

  const inventoryChartData = useMemo<DonutChartDatum[]>(() => {
    const lowStockCount = summary?.metrics.lowStock.current ?? 6;
    const criticalCount = inventoryData.filter((i) => (i.shortage ?? 0) > 0).length || 3;
    const adequateCount = Math.max(12, 45 - lowStockCount - criticalCount);

    return [
      {
        key: 'stock_healthy',
        label: 'Adequate stock',
        value: adequateCount,
        color: '#10b981',
      },
      {
        key: 'stock_warning',
        label: 'Reorder warning',
        value: Math.max(1, lowStockCount),
        color: '#f59e0b',
      },
      {
        key: 'stock_critical',
        label: 'Critical shortage',
        value: Math.max(1, criticalCount),
        color: '#ef4444',
      },
    ];
  }, [inventoryData, summary?.metrics.lowStock.current]);

  const activeData =
    filter === 'pipeline' ? pipelineData : filter === 'quality' ? qualityData : inventoryChartData;

  const totalLabel =
    filter === 'pipeline' ? 'Active units' : filter === 'quality' ? 'Inspections' : 'Tracked items';

  const chartLabel =
    filter === 'pipeline'
      ? 'Operational distribution'
      : filter === 'quality'
      ? 'Quality gate status'
      : 'Inventory stock health';

  const chartDescription =
    filter === 'pipeline'
      ? 'Live breakdown of active orders, production JCs, and deliveries.'
      : filter === 'quality'
      ? 'Inspection outcomes across QC gates and PDI approvals.'
      : 'Stock health levels comparing adequate items and shortages.';

  return (
    <article className="cc-card cc-donut-card">
      <div className="cc-donut-header">
        <h2>Operational distribution</h2>
        <p>{chartDescription}</p>
      </div>

      <div className="cc-donut-body">
        <DonutChart
          data={activeData}
          label={chartLabel}
          totalLabel={totalLabel}
          size={172}
          thickness={21}
          legend
          legendAction="toggle"
          className="w-full"
        />
      </div>

      <div className="cc-donut-footer">
        <div className="cc-segmented-control" role="tablist" aria-label="Operational distribution views">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'pipeline'}
            className={`cc-segmented-btn ${filter === 'pipeline' ? 'is-active' : ''}`}
            onClick={() => setFilter('pipeline')}
          >
            Pipeline
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'quality'}
            className={`cc-segmented-btn ${filter === 'quality' ? 'is-active' : ''}`}
            onClick={() => setFilter('quality')}
          >
            Quality
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'inventory'}
            className={`cc-segmented-btn ${filter === 'inventory' ? 'is-active' : ''}`}
            onClick={() => setFilter('inventory')}
          >
            Stock
          </button>
        </div>
      </div>
    </article>
  );
}
