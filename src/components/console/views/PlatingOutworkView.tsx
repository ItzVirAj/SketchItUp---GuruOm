import React, { useState } from 'react';
import { Wrench, Plus, Search, X, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { OutworkSendOut } from '../../../types/console';

interface PlatingOutworkViewProps {
  sendOuts?: OutworkSendOut[];
  outwork?: OutworkSendOut[];
  outworks?: OutworkSendOut[];
  isDarkMode?: boolean;
  onCreateSendOut?: (sendOut: Partial<OutworkSendOut>) => void;
  onSendOut?: (sendOut: Partial<OutworkSendOut>) => void;
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
  const [vendorName, setVendorName] = useState('Anodize Tech Ltd');
  const [process, setProcess] = useState('Hard Anodizing 25 microns');
  const [sentQty, setSentQty] = useState(100);
  const [expectedDate, setExpectedDate] = useState('2026-08-25');

  const filtered = activeSendOuts.filter(o => 
    o.sendOutId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.process.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sendOutId = `SO-${String(activeSendOuts.length + 42).padStart(4, '0')}`;
    const handleCreate = onCreateSendOut || onSendOut;
    if (handleCreate) {
      handleCreate({
        sendOutId,
        vendorName,
        process,
        sentQty,
        receivedQty: 0,
        rejectedQty: 0,
        status: 'SENT',
        sentDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: expectedDate,
        expectedDate
      });
    }
    setShowModal(false);
  };

  const totalSent = activeSendOuts.reduce((acc, s) => acc + s.sentQty, 0);

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
                Subcontracting
              </span>
              <span className="text-xs text-slate-400 font-mono">• Surface Treatment & Outwork</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Plating & Outwork Management
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Track outwork send-outs for external surface treatment (anodizing, zinc plating, heat treatment) and receive vendor returns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>New Outwork Send-out</span>
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
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">Batches</span>
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
              <span className={`text-2xl font-bold font-mono text-purple-400`}>{totalSent.toLocaleString()} NOS</span>
              <span className="text-[11px] font-mono font-semibold text-purple-400">At Vendor</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Plating Vendors</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>3 Vendors</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">Approved</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Outwork Status</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Normal</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">WIP Pool</span>
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
            placeholder="Search Send-Out ID, Vendor, Process..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-64 font-mono"
          />
        </div>

        <span className="text-xs font-mono text-slate-400">Showing {filtered.length} Send-Out Records</span>
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
                <th className="py-4 px-5">Send-Out ID</th>
                <th className="py-4 px-5">Subcontractor / Vendor</th>
                <th className="py-4 px-5">Surface Process</th>
                <th className="py-4 px-5 text-right">Sent Qty</th>
                <th className="py-4 px-5 text-right">Received Qty</th>
                <th className="py-4 px-5">Expected Return</th>
                <th className="py-4 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filtered.map((s) => (
                <tr key={s.sendOutId} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                  <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                    {s.sendOutId}
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {s.vendorName}
                  </td>
                  <td className="py-4 px-5 font-mono text-purple-400">
                    {s.process}
                  </td>
                  <td className={`py-4 px-5 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {s.sentQty} NOS
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                    {s.receivedQty} NOS
                  </td>
                  <td className="py-4 px-5 font-mono text-amber-500">
                    {s.expectedReturnDate || s.expectedDate || '—'}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border bg-purple-500/10 text-purple-400 border-purple-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      <span>{s.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ultra-Polished Create Outwork Send-Out Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl shadow-[#5B75F8]/5' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Create Outwork Send-Out
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Dispatch parts to external surface treatment subcontractor
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
              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Vendor / Subcontractor *</label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Anodize Tech Ltd"
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Surface Process *</label>
                <input
                  type="text"
                  required
                  value={process}
                  onChange={(e) => setProcess(e.target.value)}
                  placeholder="e.g. Hard Anodizing 25 microns"
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Sent Quantity *</label>
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
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Expected Return</label>
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

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3">
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
                  Issue Send-Out
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
