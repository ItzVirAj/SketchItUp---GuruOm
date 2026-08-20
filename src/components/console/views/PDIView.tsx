import React, { useState } from 'react';
import { ClipboardCheck, FileCheck, CheckCircle2, Search, X, ShieldCheck, FileText, Award, AlertTriangle, Check, Layers, Sliders, CheckSquare, Square } from 'lucide-react';
import { PDIInspection } from '../../../types/console';

interface PDIViewProps {
  pdiItems?: PDIInspection[];
  pdiQueue?: PDIInspection[];
  isDarkMode?: boolean;
  onPassPDI?: (pdiNo: string, payload?: any) => void;
  onFailPDI?: (pdiNo: string, payload?: any) => void;
}

export const PDIView: React.FC<PDIViewProps> = ({ pdiItems, pdiQueue, isDarkMode = true, onPassPDI, onFailPDI }) => {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'PENDING' | 'FAIL'>('ALL');

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
                Pre-Dispatch Clearance
              </span>
              <span className="text-xs text-slate-400 font-mono">• Certificate of Compliance (CoC)</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              PDI Queue (Pre-Dispatch Inspection)
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Perform final pre-dispatch compliance verification for every Job No and Order PO, complete dimensional checklists, and issue CoC certificates for outward dispatch.
            </p>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total PDI Items</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activePdiItems.length}</span>
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">Active Lots</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Passed Quantity</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono text-emerald-500`}>{totalPassedQty.toLocaleString()} NOS</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">{passedCount} Passed</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending Inspection</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{pendingCount}</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">Action Needed</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Compliance Rate</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {activePdiItems.length > 0 ? `${Math.round((passedCount / activePdiItems.length) * 100)}%` : '100%'}
              </span>
              <span className="text-[11px] font-mono font-semibold text-purple-400">CoC Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`relative flex items-center rounded-2xl border px-3.5 py-1.5 transition-all ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search Job #, Order PO, Part..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-xs w-64 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'PENDING', 'PASS', 'FAIL'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-[#5B75F8] text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800/70 text-slate-400 hover:text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs font-mono text-slate-400">Showing {filteredPdi.length} PDI lots</span>
      </div>

      {/* PDI Table */}
      <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-4 px-5">Job No</th>
                <th className="py-4 px-5">Order PO</th>
                <th className="py-4 px-5">Part Description</th>
                <th className="py-4 px-5 text-right">Inspection Qty</th>
                <th className="py-4 px-5 text-center">PDI Status</th>
                <th className="py-4 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredPdi.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-mono">
                    No PDI inspections matching your query.
                  </td>
                </tr>
              ) : (
                filteredPdi.map((pdi) => {
                  const isPassed = pdi.pdiStatus === 'PASS';
                  const isFailed = pdi.pdiStatus === 'FAIL';
                  return (
                    <tr key={pdi.id} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                      <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                        {pdi.jobNo}
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-400">
                        {pdi.orderPo}
                      </td>
                      <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        <div className="font-bold">{pdi.partCode}</div>
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
                          {/* PRIMARY PDI INSPECT BUTTON */}
                          <button
                            onClick={() => handleOpenInspect(pdi)}
                            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs hover:scale-[1.02] active:scale-[0.98] ${
                              isPassed
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white'
                                : 'bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white shadow-[#5B75F8]/20'
                            }`}
                            title={`Inspect PDI for ${pdi.jobNo} (${pdi.orderPo})`}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>{isPassed ? 'Re-Inspect PDI' : 'Inspect PDI'}</span>
                          </button>

                          {/* CERTIFICATE BUTTON */}
                          {pdi.certificateNo || isPassed ? (
                            <button
                              onClick={() => setSelectedReport(pdi)}
                              className={`p-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                                isDarkMode 
                                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                              title="View Compliance Certificate"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px]">CoC</span>
                            </button>
                          ) : null}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-xl rounded-3xl border p-6 space-y-4 font-mono text-xs z-10 shadow-2xl ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#5B75F8]/20 to-indigo-500/20 text-[#5B75F8] dark:text-[#7B92FF]">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-[#5B75F8] dark:text-[#7B92FF] tracking-tight">
                    Pre-Dispatch Inspection (PDI) Check
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>Job No: <strong className="text-white">{inspectingItem.jobNo}</strong></span>
                    <span>•</span>
                    <span>Order PO: <strong className="text-white">{inspectingItem.orderPo}</strong></span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setInspectingItem(null)} 
                className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Part Summary Box */}
            <div className={`p-3.5 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800/90' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Component</span>
                  <div className="font-bold text-sm text-[#5B75F8] dark:text-[#7B92FF]">{inspectingItem.partCode}</div>
                  <div className="text-xs text-slate-300 font-normal">{inspectingItem.partDescription}</div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Batch Target</span>
                  <div className="text-base font-bold text-emerald-400">{inspectingItem.qty} NOS</div>
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
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                        isChecked
                          ? isDarkMode
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : isDarkMode
                          ? 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
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
                <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                  Accepted Qty (NOS) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={acceptedQty}
                  onChange={(e) => setAcceptedQty(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border font-mono font-bold text-xs outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-emerald-400 focus:border-emerald-500' : 'bg-white border-slate-200 text-emerald-600 focus:border-emerald-500'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                  Rejected / Scrap Qty (NOS)
                </label>
                <input
                  type="number"
                  min={0}
                  value={rejectedQty}
                  onChange={(e) => setRejectedQty(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border font-mono font-bold text-xs outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-rose-400 focus:border-rose-500' : 'bg-white border-slate-200 text-rose-600 focus:border-rose-500'
                  }`}
                />
              </div>
            </div>

            {/* Certificate No & Report URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                  Compliance Certificate #
                </label>
                <input
                  type="text"
                  value={certificateNo}
                  onChange={(e) => setCertificateNo(e.target.value)}
                  placeholder="e.g. PDI-COC-2026-001"
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                  Report / Document URL (Optional)
                </label>
                <input
                  type="text"
                  value={reportUrl}
                  onChange={(e) => setReportUrl(e.target.value)}
                  placeholder="e.g. COC-Report.pdf or link"
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#5B75F8]'
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
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                }`}
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleInspectSubmit('FAIL')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>PDI Fail (Flag Rework)</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white cursor-pointer font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleInspectSubmit('PASS')}
                  disabled={isSubmitting || acceptedQty <= 0}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-mono text-xs shadow-2xl z-10 ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-[#5B75F8] dark:text-[#7B92FF]">Certificate of Compliance (CoC)</h3>
                  <p className="text-[11px] text-slate-400">Pre-Dispatch Inspection Report</p>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className={`p-4 rounded-2xl border space-y-2.5 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between font-bold text-[#5B75F8] dark:text-[#7B92FF]">
                  <span>Certificate #: {selectedReport.certificateNo || 'PDI-COC-2026-001'}</span>
                  <span className="text-emerald-400">STATUS: PASSED</span>
                </div>
                <div className="text-slate-300 font-semibold">{selectedReport.partCode} — {selectedReport.partDescription}</div>
                <div className="flex justify-between text-slate-400">
                  <span>Job #: <strong>{selectedReport.jobNo}</strong></span>
                  <span>PO #: <strong>{selectedReport.orderPo}</strong></span>
                </div>
                <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2">
                  <span>Quantity Passed:</span>
                  <span className="font-bold text-emerald-400">{selectedReport.acceptedQty || selectedReport.qty} NOS</span>
                </div>
                {selectedReport.inspectorNotes ? (
                  <div className="text-[11px] text-slate-400 pt-1">
                    <span className="font-bold">Observations:</span> {selectedReport.inspectorNotes}
                  </div>
                ) : null}
              </div>

              <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-center font-bold">
                ✓ 100% Dimensional Audit & Visual Surface Quality Verified
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedReport(null)} className="px-5 py-2.5 rounded-xl border border-slate-700 font-bold cursor-pointer hover:bg-slate-800">
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
