import React, { useState, useMemo } from "react";
import {
  Boxes, CheckCircle2, Package, Warehouse, Truck, Search, X,
  AlertTriangle, TrendingUp, ChevronDown, ChevronUp, Info, Filter
} from "lucide-react";
import { FinishedGoodsItem, CustomerOrder, MasterItem, StockItem } from "../../../types/console";

interface FinishedGoodsViewProps {
  items?: FinishedGoodsItem[];
  finishedGoods?: FinishedGoodsItem[];
  masters?: MasterItem[];
  stock?: StockItem[];
  orders?: CustomerOrder[];
  isDarkMode?: boolean;
}

type SortKey = "code" | "name" | "onHand" | "reserved" | "available" | "status";
type SortDir = "asc" | "desc";
type StockStatus = "OK" | "SHORTAGE" | "CRITICAL" | "NO_STOCK";

interface FGRow {
  master: MasterItem;
  stockItem?: StockItem;
  transactions: FinishedGoodsItem[];
  onHand: number;
  reserved: number;
  available: number;
  pdiPassed: number;
  dispatched: number;
  stockStatus: StockStatus;
}

const SortIcon: React.FC<{ col: SortKey; sortKey: SortKey; sortDir: SortDir }> = ({ col, sortKey, sortDir }) => {
  if (sortKey !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3 h-3 text-slate-900 dark:text-white" />
    : <ChevronDown className="w-3 h-3 text-slate-900 dark:text-white" />;
};

export const FinishedGoodsView: React.FC<FinishedGoodsViewProps> = ({
  items,
  finishedGoods,
  masters = [],
  stock = [],
  orders = [],
  isDarkMode = true,
}) => {
  const fgTransactions = items || finishedGoods || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | StockStatus>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const fgMasters = useMemo(() =>
    masters.filter(m =>
      m.itemType === "Finished Good" ||
      m.isFinishedGoods === true ||
      m.code?.toUpperCase().startsWith("FG-")
    ), [masters]);

  const rows = useMemo((): FGRow[] =>
    fgMasters.map(master => {
      const codeLC = master.code.toLowerCase().trim();
      const stockItem = stock.find(s =>
        s.code?.toLowerCase().trim() === codeLC ||
        s.partCode?.toLowerCase().trim() === codeLC ||
        s.rawCode?.toLowerCase().trim() === codeLC
      );
      const txns = fgTransactions.filter(fg =>
        fg.partCode?.toLowerCase().trim() === codeLC
      );
      const onHand    = stockItem?.onHand    ?? txns.reduce((s, t) => s + t.physicallyHeldQty, 0);
      const reserved  = stockItem?.reserved  ?? 0;
      const available = stockItem?.available ?? (onHand - reserved);
      const pdiPassed = txns.reduce((s, t) => s + t.pdiPassedQty, 0);
      const dispatched= txns.reduce((s, t) => s + t.dispatchedQty, 0);
      let stockStatus: StockStatus = "NO_STOCK";
      if (stockItem) stockStatus = stockItem.status as StockStatus;
      else if (onHand > 0) stockStatus = "OK";
      return { master, stockItem, transactions: txns, onHand, reserved, available, pdiPassed, dispatched, stockStatus };
    }), [fgMasters, stock, fgTransactions]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter(r => {
      const matchesSearch = !q ||
        r.master.code.toLowerCase().includes(q) ||
        (r.master.name || "").toLowerCase().includes(q) ||
        r.master.description.toLowerCase().includes(q) ||
        (r.master.partNo || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" ||
        (statusFilter === "CRITICAL" && (r.stockStatus === "CRITICAL" || r.stockStatus === "NO_STOCK")) ||
        r.stockStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      let cmp = 0;
      if (sortKey === "code") cmp = a.master.code.localeCompare(b.master.code);
      else if (sortKey === "name") cmp = (a.master.name || "").localeCompare(b.master.name || "");
      else if (sortKey === "onHand") cmp = a.onHand - b.onHand;
      else if (sortKey === "reserved") cmp = a.reserved - b.reserved;
      else if (sortKey === "available") cmp = a.available - b.available;
      else if (sortKey === "status") cmp = a.stockStatus.localeCompare(b.stockStatus);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, searchQuery, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const totalOnHand    = rows.reduce((s, r) => s + r.onHand, 0);
  const totalAvailable = rows.reduce((s, r) => s + r.available, 0);
  const totalDispatched= rows.reduce((s, r) => s + r.dispatched, 0);
  const criticalCount  = rows.filter(r => r.stockStatus === "CRITICAL" || r.stockStatus === "NO_STOCK").length;

  const statusBadge = (status: StockStatus) => {
    if (status === 'OK') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
          isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>In Stock</span>
        </span>
      );
    }
    if (status === 'SHORTAGE') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
          isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>Low Stock</span>
        </span>
      );
    }
    if (status === 'CRITICAL' || status === 'NO_STOCK') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
          isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
          </span>
          <span>{status === 'NO_STOCK' ? 'No Stock' : 'Critical Shortage'}</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
        isDarkMode ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        <span>{status}</span>
      </span>
    );
  };

  const renderTh = (col: SortKey, label: string, right?: boolean) => (
    <th 
      key={col} 
      className={`py-4 px-6 text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none transition-colors ${
        right ? "text-right" : ""
      } ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`} 
      onClick={() => toggleSort(col)}
    >
      <span className={`inline-flex items-center gap-1.5 ${right ? "justify-end" : ""}`}>
        {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-6">

      <section className={`overflow-hidden rounded-2xl border transition-all ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
          : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 sm:py-7">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                isDarkMode
                  ? 'bg-white/10 border border-white/15 text-white'
                  : 'bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs'
              }`}>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Finished Goods Telemetry</span>
              </span>
              <span className="text-sm font-semibold text-white/80">•</span>
              <span className="text-xs sm:text-sm font-semibold text-white/95">
                {fgMasters.length} Registered FG Items
              </span>
            </div>

            <h1 className="text-3xl sm:text-[32px] font-black tracking-tight text-white leading-tight">
              Finished Goods Inventory
            </h1>

            <p className="text-xs sm:text-sm text-white/95 font-medium leading-relaxed max-w-2xl">
              Finished goods index from catalog master — live store levels, reorder buffers, and PDI dispatch allocations.
            </p>
          </div>
        </div>

        {/* Integrated 4-Column Metric Strip (border-t) */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
            : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
        }`}>
          {([
            {
              label: "FG Items in Master",
              value: `${fgMasters.length}`,
              detail: "Registered finished goods",
              Icon: Package,
              iconColor: isDarkMode ? 'text-white' : 'text-[#155dfc]',
              iconBg: isDarkMode ? 'bg-blue-600 shadow-xs' : 'bg-white shadow-xs',
            },
            {
              label: "Total On-Hand Stock",
              value: `${totalOnHand.toLocaleString()} NOS`,
              detail: "Physical units in store",
              Icon: Warehouse,
              iconColor: "text-white",
              iconBg: "bg-emerald-500 shadow-xs",
            },
            {
              label: "Available for Dispatch",
              value: `${totalAvailable.toLocaleString()} NOS`,
              detail: "Unallocated ready stock",
              Icon: TrendingUp,
              iconColor: "text-white",
              iconBg: "bg-sky-500 shadow-xs",
            },
            {
              label: "Critical / No Stock",
              value: `${criticalCount}`,
              detail: "Items at or below reorder",
              Icon: AlertTriangle,
              iconColor: "text-white",
              iconBg: criticalCount > 0 ? "bg-rose-500 shadow-xs" : "bg-emerald-500 shadow-xs",
            },
          ] as const).map(({ label, value, detail, Icon, iconColor, iconBg }, index) => (
            <div
              key={label}
              className={`flex items-center gap-4 px-6 py-5 transition-all ${
                index > 0 ? (isDarkMode ? 'lg:border-l border-white/10' : 'lg:border-l border-white/20') : ''
              }`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}>
                <Icon className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-wider text-white/85">
                  {label}
                </div>
                <div className="text-2xl sm:text-[26px] font-black tracking-tight text-white tabular-nums my-0.5 leading-tight">
                  {value}
                </div>
                <div className="text-xs font-medium text-white/90 truncate">
                  {detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ── APPLE 2-TIER COMMAND DECK & FILTERS ──                                 */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-3.5 transition-all ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
          : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
      }`}>
        <div className="space-y-3">
          {/* Tier 1: Segmented status filter buttons + Telemetry chip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-1 rounded-xl p-1 border transition-all ${
              isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/80 bg-slate-100/80'
            }`}>
              {(["ALL","OK","SHORTAGE","CRITICAL"] as const).map(s => {
                const isSelected = statusFilter === s;
                const count = s === "ALL" ? rows.length :
                  s === "OK" ? rows.filter(r => r.stockStatus === "OK").length :
                  s === "SHORTAGE" ? rows.filter(r => r.stockStatus === "SHORTAGE").length :
                  rows.filter(r => r.stockStatus === "CRITICAL" || r.stockStatus === "NO_STOCK").length;

                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-white hover:bg-white/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <span>
                      {s === "ALL" && "All"}
                      {s === "OK" && "In Stock"}
                      {s === "SHORTAGE" && "Low Stock"}
                      {s === "CRITICAL" && "Critical"}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isSelected
                        ? isDarkMode ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-800'
                        : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
                isDarkMode ? 'border-white/10 bg-black/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
              }`}>
                Showing {filtered.length} of {fgMasters.length} items
              </span>
            </div>
          </div>

          {/* Tier 2: Apple Spotlight Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by finished goods code, catalog name, drawing #, or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`h-11 w-full rounded-xl border pl-10 pr-24 font-mono text-xs font-semibold outline-none transition-all ${
                isDarkMode
                  ? 'border-white/10 bg-black/30 text-white placeholder:text-slate-500 focus:border-white/30 focus:bg-black/50'
                  : 'border-slate-200/90 bg-white text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:shadow-xs'
              }`}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md border border-black/10 dark:border-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                ⌘F
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── FINISHED GOODS MASTER TABLE ──                                         */}
      {/* ========================================================================= */}
      <div className={`overflow-hidden rounded-3xl border transition-all ${
        isDarkMode
          ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
          : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]'
      }`}>
        <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-all ${
          isDarkMode
            ? 'border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60'
            : 'border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs ${
              isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-900 text-white shadow-2xs'
            }`}>
              <Boxes className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                Finished Goods Item Master
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Click any row to reveal line-level PDI &amp; dispatch tracking history
              </div>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
            isDarkMode ? 'border-white/10 bg-black/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
          }`}>
            {filtered.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider transition-all ${
                isDarkMode
                  ? 'border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400'
                  : 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600'
              }`}>
                {renderTh("code", "FG Code")}
                {renderTh("name", "Description")}
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">HSN / UoM</th>
                {renderTh("onHand", "On Hand", true)}
                {renderTh("reserved", "Reserved", true)}
                {renderTh("available", "Available", true)}
                <th className="py-4 px-6 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Reorder</th>
                {renderTh("status", "Status", true)}
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Sale Price</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs transition-colors ${
              isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/70'
            }`}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 font-mono text-xs">
                    {fgMasters.length === 0
                      ? 'No finished goods in Item Master. Add items with type "Finished Good" in Masters.'
                      : `No items match your search.`}
                  </td>
                </tr>
              )}
              {filtered.map(row => {
                const { master, onHand, reserved, available, pdiPassed, dispatched, stockStatus, transactions } = row;
                const isExpanded = expandedCode === master.code;
                const reorder = master.reorderLevel ?? 0;
                const isBelowReorder = onHand <= reorder && reorder > 0;

                return (
                  <React.Fragment key={master.id || master.code}>
                    <tr 
                      onClick={() => setExpandedCode(isExpanded ? null : master.code)}
                      className={`group transition-all duration-150 cursor-pointer ${
                        isDarkMode
                          ? 'even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent'
                          : 'even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent'
                      } ${isExpanded ? isDarkMode ? "bg-white/[0.03]" : "bg-slate-50" : ""}`}
                    >
                      {/* Column 1: FG Code with squircle and font-black code */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                            stockStatus === 'CRITICAL' || stockStatus === 'NO_STOCK'
                              ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200'
                              : stockStatus === 'SHORTAGE'
                              ? isDarkMode ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
                              : isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200/70'
                          }`}>
                            <Package className="w-5 h-5 stroke-[2]" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black">
                              {master.code}
                            </span>
                            {master.partNo ? (
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px] mt-1">
                                Drwg: {master.partNo}
                              </div>
                            ) : (
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px] mt-1">
                                {master.name || master.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className={`py-4.5 px-6 max-w-[240px] ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                        <div className="font-semibold text-xs truncate">{master.name || master.description}</div>
                        {master.name && master.description && master.name !== master.description && (
                          <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{master.description}</div>
                        )}
                        {master.category && (
                          <span className={`inline-block mt-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                            isDarkMode ? "bg-white/[0.06] text-slate-400 border-white/[0.08]" : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {master.category}
                          </span>
                        )}
                      </td>

                      {/* HSN / UoM */}
                      <td className="py-4.5 px-6">
                        <div className={`font-mono text-xs font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                          {master.hsnCode || "—"}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{master.unit}</div>
                      </td>

                      {/* On Hand */}
                      <td className="py-4.5 px-6 text-right">
                        <div className={`font-mono font-bold text-sm ${
                          stockStatus === "OK" ? "text-emerald-500" :
                          stockStatus === "SHORTAGE" ? "text-amber-500" :
                          stockStatus === "CRITICAL" ? "text-rose-500" : "text-slate-400"
                        }`}>
                          {onHand.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{master.unit}</div>
                      </td>

                      {/* Reserved */}
                      <td className="py-4.5 px-6 text-right font-mono text-slate-400">
                        <div className="font-bold text-xs">{reserved.toLocaleString()}</div>
                        <div className="text-[10px]">{master.unit}</div>
                      </td>

                      {/* Available */}
                      <td className="py-4.5 px-6 text-right">
                        <div className={`font-mono font-bold text-sm ${available > 0 ? "text-emerald-500" : "text-slate-400"}`}>
                          {available.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{master.unit}</div>
                      </td>

                      {/* Reorder Level */}
                      <td className="py-4.5 px-6 text-right font-mono">
                        <div className={`font-bold text-xs ${isBelowReorder ? "text-rose-400" : isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {reorder > 0 ? reorder.toLocaleString() : "—"}
                          {isBelowReorder && <AlertTriangle className="w-3 h-3 inline ml-1 text-rose-400" />}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4.5 px-6 text-center">{statusBadge(stockStatus)}</td>

                      {/* Sale Price */}
                      <td className="py-4.5 px-6 font-mono">
                        <div className={`text-xs font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                          {master.sellingPrice ? `\u20B9${master.sellingPrice.toLocaleString("en-IN")}` : "—"}
                        </div>
                        {master.gstRate !== undefined && (
                          <div className="text-[10px] text-slate-400 mt-0.5">GST {master.gstRate}%</div>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <tr className={isDarkMode ? "bg-black/20" : "bg-slate-50"}>
                        <td colSpan={9} className="px-8 py-4">
                          <div className="space-y-3">
                            <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                              Detail — {master.code}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { label: "PDI Passed",       value: `${pdiPassed} ${master.unit}`,   color: "text-emerald-400" },
                                { label: "Total Dispatched", value: `${dispatched} ${master.unit}`,  color: "text-purple-400" },
                                { label: "Preferred Vendor", value: master.preferredVendor || "—",   color: isDarkMode ? "text-slate-300" : "text-slate-700" },
                                { label: "Store Location",   value: master.storeLocation || master.defaultWarehouse || "—", color: isDarkMode ? "text-slate-300" : "text-slate-700" },
                              ].map(d => (
                                <div key={d.label} className={`p-2.5 rounded-xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`}>
                                  <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">{d.label}</div>
                                  <div className={`mt-0.5 font-bold text-xs font-mono ${d.color}`}>{d.value}</div>
                                </div>
                              ))}
                            </div>
                            {transactions.length > 0 ? (
                              <div className={`overflow-hidden rounded-xl border ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className={`border-b font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? "border-slate-800 bg-black/20 text-slate-500" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                                      <th className="py-2 px-3 text-left">Order PO</th>
                                      <th className="py-2 px-3 text-right">PDI Passed</th>
                                      <th className="py-2 px-3 text-right">Physically Held</th>
                                      <th className="py-2 px-3 text-right">Dispatched</th>
                                      <th className="py-2 px-3 text-right">Variance</th>
                                    </tr>
                                  </thead>
                                  <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-200"}`}>
                                    {transactions.map((t, i) => (
                                      <tr key={i} className={isDarkMode ? "hover:bg-white/[0.03]" : "hover:bg-slate-50"}>
                                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">{t.orderPo}</td>
                                        <td className="py-2 px-3 text-right text-emerald-400 font-mono font-bold">{t.pdiPassedQty}</td>
                                        <td className={`py-2 px-3 text-right font-mono font-bold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{t.physicallyHeldQty}</td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-400">{t.dispatchedQty}</td>
                                        <td className={`py-2 px-3 text-right font-mono font-bold ${t.variance !== 0 ? "text-rose-400" : "text-emerald-400"}`}>{t.variance}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className={`text-center py-3 text-[11px] font-mono rounded-xl border ${isDarkMode ? "border-slate-800 text-slate-600" : "border-slate-200 text-slate-400"}`}>
                                No PDI/dispatch transactions recorded for this item yet.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinishedGoodsView;
