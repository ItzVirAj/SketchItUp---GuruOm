import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Factory } from 'lucide-react';
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
  /** True when a search/status/attention filter is active: a handful of matching POs open by themselves. */
  filtersActive?: boolean;
  /** POs shown before "Show more" (default 20). */
  pageSize?: number;
  /** Cards listed per expanded PO before "Show more" (default 25). */
  rowsPerGroup?: number;
}

const SEGMENTS: Array<{ id: JobCardBucket; label: string; bar: string; dot: string }> = [
  { id: 'COMPLETED', label: 'completed', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { id: 'RUNNING', label: 'running', bar: 'bg-purple-500', dot: 'bg-purple-500' },
  { id: 'QC_HOLD', label: 'on QC hold', bar: 'bg-rose-500', dot: 'bg-rose-500' },
  { id: 'NOT_STARTED', label: 'not started', bar: 'bg-slate-300 dark:bg-slate-600', dot: 'bg-slate-400' }
];

const PILL: Record<JobCardBucket, { cls: string; label: string }> = {
  COMPLETED: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', label: 'Completed' },
  RUNNING: { cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30', label: 'Running' },
  QC_HOLD: { cls: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30', label: 'QC hold' },
  NOT_STARTED: { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30', label: 'Not started' }
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

const SORT_LABEL: Record<GroupSort, string> = { recent: 'Most recent', due: 'Due date', attention: 'Needs attention first' };

export const JobCardsGroupedList: React.FC<JobCardsGroupedListProps> = ({
  groups,
  isDarkMode,
  onOpenJob,
  onReleaseMore,
  filtersActive = false,
  pageSize = 20,
  rowsPerGroup = 25
}) => {
  const [sort, setSort] = useState<GroupSort>('recent');
  // Only what the user toggled is stored; everything else follows the default rule below.
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  const [groupLimit, setGroupLimit] = useState(pageSize);
  const [rowLimits, setRowLimits] = useState<Record<string, number>>({});

  const sorted = sortGroups(groups, sort);
  const shown = sorted.slice(0, groupLimit);
  const totalCards = groups.reduce((n, g) => n + g.visible.length, 0);

  // Collapsed by default so 50-card POs never flood the page; a filter that narrows to a few POs opens them.
  const autoOpen = filtersActive && groups.length <= 3;
  const isOpen = (g: JobCardGroup) => openOverride[g.key] ?? autoOpen;

  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    groups.forEach(g => { next[g.key] = open; });
    setOpenOverride(next);
  };

  const surface = isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]';
  const divider = isDarkMode ? 'divide-white/[0.06]' : 'divide-slate-100';
  const muted = 'text-slate-400';

  if (groups.length === 0) {
    return (
      <div className={`p-8 rounded-3xl border text-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <Factory className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No job cards found</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`text-[11px] font-mono ${muted}`}>
          {groups.length} PO{groups.length === 1 ? '' : 's'} · {totalCards} job card{totalCards === 1 ? '' : 's'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`flex items-center gap-1.5 text-[11px] font-mono ${muted}`}>
            Sort
            <select
              value={sort}
              onChange={e => setSort(e.target.value as GroupSort)}
              className={`h-8 rounded-lg border px-2 text-[11px] font-mono cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              {(Object.keys(SORT_LABEL) as GroupSort[]).map(k => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setAll(true)} className={`h-8 px-2.5 rounded-lg border text-[11px] font-bold cursor-pointer ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            Expand all
          </button>
          <button type="button" onClick={() => setAll(false)} className={`h-8 px-2.5 rounded-lg border text-[11px] font-bold cursor-pointer ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            Collapse all
          </button>
        </div>
      </div>

      <div className={`rounded-[22px] border overflow-hidden divide-y ${surface} ${divider}`}>
        {shown.map(g => {
          const open = isOpen(g);
          const panelId = `jc-group-${g.key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const limit = rowLimits[g.key] ?? rowsPerGroup;
          const rows = g.visible.slice(0, limit);
          const done = g.counts.COMPLETED;
          const summary = SEGMENTS.filter(s => g.counts[s.id] > 0).map(s => `${g.counts[s.id]} ${s.label}`).join(', ');

          return (
            <section key={g.key} aria-label={`PO ${g.orderPo}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenOverride(prev => ({ ...prev, [g.key]: !open }))}
                  className="flex items-center gap-2 min-w-0 text-left cursor-pointer flex-1 basis-[200px]"
                >
                  {open ? <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" /> : <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />}
                  <span className="min-w-0">
                    <span className="block font-mono font-black text-sm text-[var(--accent-primary)] truncate">{g.orderPo}</span>
                    {g.customerName && <span className={`block text-[11px] truncate ${muted}`}>{g.customerName}</span>}
                  </span>
                </button>

                <div className="flex-1 basis-[200px] min-w-[160px]">
                  <div
                    role="img"
                    aria-label={`${g.total} job cards: ${summary}`}
                    className={`flex h-2 w-full overflow-hidden rounded-full ${isDarkMode ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
                  >
                    {SEGMENTS.map(s => g.counts[s.id] > 0 && (
                      <div key={s.id} className={s.bar} style={{ width: `${(g.counts[s.id] / g.total) * 100}%` }} />
                    ))}
                  </div>
                  <div className={`mt-1 flex flex-wrap gap-x-3 text-[10px] font-mono ${muted}`}>
                    <span><strong className="text-slate-700 dark:text-slate-200">{done}/{g.total}</strong> done</span>
                    {g.opsTotal > 0 && <span>{g.opsDone}/{g.opsTotal} ops</span>}
                    {g.nextDue && <span>next due {fmtDate(g.nextDue)}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {g.overdue > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-rose-500/10 text-rose-500 border-rose-500/30">
                      {g.overdue} overdue
                    </span>
                  )}
                  {g.counts.QC_HOLD > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-rose-500/10 text-rose-500 border-rose-500/30">
                      {g.counts.QC_HOLD} QC hold
                    </span>
                  )}
                  {g.ncr > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      {g.ncr} NCR
                    </span>
                  )}
                  {!!g.unreleasedLines && g.unreleasedLines > 0 && (
                    onReleaseMore ? (
                      <button
                        type="button"
                        onClick={() => onReleaseMore(g.orderPo)}
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20 cursor-pointer"
                        title="Release job cards for the lines that don't have one yet"
                      >
                        {g.unreleasedLines} line{g.unreleasedLines === 1 ? '' : 's'} to release →
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                        {g.unreleasedLines} line{g.unreleasedLines === 1 ? '' : 's'} unreleased
                      </span>
                    )
                  )}
                </div>
              </div>

              {open && (
                <div id={panelId} className={`border-t ${isDarkMode ? 'border-white/[0.06] bg-black/20' : 'border-slate-100 bg-slate-50/60'}`}>
                  {g.visible.length < g.total && (
                    <div className={`px-4 pt-2 text-[10px] font-mono ${muted}`}>
                      Showing {g.visible.length} of {g.total} job cards for this PO (filters active)
                    </div>
                  )}
                  <ul className={`divide-y ${divider}`}>
                    {rows.map(jc => {
                      const bucket = bucketOf(jc);
                      const overdue = isOverdue(jc);
                      const opsTotal = (jc.operations || []).length;
                      const opsDone = (jc.operations || []).filter(o => o.opStatus === 'COMPLETED').length;
                      return (
                        <li key={jc.jobNo}>
                          <button
                            type="button"
                            onClick={() => onOpenJob(jc)}
                            className={`w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-left cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-white'}`}
                          >
                            <span className="font-mono font-bold text-xs text-[var(--accent-primary)] w-[130px] shrink-0 truncate">{jc.jobNo}</span>
                            <span className="min-w-0 flex-1 basis-[180px] text-xs truncate text-slate-800 dark:text-slate-200">
                              <span className="font-mono font-bold">{jc.partCode}</span>
                              <span className={muted}> — {jc.partDescription}</span>
                            </span>
                            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 w-[70px] shrink-0">{jc.targetQty || jc.qty} NOS</span>
                            <span className={`text-[11px] font-mono w-[150px] shrink-0 truncate ${muted}`} title={jc.currentOperation}>
                              {opsTotal > 0 ? `${jc.currentOperation} · ${opsDone}/${opsTotal}` : (jc.machine || '—')}
                            </span>
                            <span className={`text-[11px] font-mono w-[64px] shrink-0 ${overdue ? 'text-rose-500 font-bold' : muted}`}>
                              {fmtDate(jc.targetDate)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border shrink-0 flex items-center gap-1 ${PILL[bucket].cls}`}>
                              {jc.hasOpenNcr && <AlertTriangle className="w-3 h-3" aria-label="Open NCR" />}
                              {PILL[bucket].label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {g.visible.length > limit && (
                    <div className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setRowLimits(prev => ({ ...prev, [g.key]: limit + rowsPerGroup }))}
                        className="text-[11px] font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
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

      {sorted.length > groupLimit && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setGroupLimit(n => n + pageSize)}
            className={`px-4 h-9 rounded-xl border text-xs font-bold cursor-pointer ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            Show {Math.min(pageSize, sorted.length - groupLimit)} more POs ({sorted.length - groupLimit} hidden)
          </button>
        </div>
      )}
    </div>
  );
};
