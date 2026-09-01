import React from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { OrderLineProgress } from '../../types/console';

interface LineItemProgressBadgeProps {
  progress: OrderLineProgress;
  orderPo?: string;
  onNavigateToCreateJobCard?: (orderPo: string) => void;
  onNavigateToPDI?: (orderPo?: string, jobNo?: string) => void;
  isDarkMode?: boolean;
}

export const LineItemProgressBadge: React.FC<LineItemProgressBadgeProps> = ({
  progress,
  orderPo,
  onNavigateToCreateJobCard,
  onNavigateToPDI,
}) => {
  const { jcTotal, jcCompleted, qcStatus, pdiStatus } = progress;

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

  if (!hasJobCards) {
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
      title={hasJobCards ? `${jcCompleted} of ${jcTotal} Job Cards completed` : 'Click to create Job Card'}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-ui cursor-pointer shrink-0 active:scale-[0.96] ${badgeColor}`}
    >
      <Layers className="w-2.5 h-2.5 shrink-0" />
      <span>{label}</span>
      <ArrowRight className="w-2.5 h-2.5 shrink-0 opacity-70" />
    </button>
  );
};
