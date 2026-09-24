import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  Copy,
  Factory,
  Filter,
  Layers,
  Package,
  Play
} from 'lucide-react';
import type { JobCard } from '../../../types/console';
import {
  bucketOf,
  isOverdue,
  sortGroups,
  type GroupSort,
  type JobCardBucket,
  type JobCardGroup
} from '../../../utils/jobCardGroups';

interface JobCardsGroupedListProps {
  /** Already filtered: each group's `visible` holds the cards to list, `cards` feeds the summary. */
  groups: JobCardGroup[];
  isDarkMode: boolean;
  onOpenJob: (jc: JobCard) => void;
  /** Opens bulk release for a PO that still has lines without job cards. */
  onReleaseMore?: (orderPo: string) => void;
  /** Creates a job card for a specific PO and optional part code */
  onCreateJob?: (orderPo: string, partCode?: string) => void;
  /** True when a search/status/attention filter is active: a handful of matching POs open by themselves. */
  filtersActive?: boolean;
  /** POs shown before "Show more" (default 20). */
  pageSize?: number;
  /** Cards listed per expanded PO before "Show more" (default 25). */
  rowsPerGroup?: number;
}

const SEGMENTS: Array<{ id: JobCardBucket; label: string; dot: string }> = [
  { id: 'COMPLETED', label: 'Done', dot: 'bg-emerald-500' },
  { id: 'RUNNING', label: 'Running', dot: 'bg-[#5B75F8]' },
  { id: 'QC_HOLD', label: 'On QC Hold', dot: 'bg-rose-500' },
  { id: 'NOT_STARTED', label: 'Scheduled', dot: 'bg-slate-400' }
];

const PILL: Record<JobCardBucket, { cls: string; dot: string; label: string }> = {
  COMPLETED: { cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Done' },
  RUNNING: { cls: 'border-blue-500/30 bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF]', dot: 'bg-[#5B75F8]', label: 'Running' },
  QC_HOLD: { cls: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400', dot: 'bg-rose-500', label: 'QC Hold' },
  NOT_STARTED: { cls: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300', dot: 'bg-slate-400', label: 'Scheduled' }
};

const fmtDate = (s?: string) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    ...(/^\d{4}-\d{2}-\d{2}$/.test(s) ? { timeZone: 'UTC' } : {})
  });
};

const SORT_OPTIONS: { id: GroupSort; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'due', label: 'Due Date', icon: Calendar },
  { id: 'attention', label: 'Needs Attention', icon: AlertTriangle }
];

