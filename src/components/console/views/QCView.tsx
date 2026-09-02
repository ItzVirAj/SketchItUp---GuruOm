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
  FileSpreadsheet
} from 'lucide-react';
import { QCInspection } from '../../../types/console';
import { triggerQCFailure } from '../../../services/notificationService';
import { useUrlModal } from '../../../hooks/useUrlModal';

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
  const initialItems = qcItems || qcQueue || [];
  const [localQc, setLocalQc] = useState<QCInspection[]>(initialItems);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
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
    const map = new Map<string, QCInspection>();
    for (const item of localQc) {
      const key = `${(item.orderPo || '').trim().toUpperCase()}_${(item.jobNo || '').trim().toUpperCase()}`;
      if (key !== '_') {
        map.set(key, item);
      } else {
        map.set(item.id, item);
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
    
    const targetPo = inspectingItem.orderPo;

    // Instant optimistic update in local state for this item and all items matching the same orderPo/jobNo
    setLocalQc(prev => prev.map(q => {
      if (q.id === inspectingItem.id || (targetPo && q.orderPo === targetPo)) {
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

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-6">
      
      {/* ========================================================================= */}
      {/* ── TOP HEADER & TELEMETRY (macOS Executive Window) ──                     */}
      {/* ========================================================================= */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isDarkMode 
          ? 'bg-[#09090B] border-white/10 text-white shadow-[0_4px_24px_rgba(0,0,0,0.4)]' 
          : 'bg-white/90 border-slate-200/80 shadow-xs text-slate-900 backdrop-blur-xl'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
                  Quality Assurance
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  • Drawing Compliance & Metrology Verification
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                Quality Control & Metrology
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                Inspect manufactured components against engineering tolerances, record defect root-causes, and clear passed batches for Pre-Dispatch Inspection (PDI).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10' 
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-xs'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Quick First Pending CTA */}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  const firstPending = deduplicatedItems.find(q => q.qcStatus === 'PENDING') || deduplicatedItems[0];
                  if (firstPending) openInspection(firstPending);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-[0.98]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Audit Next Pending ({pendingCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Stat Cards Grid - Apple Desktop Widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
          {/* Total Queue */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Lots in Queue</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF]">
                <ShieldCheck className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{totalCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF]">Batches</span>
            </div>
          </div>

          {/* Pending QC */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Metrology</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{pendingCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Awaiting Audit</span>
            </div>
          </div>

          {/* Passed First-Pass Quality */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Passed Quality</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{passCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {yieldRate}% Yield
              </span>
            </div>
          </div>

          {/* Quarantine / Reject */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Quarantine / Reject</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                holdCount + rejectCount > 0 
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                <AlertTriangle className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold tracking-tight ${holdCount + rejectCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {holdCount + rejectCount}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                holdCount + rejectCount > 0 
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                {holdCount > 0 ? `${holdCount} Hold` : 'Zero Defect'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Apple Quality Metrology Distribution Bar ── */}
        <div className={`p-4 rounded-2xl border transition-all mt-4 ${
          isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-slate-50 border-slate-200/70'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#007AFF] dark:text-[#0A84FF]" />
              <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                Quality Assurance Distribution & First-Pass Yield (FPY)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {yieldRate}% First-Pass Yield
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {inspectedCount} of {totalCount} lots audited
            </span>
          </div>

          {/* Multi-Segmented Pro Bar */}
          <div className="h-2.5 w-full rounded-full bg-slate-200/60 dark:bg-black/60 overflow-hidden flex p-0.5 gap-0.5 border border-slate-200/40 dark:border-white/5">
            {passCount > 0 && (
              <div 
                style={{ width: `${(passCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
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
                className="h-full bg-amber-600 rounded-full transition-all duration-500" 
                title={`Hold: ${holdCount} (${holdPct}%)`}
              />
            )}
            {rejectCount > 0 && (
              <div 
                style={{ width: `${(rejectCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                title={`Rejected: ${rejectCount} (${rejectPct}%)`}
              />
            )}
          </div>

          {/* Legend Pills */}
          <div className="flex items-center flex-wrap gap-3 sm:gap-5 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Passed:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{passCount} ({passPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Pending:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{pendingCount} ({pendingPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">QC Hold:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{holdCount} ({holdPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Rejected:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{rejectCount} ({rejectPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── FILTER & SEARCH TOOLBAR (Apple Segmented Control & View Mode) ──       */}
      {/* ========================================================================= */}
      <div className={`p-3 sm:p-4 rounded-2xl border transition-all space-y-3 ${
        isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white/90 border-slate-200/80 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Apple Segmented Control */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border overflow-x-auto no-scrollbar shrink-0 ${
            isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-100/80 border-slate-200/80'
          }`}>
            {[
              { id: 'ALL', label: 'All Lots', count: totalCount },
              { id: 'PENDING', label: 'Pending', count: pendingCount },
              { id: 'PASS', label: 'Passed', count: passCount },
              { id: 'QC_HOLD', label: 'QC Hold', count: holdCount, isAlert: holdCount > 0 },
              { id: 'REJECTED', label: 'Rejected', count: rejectCount, isAlert: rejectCount > 0 },
            ].map(tab => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? isDarkMode ? 'bg-white/10 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                      : tab.isAlert
                      ? 'text-rose-500 hover:text-rose-600'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive 
                      ? isDarkMode ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700' 
                      : tab.isAlert
                      ? 'bg-rose-500/10 text-rose-500'
                      : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Field & View Mode Switcher */}
          <div className="flex items-center gap-2.5">
            {/* macOS Finder Capsule */}
            <div className={`relative flex items-center rounded-full border px-3.5 py-1.5 transition-all w-full sm:w-80 ${
              isDarkMode ? 'bg-black/60 border-white/10 text-white focus-within:border-[#007AFF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#007AFF]'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Search Job #, Part Code, PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-xs w-full placeholder:text-slate-400"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Apple View Mode Switcher (Table vs Grid) */}
            <div className={`hidden sm:flex items-center p-0.5 rounded-xl border shrink-0 ${
              isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-100/80 border-slate-200/80'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? isDarkMode ? 'bg-white/10 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Table Register View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? isDarkMode ? 'bg-white/10 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Inspector Card Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 hidden lg:inline">
              {filteredQc.length} of {totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── MOBILE QC CARDS (Viewport < md) ──                                     */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredQc.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border text-xs ${
            isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
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
                className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs cursor-pointer ${
                  isPassed
                    ? isDarkMode ? 'bg-[#09090B] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isHold
                    ? isDarkMode ? 'bg-[#09090B] border-amber-500/30' : 'bg-amber-50/40 border-amber-200'
                    : isRejected
                    ? isDarkMode ? 'bg-[#09090B] border-rose-500/30' : 'bg-rose-50/40 border-rose-200'
                    : isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Job Card # + Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#007AFF] dark:text-[#0A84FF]">
                        {qc.jobNo}
                      </span>
                      {qc.orderPo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
                          {qc.orderPo}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-xs font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {qc.partDescription}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${
                    isPassed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : isHold
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : isRejected
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : 'bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border-blue-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPassed ? 'bg-emerald-500' : isHold ? 'bg-amber-500' : isRejected ? 'bg-rose-500' : 'bg-[#007AFF]'
                    }`} />
                    <span>{qc.qcStatus || 'PENDING'}</span>
                  </span>
                </div>

                {/* Part Code & Quantity Detail */}
                <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs text-center ${
                  isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Part Code</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{qc.partCode || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Inspect Quantity</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{qc.qty} NOS</span>
                  </div>
                </div>

                {/* Inspector Remarks */}
                {qc.inspectorNotes && (
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    isDarkMode ? 'bg-black/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`}>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Notes:</span>
                    <span>{qc.inspectorNotes}</span>
                  </div>
                )}

                {/* Action CTA Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInspection(qc);
                  }}
                  className="w-full py-2 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Audit QC Decision</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP VIEW: TABLE OR INSPECTOR CARD GRID (Viewport >= md) ──         */}
      {/* ========================================================================= */}
      {viewMode === 'table' ? (
        <div className={`hidden md:block rounded-2xl border overflow-hidden transition-all shadow-xs ${
          isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200/80'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold ${
                  isDarkMode ? 'bg-black/60 border-white/10 text-slate-400' : 'bg-slate-50/80 border-slate-200/80 text-slate-500'
                }`}>
                  <th className="py-3.5 px-5">Job Card #</th>
                  <th className="py-3.5 px-5">Customer PO</th>
                  <th className="py-3.5 px-5">Part Description</th>
                  <th className="py-3.5 px-5 text-right">Inspect Qty</th>
                  <th className="py-3.5 px-5 text-center">QC Status</th>
                  <th className="py-3.5 px-5">Inspector Notes</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                {filteredQc.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
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
                        className={`group transition-colors cursor-pointer ${
                          isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-blue-500/[0.04]'
                        }`}
                      >
                        <td className="py-3.5 px-5 font-bold text-[#007AFF] dark:text-[#0A84FF]">
                          <div className="flex items-center gap-2">
                            <span>{qc.jobNo}</span>
                            <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className={`py-3.5 px-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {qc.orderPo ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
                              {qc.orderPo}
                            </span>
                          ) : '—'}
                        </td>
                        <td className={`py-3.5 px-5 font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          <span className="font-semibold text-slate-900 dark:text-white">{qc.partCode}</span>
                          {qc.partDescription && (
                            <span className="text-slate-400 dark:text-slate-500"> — {qc.partDescription}</span>
                          )}
                        </td>
                        <td className={`py-3.5 px-5 text-right font-bold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {qc.qty} NOS
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isPassed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : isHold
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : isRejected
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : 'bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border-blue-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isPassed ? 'bg-emerald-500' : isHold ? 'bg-amber-500' : isRejected ? 'bg-rose-500' : 'bg-[#007AFF]'
                            }`} />
                            <span>{qc.qcStatus || 'PENDING'}</span>
                          </span>
                        </td>
                        <td className={`py-3.5 px-5 text-xs truncate max-w-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {qc.inspectorNotes || <span className="text-slate-400/60 italic">Awaiting audit notes</span>}
                        </td>
                        <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openInspection(qc)}
                            className="px-3.5 py-1 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs flex items-center gap-1 ml-auto transition-all active:scale-[0.98] cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Audit Decision</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                      <span className="font-bold text-xs text-[#007AFF] dark:text-[#0A84FF]">
                        {qc.jobNo}
                      </span>
                      <h3 className={`text-sm font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {qc.partCode}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {qc.partDescription || 'Precision Machined Component'}
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${
                      isPassed
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : isHold
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : isRejected
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : 'bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border-blue-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isPassed ? 'bg-emerald-500' : isHold ? 'bg-amber-500' : isRejected ? 'bg-rose-500' : 'bg-[#007AFF]'
                      }`} />
                      <span>{qc.qcStatus || 'PENDING'}</span>
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs text-center ${
                    isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Customer PO</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{qc.orderPo || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Lot Size</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{qc.qty} NOS</span>
                    </div>
                  </div>

                  {qc.inspectorNotes ? (
                    <div className={`p-2.5 rounded-xl border text-xs line-clamp-2 ${
                      isDarkMode ? 'bg-black/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'
                    }`}>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Notes:</span>
                      <span>{qc.inspectorNotes}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">No notes recorded yet</div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-400 font-medium">Click to audit</span>
                    <button
                      type="button"
                      onClick={() => openInspection(qc)}
                      className="px-3.5 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Audit QC</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── APPLE SHEET INSPECTION AUDIT MODAL ──                                  */}
      {/* ========================================================================= */}
      {inspectModal.isOpen && inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]' 
              : 'bg-white/95 border-slate-200/80 text-slate-900 shadow-[0_24px_60px_rgba(0,0,0,0.15)]'
          }`}>
            {/* Mobile Grab Handle */}
            <div className="pt-2.5 pb-0 block sm:hidden">
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
            </div>

            {/* Modal Window Header */}
            <div className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b shrink-0 ${
              isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                  qcDecision === 'PASS'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : qcDecision === 'QC_HOLD'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
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
                  <h3 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                    Record QC Metrology Audit
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
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
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInspectSave} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Batch Metadata Card */}
              <div className={`p-4 rounded-2xl border space-y-2 ${
                isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#007AFF] dark:text-[#0A84FF]">{inspectingItem.jobNo}</span>
                  {inspectingItem.orderPo && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
                      PO: {inspectingItem.orderPo}
                    </span>
                  )}
                </div>
                <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  <span className="font-bold text-slate-900 dark:text-white">{inspectingItem.partCode}</span>
                  {inspectingItem.partDescription && ` — ${inspectingItem.partDescription}`}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/60 dark:border-white/5">
                  <span>Inspection Batch Quantity:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{inspectingItem.qty} NOS</span>
                </div>
              </div>

              {/* Inspection Decision Buttons (Apple HIG Radio Cards) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Inspection Decision *
                </label>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  {/* PASS */}
                  <button
                    type="button"
                    onClick={() => setQcDecision('PASS')}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      qcDecision === 'PASS' 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/30' 
                        : isDarkMode ? 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:bg-white/5' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[2]" />
                    <span className="font-semibold text-xs">Pass QC</span>
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">Approved</span>
                  </button>

                  {/* QC HOLD */}
                  <button
                    type="button"
                    onClick={() => setQcDecision('QC_HOLD')}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      qcDecision === 'QC_HOLD' 
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs ring-1 ring-amber-500/30' 
                        : isDarkMode ? 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:bg-white/5' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 stroke-[2]" />
                    <span className="font-semibold text-xs">QC Hold</span>
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium">Quarantine</span>
                  </button>

                  {/* REJECT */}
                  <button
                    type="button"
                    onClick={() => setQcDecision('REJECTED')}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      qcDecision === 'REJECTED' 
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-xs ring-1 ring-rose-500/30' 
                        : isDarkMode ? 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:bg-white/5' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 stroke-[2]" />
                    <span className="font-semibold text-xs">Reject</span>
                    <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-medium">Defect</span>
                  </button>
                </div>
              </div>

              {/* Quick Tap Defect / Verification Chips */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
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
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-black/40 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                          : 'bg-slate-100/80 border-slate-200/80 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Inspector Remarks & Notes
                </label>
                <textarea
                  rows={2}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Record drawing compliance, surface finish, dimensional tolerances..."
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                  }`}
                />
              </div>

              {/* Submit Buttons */}
              <div className={`pt-3.5 border-t flex items-center justify-end gap-2.5 shrink-0 ${
                isDarkMode ? 'border-white/10' : 'border-slate-100'
              }`}>
                <button 
                  type="button" 
                  onClick={() => {
                    setInspectingItem(null);
                    inspectModal.close();
                  }} 
                  className={`flex-1 sm:flex-initial px-5 py-2 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-white/10 bg-black/60 text-slate-300 hover:bg-white/10' 
                      : 'border-slate-200/80 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`flex-1 sm:flex-initial px-6 py-2 rounded-full text-white font-semibold text-xs cursor-pointer shadow-xs transition-all active:scale-[0.98] ${
                    qcDecision === 'PASS'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : qcDecision === 'QC_HOLD'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Save QC Audit ({qcDecision})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default QCView;
