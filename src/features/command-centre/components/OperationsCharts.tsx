import React from 'react';
import { ArrowRight, Box, CircleCheck, Factory, PackageCheck, ShieldAlert } from 'lucide-react';
import { CountStage, HeatmapCell, InventoryRank, QualityBreakdown, VendorBreakdown } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

export function Funnel({ stages, onStage }: { stages: CountStage[]; onStage?: (stage: CountStage) => void }) {
  return (
    <div className="cc-funnel" role="list" aria-label="Order to cash funnel">
      {stages.map((stage, index) => {
        const previous = stages[index - 1]?.count;
        const conversion = previous && previous > 0 ? (stage.count / previous) * 100 : null;
        return (
          <button type="button" key={stage.key} className="cc-funnel-stage" onClick={() => onStage?.(stage)} role="listitem">
            <span className="cc-funnel-bar" style={{ '--funnel-width': `${Math.max(20, stages[0]?.count ? (stage.count / stages[0].count) * 100 : 20)}%` } as React.CSSProperties} />
            <span className="cc-funnel-content">
              <span className="cc-funnel-label">{stage.label}</span>
              <strong className="tabular-nums">{formatNumber(stage.count)}</strong>
              {index > 0 && <small>{conversion === null ? 'No base' : `${formatPercent(conversion)} from prior`}</small>}
            </span>
            {index < stages.length - 1 && <ArrowRight size={14} aria-hidden="true" className="cc-funnel-arrow" />}
          </button>
        );
      })}
    </div>
  );
}

export function Heatmap({ cells }: { cells: HeatmapCell[] }) {
  const max = Math.max(...cells.map(cell => cell.count), 1);
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];
  const findCell = (weekday: number, hour: number) => cells.find(cell => cell.weekday === ((weekday + 1) % 7) && Math.floor(cell.hour / 3) * 3 === hour)?.count ?? 0;
  return (
    <div className="cc-heatmap" role="img" aria-label="Production activity by weekday and time bucket">
      <div className="cc-heatmap-corner" />
      {weekdays.map(day => <span key={day} className="cc-heatmap-label cc-heatmap-day">{day}</span>)}
      {hours.map(hour => (
        <React.Fragment key={hour}>
          <span className="cc-heatmap-label">{hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}</span>
          {weekdays.map((day, weekday) => {
            const value = findCell(weekday, hour);
            const intensity = value === 0 ? 0 : 0.16 + (value / max) * 0.76;
            return <span key={`${day}-${hour}`} className="cc-heat-cell" style={{ '--heat-intensity': intensity } as React.CSSProperties} title={`${day}, ${hour}:00 — ${value} completions`}><span>{value > 0 && value}</span></span>;
          })}
        </React.Fragment>
      ))}
      <div className="cc-heatmap-scale"><span>Less</span><i className="cc-heat-swatch low" /><i className="cc-heat-swatch mid" /><i className="cc-heat-swatch high" /><span>More</span></div>
    </div>
  );
}

export function QualityRing({ quality }: { quality: QualityBreakdown }) {
  const values = Object.entries(quality.qc).filter(([, value]) => value > 0);
  const total = values.reduce((sum, [, value]) => sum + value, 0);
  const passed = quality.qc.PASS ?? 0;
  const passPct = total > 0 ? (passed / total) * 100 : null;
  const circumference = 2 * Math.PI * 42;
  const passedLength = passPct === null ? 0 : circumference * (passPct / 100);
  return (
    <div className="cc-quality-layout">
      <div className="cc-ring-wrap">
        <svg viewBox="0 0 100 100" className="cc-ring" role="img" aria-label={`QC pass rate ${formatPercent(passPct)}`}>
          <circle cx="50" cy="50" r="42" className="cc-ring-track" />
          <circle cx="50" cy="50" r="42" className="cc-ring-value" strokeDasharray={`${passedLength} ${circumference - passedLength}`} />
        </svg>
        <div className="cc-ring-center"><strong>{formatPercent(passPct)}</strong><span>QC pass</span></div>
      </div>
      <div className="cc-quality-list">
        {values.length === 0 ? <p className="cc-muted-copy">No inspections in this range.</p> : values.slice(0, 4).map(([status, count]) => (
          <div key={status}><span><i className={`cc-status-dot is-${status.toLowerCase()}`} />{status.replaceAll('_', ' ')}</span><strong>{formatNumber(count)}</strong></div>
        ))}
        <div className="cc-quality-divider" />
        <div><span><i className="cc-status-dot is-info" />PDI passed</span><strong>{formatNumber(quality.pdi.PASS ?? 0)}</strong></div>
      </div>
    </div>
  );
}

export function RankedList({ items }: { items: InventoryRank[] }) {
  const visible = items.slice(0, 6);
  return (
    <div className="cc-ranked-list" role="list" aria-label="Inventory items below reorder level">
      {visible.map(item => {
        const shortage = item.shortage ?? 0;
        const width = item.reorderLevel && item.reorderLevel > 0 ? Math.min(100, (shortage / item.reorderLevel) * 100) : 100;
        return (
          <div key={item.itemId || item.code || item.description} className="cc-ranked-row" role="listitem">
            <div className="cc-ranked-copy"><strong>{item.description || item.code || 'Unnamed item'}</strong><span>{item.code || 'No item code'}</span></div>
            <div className="cc-ranked-bar"><i style={{ width: `${width}%` }} /></div>
            <strong className="cc-ranked-value tabular-nums">-{formatNumber(shortage)}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function VendorList({ items }: { items: VendorBreakdown[] }) {
  const total = items.reduce((sum, item) => sum + item.balance, 0);
  return (
    <div className="cc-vendor-list" role="list" aria-label="Vendor bills by status">
      {items.slice(0, 5).map(item => (
        <div key={item.status} className="cc-vendor-row" role="listitem">
          <span className="cc-vendor-status"><i className={`cc-status-dot is-${item.status.toLowerCase()}`} />{item.status.replaceAll('_', ' ')}</span>
          <span className="cc-vendor-share">{total > 0 ? formatPercent((item.balance / total) * 100) : '—'}</span>
          <strong className="tabular-nums">{formatCurrency(item.balance)}</strong>
        </div>
      ))}
    </div>
  );
}

export function PipelineStrip({ stages }: { stages: CountStage[] }) {
  const icons = [<PackageCheck size={15} />, <CircleCheck size={15} />, <Factory size={15} />, <ShieldAlert size={15} />, <Box size={15} />, <PackageCheck size={15} />];
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  return (
    <div className="cc-pipeline" aria-label="Operations pipeline">
      {stages.map((stage, index) => (
        <div key={stage.key} className="cc-pipeline-stage">
          <span className="cc-pipeline-icon" aria-hidden="true">{icons[index] || <Box size={15} />}</span>
          <strong className="tabular-nums">{formatNumber(stage.count)}</strong>
          <span>{stage.label}</span>
          <i style={{ width: `${total ? Math.max(3, (stage.count / total) * 100) : 0}%` }} />
        </div>
      ))}
    </div>
  );
}
