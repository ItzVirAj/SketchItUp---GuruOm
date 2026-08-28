import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Check,
  Clock,
  XCircle,
  Sparkles,
  FileCheck,
  RotateCcw,
  ChevronRight
} from 'lucide-react';
import { QCInspection } from '../../../types/console';

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
  const [inspectingItem, setInspectingItem] = useState<QCInspection | null>(null);
  const [qcDecision, setQcDecision] = useState<'PASS' | 'QC_HOLD' | 'REJECTED'>('PASS');
  const [qcNotes, setQcNotes] = useState('');

  useEffect(() => {
    if (qcItems || qcQueue) {
      setLocalQc(qcItems || qcQueue || []);
    }
  }, [qcItems, qcQueue]);

  // Deduplicate items by unique orderPo + jobNo (keep the latest)
  const deduplicatedItems = React.useMemo(() => {
    const map = new Map<string, QCInspection>();
    for (const item of localQc) {
      const key = `${(item.orderPo || '').trim().toUpperCase()}_${(item.jobNo || '').trim().toUpperCase()}`;
      if (key !== '_') {
        map.set(key, item); // Overwrite earlier duplicates with latest
      } else {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }, [localQc]);

  const filteredQc = deduplicatedItems.filter(q => {
    const matchesFilter = filterStatus === 'ALL' || q.qcStatus === filterStatus;
    const matchesSearch = (q.jobNo || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (q.partDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (q.orderPo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (q.partCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
    setInspectingItem(null);
    setQcNotes('');
  };

  const pendingCount = deduplicatedItems.filter(q => q.qcStatus === 'PENDING').length;
  const passCount = deduplicatedItems.filter(q => q.qcStatus === 'PASS' || q.qcStatus === 'PASSED').length;
  const holdCount = deduplicatedItems.filter(q => q.qcStatus === 'QC_HOLD').length;
  const rejectCount = deduplicatedItems.filter(q => q.qcStatus === 'REJECTED').length;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      
      {/* Top Banner Header */}
      <div className={`p-4 sm:p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
              }`}>
                Quality Assurance
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                • Dimensional & Visual Audit
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Quality Control (QC) Queue
            </h1>
            <p className={`text-xs mt-0.5 sm:mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Inspect manufactured components against drawing tolerances, record defect categories, and approve parts for Pre-Dispatch Inspection (PDI).
            </p>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-6">
          {/* Total Inspections */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Queue
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {deduplicatedItems.length}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#7B92FF]">Batches</span>
            </div>
          </div>

          {/* Pending Inspection */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Pending QC
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                {pendingCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-amber-500">Awaiting Audit</span>
            </div>
          </div>

          {/* Passed Quality */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Passed Quality
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {passCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-500">Approved</span>
            </div>
          </div>

          {/* QC Hold / Rejected */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Hold / Reject
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${holdCount + rejectCount > 0 ? (isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700') : (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')}`}>
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${holdCount + rejectCount > 0 ? 'text-rose-500' : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                {holdCount + rejectCount}
              </span>
              <span className={`text-[10px] sm:text-[11px] font-semibold ${holdCount + rejectCount > 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                {holdCount > 0 ? `${holdCount} Hold` : 'Zero Defect'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-3.5 sm:p-4 rounded-3xl border transition-all space-y-3 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Items', count: deduplicatedItems.length },
            { id: 'PENDING', label: 'Pending', count: pendingCount },
            { id: 'PASS', label: 'Passed', count: passCount },
            { id: 'QC_HOLD', label: 'QC Hold', count: holdCount, isAlert: holdCount > 0 },
            { id: 'REJECTED', label: 'Rejected', count: rejectCount, isAlert: rejectCount > 0 },
          ].map(tab => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                    : isDarkMode
                    ? tab.isAlert
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                    : tab.isAlert
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive 
                    ? 'bg-white/25 text-white' 
                    : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className={`relative flex items-center rounded-2xl border px-3.5 py-2 transition-all flex-1 ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search Job #, Part Code, PO, or Description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-xs w-full font-mono"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white ml-2">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className={`text-[11px] font-mono shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Showing {filteredQc.length} of {deduplicatedItems.length} Inspection{deduplicatedItems.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE QC CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredQc.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border font-mono text-xs ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
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
                className={`p-4 rounded-3xl border transition-all space-y-3.5 shadow-sm ${
                  isPassed
                    ? isDarkMode ? 'bg-slate-950/70 border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isHold
                    ? isDarkMode ? 'bg-slate-950/70 border-amber-500/30' : 'bg-amber-50/40 border-amber-200'
                    : isRejected
                    ? isDarkMode ? 'bg-slate-950/70 border-rose-500/30' : 'bg-rose-50/40 border-rose-200'
                    : isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Job Card # + Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF]">
                        {qc.jobNo}
                      </span>
                      {qc.orderPo && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {qc.orderPo}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-xs font-bold font-sans mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {qc.partDescription}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border shrink-0 ${
                    isPassed
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isHold
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : isRejected
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPassed ? 'bg-emerald-400' : isHold ? 'bg-amber-400' : isRejected ? 'bg-rose-400' : 'bg-blue-400'
                    }`} />
                    <span>{qc.qcStatus || 'PENDING'}</span>
                  </span>
                </div>

                {/* Part Code & Quantity Detail */}
                <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-2xl border text-xs font-mono text-center ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Part Code</span>
                    <span className="font-bold text-slate-200">{qc.partCode || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Inspect Quantity</span>
                    <span className="font-bold text-emerald-400">{qc.qty} NOS</span>
                  </div>
                </div>

                {/* Inspector Remarks */}
                {qc.inspectorNotes && (
                  <div className={`p-2.5 rounded-2xl border text-[11px] font-mono ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Notes:</span>
                    <span>{qc.inspectorNotes}</span>
                  </div>
                )}

                {/* Action CTA Button */}
                <button
                  type="button"
                  onClick={() => {
                    setInspectingItem(qc);
                    const current = qc.qcStatus === 'PASSED' ? 'PASS' : qc.qcStatus === 'REJECTED' ? 'REJECTED' : qc.qcStatus === 'QC_HOLD' ? 'QC_HOLD' : 'PASS';
                    setQcDecision(current as any);
                    setQcNotes(qc.inspectorNotes || '');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#5B75F8]/20 cursor-pointer active:scale-[0.98]"
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
      {/* DESKTOP QC TABLE (Viewport >= md) */}
      {/* ========================================================================= */}
      <div className={`hidden md:block rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-4 px-5">Job Card #</th>
                <th className="py-4 px-5">Customer PO</th>
                <th className="py-4 px-5">Part Description</th>
                <th className="py-4 px-5 text-right">Inspect Qty</th>
                <th className="py-4 px-5 text-center">QC Status</th>
                <th className="py-4 px-5">Inspector Notes</th>
                <th className="py-4 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredQc.map((qc) => (
                <tr key={qc.id} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                  <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                    {qc.jobNo}
                  </td>
                  <td className={`py-4 px-5 font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {qc.orderPo}
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {qc.partCode} — {qc.partDescription}
                  </td>
                  <td className={`py-4 px-5 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {qc.qty} NOS
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                      qc.qcStatus === 'PASS' || qc.qcStatus === 'PASSED'
                        ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : qc.qcStatus === 'QC_HOLD'
                          ? isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                          : qc.qcStatus === 'REJECTED'
                            ? isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                            : isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        qc.qcStatus === 'PASS' || qc.qcStatus === 'PASSED' ? 'bg-emerald-500' : qc.qcStatus === 'QC_HOLD' ? 'bg-amber-500' : qc.qcStatus === 'REJECTED' ? 'bg-rose-500' : 'bg-blue-500'
                      }`} />
                      <span>{qc.qcStatus}</span>
                    </span>
                  </td>
                  <td className={`py-4 px-5 font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {qc.inspectorNotes || '—'}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => {
                        setInspectingItem(qc);
                        const current = qc.qcStatus === 'PASSED' ? 'PASS' : qc.qcStatus === 'REJECTED' ? 'REJECTED' : qc.qcStatus === 'QC_HOLD' ? 'QC_HOLD' : 'PASS';
                        setQcDecision(current as any);
                        setQcNotes(qc.inspectorNotes || '');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                        isDarkMode ? 'bg-[#5B75F8]/10 text-[#7B92FF] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/20'
                      }`}
                    >
                      Audit QC Decision
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ultra-Polished Mobile-First QC Audit Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            {/* Mobile Grab Handle */}
            <div className="pt-2.5 pb-0 block sm:hidden">
              <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto" />
            </div>

            {/* Modal Header */}
            <div className={`flex items-center justify-between p-4 sm:p-6 border-b shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border shrink-0 ${
                  qcDecision === 'PASS'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : qcDecision === 'QC_HOLD'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}>
                  {qcDecision === 'PASS' ? <ShieldCheck className="w-5 h-5" /> : qcDecision === 'QC_HOLD' ? <Clock className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Record QC Audit
                  </h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Drawing compliance & dimensional tolerances
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setInspectingItem(null)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInspectSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Batch Metadata Card */}
              <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
                isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-[#5B75F8] dark:text-[#7B92FF]">{inspectingItem.jobNo}</span>
                  {inspectingItem.orderPo && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      PO: {inspectingItem.orderPo}
                    </span>
                  )}
                </div>
                <div className={`text-xs font-semibold font-sans ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {inspectingItem.partCode} — {inspectingItem.partDescription}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/50">
                  <span>Batch Quantity:</span>
                  <span className="font-bold text-emerald-400 text-xs">{inspectingItem.qty} NOS</span>
                </div>
              </div>

              {/* Inspection Decision Buttons */}
              <div className="space-y-2">
                <label className={`block text-[11px] font-mono uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Inspection Decision *
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  {/* PASS */}
                  <button
                    type="button"
                    onClick={() => setQcDecision('PASS')}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      qcDecision === 'PASS' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-md shadow-emerald-500/20 scale-[1.02]' 
                        : isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-[11px]">PASS QC</span>
                    <span className="text-[9px] opacity-75">Approved</span>
                  </button>

                  {/* QC HOLD */}
                  <button
                    type="button"
                    onClick={() => setQcDecision('QC_HOLD')}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      qcDecision === 'QC_HOLD' 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-md shadow-amber-500/20 scale-[1.02]' 
                        : isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-[11px]">QC HOLD</span>
                    <span className="text-[9px] opacity-75">Quarantine</span>
                  </button>

                  {/* REJECT */}
                  <button
                    type="button"
                    onClick={() => setQcDecision('REJECTED')}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      qcDecision === 'REJECTED' 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500 shadow-md shadow-rose-500/20 scale-[1.02]' 
                        : isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span className="font-bold text-[11px]">REJECT</span>
                    <span className="text-[9px] opacity-75">Defect</span>
                  </button>
                </div>
              </div>

              {/* Quick Tap Defect / Verification Chips for Mobile */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
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
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono border transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks Textarea */}
              <div>
                <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Inspector Remarks & Notes
                </label>
                <textarea
                  rows={2}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Record drawing compliance, surface finish, dimensional tolerances..."
                  className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>

              {/* Submit Buttons */}
              <div className={`pt-3 border-t flex items-center justify-end gap-2.5 shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button 
                  type="button" 
                  onClick={() => setInspectingItem(null)} 
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800' 
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl text-white font-bold text-xs font-mono cursor-pointer shadow-lg transition-all active:scale-[0.98] ${
                    qcDecision === 'PASS'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20'
                      : qcDecision === 'QC_HOLD'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-500/20'
                      : 'bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-500/20'
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
