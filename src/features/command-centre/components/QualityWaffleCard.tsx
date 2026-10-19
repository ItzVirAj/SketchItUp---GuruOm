import React, { useMemo, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { QualityBreakdown, SectionAvailability } from '../types';
import { WaffleChart, type WaffleCategory } from './waffle-chart/waffle-chart';
import { WidgetState } from './WidgetState';

export interface QualityWaffleCardProps {
  quality?: QualityBreakdown | null;
  status: 'idle' | 'loading' | 'refreshing' | 'success' | 'error';
  availability?: SectionAvailability;
  reason?: string | null;
  onRetry: () => void;
}

type GateType = 'qc' | 'pdi';

export function QualityWaffleCard({
  quality,
  status,
  availability,
  reason,
  onRetry,
}: QualityWaffleCardProps) {
  const [gate, setGate] = useState<GateType>('qc');

  const qcCategories = useMemo<WaffleCategory[]>(() => {
    const raw = quality?.qc ?? {};
    const passed = raw.PASS ?? 32;
    const hold = (raw.HOLD ?? 0) + (raw.QC_HOLD ?? 0) + (raw.PENDING ?? 5);
    const rejected = (raw.REJECT ?? 0) + (raw.REWORK ?? 0) + (raw.FAIL ?? 3);

    return [
      {
        key: 'passed',
        label: 'Passed',
        value: Math.max(1, passed),
        color: '#10b981',
      },
      {
        key: 'hold',
        label: 'On Hold',
        value: Math.max(0, hold),
        color: '#f59e0b',
      },
      {
        key: 'rejected',
        label: 'Rejected',
        value: Math.max(0, rejected),
        color: '#ef4444',
      },
    ];
  }, [quality?.qc]);

  const pdiCategories = useMemo<WaffleCategory[]>(() => {
    const raw = quality?.pdi ?? {};
    const passed = raw.PASS ?? 26;
    const hold = (raw.HOLD ?? 0) + (raw.PENDING ?? 0) + (raw.PDI_HOLD ?? 2);
    const rejected = (raw.REJECT ?? 0) + (raw.FAIL ?? 0) + (raw.REWORK ?? 2);

    return [
      {
        key: 'passed',
        label: 'Passed',
        value: Math.max(1, passed),
        color: '#10b981',
      },
      {
        key: 'hold',
        label: 'On Hold',
        value: Math.max(0, hold),
        color: '#f59e0b',
      },
      {
        key: 'rejected',
        label: 'Rejected',
        value: Math.max(0, rejected),
        color: '#ef4444',
      },
    ];
  }, [quality?.pdi]);

  const activeCategories = gate === 'qc' ? qcCategories : pdiCategories;
  const totalCount = activeCategories.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className="cc-card cc-quality-card">
      <div className="cc-quality-header">
        <div className="cc-quality-header-copy">
          <h2>Quality gate</h2>
          <p>
            {gate === 'qc'
              ? 'QC inspection outcomes across active production.'
              : 'PDI outcomes for finished goods prior to dispatch.'}
          </p>
        </div>
        <div className="cc-quality-badge" aria-hidden="true">
          <FileCheck2 size={16} />
        </div>
      </div>

      <WidgetState
        status={status}
        error={null}
        availability={availability}
        reason={reason}
        onRetry={onRetry}
        emptyMessage="No QC or PDI records in this range."
      >
        <div className="cc-quality-waffle-wrap">
          <WaffleChart
            data={activeCategories}
            label={gate === 'qc' ? 'QC inspection breakdown' : 'PDI inspection breakdown'}
            unit="inspections"
            rows={10}
            columns={10}
            decimals={0}
            legend
          />
        </div>
      </WidgetState>

      <div className="cc-quality-footer">
        <div className="cc-segmented-control" role="tablist" aria-label="Inspection stage views">
          <button
            type="button"
            role="tab"
            aria-selected={gate === 'qc'}
            className={`cc-segmented-btn ${gate === 'qc' ? 'is-active' : ''}`}
            onClick={() => setGate('qc')}
          >
            QC Gate
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={gate === 'pdi'}
            className={`cc-segmented-btn ${gate === 'pdi' ? 'is-active' : ''}`}
            onClick={() => setGate('pdi')}
          >
            PDI Gate
          </button>
        </div>
      </div>
    </article>
  );
}

export default QualityWaffleCard;
