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
    const map: Record<StockStatus, { label: string; cls: string; dot: string }> = {
      OK:       { label: "IN STOCK",  cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500" },
      SHORTAGE: { label: "LOW STOCK", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30",     dot: "bg-amber-500" },
      CRITICAL: { label: "CRITICAL",  cls: "bg-rose-500/10 text-rose-400 border-rose-500/30",         dot: "bg-rose-500" },
      NO_STOCK: { label: "NO STOCK",  cls: "bg-slate-500/10 text-slate-400 border-slate-500/30",      dot: "bg-slate-500" },
    };
    const cfg = map[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${cfg.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp   className="w-3 h-3 text-[var(--accent-primary)]" />
      : <ChevronDown className="w-3 h-3 text-[var(--accent-primary)]" />;
  };

  const thBase = `py-3.5 px-5 font-mono font-bold uppercase tracking-[0.12em] text-[9px] cursor-pointer select-none ${isDarkMode ? "text-slate-500" : "text-slate-400"}`;

  const Th = ({ col, label, right }: { col: SortKey; label: string; right?: boolean }) => (
    <th className={`${thBase} ${right ? "text-right" : ""}`} onClick={() => toggleSort(col)}>
      <span className={`inline-flex items-center gap-1 ${right ? "justify-end" : ""}`}>
        {label}<SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className="space-y-5 font-sans w-full max-w-full min-w-0 pb-6">

      {/* HEADER */}
      <section className={`overflow-hidden rounded-[24px] border ${isDarkMode ? "border-white/[0.08] bg-[#171b24]" : "border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]"}`}>
        <div className="flex items-center gap-6 px-6 py-5">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Inventory · Item Master Index
              <span className="text-slate-700">/</span>
              <span>{fgMasters.length} FG items registered</span>
            </div>
            <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
              Finished Goods Inventory
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              All finished goods from the item master — live stock levels, reorder points, PDI &amp; dispatch data indexed per FG code.
            </p>
          </div>
        </div>

        <div className={`grid grid-cols-2 md:grid-cols-4 border-t ${isDarkMode ? "border-white/[0.07]" : "border-slate-200"}`}>
          {([
            { label: "FG Items in Master",      value: `${fgMasters.length}`,                  detail: "Registered finished goods",   Icon: Package,      tone: "text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]", bg: "bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]" },
            { label: "Total On-Hand Stock",     value: `${totalOnHand.toLocaleString()} NOS`,  detail: "Physical units in store",     Icon: Warehouse,    tone: "text-emerald-600 dark:text-emerald-400",                               bg: "bg-emerald-500/10" },
            { label: "Available for Dispatch",  value: `${totalAvailable.toLocaleString()} NOS`, detail: "Unallocated ready stock",  Icon: TrendingUp,   tone: "text-sky-600 dark:text-sky-400",                                        bg: "bg-sky-500/10" },
            { label: "Critical / No Stock",     value: `${criticalCount}`,                     detail: "Items at or below reorder",   Icon: AlertTriangle, tone: criticalCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400", bg: criticalCount > 0 ? "bg-rose-500/10" : "bg-emerald-500/10" },
          ] as const).map(({ label, value, detail, Icon, tone, bg }, i) => (
            <div key={label} className={`flex items-center gap-3 px-5 py-4 ${i > 0 ? isDarkMode ? "border-l border-white/[0.07]" : "border-l border-slate-200" : ""}`}>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} ${tone}`}><Icon className="h-4 w-4" /></div>
              <div className="min-w-0">
                <div className="font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</div>
                <div className={`mt-0.5 truncate text-lg font-extrabold tracking-[-0.03em] ${tone}`}>{value}</div>
                <div className="truncate text-[10px] text-slate-400">{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TOOLBAR */}
      <div className={`rounded-2xl border p-3 ${isDarkMode ? "border-white/[0.08] bg-[#171b24]" : "border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]"}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className={`w-3.5 h-3.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
            {(["ALL","OK","SHORTAGE","CRITICAL"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === s
                    ? "bg-[var(--accent-primary)] text-white shadow-sm"
                    : isDarkMode ? "bg-white/[0.05] text-slate-400 hover:bg-white/[0.09]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}>
                {s === "ALL"      && `All (${rows.length})`}
                {s === "OK"       && `In Stock (${rows.filter(r => r.stockStatus === "OK").length})`}
                {s === "SHORTAGE" && `Low Stock (${rows.filter(r => r.stockStatus === "SHORTAGE").length})`}
                {s === "CRITICAL" && `Critical (${rows.filter(r => r.stockStatus === "CRITICAL" || r.stockStatus === "NO_STOCK").length})`}
              </button>
            ))}
          </div>
          <div className={`flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 ml-auto ${isDarkMode ? "border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]" : "border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]"}`}>
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input type="text" placeholder="Search FG code, name, description, part no..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="h-full w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 font-mono" />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className={`mt-2.5 flex items-center justify-between px-1 font-mono text-[9px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
          <span>Showing {filtered.length} of {fgMasters.length} finished goods</span>
          <span>Inventory Master · Live Stock Index</span>
        </div>
      </div>

      {/* TABLE */}
      <div className={`overflow-hidden rounded-[22px] border ${isDarkMode ? "border-white/[0.08] bg-[#171b24]" : "border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]"}`}>
        <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? "border-white/[0.07]" : "border-slate-200"}`}>
          <div>
            <div className={`text-xs font-extrabold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Finished Goods Item Master</div>
            <div className="mt-0.5 text-[10px] text-slate-400">Click any row to expand PDI &amp; dispatch history</div>
          </div>
          <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? "border-white/[0.08] bg-white/[0.04] text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
            {filtered.length} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDarkMode ? "border-white/[0.07] bg-black/20" : "border-slate-200 bg-slate-50/80"}`}>
                <Th col="code"      label="FG Code" />
                <Th col="name"      label="Description" />
                <th className={thBase}>HSN / UoM</th>
                <Th col="onHand"    label="On Hand"    right />
                <Th col="reserved"  label="Reserved"   right />
                <Th col="available" label="Available"  right />
                <th className={`${thBase} text-right`}>Reorder</th>
                <Th col="status"    label="Status" />
                <th className={thBase}>Sale Price</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-200"}`}>
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
                    <tr onClick={() => setExpandedCode(isExpanded ? null : master.code)}
                      className={`group transition-colors cursor-pointer ${isDarkMode ? "hover:bg-white/[0.035]" : "hover:bg-slate-50/80"} ${isExpanded ? isDarkMode ? "bg-white/[0.025]" : "bg-slate-50" : ""}`}>

                      {/* FG Code */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                            isDarkMode
                              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30"
                              : "bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)] border border-[var(--accent-primary)]/20"
                          }`}>
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{master.code}</div>
                            {master.partNo && <div className="text-[10px] font-mono text-slate-500 mt-0.5">Drwg: {master.partNo}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className={`py-4 px-5 max-w-[220px] ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                        <div className="font-semibold text-xs truncate">{master.name || master.description}</div>
                        {master.name && master.description && master.name !== master.description && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">{master.description}</div>
                        )}
                        {master.category && (
                          <span className={`inline-block mt-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"}`}>
                            {master.category}
                          </span>
                        )}
                      </td>

                      {/* HSN / UoM */}
                      <td className="py-4 px-5">
                        <div className={`font-mono text-xs font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{master.hsnCode || "—"}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{master.unit}</div>
                      </td>

                      {/* On Hand */}
                      <td className="py-4 px-5 text-right">
                        <div className={`font-mono font-bold text-sm ${
                          stockStatus === "OK" ? "text-emerald-500" :
                          stockStatus === "SHORTAGE" ? "text-amber-500" :
                          stockStatus === "CRITICAL" ? "text-rose-500" : "text-slate-400"
                        }`}>{onHand.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">{master.unit}</div>
                      </td>

                      {/* Reserved */}
                      <td className="py-4 px-5 text-right">
                        <div className={`font-mono font-bold text-xs ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{reserved.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">{master.unit}</div>
                      </td>

                      {/* Available */}
                      <td className="py-4 px-5 text-right">
                        <div className={`font-mono font-bold text-sm ${available > 0 ? "text-sky-400" : "text-slate-400"}`}>{available.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">{master.unit}</div>
                      </td>

                      {/* Reorder Level */}
                      <td className="py-4 px-5 text-right">
                        <div className={`font-mono font-bold text-xs ${isBelowReorder ? "text-rose-400" : isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {reorder > 0 ? reorder.toLocaleString() : "—"}
                          {isBelowReorder && <AlertTriangle className="w-3 h-3 inline ml-1 text-rose-400" />}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">{statusBadge(stockStatus)}</td>

                      {/* Sale Price */}
                      <td className="py-4 px-5">
                        <div className={`font-mono text-xs font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
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
                                        <td className="py-2 px-3 font-mono font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{t.orderPo}</td>
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
