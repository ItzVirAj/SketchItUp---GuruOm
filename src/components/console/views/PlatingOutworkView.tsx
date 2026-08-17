import React, { useState } from 'react';
import { Wrench, Plus, Search, X, CheckCircle2, AlertTriangle, Layers, Calendar, Clock, Truck, FileCheck } from 'lucide-react';
import { OutworkSendOut, SubcontractOrder } from '../../../types/console';

interface PlatingOutworkViewProps {
  sendOuts?: (OutworkSendOut | SubcontractOrder | any)[];
  outwork?: (OutworkSendOut | SubcontractOrder | any)[];
  outworks?: (OutworkSendOut | SubcontractOrder | any)[];
  isDarkMode?: boolean;
  onCreateSendOut?: (sendOut: Partial<OutworkSendOut | SubcontractOrder>) => void;
  onSendOut?: (sendOut: Partial<OutworkSendOut | SubcontractOrder>) => void;
  onReceiveReturn?: (id: string, qty: number) => void;
}

export const PlatingOutworkView: React.FC<PlatingOutworkViewProps> = ({
  sendOuts,
  outwork,
  outworks,
  isDarkMode = true,
  onCreateSendOut,
  onSendOut
}) => {
  const activeSendOuts = sendOuts || outwork || outworks || [];
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [jobNo, setJobNo] = useState('JC/0001/26-27');
  const [itemCode, setItemCode] = useState('00000001');
  const [itemDesc, setItemDesc] = useState('MAIN SPINDLE HOUSING 120MM');
  const [vendorName, setVendorName] = useState('Apex Heat Treaters Ltd');
  const [process, setProcess] = useState('HEAT_TREATMENT');
  const [sentQty, setSentQty] = useState(60);
  const [expectedDate, setExpectedDate] = useState('2026-08-25');
  const [transporter, setTransporter] = useState('Shree Logistics');
  const [vehicleNo, setVehicleNo] = useState('MH-12-QW-4011');

  const filtered = activeSendOuts.filter(o => {
    const idStr = String(o.sendOutId || o.gatePassNo || o.id || '').toLowerCase();
    const vendorStr = String(o.vendorName || o.subcontractorName || '').toLowerCase();
    const processStr = String(o.process || o.processType || '').toLowerCase();
    const jobStr = String(o.jobNo || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    return idStr.includes(q) || vendorStr.includes(q) || processStr.includes(q) || jobStr.includes(q);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gatePassNo = `GP-OUT-2026-${String(activeSendOuts.length + 80).padStart(4, '0')}`;
    const handleCreate = onCreateSendOut || onSendOut;
    if (handleCreate) {
      handleCreate({
        sendOutId: gatePassNo,
        gatePassNo,
        jobNo,
        itemCode,
        itemDescription: itemDesc,
        vendorName,
        subcontractorName: vendorName,
        process,
        processType: process,
        sentQty,
        dispatchedQty: sentQty,
        receivedQty: 0,
        rejectedQty: 0,
        status: 'OUT_FOR_JOBWORK',
        dispatchDate: new Date().toISOString().split('T')[0],
        sentDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: expectedDate,
        expectedDate,
        transporter,
        vehicleDetails: vehicleNo
      });
    }
    setShowModal(false);
  };

  const totalSent = activeSendOuts.reduce((acc, s) => acc + Number(s.sentQty || s.dispatchedQty || 0), 0);
  const overdueCount = activeSendOuts.filter(s => {
    if (s.status === 'COMPLETED' || s.status === 'RETURNED_INSPECTED') return false;
    const expDate = s.expectedReturnDate || s.expectedDate;
    if (!expDate) return false;
    return new Date().getTime() > new Date(expDate).getTime();
  }).length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Overdue Subcontracting Alert Banner (Day-1 Gap Fix) */}
      {overdueCount > 0 && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 backdrop-blur-md transition-all ${
          isDarkMode 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
            : 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>
                Automated Subcontracting Overdue Alert
              </h4>
              <p className={`text-xs font-mono mt-0.5 ${isDarkMode ? 'text-amber-400/90' : 'text-amber-700'}`}>
                {overdueCount} job-work gate-out batch{overdueCount > 1 ? 'es are' : ' is'} past the committed return date with no matching gate-in recorded.
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
            isDarkMode 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
              : 'bg-amber-200/60 text-amber-900 border-amber-300'
          }`}>
            {overdueCount} Overdue Batch{overdueCount > 1 ? 'es' : ''}
          </span>
        </div>
      )}
      
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
                Subcontracting & Job-Work
              </span>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>• Gate-Out / Gate-In & Ledger Tracking</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Plating & Job-Work Outwork Hub
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Track outsourced processes (Heat Treatment, Electroplating, Zinc Plating, NDT Testing, CNC Machining) with gate pass numbers, SUBCON ledger movements, and automatic overdue alerting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Gate-Out Pass</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Outwork Batches</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeSendOuts.length}</span>
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">Gate Passes</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Sent Quantity</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>{totalSent.toLocaleString()} NOS</span>
              <span className="text-[11px] font-mono font-semibold text-purple-500">In Subcon WIP</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Vendors</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {Array.from(new Set(activeSendOuts.map(s => s.vendorName || s.subcontractorName))).filter(Boolean).length || 3}
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">Approved</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Overdue Status</span>
              <div className={`p-2 rounded-xl ${overdueCount > 0 ? (isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700') : (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${overdueCount > 0 ? 'text-rose-500' : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                {overdueCount > 0 ? `${overdueCount} Overdue` : 'Clear'}
              </span>
              <span className={`text-[11px] font-mono font-semibold ${overdueCount > 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                {overdueCount > 0 ? 'Action Required' : 'On Schedule'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className={`relative flex items-center rounded-2xl border px-3.5 py-1.5 transition-all ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
        }`}>
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search Gate Pass #, Job #, Vendor, Process..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-64 font-mono"
          />
        </div>

        <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Showing {filtered.length} Job-Work Record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Outwork Table */}
      <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-4 px-5">Gate-Out Pass #</th>
                <th className="py-4 px-5">Job Card Reference</th>
                <th className="py-4 px-5">Subcontractor / Vendor</th>
                <th className="py-4 px-5">Outsourced Process</th>
                <th className="py-4 px-5 text-right">Dispatched Qty</th>
                <th className="py-4 px-5 text-right">Received Qty</th>
                <th className="py-4 px-5">Expected Return</th>
                <th className="py-4 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filtered.map((s, idx) => {
                const passNo = s.gatePassNo || s.sendOutId || s.id || `GP-OUT-${idx + 1}`;
                const vendor = s.vendorName || s.subcontractorName || 'Subcontractor';
                const proc = s.process || s.processType || 'Outwork Process';
                const sent = Number(s.sentQty || s.dispatchedQty || 0);
                const rec = Number(s.receivedQty || 0);
                const expDate = s.expectedReturnDate || s.expectedDate || '—';
                const isOverdue = expDate !== '—' && s.status !== 'RETURNED_INSPECTED' && s.status !== 'COMPLETED' && new Date().getTime() > new Date(expDate).getTime();

                return (
                  <tr key={passNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                      {passNo}
                    </td>
                    <td className={`py-4 px-5 font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {s.jobNo || 'JC/0001/26-27'}
                    </td>
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      {vendor}
                    </td>
                    <td className="py-4 px-5 font-mono font-medium text-purple-500 dark:text-purple-400">
                      {proc}
                    </td>
                    <td className={`py-4 px-5 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {sent} NOS
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                      {rec} NOS
                    </td>
                    <td className={`py-4 px-5 font-mono ${isOverdue ? 'text-rose-500 font-bold' : (isDarkMode ? 'text-amber-400' : 'text-amber-600')}`}>
                      {expDate}
                      {isOverdue && <span className="ml-1 text-[9px] px-1 rounded bg-rose-500/20 text-rose-500">OVERDUE</span>}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                        isOverdue || s.status === 'OVERDUE_JOBWORK'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : s.status === 'RETURNED_INSPECTED' || s.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOverdue || s.status === 'OVERDUE_JOBWORK'
                            ? 'bg-rose-500'
                            : s.status === 'RETURNED_INSPECTED' || s.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : 'bg-purple-500'
                        }`} />
                        <span>{isOverdue ? 'OVERDUE' : (s.status || 'SENT')}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Outwork Send-Out Modal with Full Light/Dark Theming */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Issue Job-Work Gate-Out Pass
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Dispatch material to subcontractor & deduct from factory on-hand stock
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Job Card Reference *</label>
                  <input
                    type="text"
                    required
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    placeholder="e.g. JC/0001/26-27"
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Process Type *</label>
                  <select
                    value={process}
                    onChange={(e) => setProcess(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  >
                    <option value="HEAT_TREATMENT">Heat Treatment</option>
                    <option value="ELECTROPLATING">Electroplating</option>
                    <option value="ZINC_PLATING">Zinc Plating (Trivalent)</option>
                    <option value="NDT_TESTING">NDT Ultrasonic Testing</option>
                    <option value="CNC_MACHINING">CNC Machining (Outsourced)</option>
                    <option value="BLACK_OXIDE">Black Oxide Coating</option>
                    <option value="OTHER">Other Process</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Subcontractor / Vendor *</label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Apex Heat Treaters Ltd"
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Dispatched Quantity *</label>
                  <input
                    type="number"
                    required
                    value={sentQty}
                    onChange={(e) => setSentQty(Number(e.target.value))}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Expected Return Date *</label>
                  <input
                    type="date"
                    required
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Transporter</label>
                  <input
                    type="text"
                    value={transporter}
                    onChange={(e) => setTransporter(e.target.value)}
                    placeholder="e.g. Shree Logistics"
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Vehicle No</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. MH-12-QW-4011"
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className={`pt-4 border-t flex items-center justify-end gap-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
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
                  Issue Gate-Out Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlatingOutworkView;
