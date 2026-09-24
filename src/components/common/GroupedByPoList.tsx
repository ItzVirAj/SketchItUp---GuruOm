import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Package,
  Copy,
  Check,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import {
  INSPECTION_BUCKETS,
  orderRows,
  sortPoGroups,
  type InspectionBucket,
  type PoGroup,
  type PoGroupSort
} from '../../utils/poGroups';

/**
 * Props for GroupedByPoList.
 * Visually redesigned using Apple Human Interface Guidelines (macOS/iOS HIG):
 * - Glassmorphic elevated cards with subtle specular borders and backdrop blur.
 * - Apple-style segmented controls and capsule toolbars.
 * - Multi-segment metrology progress bar with first-pass yield metrics.
 * - Inset grouped row hierarchy with accessible disclosure affordances.
 */
interface GroupedByPoListProps<T> {
  /** Already filtered: `visible` is what gets listed, `items` feeds the summary. */
  groups: PoGroup<T>[];
  isDarkMode: boolean;
  getKey: (item: T) => string;
  bucketOf: (item: T) => InspectionBucket;
  renderRow: (item: T) => React.ReactNode;
  noun?: { singular: string; plural: string };
  /** Label for the REJECTED bucket ("rejected" for QC, "failed" for PDI). */
  rejectedLabel?: string;
  /** True when a search/status filter is active: a handful of matching POs open by themselves. */
  filtersActive?: boolean;
  /** POs shown before "Show more" (default 20). */
  pageSize?: number;
  /** Items listed per expanded PO before "Show more" (default 25). */
  rowsPerGroup?: number;
  emptyTitle?: string;
  emptyHint?: string;
}

const BAR_COLOR: Record<InspectionBucket, string> = {
  PASS: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  PENDING: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.25)]',
  HOLD: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]',
  REJECTED: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
};

const SORT_OPTIONS: { id: PoGroupSort; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'attention', label: 'Needs Attention', icon: AlertTriangle },
  { id: 'pending', label: 'Most Pending', icon: Layers }
];

