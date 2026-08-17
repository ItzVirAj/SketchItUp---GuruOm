import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, CheckCircle2, AlertTriangle, Search, X, Check, Clock, XCircle } from 'lucide-react';
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
                          (q.orderPo || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDeleteQC = (id: string) => {
    setLocalQc(prev => prev.filter(q => q.id !== id));
  };

  const handleInspectSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingItem) return;
    
    const targetPo = inspectingItem.orderPo;
    const targetJob = inspectingItem.jobNo;

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
  const holdCount = deduplicatedItems.filter(q => q.qcStatus === 'QC_HOLD' || q.qcStatus === 'REJECTED').length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner Header */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
              }`}>
                Quality Assurance
              </span>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>• Dimensional & Visual Audit</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Quality Control (QC) Queue
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Inspect manufactured components against drawing tolerances, record defect categories, and approve parts for Pre-Dispatch Inspection (PDI).
            </p>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Inspections</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{localQc.length}</span>
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">In System</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending Inspection</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{pendingCount}</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">Awaiting Approval</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Passed Quality</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{passCount}</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">Approved</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>QC Hold / Rejected</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{holdCount}</span>
              <span className="text-[11px] font-mono font-semibold text-rose-500">Deficit Hold</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Inspections' },
            { id: 'PENDING', label: 'Pending QC' },
            { id: 'PASS', label: 'Passed QC' },
            { id: 'QC_HOLD', label: 'QC Hold' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === tab.id
                  ? isDarkMode 
                    ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' 
                    : 'bg-[#5B75F8] text-white shadow-xs'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`relative flex items-center rounded-2xl border px-3.5 py-1.5 transition-all ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
        }`}>
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search Job # or Part..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-48 sm:w-64 font-mono"
          />
        </div>
      </div>

      {/* QC Table */}
      <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
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

      {/* Ultra-Polished QC Audit Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Record Quality Control Decision
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Audit drawing compliance & dimensional tolerances
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

            <form onSubmit={handleInspectSave} className="space-y-4">
              <div className={`p-4 rounded-2xl border font-mono font-bold text-xs ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800 text-[#7B92FF]' : 'bg-slate-50 border-slate-200 text-[#5B75F8]'
              }`}>
                {inspectingItem.jobNo} — {inspectingItem.partDescription} ({inspectingItem.qty} NOS)
              </div>

              <div>
                <label className={`block text-[11px] font-mono uppercase font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Inspection Decision *
                </label>
                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setQcDecision('PASS')}
                    className={`py-3 rounded-2xl font-bold border transition-all cursor-pointer ${
                      qcDecision === 'PASS' 
                        ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border-emerald-500/50 shadow-md shadow-emerald-500/20' 
                        : isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    PASS QC
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcDecision('QC_HOLD')}
                    className={`py-3 rounded-2xl font-bold border transition-all cursor-pointer ${
                      qcDecision === 'QC_HOLD' 
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-md shadow-amber-500/20' 
                        : isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    QC HOLD
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcDecision('REJECTED')}
                    className={`py-3 rounded-2xl font-bold border transition-all cursor-pointer ${
                      qcDecision === 'REJECTED' 
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 shadow-md shadow-rose-500/20' 
                        : isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    REJECT
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Inspector Remarks
                </label>
                <textarea
                  rows={3}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Record drawing compliance, surface finish, dimensional tolerances..."
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex items-center justify-end gap-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button 
                  type="button" 
                  onClick={() => setInspectingItem(null)} 
                  className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800' 
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[#5B75F8]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Save QC Audit
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
