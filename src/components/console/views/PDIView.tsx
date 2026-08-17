import React, { useState } from 'react';
import { ClipboardCheck, FileCheck, CheckCircle2, Search, X, ShieldCheck, FileText, Award } from 'lucide-react';
import { PDIInspection } from '../../../types/console';

interface PDIViewProps {
  pdiItems?: PDIInspection[];
  pdiQueue?: PDIInspection[];
  isDarkMode?: boolean;
  onPassPDI?: (pdiNo: string) => void;
}

export const PDIView: React.FC<PDIViewProps> = ({ pdiItems, pdiQueue, isDarkMode = true, onPassPDI }) => {
  const rawPdiItems = pdiItems || pdiQueue || [];
  
  // Deduplicate PDI inspection items by orderPo + jobNo (keep latest)
  const activePdiItems = React.useMemo(() => {
    const map = new Map<string, PDIInspection>();
    for (const item of rawPdiItems) {
      const key = `${(item.orderPo || '').trim().toUpperCase()}_${(item.jobNo || '').trim().toUpperCase()}`;
      if (key !== '_') {
        map.set(key, item);
      } else {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }, [rawPdiItems]);

  const [selectedReport, setSelectedReport] = useState<PDIInspection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPdi = activePdiItems.filter(p => 
    p.jobNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.orderPo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.partDescription.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPassedQty = activePdiItems.reduce((acc, p) => acc + p.qty, 0);

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
              <span className="text-xs text-slate-400 font-mono">• Certificate of Compliance</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              PDI Queue (Pre-Dispatch Inspection)
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Issue final pre-dispatch compliance certificates, audit finished lot quantities, and authorize goods for outward dispatch challans.
            </p>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total PDI Inspections</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activePdiItems.length}</span>
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">Lots Audit</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Passed Quantity</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono text-emerald-500`}>{totalPassedQty.toLocaleString()} NOS</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">Ready</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Certificates Generated</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activePdiItems.length}</span>
              <span className="text-[11px] font-mono font-semibold text-purple-400">CoC Issued</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Dispatch Readiness</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>100%</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
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

        <span className="text-xs font-mono text-slate-400">Showing {filteredPdi.length} PDI Certificates</span>
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
                <th className="py-4 px-5 text-right">Qty Passed</th>
                <th className="py-4 px-5 text-center">PDI Status</th>
                <th className="py-4 px-5 text-center">Certificate Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredPdi.map((pdi) => (
                <tr key={pdi.id} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                  <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                    {pdi.jobNo}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400">
                    {pdi.orderPo}
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {pdi.partCode} — {pdi.partDescription}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                    {pdi.qty} NOS
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{pdi.pdiStatus}</span>
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => setSelectedReport(pdi)}
                      className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isDarkMode ? 'bg-[#5B75F8]/10 text-[#7B92FF] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/20'
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>View Certificate</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDI Inspection Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-mono text-xs shadow-2xl ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm uppercase text-[#5B75F8] dark:text-[#7B92FF]">Pre-Dispatch Inspection Certificate</h3>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 space-y-2">
                <div className="flex justify-between font-bold text-[#5B75F8] dark:text-[#7B92FF]">
                  <span>Certificate #: {selectedReport.certificateNo || 'COC-2026-001'}</span>
                  <span className="text-emerald-400">STATUS: PASSED</span>
                </div>
                <div className="text-slate-300 font-semibold">{selectedReport.partDescription}</div>
                <div className="flex justify-between text-slate-400">
                  <span>Job #: {selectedReport.jobNo}</span>
                  <span>PO #: {selectedReport.orderPo}</span>
                </div>
                <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2">
                  <span>Quantity Passed:</span>
                  <span className="font-bold text-white">{selectedReport.qty} NOS</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-center font-bold">
                ✓ 100% Dimensional Audit & Visual Surface Quality Verified
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedReport(null)} className="px-5 py-2.5 rounded-xl border border-slate-800 font-bold cursor-pointer">
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PDIView;
