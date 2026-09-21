import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Factory,
  Layers,
  Package,
  Play,
  Plus
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

const SEGMENTS: Array<{ id: JobCardBucket; label: string; bar: string; dot: string }> = [
  { id: 'COMPLETED', label: 'Done', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { id: 'RUNNING', label: 'Running', bar: 'bg-purple-500', dot: 'bg-purple-500' },
  { id: 'QC_HOLD', label: 'On QC Hold', bar: 'bg-rose-500', dot: 'bg-rose-500' },
  { id: 'NOT_STARTED', label: 'Not Started', bar: 'bg-slate-300 dark:bg-slate-600', dot: 'bg-slate-400' }
];

const PILL: Record<JobCardBucket, { cls: string; label: string }> = {
  COMPLETED: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', label: 'Done' },
  RUNNING: { cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30', label: 'Running' },
  QC_HOLD: { cls: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30', label: 'QC Hold' },
  NOT_STARTED: { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30', label: 'Scheduled' }
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

const SORT_LABEL: Record<GroupSort, string> = {
  recent: 'Most Recent',
  due: 'Due Date',
  attention: 'Attention'
};

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
  // Only what the user toggled is stored; everything else follows the default rule below.
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  const [groupLimit, setGroupLimit] = useState(pageSize);
  const [rowLimits, setRowLimits] = useState<Record<string, number>>({});

  // Filter out any PO groups that have 0 job cards: only show POs where JC is created
  const activeGroups = groups.filter(g => g.total > 0 && g.cards.length > 0);
  const sorted = sortGroups(activeGroups, sort);
  const shown = sorted.slice(0, groupLimit);
  const totalCards = activeGroups.reduce((n, g) => n + g.visible.length, 0);

  // Collapsed by default so 50-card POs never flood the page; a filter that narrows to a few POs opens them.
  const autoOpen = filtersActive && activeGroups.length <= 3;
  const isOpen = (g: JobCardGroup) => openOverride[g.key] ?? autoOpen;

  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    activeGroups.forEach(g => { next[g.key] = open; });
    setOpenOverride(next);
  };

  const divider = isDarkMode ? 'divide-white/[0.06]' : 'divide-slate-100';

  if (activeGroups.length === 0) {
    return (
      <div className={`p-10 rounded-3xl border text-center transition-all ${
        isDarkMode ? 'bg-[#121215] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 flex items-center justify-center mx-auto mb-3">
          <Factory className="w-6 h-6" />
        </div>
        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Job Cards Found</p>
        <p className="text-xs text-slate-400 mt-1">Try clearing or adjusting active filters to display production cards.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {/* ========================================================================= */}
      {/* ── TOP CONTROL STRIP (Apple HIG Segmented Controls & Actions) ──          */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* PO & Job Cards Summary Capsule */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/25 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            {activeGroups.length} PO {activeGroups.length === 1 ? 'Batch' : 'Batches'}
          </span>
          <span className="text-slate-400 dark:text-slate-600">•</span>
          <span className="text-xs font-mono font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
            {totalCards} Job Cards
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* macOS Segmented Sort Picker */}
          <div
            className={`p-1 rounded-xl border flex items-center gap-1 ${
              isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {(['recent', 'due', 'attention'] as GroupSort[]).map(k => {
              const active = sort === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSort(k)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {SORT_LABEL[k]}
                </button>
              );
            })}
          </div>

          {/* Expand / Collapse Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAll(true)}
              className={`inline-flex items-center gap-1 h-8 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 shadow-2xs'
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Expand All</span>
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              className={`inline-flex items-center gap-1 h-8 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 shadow-2xs'
              }`}
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Collapse All</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── INSET GROUPED PO CARDS LIST ──                                         */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {shown.map(g => {
          const open = isOpen(g);
          const panelId = `jc-group-${g.key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const limit = rowLimits[g.key] ?? rowsPerGroup;
          const rows = g.visible.slice(0, limit);
          const done = g.counts.COMPLETED;
          const summary = SEGMENTS.filter(s => g.counts[s.id] > 0).map(s => `${g.counts[s.id]} ${s.label}`).join(', ');

          return (
            <section
              key={g.key}
              aria-label={`PO ${g.orderPo}`}
              className={`rounded-[20px] border transition-all duration-200 overflow-hidden ${
                isDarkMode
                  ? 'border-white/[0.08] bg-[#121215] shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:border-white/[0.14]'
                  : 'border-slate-200/80 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.04)] hover:border-slate-300'
              }`}
            >
              {/* Group Accordion Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-4.5">
                {/* Left: Accordion trigger & PO Meta */}
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenOverride(prev => ({ ...prev, [g.key]: !open }))}
                  className="flex items-center gap-3 min-w-0 text-left cursor-pointer group flex-1 basis-[240px]"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 border ${
                    open
                      ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-xs'
                      : isDarkMode
                        ? 'bg-white/[0.04] border-white/[0.08] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight truncate">
                        {g.orderPo}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                        isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}>
                        {g.total} {g.total === 1 ? 'Card' : 'Cards'}
                      </span>
                    </div>
                    {g.customerName && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                        {g.customerName}
                      </div>
                    )}
                  </div>
                </button>

                {/* Center: Apple Multi-Segment Progress Bar & Metrics */}
                <div className="flex-1 basis-[220px] min-w-[180px] max-w-md">
                  <div
                    role="img"
                    aria-label={`${g.total} job cards: ${summary}`}
                    className={`flex h-2.5 w-full overflow-hidden rounded-full p-0.5 border ${
                      isDarkMode ? 'bg-black/40 border-white/[0.06]' : 'bg-slate-100 border-slate-200/60'
                    }`}
                  >
                    {g.total > 0 ? (
                      SEGMENTS.map(s => g.counts[s.id] > 0 && (
                        <div
                          key={s.id}
                          className={`${s.bar} rounded-full transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                          style={{ width: `${(g.counts[s.id] / g.total) * 100}%` }}
                          title={`${g.counts[s.id]} ${s.label}`}
                        />
                      ))
                    ) : (
                      <div className="w-full h-full bg-slate-300 dark:bg-slate-700/50 rounded-full" />
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${done > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {done}/{g.total}
                      </span>
                      <span>Done</span>
                      {g.opsTotal > 0 && <span>• {g.opsDone}/{g.opsTotal} Ops</span>}
                    </div>
                    {g.nextDue && (
                      <span className="text-slate-500 dark:text-slate-400">
                        Due <strong className="text-slate-700 dark:text-slate-300">{fmtDate(g.nextDue)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Apple Status Lozenges & Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Done Status Badges */}
                  {done === g.total && g.total > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>All Done</span>
                    </span>
                  )}
                  {done > 0 && done < g.total && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{done} Done</span>
                    </span>
                  )}

                  {/* Overdue */}
                  {g.overdue > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-rose-500/10 text-rose-500 border-rose-500/30">
                      <Clock className="w-3 h-3" />
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
              </div>

              {/* Expanded Job Cards Table */}
              {open && (
                <div id={panelId} className={`border-t ${isDarkMode ? 'border-white/[0.06] bg-black/20' : 'border-slate-100 bg-slate-50/40'}`}>
                  {g.visible.length < g.total && (
                    <div className={`px-5 py-2.5 text-[10px] font-mono border-b ${
                      isDarkMode ? 'text-slate-400 border-white/[0.04]' : 'text-slate-500 border-slate-200/60'
                    }`}>
                      Showing {g.visible.length} of {g.total} job cards for this PO (active filters applied)
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] select-none ${
                          isDarkMode
                            ? 'border-white/[0.06] bg-black/30 text-slate-400'
                            : 'border-slate-200 bg-slate-50/90 text-slate-500'
                        }`}>
                          <th className="py-3 px-5">Job Card</th>
                          <th className="py-3 px-4">Part & Description</th>
                          <th className="py-3 px-4">Quantity</th>
                          <th className="py-3 px-4">Current Operation / Machine</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4">Clearance Status</th>
                          <th className="py-3 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${divider}`}>
                        {/* 1. Existing Released Job Cards */}
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
                              className={`group transition-colors cursor-pointer ${
                                isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-white'
                              }`}
                            >
                              {/* 1st Column: Bold Job Card # with Squircle Package Badge */}
                              <td className="py-3.5 px-5 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/20 flex items-center justify-center shrink-0">
                                    <Package className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] group-hover:underline">
                                    {jc.jobNo}
                                  </span>
                                </div>
                              </td>

                              {/* Part Code & Description */}
                              <td className="py-3.5 px-4 min-w-[200px]">
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
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                  {jc.targetQty || jc.qty}
                                  <span className="text-[10px] text-slate-400 uppercase font-medium ml-1">NOS</span>
                                </div>
                              </td>

                              {/* Current Operation / Machine */}
                              <td className="py-3.5 px-4 min-w-[160px]">
                                {opsTotal > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={jc.currentOperation}>
                                      {jc.currentOperation}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold border ${
                                      isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                                    }`}>
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
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`font-mono text-xs ${overdue ? 'text-rose-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {fmtDate(jc.targetDate)}
                                </span>
                              </td>

                              {/* Status Pill: Supports Done Status */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                                  isDone
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : PILL[bucket].cls
                                }`}>
                                  {jc.hasOpenNcr && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" aria-label="Open NCR" />}
                                  {isDone ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <span className={`w-1.5 h-1.5 rounded-full ${SEGMENTS.find(s => s.id === bucket)?.dot || 'bg-slate-400'}`} />
                                  )}
                                  <span>{isDone ? 'Done' : PILL[bucket].label}</span>
                                </span>
                              </td>

                              {/* Action: Start Production / View / Log / View Card & open chevron */}
                              <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  {!isDone && bucket === 'NOT_STARTED' && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenJob(jc)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-xs active:scale-95 transition-all cursor-pointer"
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
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
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
                                    className="p-1 rounded-lg text-slate-400 hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 transition-all cursor-pointer"
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
                    <div className={`px-5 py-3 border-t ${isDarkMode ? 'border-white/[0.04] bg-white/[0.01]' : 'border-slate-200/60 bg-slate-50/50'}`}>
                      <button
                        type="button"
                        onClick={() => setRowLimits(prev => ({ ...prev, [g.key]: limit + rowsPerGroup }))}
                        className="text-xs font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
                      >
                        Show {Math.min(rowsPerGroup, g.visible.length - limit)} more ({g.visible.length - limit} hidden)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Show more groups pagination */}
      {sorted.length > groupLimit && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setGroupLimit(n => n + pageSize)}
            className={`inline-flex items-center gap-2 px-5 h-10 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
              isDarkMode
                ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <span>Show {Math.min(pageSize, sorted.length - groupLimit)} More PO Batches</span>
            <span className="font-mono text-[10px] text-slate-400">({sorted.length - groupLimit} remaining)</span>
          </button>
        </div>
      )}
    </div>
  );
};
