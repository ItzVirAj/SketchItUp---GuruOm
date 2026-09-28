import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Clock,
  XCircle,
  FileCheck,
  LayoutGrid,
  List,
  Activity,
  ArrowUpDown,
  Filter,
  Layers,
  ChevronRight,
  FileSpreadsheet,
  Package
} from 'lucide-react';
import { QCInspection } from '../../../types/console';
import { triggerQCFailure } from '../../../services/notificationService';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { useCanPerformCta } from '../../../hooks/useCtaPermission';
import { GroupedByPoList } from '../../common/GroupedByPoList';
import { groupByPo, inspectionBucket } from '../../../utils/poGroups';
import { useAccentTheme } from '../../../context/AccentThemeContext';

interface QCViewProps {
  qcItems?: QCInspection[];
  qcQueue?: QCInspection[];
  isDarkMode?: boolean;
  onInspectSubmit?: (id: string, status: 'PASS' | 'QC_HOLD' | 'REJECTED', notes: string) => void;
  onUpdateQC?: (id: string, status: any, notes: string) => void;
}

export const QCView: React.FC<QCViewProps> = ({
  qcItems,
  qcQueue,
  isDarkMode = true,
  onInspectSubmit,
  onUpdateQC
}) => {
  const { accent, isGreen, isBlue, isCrystal } = useAccentTheme();
  const canPerformCta = useCanPerformCta();
  const initialItems = qcItems || qcQueue || [];
  const [localQc, setLocalQc] = useState<QCInspection[]>(initialItems);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  // 'grouped' (one row per PO) is the default so a 50-line PO does not flood the queue; the choice is remembered.
  const [viewMode, setViewModeState] = useState<'grouped' | 'table' | 'grid'>(() => {
    try {
      const saved = window.localStorage.getItem('qcViewMode');
      if (saved === 'grouped' || saved === 'table' || saved === 'grid') return saved;
    } catch { /* storage unavailable: use default */ }
    return 'grouped';
  });
  const setViewMode = (mode: 'grouped' | 'table' | 'grid') => {
    setViewModeState(mode);
    try { window.localStorage.setItem('qcViewMode', mode); } catch { /* ignore */ }
  };
  const inspectModal = useUrlModal('inspect-qc');
  const [inspectingItem, setInspectingItem] = useState<QCInspection | null>(null);
  const [qcDecision, setQcDecision] = useState<'PASS' | 'QC_HOLD' | 'REJECTED'>('PASS');
  const [qcNotes, setQcNotes] = useState('');

  useEffect(() => {
    if (qcItems || qcQueue) {
      setLocalQc(qcItems || qcQueue || []);
    }
  }, [qcItems, qcQueue]);

  // Sync inspection item from URL
  useEffect(() => {
    if (inspectModal.isOpen) {
      const { qcId, jobNo, orderPo } = inspectModal.params;
      if (qcId || jobNo || orderPo) {
        const found = localQc.find(q => (qcId && q.id === qcId) || (jobNo && q.jobNo === jobNo) || (orderPo && q.orderPo === orderPo));
        if (found) {
          setInspectingItem(found);
          const current = found.qcStatus === 'PASSED' ? 'PASS' : found.qcStatus === 'REJECTED' ? 'REJECTED' : found.qcStatus === 'QC_HOLD' ? 'QC_HOLD' : 'PASS';
          setQcDecision(current as any);
          setQcNotes(found.inspectorNotes || '');
        }
      }
    } else {
      setInspectingItem(null);
    }
  }, [inspectModal.isOpen, inspectModal.params.qcId, inspectModal.params.jobNo, inspectModal.params.orderPo, localQc]);

  // Deduplicate items by unique orderPo + jobNo (keep the latest)
  const deduplicatedItems = useMemo(() => {
    // localQc is ordered newest-first (created_at DESC), so keep the FIRST item seen per key - if a
    // job ever ends up with more than one QC record, the newest one wins, not a stale earlier one.
    const map = new Map<string, QCInspection>();
    for (const item of localQc) {
      const key = `${(item.orderPo || '').trim().toUpperCase()}_${(item.jobNo || '').trim().toUpperCase()}`;
      const dedupeKey = key !== '_' ? key : item.id;
      if (!map.has(dedupeKey)) {
        map.set(dedupeKey, item);
      }
    }
    return Array.from(map.values());
  }, [localQc]);

  const filteredQc = useMemo(() => {
    return deduplicatedItems.filter(q => {
      const matchesFilter = filterStatus === 'ALL' || q.qcStatus === filterStatus;
      const matchesSearch = (q.jobNo || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (q.partDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (q.orderPo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (q.partCode || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [deduplicatedItems, filterStatus, searchQuery]);

  const handleInspectSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingItem) return;
    
    // Instant optimistic update for ONLY the reviewed item. A sibling job card on the same order
    // has not been reviewed - marking it too here would flash the wrong status until the next
    // refresh corrects it, which is exactly the "shows pass then reverts to pending" symptom.
    setLocalQc(prev => prev.map(q => {
      if (q.id === inspectingItem.id) {
        return {
          ...q,
          qcStatus: qcDecision,
          inspectorNotes: qcNotes || q.inspectorNotes,
          inspectedAt: new Date().toISOString()
        };
      }
      return q;
    }));

    if (onInspectSubmit) onInspectSubmit(inspectingItem.id, qcDecision, qcNotes);
    if (onUpdateQC) onUpdateQC(inspectingItem.id, qcDecision, qcNotes);

    // Fire live in-app push notification on rejection or hold
    if (qcDecision === 'REJECTED' || qcDecision === 'QC_HOLD') {
      triggerQCFailure(
        inspectingItem.partDescription || inspectingItem.partCode || `Job ${inspectingItem.jobNo}`,
        qcNotes || (qcDecision === 'REJECTED' ? 'Lot rejected in quality inspection' : 'Lot placed on QC Hold'),
        'Final QC',
        'QC Inspector'
      ).catch(() => {});
    }

    setInspectingItem(null);
    setQcNotes('');
    inspectModal.close();
  };

  const handleExportCSV = () => {
    const headers = ['Job Card #', 'Customer PO', 'Part Code', 'Part Description', 'Quantity', 'QC Status', 'Inspector Notes'];
    const rows = filteredQc.map(q => [
      `"${q.jobNo || ''}"`,
      `"${q.orderPo || ''}"`,
      `"${q.partCode || ''}"`,
      `"${q.partDescription || ''}"`,
      q.qty || 0,
      `"${q.qcStatus || 'PENDING'}"`,
      `"${(q.inspectorNotes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `QC_Audit_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCount = deduplicatedItems.length;
  const pendingCount = deduplicatedItems.filter(q => q.qcStatus === 'PENDING').length;
  const passCount = deduplicatedItems.filter(q => q.qcStatus === 'PASS' || q.qcStatus === 'PASSED').length;
  const holdCount = deduplicatedItems.filter(q => q.qcStatus === 'QC_HOLD').length;
  const rejectCount = deduplicatedItems.filter(q => q.qcStatus === 'REJECTED').length;
  const inspectedCount = passCount + holdCount + rejectCount;
  const yieldRate = inspectedCount > 0 ? Math.round((passCount / inspectedCount) * 100) : 100;
  const passPct = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;
  const pendingPct = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;
  const holdPct = totalCount > 0 ? Math.round((holdCount / totalCount) * 100) : 0;
  const rejectPct = totalCount > 0 ? Math.round((rejectCount / totalCount) * 100) : 0;

  const openInspection = (item: QCInspection) => {
    setInspectingItem(item);
    const current = item.qcStatus === 'PASS' ? 'PASS' : item.qcStatus === 'REJECTED' ? 'REJECTED' : item.qcStatus === 'QC_HOLD' ? 'QC_HOLD' : 'PASS';
    setQcDecision(current as any);
    setQcNotes(item.inspectorNotes || '');
    inspectModal.open({ qcId: item.id, jobNo: item.jobNo, orderPo: item.orderPo });
  };

  // Grouped-by-PO view: aggregates cover every inspection of the PO, only the listed rows follow the filters.
  const qcFiltersActive = filterStatus !== 'ALL' || !!searchQuery.trim();
  const filteredQcSet = new Set(filteredQc);
  const qcGroups = viewMode === 'grouped'
    ? groupByPo<QCInspection>(deduplicatedItems, {
        getPo: q => q.orderPo,
        bucketOf: q => inspectionBucket(q.qcStatus),
        matches: q => filteredQcSet.has(q)
      })
    : [];

  // Compact row for the grouped view. Same actions and the same permission check as the table row.
  const renderQcGroupRow = (qc: QCInspection) => {
    const bucket = inspectionBucket(qc.qcStatus);
    const pill =
      bucket === 'PASS' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : bucket === 'HOLD' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      : bucket === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      : 'bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border-blue-500/20';
    return (
      <div className={`flex flex-wrap items-center gap-3 px-5 py-2.5 transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
        <button
          type="button"
          onClick={() => openInspection(qc)}
          className="group flex flex-1 min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/20 flex items-center justify-center shrink-0">
            <Package className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] w-[130px] shrink-0 truncate group-hover:underline">{qc.jobNo}</span>
          <span className={`min-w-0 flex-1 basis-[180px] text-xs truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <span className="font-mono font-bold">{qc.partCode}</span>
            {qc.partDescription && <span className="text-slate-400"> — {qc.partDescription}</span>}
          </span>
          <span className={`font-mono font-bold text-xs tabular-nums w-[70px] shrink-0 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {qc.qty} <span className="text-[10px] text-slate-400 uppercase font-medium">NOS</span>
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${pill}`}>
            {qc.qcStatus || 'PENDING'}
          </span>
        </button>
        {canPerformCta('UPLOAD_QC_REPORT') && (
          <button
            type="button"
            onClick={() => openInspection(qc)}
            className={`h-8 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isDarkMode 
                ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-sm' 
                : 'bg-[#181920] text-white hover:bg-[#252730] shadow-sm'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Audit Decision</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-6">

      {/* ========================================================================= */}
      {/* ── MOBILE-FIRST TOP HEADER (< md) ──                                      */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Quality &amp; Metrology
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              QC Inspection ({filteredQc.length})
            </h1>
          </div>

          {pendingCount > 0 && canPerformCta('UPLOAD_QC_REPORT') && (
            <button
              type="button"
              onClick={() => {
                const firstPending = deduplicatedItems.find(q => q.qcStatus === 'PENDING') || deduplicatedItems[0];
                if (firstPending) openInspection(firstPending);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#181920] hover:bg-[#252730] text-white text-xs font-bold shadow-md active:scale-[0.96] transition-ui cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Audit Next ({pendingCount})</span>
            </button>
          )}
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total Lots</div>
            <div className="text-base font-black text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight mt-0.5">
              {totalCount} <span className="text-xs font-normal text-slate-400">Lots</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Pending Audit</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5">
              {pendingCount} <span className="text-xs font-normal text-slate-400">Lots</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">First-Pass Yield</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {yieldRate}% <span className="text-xs font-normal text-slate-400">Passed</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Defect / Hold</div>
            <div className={`text-base font-black tracking-tight mt-0.5 ${holdCount + rejectCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {holdCount + rejectCount > 0 ? `${holdCount + rejectCount} Defect` : '0 Defects'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP HEADER & INTEGRATED KPI ROW (≥ md) ──                          */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        <section className={`relative isolate overflow-hidden rounded-2xl border transition-all duration-300 ${
          isDarkMode
            ? isCrystal
              ? 'border-white/10 bg-gradient-to-b from-[#181C24] via-[#10131A] to-[#0A0C10] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6)]'
              : isGreen
                ? 'border-emerald-500/20 bg-gradient-to-b from-[#0D241B] via-[#081711] to-[#030B07] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(16,185,129,0.12)]'
                : 'border-blue-500/20 bg-gradient-to-b from-[#0a1836] via-[#071126] to-[#030712] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(21,93,252,0.15)]'
            : isCrystal
              ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] text-slate-950 shadow-[0_16px_40px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.95)]'
              : isGreen
                ? 'border-emerald-600/30 bg-gradient-to-b from-[#0A7E58] via-[#086B4A] to-[#044F36] text-white shadow-[0_16px_40px_rgba(10,126,88,0.22)]'
                : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
        }`}>
          {/* Light-scheme only: whisper-faint drafting grid for crystal theme */}
          {!isDarkMode && isCrystal && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_72%)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent_72%)]"
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 sm:py-7">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                  isDarkMode
                    ? 'bg-white/10 border border-white/15 text-white'
                    : isCrystal
                      ? 'bg-slate-900/[0.06] border border-slate-900/10 text-slate-800'
                      : 'bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs'
                }`}>
                  <span className={`h-2 w-2 rounded-full animate-pulse ${
                    isCrystal && !isDarkMode ? 'bg-emerald-500' : isGreen ? 'bg-emerald-400' : 'bg-sky-400'
                  }`} />
                  <span>Quality Assurance &amp; Metrology</span>
                </span>
                <span className={`text-sm font-semibold ${isCrystal && !isDarkMode ? 'text-slate-400' : 'text-white/80'}`}>•</span>
                <span className={`text-xs sm:text-sm font-semibold ${isCrystal && !isDarkMode ? 'text-slate-600' : 'text-white/95'}`}>
                  {totalCount} Inspection Lots
                </span>
              </div>

              <h1 className={`text-3xl sm:text-[32px] font-black tracking-tight leading-tight ${
                isCrystal && !isDarkMode ? 'text-slate-950' : 'text-white'
              }`}>
                Quality Control &amp; Metrology
              </h1>

              <p className={`text-xs sm:text-sm font-medium leading-relaxed max-w-2xl ${
                isCrystal && !isDarkMode ? 'text-slate-600' : 'text-white/95'
              }`}>
                Inspect manufactured components against engineering tolerances, record defect root-causes, and clear passed batches for Pre-Dispatch Inspection (PDI).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isDarkMode
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    : isCrystal
                      ? 'bg-slate-900/[0.06] hover:bg-slate-900/10 text-slate-800 border border-slate-900/15'
                      : 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md'
                }`}
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Export CSV</span>
              </button>

              {pendingCount > 0 && canPerformCta('UPLOAD_QC_REPORT') && (
                <button
                  type="button"
                  onClick={() => {
                    const firstPending = deduplicatedItems.find(q => q.qcStatus === 'PENDING') || deduplicatedItems[0];
                    if (firstPending) openInspection(firstPending);
                  }}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                    isDarkMode
                      ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                      : isCrystal
                        ? 'bg-slate-950 hover:bg-slate-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
                        : isGreen
                          ? 'bg-white hover:bg-emerald-50 text-[#065F46] shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
                          : 'bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Audit Next Pending ({pendingCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
            isDarkMode
              ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
              : isCrystal
                ? 'border-slate-200/80 bg-slate-50/70'
                : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
          }`}>
            {[
              {
                label: 'Total Lots in Queue',
                value: String(totalCount),
                detail: 'Batches registered in queue',
                icon: ShieldCheck,
                iconColor: isDarkMode ? 'text-white' : (isCrystal ? 'text-white' : (isGreen ? 'text-[#065F46]' : 'text-[#155dfc]')),
                iconBg: isDarkMode ? (isGreen ? 'bg-emerald-600 shadow-xs' : 'bg-blue-600 shadow-xs') : (isCrystal ? 'bg-slate-900 shadow-xs' : 'bg-white shadow-xs'),
              },
              {
                label: 'Pending Metrology',
                value: String(pendingCount),
                detail: 'Awaiting QC clearance',
                icon: Clock,
                iconColor: 'text-white',
                iconBg: pendingCount > 0 ? 'bg-amber-500 shadow-xs' : 'bg-emerald-500 shadow-xs',
              },
              {
                label: 'First-Pass Yield',
                value: `${yieldRate}%`,
                detail: `${passCount} lots cleared clean`,
                icon: CheckCircle2,
                iconColor: 'text-white',
                iconBg: 'bg-emerald-500 shadow-xs',
              },
              {
                label: 'QC Hold / Defect',
                value: String(holdCount + rejectCount),
                detail: holdCount > 0 ? `${holdCount} on hold` : 'Zero defect clearance',
                icon: AlertTriangle,
                iconColor: 'text-white',
                iconBg: (holdCount + rejectCount > 0) ? 'bg-rose-500 shadow-xs' : 'bg-emerald-500 shadow-xs',
              },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className={`flex items-center gap-4 px-6 py-5 transition-all ${
                    index > 0 ? (isDarkMode ? 'lg:border-l border-white/10' : (isCrystal ? 'lg:border-l border-slate-200/80' : 'lg:border-l border-white/20')) : ''
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${metric.iconBg} ${metric.iconColor}`}>
                    <MetricIcon className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold uppercase tracking-wider ${
                      isCrystal && !isDarkMode ? 'text-slate-500' : 'text-white/85'
                    }`}>
                      {metric.label}
                    </div>
                    <div className={`text-2xl sm:text-[26px] font-black tracking-tight tabular-nums my-0.5 leading-tight ${
                      isCrystal && !isDarkMode ? 'text-slate-950' : 'text-white'
                    }`}>
                      {metric.value}
                    </div>
                    <div className={`text-xs font-medium truncate ${
                      isCrystal && !isDarkMode ? 'text-slate-600' : 'text-white/90'
                    }`}>
                      {metric.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Apple Quality Metrology Distribution Bar */}
          <div className={`px-6 py-4 border-t ${
            isDarkMode
              ? 'border-white/10 bg-black/40'
              : isCrystal
                ? 'border-slate-200/80 bg-slate-100/60'
                : 'border-white/20 bg-black/10'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${isCrystal && !isDarkMode ? 'text-slate-700' : 'text-white'}`} />
                <span className={`text-xs font-bold tracking-tight ${isCrystal && !isDarkMode ? 'text-slate-900' : 'text-white'}`}>
                  Quality Assurance Distribution &amp; First-Pass Yield (FPY)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  {yieldRate}% First-Pass Yield
                </span>
              </div>
              <span className={`text-xs ${isCrystal && !isDarkMode ? 'text-slate-500 font-medium' : 'text-white/70'}`}>
                {inspectedCount} of {totalCount} lots audited
              </span>
            </div>

            {/* Multi-Segmented Pro Bar */}
            <div className={`h-2.5 w-full rounded-full overflow-hidden flex p-0.5 gap-0.5 border ${
              isCrystal && !isDarkMode ? 'bg-slate-200/80 border-slate-300/60' : 'bg-white/20 border-white/15'
            }`}>
              {passCount > 0 && (
                <div 
                  style={{ width: `${(passCount / (totalCount || 1)) * 100}%` }} 
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
                  title={`Passed: ${passCount} (${passPct}%)`}
                />
              )}
              {pendingCount > 0 && (
                <div 
                  style={{ width: `${(pendingCount / (totalCount || 1)) * 100}%` }} 
                  className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                  title={`Pending: ${pendingCount} (${pendingPct}%)`}
                />
              )}
              {holdCount > 0 && (
                <div 
                  style={{ width: `${(holdCount / (totalCount || 1)) * 100}%` }} 
                  className="h-full bg-orange-400 rounded-full transition-all duration-500" 
                  title={`Hold: ${holdCount} (${holdPct}%)`}
                />
              )}
              {rejectCount > 0 && (
                <div 
                  style={{ width: `${(rejectCount / (totalCount || 1)) * 100}%` }} 
                  className="h-full bg-rose-400 rounded-full transition-all duration-500" 
                  title={`Rejected: ${rejectCount} (${rejectPct}%)`}
                />
              )}
            </div>

            {/* Legend Pills */}
            <div className="flex items-center flex-wrap gap-3 sm:gap-5 mt-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className={`font-medium ${isCrystal && !isDarkMode ? 'text-slate-500' : 'text-white/70'}`}>Passed:</span>
                <span className={`font-bold tabular-nums ${isCrystal && !isDarkMode ? 'text-slate-900' : 'text-white'}`}>{passCount} ({passPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className={`font-medium ${isCrystal && !isDarkMode ? 'text-slate-500' : 'text-white/70'}`}>Pending:</span>
                <span className={`font-bold tabular-nums ${isCrystal && !isDarkMode ? 'text-slate-900' : 'text-white'}`}>{pendingCount} ({pendingPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className={`font-medium ${isCrystal && !isDarkMode ? 'text-slate-500' : 'text-white/70'}`}>QC Hold:</span>
                <span className={`font-bold tabular-nums ${isCrystal && !isDarkMode ? 'text-slate-900' : 'text-white'}`}>{holdCount} ({holdPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className={`font-medium ${isCrystal && !isDarkMode ? 'text-slate-500' : 'text-white/70'}`}>Rejected:</span>
                <span className={`font-bold tabular-nums ${isCrystal && !isDarkMode ? 'text-slate-900' : 'text-white'}`}>{rejectCount} ({rejectPct}%)</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── APPLE 2-TIER COMMAND DECK & FILTERS ── */}
        <div className={`rounded-2xl border p-3.5 transition-all ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
            : 'border-slate-200 bg-white shadow-xs'
        }`}>
          <div className="space-y-3">
            {/* Tier 1: Segmented tab buttons with counts + Live telemetry chip + View Switchers */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`inline-flex items-center p-1 rounded-xl border text-xs overflow-x-auto max-w-full ${
                isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
              }`}>
                {[
                  { id: 'ALL', label: 'All Lots', count: totalCount, isAlert: false },
                  { id: 'PENDING', label: 'Pending', count: pendingCount, isAlert: pendingCount > 0 },
                  { id: 'PASS', label: 'Passed', count: passCount, isAlert: false },
                  { id: 'QC_HOLD', label: 'QC Hold', count: holdCount, isAlert: holdCount > 0 },
                  { id: 'REJECTED', label: 'Rejected', count: rejectCount, isAlert: rejectCount > 0 },
                ].map(tab => {
                  const isActive = filterStatus === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterStatus(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        isActive
                          ? isDarkMode
                            ? tab.isAlert
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs'
                              : 'bg-white/15 text-white shadow-xs border border-white/10'
                            : tab.isAlert
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                            : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                          : isDarkMode
                          ? tab.isAlert
                            ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                            : 'text-slate-400 hover:text-white'
                          : tab.isAlert
                          ? 'text-rose-700 hover:text-rose-800 hover:bg-rose-100/50'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? isDarkMode
                            ? tab.isAlert ? 'bg-rose-500/30 text-rose-200' : 'bg-white/20 text-white'
                            : tab.isAlert ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                          : isDarkMode
                          ? tab.isAlert ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-slate-400'
                          : tab.isAlert ? 'bg-rose-100 text-rose-800' : 'bg-slate-300/60 text-slate-600'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Telemetry pill & View switcher */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                  isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-white text-slate-600 shadow-2xs'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Showing {filteredQc.length} of {totalCount} records
                </span>

                {/* View switcher */}
                <div className={`flex items-center p-0.5 rounded-xl border shrink-0 ${
                  isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/80 bg-slate-100/80'
                }`}>
                  <button
                    type="button"
                    onClick={() => setViewMode('grouped')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'grouped'
                        ? isDarkMode ? 'bg-white/15 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title="Group by PO"
                    aria-label="Group by PO"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? isDarkMode ? 'bg-white/15 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title="Table View"
                    aria-label="Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? isDarkMode ? 'bg-white/15 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title="Cards Grid View"
                    aria-label="Cards Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tier 2: Spotlight search */}
            <div className={`relative flex items-center rounded-xl border transition-all ${
              isDarkMode
                ? 'border-white/10 bg-black/40 text-white focus-within:border-white/25 focus-within:bg-black/60'
                : 'border-slate-200/90 bg-white text-slate-900 focus-within:border-slate-400 focus-within:shadow-xs'
            }`}>
              <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Job Card #, Customer PO, Part Code, Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pl-10 pr-24 py-2.5 text-xs font-medium outline-none placeholder:text-slate-400 font-sans"
              />
              <div className="absolute right-3 flex items-center gap-2">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className={`hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                    isDarkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'
                  }`}>
                    ⌘F
                  </kbd>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── MOBILE QC CARDS (Viewport < md) ──                                     */}
      {/* ========================================================================= */}
      {viewMode === 'grouped' && (
        <GroupedByPoList
          groups={qcGroups}
          isDarkMode={isDarkMode}
          getKey={(q: QCInspection) => q.id}
          bucketOf={(q: QCInspection) => inspectionBucket(q.qcStatus)}
          renderRow={renderQcGroupRow}
          filtersActive={qcFiltersActive}
          emptyTitle="No QC inspection records matching your query."
        />
      )}

      {viewMode !== 'grouped' && (
      <div className="block md:hidden space-y-3">
        {filteredQc.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border text-xs font-mono ${
            isDarkMode ? 'bg-[#121215] border-white/[0.08] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No inspection records found matching your filters.
          </div>
        ) : (
          filteredQc.map((qc) => {
            const isPassed = qc.qcStatus === 'PASS' || qc.qcStatus === 'PASSED';
            const isHold = qc.qcStatus === 'QC_HOLD';
            const isRejected = qc.qcStatus === 'REJECTED';

            return (
              <div
                key={qc.id}
                onClick={() => openInspection(qc)}
                className={`p-4 rounded-2xl border transition-all space-y-3.5 shadow-sm cursor-pointer ${
                  isPassed
                    ? isDarkMode ? 'bg-[#121215] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isHold
                    ? isDarkMode ? 'bg-[#121215] border-amber-500/30' : 'bg-amber-50/40 border-amber-200'
                    : isRejected
                    ? isDarkMode ? 'bg-[#121215] border-rose-500/30' : 'bg-rose-50/40 border-rose-200'
                    : isDarkMode ? 'bg-[#121215] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Job Card # + Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                        {qc.jobNo}
                      </span>
                      {qc.orderPo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/20">
                          {qc.orderPo}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-xs font-bold font-sans mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {qc.partDescription}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border shrink-0 ${
                    isPassed
                      ? isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : isHold
                      ? isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'
                      : isRejected
                      ? isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'
                      : isDarkMode ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPassed ? 'bg-emerald-500' : isHold ? 'bg-amber-500' : isRejected ? 'bg-rose-500' : 'bg-blue-500'
                    }`} />
                    <span>{qc.qcStatus || 'PENDING'}</span>
                  </span>
                </div>

                {/* Part Code & Quantity Detail */}
                <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs text-center ${
                  isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Part Code</span>
                    <span className="font-semibold font-mono text-slate-700 dark:text-slate-200">{qc.partCode || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Inspect Quantity</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">{qc.qty} NOS</span>
                  </div>
                </div>

                {/* Inspector Remarks */}
                {qc.inspectorNotes && (
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    isDarkMode ? 'bg-black/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`}>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase font-mono">Notes:</span>
                    <span>{qc.inspectorNotes}</span>
                  </div>
                )}

                {/* Action CTA Button */}
                {canPerformCta('UPLOAD_QC_REPORT') && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInspection(qc);
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-[0.98] ${
                      isDarkMode 
                        ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-sm' 
                        : 'bg-[#181920] text-white hover:bg-[#252730] shadow-sm'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Audit QC Decision</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      )}

      {/* ========================================================================= */}
      {/* ── DESKTOP VIEW: TABLE OR INSPECTOR CARD GRID (Viewport >= md) ──         */}
      {/* ========================================================================= */}
      {viewMode === 'table' ? (
        <div className={`hidden md:block overflow-hidden rounded-3xl border transition-all duration-300 ${
          isDarkMode
            ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_24px_50px_rgba(0,0,0,0.6)]'
            : 'border-slate-200 bg-white shadow-xs'
        }`}>
          {/* Specular top edge highlight line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />

          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200 bg-white'}`}>
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Quality Control (QC) Metrology Register</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Incoming, in-process, and final inspection clearance tracking</div>
            </div>
            <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              {filteredQc.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`border-b ${isDarkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'}`}>
                <tr className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
                  <th className="py-4 px-6">Job Card #</th>
                  <th className="py-4 px-6">Customer PO</th>
                  <th className="py-4 px-6">Part Description</th>
                  <th className="py-4 px-6 text-right">Inspect Qty</th>
                  <th className="py-4 px-6 text-center">QC Status</th>
                  <th className="py-4 px-6">Inspector Notes</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200/80'}`}>
                {filteredQc.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-mono text-xs">
                      No QC inspection records matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredQc.map((qc) => {
                    const isPassed = qc.qcStatus === 'PASS' || qc.qcStatus === 'PASSED';
                    const isHold = qc.qcStatus === 'QC_HOLD';
                    const isRejected = qc.qcStatus === 'REJECTED';

                    return (
                      <tr 
                        key={qc.id} 
                        onClick={() => openInspection(qc)}
                        className={`group transition-all duration-200 cursor-pointer ${
                          isDarkMode 
                            ? 'hover:bg-white/[0.03] border-b border-white/[0.04]' 
                            : 'hover:bg-slate-50/90 border-b border-slate-100'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${
                              isDarkMode
                                ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10 text-white'
                                : 'bg-gradient-to-br from-slate-50 to-slate-100/80 border-slate-200/80 text-slate-800 shadow-xs'
                            }`}>
                              <ShieldCheck className="w-5 h-5 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-mono text-sm tracking-tight text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] font-black">
                                {qc.jobNo}
                              </div>
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                                {qc.partCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs">
                          {qc.orderPo ? (
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {qc.orderPo}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className={`py-4 px-6 font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          <span className="font-semibold text-slate-900 dark:text-white">{qc.partCode}</span>
                          {qc.partDescription && (
                            <span className="text-slate-400 dark:text-slate-500"> — {qc.partDescription}</span>
                          )}
                        </td>
                        <td className={`py-4 px-6 text-right font-black font-mono text-xs tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {qc.qty} NOS
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                            isPassed
                              ? isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : isHold
                              ? isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'
                              : isRejected
                              ? isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'
                              : isDarkMode ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isPassed ? 'bg-emerald-500' : isHold ? 'bg-amber-500' : isRejected ? 'bg-rose-500' : 'bg-blue-500'
                            }`} />
                            <span>{qc.qcStatus || 'PENDING'}</span>
                          </span>
                        </td>
                        <td className={`py-4 px-6 text-xs truncate max-w-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {qc.inspectorNotes || <span className="text-slate-400/60 italic">Awaiting audit notes</span>}
                        </td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          {canPerformCta('UPLOAD_QC_REPORT') && (
                            <button
                              type="button"
                              onClick={() => openInspection(qc)}
                              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs ${
                                isDarkMode 
                                  ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-sm' 
                                  : 'bg-[#181920] hover:bg-[#252730] text-white shadow-sm'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Audit Decision</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Inspector Cards View */
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQc.length === 0 ? (
            <div className={`col-span-full p-12 text-center rounded-2xl border text-xs ${
              isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              No QC inspection records matching your query.
            </div>
          ) : (
            filteredQc.map((qc) => {
              const isPassed = qc.qcStatus === 'PASS' || qc.qcStatus === 'PASSED';
              const isHold = qc.qcStatus === 'QC_HOLD';
              const isRejected = qc.qcStatus === 'REJECTED';

              return (
                <div
                  key={qc.id}
                  onClick={() => openInspection(qc)}
                  className={`p-5 rounded-2xl border transition-all space-y-3.5 shadow-xs cursor-pointer hover:shadow-md ${
                    isPassed
                      ? isDarkMode ? 'bg-[#09090B] border-emerald-500/30 hover:border-emerald-500/50' : 'bg-white border-emerald-200 hover:border-emerald-300'
                      : isHold
                      ? isDarkMode ? 'bg-[#09090B] border-amber-500/30 hover:border-amber-500/50' : 'bg-white border-amber-200 hover:border-amber-300'
                      : isRejected
                      ? isDarkMode ? 'bg-[#09090B] border-rose-500/30 hover:border-rose-500/50' : 'bg-white border-rose-200 hover:border-rose-300'
                      : isDarkMode ? 'bg-[#09090B] border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                        {qc.jobNo}
                      </span>
                      <h3 className={`text-sm font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {qc.partCode}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {qc.partDescription || 'Precision Machined Component'}
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border shrink-0 ${
                      isPassed
                        ? isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : isHold
                        ? isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'
                        : isRejected
                        ? isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'
                        : isDarkMode ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isPassed ? 'bg-emerald-500' : isHold ? 'bg-amber-500' : isRejected ? 'bg-rose-500' : 'bg-blue-500'
                      }`} />
                      <span>{qc.qcStatus || 'PENDING'}</span>
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs text-center ${
                    isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Customer PO</span>
                      <span className="font-semibold font-mono text-slate-700 dark:text-slate-200">{qc.orderPo || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Lot Size</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">{qc.qty} NOS</span>
                    </div>
                  </div>

                  {qc.inspectorNotes ? (
                    <div className={`p-2.5 rounded-xl border text-xs line-clamp-2 ${
                      isDarkMode ? 'bg-black/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'
                    }`}>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase font-mono">Notes:</span>
                      <span>{qc.inspectorNotes}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">No notes recorded yet</div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-400 font-medium">Click to audit</span>
                    {canPerformCta('UPLOAD_QC_REPORT') && (
                      <button
                        type="button"
                        onClick={() => openInspection(qc)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer ${
                          isDarkMode 
                            ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-sm' 
                            : 'bg-[#181920] hover:bg-[#252730] text-white shadow-sm'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Audit QC</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* ── APPLE SHEET INSPECTION AUDIT MODAL ──                                  */}
      {/* ========================================================================= */}
      {inspectModal.isOpen && inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md font-sans overflow-y-auto">
          <div className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#181920] text-white shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all overflow-hidden font-sans">
            {/* Mobile Grab Handle */}
            <div className="pt-2.5 pb-0 block sm:hidden">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
            </div>

            {/* Modal Window Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#181920] shrink-0">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                  qcDecision === 'PASS'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : qcDecision === 'QC_HOLD'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {qcDecision === 'PASS' ? (
                    <ShieldCheck className="w-5 h-5 stroke-[2]" />
                  ) : qcDecision === 'QC_HOLD' ? (
                    <Clock className="w-5 h-5 stroke-[2]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 stroke-[2]" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight text-white">
                    Record QC Metrology Audit
                  </h3>
                  <p className="text-xs text-white/60">
                    Drawing compliance & dimensional tolerances
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setInspectingItem(null);
                  inspectModal.close();
                }} 
                className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInspectSave} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Batch Metadata Card */}
              <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white font-mono">{inspectingItem.jobNo}</span>
                  {inspectingItem.orderPo && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white/90 border border-white/15">
                      PO: {inspectingItem.orderPo}
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-white/90">
                  <span className="font-bold text-white">{inspectingItem.partCode}</span>
                  {inspectingItem.partDescription && ` — ${inspectingItem.partDescription}`}
                </div>
                <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/10">
                  <span>Inspection Batch Quantity:</span>
                  <span className="font-bold text-emerald-400 tabular-nums">{inspectingItem.qty} NOS</span>
                </div>
              </div>

              {/* Inspection Decision Buttons (Apple HIG Radio Cards) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white/60">
                  Inspection Decision *
                </label>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  {/* PASS */}
                  {canPerformCta('MARK_READY_TO_DISPATCH') && (
                    <button
                      type="button"
                      onClick={() => setQcDecision('PASS')}
                      className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        qcDecision === 'PASS' 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30 font-bold' 
                          : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2]" />
                      <span className="font-semibold text-xs">Pass QC</span>
                      <span className="text-[10px] text-emerald-400/80 font-medium">Approved</span>
                    </button>
                  )}

                  {/* QC HOLD */}
                  <button
                    type="button"
                    onClick={() => setQcDecision('QC_HOLD')}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      qcDecision === 'QC_HOLD' 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30 font-bold' 
                        : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Clock className="w-5 h-5 text-amber-400 stroke-[2]" />
                    <span className="font-semibold text-xs">QC Hold</span>
                    <span className="text-[10px] text-amber-400/80 font-medium">Quarantine</span>
                  </button>

                  {/* REJECT */}
                  {canPerformCta('RAISE_NCR_REWORK') && (
                    <button
                      type="button"
                      onClick={() => setQcDecision('REJECTED')}
                      className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        qcDecision === 'REJECTED' 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-xs ring-1 ring-rose-500/30 font-bold' 
                          : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <XCircle className="w-5 h-5 text-rose-400 stroke-[2]" />
                      <span className="font-semibold text-xs">Reject</span>
                      <span className="text-[10px] text-rose-400/80 font-medium">Defect</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Tap Defect / Verification Chips */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-white/60 block">
                  Quick Remarks Preset:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Drawing dimensions verified OK',
                    'Surface finish Ra 0.8 compliant',
                    'Plating thickness verified 12µm',
                    'Visual inspection passed',
                    'Minor burr — deburring required',
                    'Dimension deviation ±0.05mm',
                    'Surface scratch defect',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQcNotes(prev => prev ? `${prev}, ${preset}` : preset);
                      }}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-white/10 bg-white/[0.06] text-white hover:bg-white/15 transition-all cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks Textarea */}
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5">
                  Inspector Remarks & Notes
                </label>
                <textarea
                  rows={2}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Record drawing compliance, surface finish, dimensional tolerances..."
                  className="w-full rounded-xl border border-white/15 bg-white/[0.05] text-white placeholder-white/40 px-3.5 py-2.5 text-xs outline-none transition-all focus:border-white/40"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3.5 border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
                <button 
                  type="button" 
                  onClick={() => {
                    setInspectingItem(null);
                    inspectModal.close();
                  }} 
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-full border border-white/15 bg-white/[0.06] text-white hover:bg-white/15 text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                {canPerformCta('UPLOAD_QC_REPORT') && (
                  <button 
                    type="submit" 
                    className={`flex-1 sm:flex-initial px-6 py-2 rounded-full text-xs font-bold cursor-pointer shadow-md transition-all active:scale-[0.96] ${
                      isDarkMode
                        ? 'bg-[#181920] hover:bg-[#252730] text-white border border-white/25'
                        : 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/20'
                    }`}
                  >
                    Save QC Audit ({qcDecision})
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default QCView;
