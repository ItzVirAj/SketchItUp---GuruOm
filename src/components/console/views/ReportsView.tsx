import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  BarChart3, 
  TrendingUp, 
  X, 
  Clock, 
  CheckCircle2,
  Calendar,
  Package
} from 'lucide-react';
import { ProductionLogReport } from '../../../types/console';

interface ReportsViewProps {
  logs?: ProductionLogReport[];
  productionLogs?: ProductionLogReport[];
  orders?: any[];
  stock?: any[];
  qcItems?: any[];
  isDarkMode?: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ 
  logs, 
  productionLogs, 
  orders = [], 
  stock = [], 
  isDarkMode = true 
}) => {
  const activeLogs = logs || productionLogs || [];
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-20');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = activeLogs.filter(l => 
    l.jobNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.operationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.itemCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalLoggedQty = activeLogs.reduce((acc, l) => acc + l.qtyDone, 0);

  const exportCSV = () => {
    const headers = ['Item Code', 'Description', 'Job No', 'Step No', 'Operation Name', 'Qty Done', 'Timestamp'];
    const rows = filteredLogs.map(l => [l.itemCode, l.description, l.jobNo, l.stepNo, l.operationName, l.qtyDone, l.loggedTimestamp]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `production_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                Executive Analytics
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Production Logs ({filteredLogs.length})
            </h1>
          </div>

          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-md active:scale-[0.96] transition-ui"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Shift Steps Logged</div>
            <div className="text-base font-black text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight mt-0.5">
              {activeLogs.length} <span className="text-xs font-normal text-slate-400">Records</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total Output</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {totalLoggedQty.toLocaleString()} <span className="text-xs font-normal text-slate-400">NOS</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Active Orders</div>
            <div className="text-base font-black text-purple-500 tracking-tight mt-0.5">
              {orders.length} <span className="text-xs font-normal text-slate-400">POs</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Compliance</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5">
              100% <span className="text-xs font-normal text-slate-400">Audited</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP HEADER & INTEGRATED KPI ROW (≥ md) ──                          */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        <section className={`overflow-hidden rounded-[24px] border ${isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'}`}>
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Audit Logs & Analytics Engine
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{filteredLogs.length} Operation Records</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                  Production & Shift Logs
                </h1>
                <span className="hidden font-mono text-[10px] font-semibold text-slate-400 xl:inline">
                  EXECUTIVE ANALYTICS • PRODUCTION AUDIT LOGS • COMPLIANCE TRACKING
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Audit operation steps completed across all shopfloor job cards, analyze machine output, and export compliance reports.
              </p>
            </div>

            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 text-xs font-bold text-white shadow-lg shadow-[var(--accent-shadow)] transition hover:brightness-110 active:scale-[0.96]"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV Report</span>
            </button>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            {[
              { label: 'Shift Steps Logged', value: `${activeLogs.length}`, detail: 'Recorded terminal executions', icon: FileText, tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]' },
              { label: 'Total Output Volume', value: `${totalLoggedQty.toLocaleString()} NOS`, detail: 'Finished component units', icon: TrendingUp, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10' },
              { label: 'Customer Orders', value: `${orders.length} Tracked`, detail: 'Active manufacturing POs', icon: BarChart3, tone: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-500/10' },
              { label: 'Audit Compliance', value: '100% Verified', detail: 'Traceable log timestamps', icon: CheckCircle2, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
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

        {/* Desktop Date Filter & Search Toolbar */}
        <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'}`}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkMode ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-500'}`} title="Modules">
              <FileText className="h-4 w-4" />
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <div className={`flex h-10 items-center gap-2 rounded-xl border px-3 ${
                isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
              }`}>
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-400 font-bold uppercase text-[9px]">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent outline-none font-bold text-xs"
                />
              </div>

              <div className={`flex h-10 items-center gap-2 rounded-xl border px-3 ${
                isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
              }`}>
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-400 font-bold uppercase text-[9px]">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent outline-none font-bold text-xs"
                />
              </div>
            </div>

            {/* Search Input */}
            <div className={`flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 ml-auto ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]' : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search Job #, Part, Operation..."
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
            <span>Showing {filteredLogs.length} of {activeLogs.length} logged operations</span>
            <span className="text-emerald-500 font-bold">Total Produced: {totalLoggedQty.toLocaleString()} NOS</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE PRODUCTION LOG CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredLogs.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
            isDarkMode ? 'bg-[#121215] border-white/[0.08] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No production logs found matching your filters.
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-ui space-y-3 shadow-sm ${
                isDarkMode ? 'bg-[#121215] border-white/[0.08]' : 'bg-white border-slate-200'
              }`}
            >
              {/* Header: Job No + Step Pill */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                      {log.jobNo}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Step {log.stepNo}
                    </span>
                  </div>
                  <h3 className={`text-xs font-bold font-sans mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {log.operationName}
                  </h3>
                </div>

                <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                  +{log.qtyDone} NOS
                </span>
              </div>

              {/* Component Code & Description */}
              <div className={`p-2.5 rounded-xl border text-xs ${
                isDarkMode ? 'bg-black/20 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="font-mono font-bold text-slate-200 text-[11px]">{log.itemCode}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">{log.description}</div>
              </div>

              {/* Footer: Timestamp */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Logged at:</span>
                </span>
                <span className="text-slate-300 font-semibold">{log.loggedTimestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP REPORTS TABLE (Viewport >= md) */}
      {/* ========================================================================= */}
      <div className={`hidden md:block overflow-hidden rounded-[22px] border transition-ui ${
        isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
      }`}>
        <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Shopfloor Production Log Ledger</div>
            <div className="mt-0.5 text-[10px] text-slate-400">Step completions, machine outputs, and operator timestamps</div>
          </div>
          <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{filteredLogs.length} logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
              }`}>
                <th className="py-4 px-5">Item Code</th>
                <th className="py-4 px-5">Description</th>
                <th className="py-4 px-5">Job Card #</th>
                <th className="py-4 px-5 text-center">Step #</th>
                <th className="py-4 px-5">Operation Name</th>
                <th className="py-4 px-5 text-right">Qty Done</th>
                <th className="py-4 px-5 font-mono">Logged Timestamp</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono text-xs">
                    No production logs found matching the selected range and search criteria.
                  </td>
                </tr>
              ) : null}
              {filteredLogs.map((log, idx) => (
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
                          {log.itemCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {log.description}
                  </td>
                  <td className={`py-4 px-5 font-mono text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {log.jobNo}
                  </td>
                  <td className="py-4 px-5 text-center font-bold font-mono text-purple-400">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px]">
                      Step {log.stepNo}
                    </span>
                  </td>
                  <td className={`py-4 px-5 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {log.operationName}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                    {log.qtyDone.toLocaleString()} NOS
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400 text-xs">
                    {log.loggedTimestamp}
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

export default ReportsView;