export const JobCardsGroupedList: React.FC<JobCardsGroupedListProps> = ({
  groups,
  isDarkMode,
  onOpenJob,
  onReleaseMore,
  onCreateJob,
  filtersActive = false,
  pageSize = 20,
  rowsPerGroup = 25
}) => {
  const [sort, setSort] = useState<GroupSort>('recent');
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  const [groupLimit, setGroupLimit] = useState(pageSize);
  const [rowLimits, setRowLimits] = useState<Record<string, number>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter out any PO groups that have 0 job cards: only show POs where JC is created
  const activeGroups = groups.filter(g => g.total > 0 && g.cards.length > 0);
  const sorted = sortGroups(activeGroups, sort);
  const shown = sorted.slice(0, groupLimit);
  const totalCards = activeGroups.reduce((n, g) => n + g.visible.length, 0);
  const totalAttention = activeGroups.reduce((n, g) => n + g.overdue + g.counts.QC_HOLD + g.ncr, 0);

  // Auto-open if specific filters isolate 3 or fewer groups
  const autoOpen = filtersActive && activeGroups.length <= 3;
  const isOpen = (g: JobCardGroup) => openOverride[g.key] ?? autoOpen;

  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    activeGroups.forEach(g => { next[g.key] = open; });
    setOpenOverride(next);
  };

  const handleCopyPo = (e: React.MouseEvent, po: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(po);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 1800);
  };

  // Apple-style Empty State
  if (activeGroups.length === 0) {
    return (
      <div
        className={`relative overflow-hidden p-12 sm:p-16 rounded-[24px] border text-center transition-all duration-300 ${
          isDarkMode
            ? 'bg-[#121215]/80 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.36)] backdrop-blur-xl'
            : 'bg-white/80 border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl'
        }`}
      >
        <div
          className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border shadow-inner ${
            isDarkMode
              ? 'bg-white/[0.04] border-white/10 text-slate-400'
              : 'bg-slate-100/90 border-slate-200 text-slate-500'
          }`}
        >
          <Factory className="w-7 h-7 stroke-[1.75]" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
          No Job Cards Found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Try clearing search filters or release new job cards from customer orders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 w-full font-sans">
      {/* ========================================================================= */}
      {/* ── macOS / iOS APPLE TOOLBAR HEADER ──                                    */}
      {/* ========================================================================= */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border transition-all ${
          isDarkMode
            ? 'bg-[#121215]/70 border-white/[0.08] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
            : 'bg-white/80 border-slate-200/70 backdrop-blur-xl shadow-[0_4px_20px_rgba(15,23,42,0.03)]'
        }`}
      >
        {/* Left: Summary Metrics Pill */}
        <div className="flex items-center flex-wrap gap-2">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
              isDarkMode
                ? 'bg-white/[0.04] border-white/[0.06] text-slate-300'
                : 'bg-slate-100/80 border-slate-200/60 text-slate-700'
            }`}
          >
            <Factory className="w-3.5 h-3.5 text-[#5B75F8] dark:text-[#7B92FF]" />
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {activeGroups.length}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              PO {activeGroups.length === 1 ? 'Batch' : 'Batches'}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {totalCards}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Job Cards</span>
          </div>

          {/* Attention Pill if any cards are overdue, hold, or NCR */}
          {totalAttention > 0 && (
            <button
              type="button"
              onClick={() => setSort('attention')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                sort === 'attention'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
              }`}
              title="Filter or prioritize POs needing attention"
            >
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2]" />
              <span className="tabular-nums font-bold">{totalAttention}</span>
              <span>needs attention</span>
            </button>
          )}
        </div>

        {/* Right: Apple Segmented Sort & Expand Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Apple Segmented Control for Sort */}
          <div
            className={`flex items-center p-0.5 rounded-xl border shrink-0 ${
              isDarkMode ? 'bg-black/40 border-white/[0.08]' : 'bg-slate-100/90 border-slate-200/70'
            }`}
            role="radiogroup"
            aria-label="Sort job card groups"
          >
            {SORT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = sort === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSort(opt.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-[11px] font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white/10 text-white shadow-xs font-semibold'
                        : 'bg-white text-slate-900 shadow-xs font-semibold'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3 h-3 stroke-[2]" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Expand / Collapse Capsule Buttons */}
          <div
            className={`flex items-center p-0.5 rounded-xl border shrink-0 ${
              isDarkMode ? 'bg-black/40 border-white/[0.08]' : 'bg-slate-100/90 border-slate-200/70'
            }`}
          >
            <button
              type="button"
              onClick={() => setAll(true)}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-[10px] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-white'
              }`}
              title="Expand all purchase order groups"
              aria-label="Expand all purchase order groups"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Expand All</span>
            </button>
            <div className={`w-[1px] h-3.5 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
            <button
              type="button"
              onClick={() => setAll(false)}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-[10px] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-white'
              }`}
              title="Collapse all purchase order groups"
              aria-label="Collapse all purchase order groups"
            >
              <ChevronsDownUp className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Collapse All</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── PURCHASE ORDER GROUP CARDS (APPLE INSET GROUPED HIERARCHY) ──         */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {shown.map(g => {
          const open = isOpen(g);
          const panelId = `jc-group-${g.key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const limit = rowLimits[g.key] ?? rowsPerGroup;
          const rows = g.visible.slice(0, limit);
          const done = g.counts.COMPLETED;
          const summary = SEGMENTS.filter(s => g.counts[s.id] > 0)
            .map(s => `${g.counts[s.id]} ${s.label}`)
            .join(', ');

          const isAllDone = done === g.total && g.total > 0;
          const hasAttention = g.overdue > 0 || g.counts.QC_HOLD > 0 || g.ncr > 0;
          const isRunning = g.counts.RUNNING > 0;
          const donePercentage = g.total > 0 ? Math.round((done / g.total) * 100) : 0;
          const isInProgress = (donePercentage > 0 && !isAllDone) || isRunning;
          const isCopied = copiedKey === g.key;

          const getSegmentBarClass = (bucket: JobCardBucket): string => {
            if (bucket === 'COMPLETED') {
              return isAllDone
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-[#5B75F8] shadow-[0_0_8px_rgba(91,117,248,0.3)]';
            }
            if (bucket === 'RUNNING') {
              return 'bg-[#5B75F8] shadow-[0_0_8px_rgba(91,117,248,0.3)]';
            }
            if (bucket === 'QC_HOLD') {
              return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
            }
            return 'bg-slate-200 dark:bg-slate-700/60';
          };

          return (
            <section
              key={g.key}
              aria-label={`PO ${g.orderPo}`}
              className={`group/card rounded-[22px] border transition-all duration-200 overflow-hidden ${
                isDarkMode
                  ? 'border-white/[0.08] bg-[#121215]/85 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:border-white/[0.16]'
                  : 'border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.07)]'
              }`}
            >
              {/* ── CARD HEADER ROW (Apple HIG Aligned Grid Columns: exact match to GroupedByPoList) ── */}
              <div
                onClick={() => setOpenOverride(prev => ({ ...prev, [g.key]: !open }))}
                className="grid grid-cols-1 md:grid-cols-12 items-center gap-3.5 sm:gap-4 p-4 sm:p-4.5 cursor-pointer select-none transition-colors"
                role="button"
                tabIndex={0}
                aria-expanded={open}
                aria-controls={panelId}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenOverride(prev => ({ ...prev, [g.key]: !open }));
                  }
                }}
              >
                {/* Col 1-4: Squircle Avatar + PO Title + Meta */}
                <div className="col-span-1 md:col-span-4 flex items-center gap-3.5 min-w-0">
                  {/* Apple Squircle Icon Well */}
                  <div
                    className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover/card:scale-105 ${
                      hasAttention
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : isAllDone
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : isInProgress
                            ? 'bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border-blue-500/20'
                            : 'bg-slate-100/80 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 border-slate-200/80 dark:border-white/10'
                    }`}
                  >
                    {hasAttention ? (
                      <AlertTriangle className="w-5 h-5 stroke-[2]" />
                    ) : isAllDone ? (
                      <CheckCircle2 className="w-5 h-5 stroke-[2]" />
                    ) : isRunning ? (
                      <Activity className="w-5 h-5 stroke-[2]" />
                    ) : (
                      <Factory className="w-5 h-5 stroke-[1.8]" />
                    )}
                  </div>

                  {/* PO Title & Chips */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono font-bold text-sm tracking-tight text-slate-900 dark:text-white group-hover/card:text-[#5B75F8] dark:group-hover/card:text-[#7B92FF] transition-colors truncate">
                        {g.orderPo}
                      </span>

                      {/* Apple-style Copy PO Button */}
                      <button
                        type="button"
                        onClick={e => handleCopyPo(e, g.orderPo, g.key)}
                        aria-label={`Copy PO ${g.orderPo}`}
                        title={isCopied ? 'Copied to clipboard!' : 'Copy PO'}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : isDarkMode
                              ? 'text-slate-400 hover:text-white hover:bg-white/10'
                              : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {isCopied ? <Check className="w-3 h-3 stroke-[2.5]" /> : <Copy className="w-3 h-3" />}
                      </button>

                      {/* Total Count Capsule Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wide border tabular-nums ${
                          isDarkMode
                            ? 'border-white/[0.08] bg-white/[0.04] text-slate-300'
                            : 'border-slate-200/80 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {g.total} {g.total === 1 ? 'Card' : 'Cards'}
                      </span>
                    </div>

                    {/* Customer Name or Route Info */}
                    {g.customerName ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                        {g.customerName}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Production Traveler
                      </div>
                    )}
                  </div>
                </div>

                {/* Col 5-9: Apple Watch-Style Production Progress Bar (Exact column alignment) */}
                <div className="col-span-1 md:col-span-5 w-full">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      Production Progress
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        isAllDone
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isInProgress
                            ? 'text-[#5B75F8] dark:text-[#7B92FF]'
                            : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {donePercentage}% {isAllDone ? 'done' : isInProgress ? 'in progress' : 'done'}
                    </span>
                  </div>

                  {/* Multi-Segment Rounded Bar */}
                  <div
                    role="img"
                    aria-label={`${g.total} job cards: ${summary}`}
                    className={`flex h-2.5 w-full overflow-hidden rounded-full p-0.5 border ${
                      isDarkMode
                        ? 'bg-black/60 border-white/[0.06]'
                        : 'bg-slate-100 border-slate-200/70'
                    }`}
                  >
                    {g.total > 0 ? (
                      SEGMENTS.map(s =>
                        g.counts[s.id] > 0 ? (
                          <div
                            key={s.id}
                            className={`${getSegmentBarClass(s.id)} rounded-full transition-all duration-300`}
                            style={{ width: `${(g.counts[s.id] / g.total) * 100}%` }}
                            title={`${g.counts[s.id]} ${s.label}`}
                          />
                        ) : null
                      )
                    ) : (
                      <div className="w-full h-full bg-slate-300 dark:bg-slate-700/50 rounded-full" />
                    )}
                  </div>

                  {/* Micro Breakdown Details */}
                  <div className="mt-1.5 flex items-center flex-wrap justify-between gap-x-2.5 gap-y-1 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAllDone
                              ? 'bg-emerald-500'
                              : isInProgress
                                ? 'bg-[#5B75F8]'
                                : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                        <span
                          className={`font-semibold tabular-nums ${
                            isAllDone
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isInProgress
                                ? 'text-[#5B75F8] dark:text-[#7B92FF]'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {done}
                        </span>{' '}
                        done
                      </span>
                      {g.counts.RUNNING > 0 && (
                        <span className="inline-flex items-center gap-1 text-[#5B75F8] dark:text-[#7B92FF]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5B75F8]" />
                          <span className="font-semibold tabular-nums">
                            {g.counts.RUNNING}
                          </span>{' '}
                          running
                        </span>
                      )}
                      {g.counts.QC_HOLD > 0 && (
                        <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span className="tabular-nums">{g.counts.QC_HOLD}</span> QC hold
                        </span>
                      )}
                      {g.opsTotal > 0 && (
                        <span>• {g.opsDone}/{g.opsTotal} Ops</span>
                      )}
                    </div>
                    {g.nextDue && (
                      <span className="text-slate-500 dark:text-slate-400">
                        Due <strong className="text-slate-700 dark:text-slate-300">{fmtDate(g.nextDue)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Col 10-12: Status Badges & Apple Disclosure Chevron */}
                <div className="col-span-1 md:col-span-3 flex items-center justify-between md:justify-end gap-2.5 shrink-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    {/* All Done */}
                    {isAllDone && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>All Done</span>
                      </span>
                    )}

                    {/* Overdue */}
                    {g.overdue > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-rose-500/10 text-rose-500 border-rose-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>{g.overdue} Overdue</span>
                      </span>
                    )}

                    {/* QC Hold */}
                    {g.counts.QC_HOLD > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-rose-500/10 text-rose-500 border-rose-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{g.counts.QC_HOLD} QC Hold</span>
                      </span>
                    )}

                    {/* NCR */}
                    {g.ncr > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                        <AlertOctagon className="w-3 h-3" />
                        <span>{g.ncr} NCR</span>
                      </span>
                    )}
                  </div>

                  {/* Apple Disclosure Chevron Button */}
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 shrink-0 ${
                      open
                        ? 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                        : isDarkMode
                          ? 'bg-white/[0.04] border-white/10 text-slate-400 group-hover/card:bg-white/[0.08] group-hover/card:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-500 group-hover/card:bg-slate-200 group-hover/card:text-slate-800'
                    }`}
                  >
                    <ChevronRight
                      className={`w-4 h-4 transition-transform duration-300 ${
                        open ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* ── EXPANDED DRAWER (APPLE INSET TABLE STYLE) ── */}
              {open && (
                <div
                  id={panelId}
                  className={`border-t transition-colors duration-200 ${
                    isDarkMode
                      ? 'border-white/[0.06] bg-black/30'
                      : 'border-slate-200/70 bg-slate-50/60'
                  }`}
                >
                  {/* Subtle Filter Notice Header if items are filtered */}
                  {g.visible.length < g.total && (
                    <div
                      className={`flex items-center gap-2 px-5 py-2 text-[11px] font-mono border-b ${
                        isDarkMode
                          ? 'border-white/[0.04] bg-blue-500/[0.04] text-blue-400'
                          : 'border-slate-200/60 bg-blue-50/50 text-blue-700'
                      }`}
                    >
                      <Filter className="w-3 h-3 shrink-0" />
                      <span>
                        Showing {g.visible.length} of {g.total} job cards for this PO (matching active filters)
                      </span>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className={`border-b ${isDarkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/60'}`}>
                        <tr className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400 select-none">
                          <th className="py-4 px-6">Job Card #</th>
                          <th className="py-4 px-6">Part &amp; Description</th>
                          <th className="py-4 px-6">Quantity</th>
                          <th className="py-4 px-6">Current Operation / Machine</th>
                          <th className="py-4 px-6">Due Date</th>
                          <th className="py-4 px-6 text-center">Clearance Status</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/60'
                        }`}
                      >
                        {rows.map(jc => {
                          const bucket = bucketOf(jc);
                          const overdue = isOverdue(jc);
                          const isDone = bucket === 'COMPLETED';
                          const opsTotal = (jc.operations || []).length;
                          const opsDone = (jc.operations || []).filter(o => o.opStatus === 'COMPLETED').length;

                          return (
                            <tr
                              key={jc.jobNo}
                              onClick={() => onOpenJob(jc)}
                              className={`group transition-all duration-150 cursor-pointer ${
                                isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-white'
                              }`}
                            >
                              {/* 1st Column: Job Card # with Squircle Package Badge */}
                              <td className="py-4 px-6 whitespace-nowrap">
                                <div className="flex items-center gap-3.5">
                                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${
                                    isDarkMode
                                      ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10 text-white'
                                      : 'bg-gradient-to-br from-slate-50 to-slate-100/80 border-slate-200/80 text-slate-800 shadow-xs'
                                  }`}>
                                    <Package className="w-5 h-5 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black group-hover:underline">
                                      {jc.jobNo}
                                    </div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                                      <span className="font-mono">{g.orderPo}</span>
                                      {jc.partCode && (
                                        <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                          • {jc.partCode}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Part Code & Description */}
                              <td className="py-4 px-6 min-w-[200px]">
                                <div className="flex items-baseline gap-1.5 truncate">
                                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                    {jc.partCode}
                                  </span>
                                  {jc.partDescription && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      — {jc.partDescription}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Quantity */}
                              <td className="py-4 px-6 whitespace-nowrap">
                                <div className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                  {jc.targetQty || jc.qty}
                                  <span className="text-[10px] text-slate-400 uppercase font-medium ml-1">
                                    NOS
                                  </span>
                                </div>
                              </td>

                              {/* Current Operation / Machine */}
                              <td className="py-4 px-6 min-w-[160px]">
                                {opsTotal > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]"
                                      title={jc.currentOperation}
                                    >
                                      {jc.currentOperation}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold border ${
                                        isDarkMode
                                          ? 'border-white/10 bg-white/[0.04] text-slate-400'
                                          : 'border-slate-200 bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {opsDone}/{opsTotal}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 font-mono">
                                    {jc.machine || '—'}
                                  </span>
                                )}
                              </td>

                              {/* Target Date */}
                              <td className="py-4 px-6 whitespace-nowrap">
                                <span
                                  className={`font-mono text-xs ${
                                    overdue
                                      ? 'text-rose-500 font-bold'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {fmtDate(jc.targetDate)}
                                </span>
                              </td>

                              {/* Clearance Status Pill */}
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                                    isDone
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : PILL[bucket].cls
                                  }`}
                                >
                                  {jc.hasOpenNcr ? (
                                    <AlertTriangle
                                      className="w-3 h-3 text-amber-500 shrink-0"
                                      aria-label="Open NCR"
                                    />
                                  ) : isDone ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        PILL[bucket].dot
                                      } ${bucket === 'QC_HOLD' ? 'animate-ping' : ''}`}
                                    />
                                  )}
                                  <span>{isDone ? 'Done' : PILL[bucket].label}</span>
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-4 px-6 text-right whitespace-nowrap">
                                <div
                                  className="flex items-center justify-end gap-2"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {!isDone && bucket === 'NOT_STARTED' && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenJob(jc)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#5B75F8] hover:bg-[#4E67F0] text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                                      title="Start Production / Open Route Traveler"
                                    >
                                      <Play className="w-3 h-3 fill-current" />
                                      <span>Start Production</span>
                                    </button>
                                  )}
                                  {!isDone && bucket === 'RUNNING' && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenJob(jc)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#5B75F8] hover:bg-[#4E67F0] text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                                      title="Production In Progress — Open to log operations"
                                    >
                                      <Activity className="w-3 h-3" />
                                      <span>View / Log</span>
                                    </button>
                                  )}
                                  {!isDone && bucket === 'QC_HOLD' && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenJob(jc)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                                      title="QC Hold — Inspect Job Card"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>Inspect Hold</span>
                                    </button>
                                  )}
                                  {isDone && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenJob(jc)}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                                        isDarkMode
                                          ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                      }`}
                                      title="View Job Card Details"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>View Card</span>
                                    </button>
                                  )}
                                  <div
                                    onClick={() => onOpenJob(jc)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-[#5B75F8] group-hover:translate-x-0.5 transition-all cursor-pointer"
                                    title="Open Job Card"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Show more rows button */}
                  {g.visible.length > limit && (
                    <div className="px-5 py-3 border-t border-dashed border-slate-200 dark:border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() =>
                          setRowLimits(prev => ({ ...prev, [g.key]: limit + rowsPerGroup }))
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#5B75F8] dark:text-[#7B92FF] hover:bg-blue-500/10 transition-colors cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>
                          Show {Math.min(rowsPerGroup, g.visible.length - limit)} more cards (
                          {g.visible.length - limit} hidden)
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ── FOOTER: SHOW MORE PURCHASE ORDERS (APPLE CAPSULE BUTTON) ──            */}
      {/* ========================================================================= */}
      {sorted.length > groupLimit && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setGroupLimit(n => n + pageSize)}
            className={`flex items-center gap-2 px-5 h-10 rounded-full border text-xs font-semibold shadow-xs transition-all duration-200 cursor-pointer active:scale-95 ${
              isDarkMode
                ? 'border-white/10 bg-[#121215] text-slate-200 hover:bg-white/10 hover:border-white/20'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <ChevronDown className="w-4 h-4 text-[#5B75F8] dark:text-[#7B92FF]" />
            <span>
              Show {Math.min(pageSize, sorted.length - groupLimit)} more PO Batches ({sorted.length - groupLimit} remaining)
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
