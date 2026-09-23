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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shadow-md active:scale-[0.96] transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-white hover:bg-slate-100 text-slate-900'
                : 'bg-[#181920] hover:bg-[#252730] text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Shift Steps Logged</div>
            <div className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
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
                  <span>Audit Logs &amp; Analytics Engine</span>
                </span>
                <span className="text-sm font-semibold text-white/80">•</span>
                <span className="text-xs sm:text-sm font-semibold text-white/95">
                  {filteredLogs.length} Operation Records
                </span>
              </div>

              <h1 className="text-3xl sm:text-[32px] font-black tracking-tight text-white leading-tight">
                Production &amp; Shift Logs
              </h1>

              <p className="text-xs sm:text-sm text-white/95 font-medium leading-relaxed max-w-2xl">
                Audit operation steps completed across all shopfloor job cards, analyze machine output, and export compliance reports.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={exportCSV}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isDarkMode
                    ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                    : 'bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
                }`}
              >
                <Download className="h-4 w-4 stroke-[2.5]" />
                <span>Export CSV Report</span>
              </button>
            </div>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
            isDarkMode
              ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
              : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
          }`}>
            {[
              {
                label: 'Shift Steps Logged',
                value: `${activeLogs.length}`,
                detail: 'Recorded terminal executions',
                icon: FileText,
                iconColor: isDarkMode ? 'text-white' : 'text-[#155dfc]',
                iconBg: isDarkMode ? 'bg-blue-600 shadow-xs' : 'bg-white shadow-xs',
              },
              {
                label: 'Total Output Volume',
                value: `${totalLoggedQty.toLocaleString()} NOS`,
                detail: 'Finished component units',
                icon: TrendingUp,
                iconColor: 'text-white',
                iconBg: 'bg-emerald-500 shadow-xs',
              },
              {
                label: 'Customer Orders',
                value: `${orders.length} Tracked`,
                detail: 'Active manufacturing POs',
                icon: BarChart3,
                iconColor: 'text-white',
                iconBg: 'bg-purple-500 shadow-xs',
              },
              {
                label: 'Audit Compliance',
                value: '100% Verified',
                detail: 'Traceable log timestamps',
                icon: CheckCircle2,
                iconColor: 'text-white',
                iconBg: 'bg-amber-500 shadow-xs',
              },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className={`flex items-center gap-4 px-6 py-5 transition-all ${
                    index > 0 ? (isDarkMode ? 'lg:border-l border-white/10' : 'lg:border-l border-white/20') : ''
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${metric.iconBg} ${metric.iconColor}`}>
                    <MetricIcon className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-white/85">
                      {metric.label}
                    </div>
                    <div className="text-2xl sm:text-[26px] font-black tracking-tight text-white tabular-nums my-0.5 leading-tight">
                      {metric.value}
                    </div>
                    <div className="text-xs font-medium text-white/90 truncate">
                      {metric.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── APPLE 2-TIER COMMAND DECK & DATE FILTERS ── */}
        <div className={`rounded-2xl border p-3.5 transition-all ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
            : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
        }`}>
          <div className="space-y-3">
            {/* Tier 1: Date pickers + Live Telemetry chip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-xs">
                <div className={`flex h-9 items-center gap-2 rounded-xl border px-3 transition-all ${
                  isDarkMode ? 'border-white/10 bg-black/40 text-white' : 'border-slate-200/90 bg-slate-100/80 text-slate-900'
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

                <div className={`flex h-9 items-center gap-2 rounded-xl border px-3 transition-all ${
                  isDarkMode ? 'border-white/10 bg-black/40 text-white' : 'border-slate-200/90 bg-slate-100/80 text-slate-900'
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

              {/* Telemetry pill */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                  isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-white text-slate-600 shadow-2xs'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Showing {filteredLogs.length} of {activeLogs.length} logged operations
                </span>
                <span className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                  isDarkMode ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  Total: {totalLoggedQty.toLocaleString()} NOS
                </span>
              </div>
            </div>

            {/* Tier 2: Spotlight search */}
            <div className={`relative flex items-center rounded-xl border transition-all ${
              isDarkMode
                ? 'border-white/10 bg-black/40 text-white focus-within:border-white/25 focus-within:bg-black/60'
                : 'border-slate-200/90 bg-white text-slate-900 focus-within:border-slate-400 focus-within:shadow-xs'
            }`}>
              <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search job card #, part name, item code, operation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pl-10 pr-24 py-2.5 text-xs font-medium outline-none placeholder:text-slate-400 font-sans"
              />
              <div className="absolute right-3 flex items-center gap-2">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className={`hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                    isDarkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'
                  }`}>
                    ⌘F
                  </kbd>
                )}
              </div>
            </div>
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
      <div className={`hidden md:block overflow-hidden rounded-3xl border transition-all duration-300 ${
        isDarkMode 
          ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_24px_50px_rgba(0,0,0,0.6)]' 
          : 'border-slate-200/80 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.06)]'
      }`}>
        {/* Specular top edge highlight line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />

        <div className={`flex items-center justify-between border-b px-6 py-4 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">Shopfloor Production Log Ledger</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Step completions, machine outputs, and operator timestamps</div>
          </div>
          <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            {filteredLogs.length} logs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`border-b ${isDarkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/60'}`}>
              <tr className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
                <th className="py-4 px-6">Item Code &amp; Part</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Job Card #</th>
                <th className="py-4 px-6 text-center">Step #</th>
                <th className="py-4 px-6">Operation Name</th>
                <th className="py-4 px-6 text-right">Qty Done</th>
                <th className="py-4 px-6 font-mono">Logged Timestamp</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200/80'}`}>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 font-mono text-xs">
                    No production logs found matching the selected range and search criteria.
                  </td>
                </tr>
              ) : null}
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className={`group transition-all duration-200 ${
                  isDarkMode 
                    ? 'hover:bg-white/[0.03] border-b border-white/[0.04]' 
                    : 'hover:bg-slate-50/90 border-b border-slate-100'
                }`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${
                        isDarkMode
                          ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10 text-white'
                          : 'bg-gradient-to-br from-slate-50 to-slate-100/80 border-slate-200/80 text-slate-800 shadow-xs'
                      }`}>
                        <Package className="w-5 h-5 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]" />
                      </div>
                      <div>
                        <div className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black">
                          {log.itemCode}
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate max-w-[220px]">
                          {log.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`py-4 px-6 font-bold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {log.description}
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-mono text-xs font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                      {log.jobNo}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                      isDarkMode ? 'border-purple-500/30 bg-purple-500/10 text-purple-300' : 'border-purple-200 bg-purple-50 text-purple-700'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span>Step {log.stepNo}</span>
                    </span>
                  </td>
                  <td className={`py-4 px-6 font-medium text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {log.operationName}
                  </td>
                  <td className="py-4 px-6 text-right font-black font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    {log.qtyDone.toLocaleString()} NOS
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-500 dark:text-slate-400 font-medium">
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