export function GroupedByPoList<T>({
  groups,
  isDarkMode,
  getKey,
  bucketOf,
  renderRow,
  noun = { singular: 'inspection', plural: 'inspections' },
  rejectedLabel = 'rejected',
  filtersActive = false,
  pageSize = 20,
  rowsPerGroup = 25,
  emptyTitle = 'No records found',
  emptyHint = 'Try adjusting your search criteria or active filters'
}: GroupedByPoListProps<T>): React.ReactElement {
  const [sort, setSort] = useState<PoGroupSort>('recent');
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  const [groupLimit, setGroupLimit] = useState(pageSize);
  const [rowLimits, setRowLimits] = useState<Record<string, number>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const label: Record<InspectionBucket, string> = {
    PASS: 'passed',
    PENDING: 'pending',
    HOLD: 'on hold',
    REJECTED: rejectedLabel
  };

  const sorted = sortPoGroups(groups, sort);
  const shown = sorted.slice(0, groupLimit);
  const totalItems = groups.reduce((n, g) => n + g.visible.length, 0);
  const totalAttention = groups.reduce((n, g) => n + g.counts.HOLD + g.counts.REJECTED, 0);
  const plural = (n: number) => (n === 1 ? noun.singular : noun.plural);

  // Auto-open if specific filters isolate 3 or fewer groups
  const autoOpen = filtersActive && groups.length <= 3;
  const isOpen = (g: PoGroup<T>) => openOverride[g.key] ?? autoOpen;

  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    groups.forEach(g => { next[g.key] = open; });
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
  if (groups.length === 0) {
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
          <ShieldCheck className="w-7 h-7 stroke-[1.75]" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
          {emptyTitle}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          {emptyHint}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 w-full">
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
            <Package className="w-3.5 h-3.5 text-[#5B75F8] dark:text-[#7B92FF]" />
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {groups.length}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              PO{groups.length === 1 ? '' : 's'}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {totalItems}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {plural(totalItems)}
            </span>
          </div>

          {/* Attention Pill if there are holds/rejects */}
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
            aria-label="Sort purchase orders"
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
          const panelId = `po-group-${g.key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const limit = rowLimits[g.key] ?? rowsPerGroup;
          const rows = orderRows(g.visible, bucketOf);
          const listed = rows.slice(0, limit);
          const summary = INSPECTION_BUCKETS.filter(b => g.counts[b] > 0)
            .map(b => `${g.counts[b]} ${label[b]}`)
            .join(', ');

          const isAllPassed = g.counts.PASS === g.total && g.total > 0;
          const hasAttention = g.counts.HOLD > 0 || g.counts.REJECTED > 0;
          const passPercentage = g.total > 0 ? Math.round((g.counts.PASS / g.total) * 100) : 0;
          const isInProgress = passPercentage > 0 && !isAllPassed;
          const isCopied = copiedKey === g.key;

          const getSegmentColor = (bucket: InspectionBucket): string => {
            if (bucket === 'PASS') {
              return isAllPassed
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-[#5B75F8] shadow-[0_0_8px_rgba(91,117,248,0.3)]';
            }
            if (bucket === 'PENDING') {
              return 'bg-slate-200 dark:bg-slate-700/60';
            }
            if (bucket === 'HOLD') {
              return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
            }
            return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
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
              {/* ── CARD HEADER ROW (Apple HIG Aligned Grid Columns) ── */}
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
                {/* Col 1-4: Status Avatar + PO Title + Copy Trigger */}
                <div className="col-span-1 md:col-span-4 flex items-center gap-3.5 min-w-0">
                  {/* Apple Squircle Icon Well */}
                  <div
                    className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover/card:scale-105 ${
                      hasAttention
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : isAllPassed
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : isInProgress
                            ? 'bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border-blue-500/20'
                            : 'bg-slate-100/80 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 border-slate-200/80 dark:border-white/10'
                    }`}
                  >
                    {hasAttention ? (
                      <AlertTriangle className="w-5 h-5 stroke-[2]" />
                    ) : isAllPassed ? (
                      <CheckCircle2 className="w-5 h-5 stroke-[2]" />
                    ) : (
                      <Package className="w-5 h-5 stroke-[1.8]" />
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
                        {g.total} {plural(g.total)}
                      </span>
                    </div>

                    {/* Micro Secondary Info */}
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Metrology Queue</span>
                      {hasAttention && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Requires review
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Col 5-9: Apple Watch-Style Metrology Progress Meter (Locked in aligned column) */}
                <div className="col-span-1 md:col-span-5 w-full">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      Completion Status
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        isAllPassed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isInProgress
                            ? 'text-[#5B75F8] dark:text-[#7B92FF]'
                            : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {passPercentage}% {isAllPassed ? 'passed' : isInProgress ? 'in progress' : 'passed'}
                    </span>
                  </div>

                  {/* Multi-Segment Rounded Bar */}
                  <div
                    role="img"
                    aria-label={`${g.total} ${plural(g.total)}: ${summary}`}
                    className={`flex h-2.5 w-full overflow-hidden rounded-full p-0.5 border ${
                      isDarkMode
                        ? 'bg-black/60 border-white/[0.06]'
                        : 'bg-slate-100 border-slate-200/70'
                    }`}
                  >
                    {INSPECTION_BUCKETS.map(b =>
                      g.counts[b] > 0 ? (
                        <div
                          key={b}
                          className={`${getSegmentColor(b)} rounded-full transition-all duration-300`}
                          style={{ width: `${(g.counts[b] / g.total) * 100}%` }}
                          title={`${g.counts[b]} ${label[b]}`}
                        />
                      ) : null
                    )}
                  </div>

                  {/* Micro Breakdown Details */}
                  <div className="mt-1.5 flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[10px] font-mono text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isAllPassed
                            ? 'bg-emerald-500'
                            : isInProgress
                              ? 'bg-[#5B75F8]'
                              : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                      <span
                        className={`font-semibold tabular-nums ${
                          isAllPassed
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isInProgress
                              ? 'text-[#5B75F8] dark:text-[#7B92FF]'
                              : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {g.counts.PASS}
                      </span>{' '}
                      passed
                    </span>
                    {g.counts.PENDING > 0 && (
                      <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span className="font-semibold tabular-nums">
                          {g.counts.PENDING}
                        </span>{' '}
                        pending
                      </span>
                    )}
                    {g.counts.HOLD > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="tabular-nums">{g.counts.HOLD}</span> on hold
                      </span>
                    )}
                    {g.counts.REJECTED > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="tabular-nums">{g.counts.REJECTED}</span> {rejectedLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Col 10-12: Status Pills & Apple Disclosure Chevron */}
                <div className="col-span-1 md:col-span-3 flex items-center justify-between md:justify-end gap-2.5 shrink-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    {g.counts.HOLD > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {g.counts.HOLD} Hold
                      </span>
                    )}
                    {g.counts.REJECTED > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {g.counts.REJECTED} {rejectedLabel}
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

              {/* ── EXPANDED DRAWER (APPLE INSET LIST STYLE) ── */}
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
                        Showing {g.visible.length} of {g.total} {plural(g.total)} for this PO (matching active filters)
                      </span>
                    </div>
                  )}

                  {/* Rows List */}
                  <ul
                    className={`divide-y ${
                      isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/60'
                    }`}
                  >
                    {listed.map(item => (
                      <li
                        key={getKey(item)}
                        className={`transition-colors duration-150 ${
                          isDarkMode ? 'hover:bg-white/[0.025]' : 'hover:bg-white'
                        }`}
                      >
                        {renderRow(item)}
                      </li>
                    ))}
                  </ul>

                  {/* Show More Items Button */}
                  {rows.length > limit && (
                    <div className="px-5 py-3 border-t border-dashed border-slate-200 dark:border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() =>
                          setRowLimits(prev => ({
                            ...prev,
                            [g.key]: limit + rowsPerGroup
                          }))
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#5B75F8] dark:text-[#7B92FF] hover:bg-blue-500/10 transition-colors cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>
                          Show {Math.min(rowsPerGroup, rows.length - limit)} more items (
                          {rows.length - limit} hidden)
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
              Show {Math.min(pageSize, sorted.length - groupLimit)} more POs ({sorted.length - groupLimit} remaining)
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
