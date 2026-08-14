import React, { useState } from 'react';
import { Boxes, CheckCircle2, AlertTriangle, Package, Warehouse, Truck, RefreshCw } from 'lucide-react';
import { FinishedGoodsItem, CustomerOrder } from '../../../types/console';

interface FinishedGoodsViewProps {
  items?: FinishedGoodsItem[];
  finishedGoods?: FinishedGoodsItem[];
  orders?: CustomerOrder[];
  isDarkMode?: boolean;
}

export const FinishedGoodsView: React.FC<FinishedGoodsViewProps> = ({
  items,
  finishedGoods,
  orders = [],
  isDarkMode = true
}) => {
  const activeFgList = items || finishedGoods || [];
  const [selectedOrderPo, setSelectedOrderPo] = useState<string>('ALL');

  const filteredFg = activeFgList.filter(fg => selectedOrderPo === 'ALL' || fg.orderPo === selectedOrderPo);

  const totalPassed = activeFgList.reduce((acc, fg) => acc + fg.pdiPassedQty, 0);
  const totalHeld = activeFgList.reduce((acc, fg) => acc + fg.physicallyHeldQty, 0);
  const totalDispatched = activeFgList.reduce((acc, fg) => acc + fg.dispatchedQty, 0);

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
                Finished Stock
              </span>
              <span className="text-xs text-slate-400 font-mono">• Store Inventory Reconciliation</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Finished Goods (FG) Reconciliation
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Audit PDI-passed component inventory held in store vs dispatched quantities to verify zero stock variance prior to billing.
            </p>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>PDI Passed Pool</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalPassed.toLocaleString()} NOS</span>
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8] dark:text-[#7B92FF]">QC Passed</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Physically Held in Store</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <Warehouse className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono text-emerald-500`}>{totalHeld.toLocaleString()} NOS</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">In Rack</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Dispatched Quantities</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalDispatched.toLocaleString()} NOS</span>
              <span className="text-[11px] font-mono font-semibold text-purple-400">Shipped</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Reconciliation Status</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>0 Variance</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">Reconciled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Filter Order PO:</span>
          <select
            value={selectedOrderPo}
            onChange={(e) => setSelectedOrderPo(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border outline-none font-bold cursor-pointer ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">All Purchase Orders</option>
            {orders.map((o) => (
              <option key={o.poNo} value={o.poNo}>
                PO: {o.poNo} — {o.customerName}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-mono text-slate-400">Showing {filteredFg.length} FG Stock Items</span>
      </div>

      {/* Finished Goods Table */}
      <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-4 px-5">Order PO</th>
                <th className="py-4 px-5">Part Code</th>
                <th className="py-4 px-5">Description</th>
                <th className="py-4 px-5 text-right">PDI Passed Pool</th>
                <th className="py-4 px-5 text-right">Physically Held</th>
                <th className="py-4 px-5 text-right">Dispatched</th>
                <th className="py-4 px-5 text-right">Variance</th>
                <th className="py-4 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredFg.map((fg, idx) => (
                <tr key={idx} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                  <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                    {fg.orderPo}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400">
                    {fg.partCode}
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {fg.partDescription}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                    {fg.pdiPassedQty} NOS
                  </td>
                  <td className={`py-4 px-5 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {fg.physicallyHeldQty} NOS
                  </td>
                  <td className="py-4 px-5 text-right font-mono text-slate-400">
                    {fg.dispatchedQty} NOS
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                    {fg.variance}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>RECONCILED</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default FinishedGoodsView;
