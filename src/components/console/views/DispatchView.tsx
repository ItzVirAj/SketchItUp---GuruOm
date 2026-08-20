import React, { useState } from 'react';
import { Truck, Plus, Download, CheckCircle2, Search, X, MapPin, PackageCheck } from 'lucide-react';
import { DispatchChallan, CustomerOrder, VendorMaster } from '../../../types/console';
import { getCurrentFinancialYear, formatDocumentNumber } from '../../../utils/statutoryAccountingEngine';

interface DispatchViewProps {
  dispatches?: DispatchChallan[];
  orders?: CustomerOrder[];
  vendors?: VendorMaster[];
  isDarkMode?: boolean;
  onCreateChallan?: (newChallan: Partial<DispatchChallan>) => void;
  onIssueDispatch?: (newChallan: any) => void;
}

export const DispatchView: React.FC<DispatchViewProps> = ({
  dispatches = [],
  orders = [],
  vendors = [],
  isDarkMode = true,
  onCreateChallan,
  onIssueDispatch
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderPo, setOrderPo] = useState(orders[0]?.poNo || '');
  
  const allTransporterOptions = ['VRL Logistics Ltd', 'SafeXpress Courier', 'GATI KWE', 'BlueDart Express', 'TCI Freight', 'Delhivery Surface'];
  const [transporter, setTransporter] = useState(allTransporterOptions[0] || 'VRL Logistics Ltd');
  const [vehicleNo, setVehicleNo] = useState('');

  const filteredDispatches = dispatches.filter(d => 
    d.challanNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.orderPo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.transporter && d.transporter.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fy = getCurrentFinancialYear();
    const runningNum = Math.floor(1000 + (dispatches.length + 1) * 31 + Math.random() * 899) % 9000;
    const challanNo = formatDocumentNumber('CHL', fy, runningNum);
    const payload = {
      challanNo,
      orderPo,
      status: 'DISPATCHED' as const,
      date: new Date().toISOString().split('T')[0],
      transporter,
      vehicleNo,
      driverContact: '+91 98765 43210',
      totalInvoiceValue: 18500
    };
    if (onCreateChallan) onCreateChallan(payload);
    if (onIssueDispatch) onIssueDispatch(payload);
    setShowModal(false);
  };

  const deliveredCount = dispatches.filter(d => d.status === 'DELIVERED' || d.status === 'DISPATCHED').length;

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
                Outward Logistics
              </span>
              <span className="text-xs text-slate-400 font-mono">• Delivery Challans Telemetry</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Dispatch & Delivery Schedule
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Generate delivery challans for PDI-approved finished goods, manage freight transporters, and track outbound shipments to customer plants.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Delivery Challan</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Delivery Challans</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{dispatches.length}</span>
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">Challans</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Fulfilled & Delivered</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono text-emerald-500`}>{deliveredCount}</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">Dispatched</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Freight Transporters</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>4 Partners</span>
              <span className="text-[11px] font-mono font-semibold text-purple-400">Logistics</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Dispatch Compliance</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>100%</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">PDI Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className={`relative flex items-center rounded-2xl border px-3.5 py-1.5 transition-all ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
        }`}>
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search Challan # or Order PO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-64 font-mono"
          />
        </div>

        <span className="text-xs font-mono text-slate-400">Showing {filteredDispatches.length} Delivery Challans</span>
      </div>

      {/* Dispatches Table */}
      <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-4 px-5">Challan #</th>
                <th className="py-4 px-5">Customer Order PO</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5">Dispatch Date</th>
                <th className="py-4 px-5">Transporter Partner</th>
                <th className="py-4 px-5">Vehicle #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredDispatches.map((disp) => (
                <tr key={disp.challanNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                  <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                    {disp.challanNo}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400">
                    {disp.orderPo}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{disp.status}</span>
                    </span>
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400">
                    {disp.date}
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {disp.transporter || 'Self Pick-up'}
                  </td>
                  <td className="py-4 px-5 font-mono text-purple-400 font-medium">
                    {disp.vehicleNo || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ultra-Polished Issue Delivery Challan Modal */}
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
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Issue Delivery Challan
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Dispatch outward consignment & logistics manifest
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
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Customer Order PO *</label>
                <select
                  value={orderPo}
                  onChange={(e) => setOrderPo(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                >
                  {orders.map(o => (
                    <option key={o.id} value={o.poNo}>{o.poNo} — {o.customerName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Transporter Partner (Vendor Master) *</label>
                <select
                  required
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                >
                  {allTransporterOptions.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Vehicle Registration Number *</label>
                <input
                  type="text"
                  required
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="e.g. MH 12 AB 4589"
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
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
                  Issue Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DispatchView;
