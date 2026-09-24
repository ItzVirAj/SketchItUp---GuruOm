import React from 'react';
import { ArrowRight, Layers, Clock, Package } from 'lucide-react';
import { OrderLineProgress } from '../../types/console';

// Pre-production statuses where JC badge should show a stage-appropriate label instead of "0 JC"
const PRE_PRODUCTION_STAGES = new Set([
  'DRAFT', 'SUBMITTED', 'PO_RECEIVED', 'CONFIRMED', 'APPROVED', 'RELEASED',
  'MATERIAL_CHECK', 'MATERIAL_CHECKED', 'MATERIAL_VERIFIED', 'MATERIAL_READY',
  'MATERIAL_SHORT', 'MATERIAL_SHORTAGE', 'PROCUREMENT_PENDING',
  'GRN', 'PO_SENT', 'GRN_RECEIVED', 'GRN_PENDING', 'AWAITING_GRN',
  'PENDING_REVIEW', 'PENDING_VERIFICATION', 'PO_APPROVED'
]);

function getPreProductionLabel(status: string): string {
  const s = (status || '').toUpperCase();
  if (['DRAFT', 'SUBMITTED', 'PO_RECEIVED', 'PENDING_REVIEW'].includes(s)) return 'Pending';
  if (['CONFIRMED', 'APPROVED', 'RELEASED', 'PO_APPROVED'].includes(s)) return 'Planning';
  if (['MATERIAL_CHECK', 'MATERIAL_CHECKED', 'MATERIAL_VERIFIED', 'MATERIAL_READY', 'PENDING_VERIFICATION'].includes(s)) return 'Material';
  if (['MATERIAL_SHORT', 'MATERIAL_SHORTAGE', 'PROCUREMENT_PENDING', 'PO_SENT'].includes(s)) return 'Shortage';
  if (['GRN', 'GRN_RECEIVED', 'GRN_PENDING', 'AWAITING_GRN'].includes(s)) return 'GRN';
  return 'Pending';
}

interface LineItemProgressBadgeProps {
  progress: OrderLineProgress;
  orderPo?: string;
  orderStatus?: string;
  onNavigateToCreateJobCard?: (orderPo: string) => void;
  onNavigateToPDI?: (orderPo?: string, jobNo?: string) => void;
  isDarkMode?: boolean;
}

export const LineItemProgressBadge: React.FC<LineItemProgressBadgeProps> = ({
  progress,
  orderPo,
  orderStatus,
  onNavigateToCreateJobCard,
  onNavigateToPDI,
}) => {
  const { jcTotal, jcCompleted, qcStatus, pdiStatus } = progress;
  const normalizedStatus = (orderStatus || '').toUpperCase();
  const isPreProduction = PRE_PRODUCTION_STAGES.has(normalizedStatus);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (jcTotal === 0 && onNavigateToCreateJobCard && orderPo) {
      onNavigateToCreateJobCard(orderPo);
    } else if (onNavigateToPDI) {
      onNavigateToPDI(orderPo);
    } else if (onNavigateToCreateJobCard && orderPo) {
      onNavigateToCreateJobCard(orderPo);
    }
  };

  const isComplete = jcTotal > 0 && jcCompleted >= jcTotal;
  const hasJobCards = jcTotal > 0;

  // Determine badge styling matching console token patterns
  let badgeColor = 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-800';
  let label = `${jcCompleted}/${jcTotal} JC`;
  let BadgeIcon = Layers;

  // If in pre-production and no job cards exist, show a stage-contextual label
  if (isPreProduction && !hasJobCards) {
    const stageLabel = getPreProductionLabel(normalizedStatus);
    const isShortage = ['MATERIAL_SHORT', 'MATERIAL_SHORTAGE', 'PROCUREMENT_PENDING', 'PO_SENT'].includes(normalizedStatus);
    badgeColor = isShortage
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/60';
    label = stageLabel;
    BadgeIcon = isShortage ? Package : Clock;
  } else if (!hasJobCards) {
    badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20';
    label = '0 JC';
  } else if (isComplete) {
    if (pdiStatus === 'PASS' || qcStatus === 'PASS') {
      badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';
    } else {
      badgeColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20';
    }
  } else {
    badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={hasJobCards ? `${jcCompleted} of ${jcTotal} Job Cards completed` : isPreProduction ? `Order is in ${(orderStatus || 'DRAFT').replace(/_/g, ' ')} stage` : 'Click to create Job Card'}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-ui cursor-pointer shrink-0 active:scale-[0.96] ${badgeColor}`}
    >
      <BadgeIcon className="w-2.5 h-2.5 shrink-0" />
      <span>{label}</span>
      {(hasJobCards || !isPreProduction) && <ArrowRight className="w-2.5 h-2.5 shrink-0 opacity-70" />}
    </button>
  );
};
