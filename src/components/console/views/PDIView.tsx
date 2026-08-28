import React, { useState } from 'react';
import {
  ClipboardCheck,
  FileCheck,
  CheckCircle2,
  Search,
  X,
  ShieldCheck,
  Award,
  AlertTriangle,
  Clock,
  CheckSquare,
  Square,
  Package
} from 'lucide-react';
import { PDIInspection } from '../../../types/console';

interface PDIViewProps {
  pdiItems?: PDIInspection[];
  pdiQueue?: PDIInspection[];
  isDarkMode?: boolean;
  preselectedOrderPo?: string | null;
  preselectedJobNo?: string | null;
  onPdiModalOpened?: () => void;
  onPassPDI?: (pdiNo: string, payload?: any) => void;
  onFailPDI?: (pdiNo: string, payload?: any) => void;
}

export const PDIView: React.FC<PDIViewProps> = ({ 
  pdiItems, 
  pdiQueue, 
  isDarkMode = true, 
  preselectedOrderPo,
  preselectedJobNo,
  onPdiModalOpened,
  onPassPDI, 
  onFailPDI 
}) => {
  const rawPdiItems = pdiItems || pdiQueue || [];
  
  // Local state for instant optimistic updates
  const [localPdiList, setLocalPdiList] = useState<PDIInspection[]>(rawPdiItems);

  React.useEffect(() => {
    if (pdiItems || pdiQueue) {
      setLocalPdiList(pdiItems || pdiQueue || []);
    }
  }, [pdiItems, pdiQueue]);

  // Deduplicate PDI inspection items by orderPo + jobNo (keep latest)
  const activePdiItems = React.useMemo(() => {
    const map = new Map<string, PDIInspection>();
    for (const item of localPdiList) {
      const key = `${(item.orderPo || '').trim().toUpperCase()}_${(item.jobNo || '').trim().toUpperCase()}`;
      if (key !== '_') {
        map.set(key, item);
      } else {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }, [localPdiList]);

  const [selectedReport, setSelectedReport] = useState<PDIInspection | null>(null);
  const [inspectingItem, setInspectingItem] = useState<PDIInspection | null>(null);
  const [searchQuery, setSearchQuery] = useState(preselectedOrderPo || preselectedJobNo || '');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'PENDING' | 'FAIL'>('ALL');

  // Handle preselection
  const preselectHandled = React.useRef<string | null>(null);
  React.useEffect(() => {
    const key = preselectedOrderPo || preselectedJobNo;
    if (!key || preselectHandled.current === key) return;
    preselectHandled.current = key;

    const matched = activePdiItems.find(p => 
      (preselectedJobNo && (p.jobNo?.toLowerCase() === preselectedJobNo.toLowerCase() || p.id === preselectedJobNo)) ||
      (preselectedOrderPo && (p.orderPo?.toLowerCase() === preselectedOrderPo.toLowerCase()))
    );

    if (matched) {
      handleOpenInspect(matched);
      onPdiModalOpened?.();
    } else if (preselectedOrderPo) {
      setSearchQuery(preselectedOrderPo);
    }
  }, [preselectedOrderPo, preselectedJobNo, activePdiItems, onPdiModalOpened]);

  // Inspection form states
  const [acceptedQty, setAcceptedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [certificateNo, setCertificateNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [reportUrl, setReportUrl] = useState<string>('');
  const [checklist, setChecklist] = useState({
    visualFinish: true,
    dimensionalAudit: true,
    gaugesChecked: true,
    packagingRustProof: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenInspect = (item: PDIInspection) => {
    setInspectingItem(item);
    setAcceptedQty(item.acceptedQty ?? item.qty ?? 1);
    setRejectedQty(item.rejectedQty ?? 0);
    setCertificateNo(item.certificateNo || `PDI-COC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRemarks(item.inspectorNotes || '100% parts cleared visual and dimensional tolerance checks.');
    setReportUrl(item.pdiReportUrl || '');
    setChecklist(item.checklist || {
      visualFinish: true,
      dimensionalAudit: true,
      gaugesChecked: true,
      packagingRustProof: true
    });
  };

  const handleToggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInspectSubmit = async (decision: 'PASS' | 'FAIL') => {
    if (!inspectingItem) return;
    setIsSubmitting(true);
    try {
      const updatedItem: PDIInspection = {
        ...inspectingItem,
        pdiStatus: decision,
        certificateNo: decision === 'PASS' ? certificateNo : undefined,
        acceptedQty: Number(acceptedQty),
        rejectedQty: Number(rejectedQty),
        inspectorNotes: remarks,
        pdiReportUrl: reportUrl,
        reportDate: new Date().toISOString().split('T')[0],
        checklist
      };

      // Optimistic local state update
      setLocalPdiList(prev => prev.map(p => (p.id === inspectingItem.id || (p.jobNo === inspectingItem.jobNo && p.orderPo === inspectingItem.orderPo) ? updatedItem : p)));

      if (decision === 'PASS') {
        if (onPassPDI) {
          await onPassPDI(inspectingItem.id, updatedItem);
        }
      } else {
        if (onFailPDI) {
          await onFailPDI(inspectingItem.id, updatedItem);
        }
      }

      setInspectingItem(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPdi = activePdiItems.filter(p => {
    const matchesSearch = 
      p.jobNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.orderPo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'ALL' || p.pdiStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalPassedQty = activePdiItems.filter(p => p.pdiStatus === 'PASS').reduce((acc, p) => acc + (p.acceptedQty || p.qty), 0);
  const pendingCount = activePdiItems.filter(p => p.pdiStatus === 'PENDING').length;
  const passedCount = activePdiItems.filter(p => p.pdiStatus === 'PASS').length;
  const failedCount = activePdiItems.filter(p => p.pdiStatus === 'FAIL').length;

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
                Pre-Dispatch Clearance
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              PDI Clearance ({filteredPdi.length})
            </h1>
          </div>
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total PDI Lots</div>
            <div className="text-base font-black text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight mt-0.5">
              {activePdiItems.length} <span className="text-xs font-normal text-slate-400">Lots</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Passed Quantity</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {totalPassedQty.toLocaleString()} <span className="text-xs font-normal text-slate-400">NOS</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Pending Inspection</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5">
              {pendingCount} <span className="text-xs font-normal text-slate-400">Waiting</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Compliance Rate</div>
            <div className="text-base font-black text-purple-500 tracking-tight mt-0.5">
              {activePdiItems.length > 0 ? `${Math.round((passedCount / activePdiItems.length) * 100)}%` : '100%'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP HEADER & INTEGRATED KPI ROW (≥ md) ──                          */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        <section className={`overflow-hidden rounded-[24px] border ${isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'}`}>
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Pre-Dispatch Clearance & Certificate of Compliance
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{filteredPdi.length} PDI Lots</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                  PDI Queue (Pre-Dispatch Inspection)
                </h1>
                <span className="hidden font-mono text-[10px] font-semibold text-slate-400 xl:inline">
                  FINAL QUALITY CLEARANCE • 4-POINT AUDIT • COC GENERATION
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Final pre-dispatch compliance verification for Job Cards and Customer POs, dimensional checklists, and outward CoC generation.
              </p>
            </div>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            {[
              { label: 'Total PDI Items', value: `${activePdiItems.length}`, detail: 'Active inspection lots', icon: ClipboardCheck, tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]' },
              { label: 'Passed Quantity', value: `${totalPassedQty.toLocaleString()} NOS`, detail: `${passedCount} batches approved`, icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10' },
              { label: 'Pending Inspection', value: `${pendingCount}`, detail: 'Action required on shopfloor', icon: Clock, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
              { label: 'Compliance Rate', value: activePdiItems.length > 0 ? `${Math.round((passedCount / activePdiItems.length) * 100)}%` : '100%', detail: 'CoC certified shipments', icon: Award, tone: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-500/10' },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div key={metric.label} className={`flex items-center gap-3 px-5 py-4 ${index > 0 ? isDarkMode ? 'border-l border-white/[0.07]' : 'border-l border-slate-200' : ''}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${metric.iconBg} ${metric.tone}`}>
                    <MetricIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">{metric.label}</div>
                    <div className={`mt-0.5 truncate text-lg font-extrabold tracking-[-0.03em] ${metric.tone}`}>{metric.value}</div>
                    <div className="truncate text-[10px] text-slate-400">{metric.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Desktop Filter & Search Toolbar */}
        <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'}`}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkMode ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-500'}`} title="Modules">
              <ClipboardCheck className="h-4 w-4" />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Lots', count: activePdiItems.length },
                { id: 'PENDING', label: 'Pending PDI', count: pendingCount },
                { id: 'PASS', label: 'Passed / CoC', count: passedCount },
                { id: 'FAIL', label: 'Failed / Rework', count: failedCount, isAlert: failedCount > 0 },
              ].map(tab => {
                const isActive = filterStatus === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterStatus(tab.id as any)}
                    className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors ${
                      isActive
                        ? isDarkMode
                          ? tab.isAlert
                            ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                            : 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] shadow-xs'
                          : tab.isAlert
                          ? 'border-rose-300 bg-rose-500 text-white'
                          : 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white shadow-sm shadow-[var(--accent-shadow)]'
                        : isDarkMode
                        ? tab.isAlert
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          : 'border-white/[0.08] bg-black/20 text-slate-400 hover:bg-white/[0.04] hover:text-white'
                        : tab.isAlert
                        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                      isActive
                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-white/30 text-white'
                        : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className={`flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 ml-auto ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]' : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search Job #, Order PO, Part Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 font-mono"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Showing {filteredPdi.length} of {activePdiItems.length} PDI lots</span>
            <span>Pre-Dispatch Quality & CoC Certification</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE PDI CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredPdi.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
            isDarkMode ? 'bg-[#171b24] border-white/[0.08] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No PDI items found matching your filters.
          </div>
        ) : (
          filteredPdi.map((pdi) => {
            const isPassed = pdi.pdiStatus === 'PASS';
            const isFailed = pdi.pdiStatus === 'FAIL';

            return (
              <div
                key={pdi.id}
                className={`p-4 rounded-2xl border transition-all space-y-3.5 shadow-sm ${
                  isPassed
                    ? isDarkMode ? 'bg-[#171b24] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isFailed
                    ? isDarkMode ? 'bg-[#171b24] border-rose-500/30' : 'bg-rose-50/40 border-rose-200'
                    : isDarkMode ? 'bg-[#171b24] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Job No + Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                        {pdi.jobNo}
                      </span>
                      {pdi.orderPo && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {pdi.orderPo}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-xs font-bold font-sans mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {pdi.partDescription}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border shrink-0 ${
                    isPassed
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isFailed
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPassed ? 'bg-emerald-400' : isFailed ? 'bg-rose-400' : 'bg-amber-400 animate-pulse'
                    }`} />
                    <span>{pdi.pdiStatus || 'PENDING'}</span>
                  </span>
                </div>

                {/* Part Code & Quantity Detail */}
                <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs font-mono text-center ${
                  isDarkMode ? 'bg-black/20 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Part Code</span>
                    <span className="font-bold text-slate-200">{pdi.partCode || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Cleared Qty</span>
                    <span className={`font-bold ${isPassed ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {pdi.acceptedQty ?? pdi.qty} NOS
                      {pdi.rejectedQty ? <span className="text-rose-400 text-[10px] block">({pdi.rejectedQty} rej)</span> : null}
                    </span>
                  </div>
                </div>

                {/* Certificate Tag if available */}
                {pdi.certificateNo && (
                  <div className="flex items-center justify-between text-[11px] font-mono p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="flex items-center gap-1 font-bold">
                      <Award className="w-3.5 h-3.5" />
                      <span>CoC: {pdi.certificateNo}</span>
                    </span>
                    <span className="text-[10px]">Verified ✓</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenInspect(pdi)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-[0.98] bg-[var(--accent-primary)] text-white shadow-[var(--accent-shadow)]"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>{isPassed ? 'Re-Inspect PDI' : 'Inspect PDI Clearance'}</span>
                  </button>

                  {(pdi.certificateNo || isPassed) && (
                    <button
                      type="button"
                      onClick={() => setSelectedReport(pdi)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                        isDarkMode 
                          ? 'bg-[#171b24] border-white/[0.08] text-slate-300 hover:bg-white/[0.05]' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="View CoC Certificate"
                    >
                      <Award className="w-4 h-4 text-emerald-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP PDI TABLE (Viewport >= md) */}
      {/* ========================================================================= */}
      <div className={`hidden md:block overflow-hidden rounded-[22px] border transition-all ${
        isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
      }`}>
        <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Pre-Dispatch Inspection Register</div>
            <div className="mt-0.5 text-[10px] text-slate-400">Quality inspection audits, 4-point verification checks, and CoC certificates</div>
          </div>
          <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{filteredPdi.length} lots</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
              }`}>
                <th className="py-4 px-5">Job No</th>
                <th className="py-4 px-5">Order PO</th>
                <th className="py-4 px-5">Part Description</th>
                <th className="py-4 px-5 text-right">Inspection Qty</th>
                <th className="py-4 px-5 text-center">PDI Status</th>
                <th className="py-4 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredPdi.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                    No PDI inspections matching your query.
                  </td>
                </tr>
              ) : (
                filteredPdi.map((pdi) => {
                  const isPassed = pdi.pdiStatus === 'PASS';
                  const isFailed = pdi.pdiStatus === 'FAIL';
                  return (
                    <tr key={pdi.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 shrink-0 ${
                            isDarkMode 
                              ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30' 
                              : 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)] border border-[var(--accent-primary)]/20'
                          }`}>
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                              {pdi.jobNo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-xs text-slate-400">
                        {pdi.orderPo}
                      </td>
                      <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        <div className="font-bold font-mono text-xs">{pdi.partCode}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{pdi.partDescription}</div>
                      </td>
                      <td className="py-4 px-5 text-right font-bold font-mono">
                        <span className={isPassed ? 'text-emerald-500' : isDarkMode ? 'text-white' : 'text-slate-900'}>
                          {pdi.acceptedQty ?? pdi.qty} NOS
                        </span>
                        {pdi.rejectedQty ? (
                          <div className="text-[10px] text-rose-400 font-normal font-mono">
                            ({pdi.rejectedQty} rejected)
                          </div>
                        ) : null}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                          isPassed
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isFailed
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isPassed ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                          }`} />
                          <span>{pdi.pdiStatus || 'PENDING'}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenInspect(pdi)}
                            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs hover:scale-[1.02] active:scale-[0.98] ${
                              isPassed
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-[var(--accent-primary)] hover:brightness-110 text-white shadow-sm shadow-[var(--accent-shadow)]'
                            }`}
                            title={`Inspect PDI for ${pdi.jobNo} (${pdi.orderPo})`}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>{isPassed ? 'Re-Inspect PDI' : 'Inspect PDI'}</span>
                          </button>

                          {(pdi.certificateNo || isPassed) && (
                            <button
                              type="button"
                              onClick={() => setSelectedReport(pdi)}
                              className={`p-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                                isDarkMode 
                                  ? 'border border-white/[0.08] bg-black/20 text-slate-300 hover:bg-white/[0.05]' 
                                  : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                              title="View Compliance Certificate"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px]">CoC</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. INTERACTIVE PDI INSPECTION MODAL */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-[24px] border shadow-2xl transition-all overflow-hidden ${
            isDarkMode ? 'border-white/[0.08] bg-[#171b24] text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            {/* Mobile Grab Handle */}
            <div className="pt-2.5 pb-0 block sm:hidden">
              <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto" />
            </div>

            {/* Header */}
            <div className={`flex items-center justify-between p-4 sm:p-6 border-b shrink-0 ${isDarkMode ? 'border-white/[0.07] bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shrink-0">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight">
                    Pre-Dispatch Inspection (PDI)
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                    <span>Job: <strong className="text-slate-900 dark:text-white">{inspectingItem.jobNo}</strong></span>
                    <span>•</span>
                    <span>PO: <strong className="text-slate-900 dark:text-white">{inspectingItem.orderPo}</strong></span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setInspectingItem(null)} 
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-white/[0.08] bg-black/20 text-slate-400 hover:text-white hover:bg-white/[0.05]' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 font-mono text-xs">
              
              {/* Part Summary Box */}
              <div className={`p-3.5 rounded-xl border ${
                isDarkMode ? 'border-white/[0.08] bg-black/20' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Component</span>
                    <div className="font-bold text-sm text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{inspectingItem.partCode}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-300 font-normal font-sans">{inspectingItem.partDescription}</div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Batch Target</span>
                    <div className="text-base font-bold text-emerald-500">{inspectingItem.qty} NOS</div>
                  </div>
                </div>
              </div>

              {/* 4-Point Checklist */}
              <div className="space-y-2">
                <label className="block text-[11px] text-slate-400 font-bold uppercase">
                  4-Point Quality & Compliance Checklist
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'visualFinish', label: '1. Visual Finish & Burr Removal', desc: 'No burrs, sharp edges, or surface blemishes' },
                    { key: 'dimensionalAudit', label: '2. Critical Dimensions & Tolerances', desc: '100% drawing tolerances verified' },
                    { key: 'gaugesChecked', label: '3. Gauge & Thread Fitment', desc: 'Go/No-Go plug and ring gauges cleared' },
                    { key: 'packagingRustProof', label: '4. Anti-Rust Coating & Packaging', desc: 'VCI oil applied, barcode label attached' }
                  ].map(({ key, label, desc }) => {
                    const isChecked = !!checklist[key as keyof typeof checklist];
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleChecklist(key as keyof typeof checklist)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isChecked
                            ? isDarkMode
                              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : isDarkMode
                            ? 'border-white/[0.08] bg-black/20 text-slate-400 hover:border-white/[0.15]'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mt-0.5 p-0.5 rounded-md ${
                          isChecked ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-[11px]">{label}</div>
                          <div className="text-[10px] opacity-80 mt-0.5 font-normal">{desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-slate-400 font-bold uppercase">
                      Accepted Qty *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAcceptedQty(inspectingItem.qty || 1);
                        setRejectedQty(0);
                      }}
                      className="text-[10px] text-emerald-500 font-bold hover:underline cursor-pointer"
                    >
                      All ({inspectingItem.qty})
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={acceptedQty}
                    onChange={(e) => setAcceptedQty(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-mono font-bold text-xs outline-none ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-emerald-400 focus:border-emerald-500' : 'bg-white border-slate-200 text-emerald-600 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    Rejected / Scrap
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-mono font-bold text-xs outline-none ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-rose-400 focus:border-rose-500' : 'bg-white border-slate-200 text-rose-600 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>

              {/* Certificate No & Report URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    CoC Certificate #
                  </label>
                  <input
                    type="text"
                    value={certificateNo}
                    onChange={(e) => setCertificateNo(e.target.value)}
                    placeholder="e.g. PDI-COC-2026-001"
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' : 'bg-white border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    Document URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={reportUrl}
                    onChange={(e) => setReportUrl(e.target.value)}
                    placeholder="e.g. COC-Report.pdf"
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' : 'bg-white border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                  Inspector Observations & Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Surface finish Ra 0.8 achieved. Thread gauges matched cleanly. Ready for dispatch."
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none ${
                    isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' : 'bg-white border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className={`p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t shrink-0 ${isDarkMode ? 'border-white/[0.07] bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
              <button
                type="button"
                onClick={() => handleInspectSubmit('FAIL')}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-bold font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>PDI Fail (Flag Rework)</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                    isDarkMode ? 'border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleInspectSubmit('PASS')}
                  disabled={isSubmitting || acceptedQty <= 0}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Processing...' : 'Complete PDI (Pass & Release)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PDI CERTIFICATE MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-[24px] border p-4 sm:p-6 space-y-4 font-mono text-xs shadow-2xl z-10 overflow-hidden ${
            isDarkMode ? 'border-white/[0.08] bg-[#171b24] text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            {/* Mobile Grab Handle */}
            <div className="pt-1 pb-0 block sm:hidden">
              <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto" />
            </div>

            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">Certificate of Compliance (CoC)</h3>
                  <p className="text-[11px] text-slate-400">Pre-Dispatch Inspection Report</p>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold cursor-pointer p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1">
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                isDarkMode ? 'border-white/[0.08] bg-black/20' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                  <span>Certificate #: {selectedReport.certificateNo || 'PDI-COC-2026-001'}</span>
                  <span className="text-emerald-400">STATUS: PASSED</span>
                </div>
                <div className="text-slate-800 dark:text-slate-300 font-semibold font-sans">{selectedReport.partCode} — {selectedReport.partDescription}</div>
                <div className="flex justify-between text-slate-400">
                  <span>Job #: <strong className="text-slate-900 dark:text-white">{selectedReport.jobNo}</strong></span>
                  <span>PO #: <strong className="text-slate-900 dark:text-white">{selectedReport.orderPo}</strong></span>
                </div>
                <div className={`flex justify-between text-slate-400 border-t pt-2 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
                  <span>Quantity Passed:</span>
                  <span className="font-bold text-emerald-500">{selectedReport.acceptedQty || selectedReport.qty} NOS</span>
                </div>
                {selectedReport.inspectorNotes ? (
                  <div className="text-[11px] text-slate-400 pt-1">
                    <span className="font-bold">Observations:</span> {selectedReport.inspectorNotes}
                  </div>
                ) : null}
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-center font-bold">
                ✓ 100% Dimensional Audit & Visual Surface Quality Verified
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedReport(null)} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border font-bold cursor-pointer ${
                isDarkMode ? 'border-white/[0.08] bg-black/20 text-slate-300 hover:bg-white/[0.05]' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}>
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PDIView;
