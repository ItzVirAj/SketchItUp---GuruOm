import React, { useState } from 'react';
import { Boxes, CheckCircle2, Package, Warehouse, Truck, Search, X } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFg = activeFgList.filter(fg => {
    const matchesPo = selectedOrderPo === 'ALL' || fg.orderPo === selectedOrderPo;
    const matchesSearch = !searchQuery || 
      fg.orderPo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fg.partCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fg.partDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPo && matchesSearch;
  });

  const totalPassed = activeFgList.reduce((acc, fg) => acc + fg.pdiPassedQty, 0);
  const totalHeld = activeFgList.reduce((acc, fg) => acc + fg.physicallyHeldQty, 0);
  const totalDispatched = activeFgList.reduce((acc, fg) => acc + fg.dispatchedQty, 0);

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
                Finished Inventory
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Finished Goods ({filteredFg.length})
            </h1>
          </div>
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">PDI Passed Pool</div>
            <div className="text-base font-black text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight mt-0.5">
              {totalPassed.toLocaleString()} <span className="text-xs font-normal text-slate-400">NOS</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Physically Held</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {totalHeld.toLocaleString()} <span className="text-xs font-normal text-slate-400">NOS</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Dispatched Qty</div>
            <div className="text-base font-black text-purple-500 tracking-tight mt-0.5">
              {totalDispatched.toLocaleString()} <span className="text-xs font-normal text-slate-400">NOS</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Reconciliation</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5">
              0 <span className="text-xs font-normal text-emerald-500">Variance</span>
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
                Finished Stock & Inventory Reconciliation
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{filteredFg.length} FG Items</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                  Finished Goods (FG) Reconciliation
                </h1>
                <span className="hidden font-mono text-[10px] font-semibold text-slate-400 xl:inline">
                  FINISHED STOCK • STORE RECONCILIATION • ZERO VARIANCE AUDIT
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Audit PDI-passed component inventory held in store vs dispatched quantities to verify zero stock variance prior to billing.
              </p>
            </div>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            {[
              { label: 'PDI Passed Pool', value: `${totalPassed.toLocaleString()} NOS`, detail: 'QC cleared output', icon: CheckCircle2, tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]' },
              { label: 'Physically Held in Store', value: `${totalHeld.toLocaleString()} NOS`, detail: 'In rack store', icon: Warehouse, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10' },
              { label: 'Dispatched Quantities', value: `${totalDispatched.toLocaleString()} NOS`, detail: 'Outward shipped', icon: Truck, tone: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-500/10' },
              { label: 'Reconciliation Status', value: '0 Variance', detail: 'Fully balanced', icon: Boxes, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
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
              <Warehouse className="h-4 w-4" />
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Filter Order PO:</span>
              <select
                value={selectedOrderPo}
                onChange={(e) => setSelectedOrderPo(e.target.value)}
                className={`h-10 px-3 rounded-xl border outline-none font-bold cursor-pointer text-xs ${
                  isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
              >
                <option value="ALL">All Purchase Orders ({activeFgList.length})</option>
                {orders.map((o) => (
                  <option key={o.poNo} value={o.poNo}>
                    PO: {o.poNo} — {o.customerName}
                  </option>
                ))}
              </select>
            </div>

            <div className={`flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 ml-auto ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]' : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search PO #, Part Code, Description..."
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
            <span>Showing {filteredFg.length} finished stock records</span>
            <span>Zero-Variance Store & PDI Physical Audit</span>
          </div>
        </div>
      </div>

      {/* Finished Goods Table Container */}
      <div className={`overflow-hidden rounded-[22px] border transition-all ${
        isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
      }`}>
        <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Finished Goods Stock Ledger</div>
            <div className="mt-0.5 text-[10px] text-slate-400">Audited PDI pool vs physically held in store and dispatches</div>
          </div>
          <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{filteredFg.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
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
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredFg.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                    No finished goods items found matching criteria.
                  </td>
                </tr>
              ) : null}
              {filteredFg.map((fg, idx) => (
                <tr key={idx} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
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
                          {fg.orderPo}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
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
                  <td className="py-4 px-5 text-right font-bold font-mono text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
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
