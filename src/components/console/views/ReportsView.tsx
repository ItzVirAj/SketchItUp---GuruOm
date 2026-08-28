import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  Calendar, 
  Search, 
  BarChart3, 
  TrendingUp, 
  Filter,
  X,
  Layers,
  Clock,
  CheckCircle2,
  Sparkles
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
    <div className="space-y-4 sm:space-y-6 font-sans">
      
      {/* Top Banner Header */}
      <div className={`p-4 sm:p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
              }`}>
                Executive Analytics
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                • Production Audit Logs
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Production & Shift Logs
            </h1>
            <p className={`text-xs mt-0.5 sm:mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Audit operation steps completed across all shopfloor job cards, analyze machine output, and export compliance reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-6">
          {/* Card 1: Shift Steps */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Shift Steps Logged
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {activeLogs.length}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#7B92FF]">Records</span>
            </div>
          </div>

          {/* Card 2: Total Output */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Quantity Produced
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className="text-xl sm:text-2xl font-bold text-emerald-500">
                {totalLoggedQty.toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-500">Units</span>
            </div>
          </div>

          {/* Card 3: Active Orders */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Active POs
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {orders.length}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-purple-400">Tracked</span>
            </div>
          </div>

          {/* Card 4: Compliance */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Compliance
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                100%
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-amber-500">Timestamped</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter & Search Controls */}
      <div className={`p-3.5 sm:p-4 rounded-3xl border transition-all space-y-3 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Date Pickers */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 font-mono text-xs">
            <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <span className="text-slate-400 font-bold uppercase text-[10px]">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent outline-none font-bold text-xs"
              />
            </div>

            <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <span className="text-slate-400 font-bold uppercase text-[10px]">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent outline-none font-bold text-xs"
              />
            </div>
          </div>

          {/* Search Input */}
          <div className={`relative flex items-center rounded-2xl border px-3.5 py-2 transition-all flex-1 max-w-full sm:max-w-xs ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search Job #, Part, Operation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-xs w-full font-mono"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white ml-2">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
          <span>Showing <strong>{filteredLogs.length}</strong> of <strong>{activeLogs.length}</strong> logged operations</span>
          <span className="text-emerald-400 font-bold">Total: {totalLoggedQty} NOS</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE PRODUCTION LOG CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredLogs.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border font-mono text-xs ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No production logs found matching your filters.
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-3xl border transition-all space-y-3 shadow-sm ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {/* Header: Job No + Step Pill */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF]">
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
              <div className={`p-2.5 rounded-2xl border text-xs ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
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
      <div className={`hidden md:block rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
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
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                  <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                    {log.itemCode}
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {log.description}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400">
                    {log.jobNo}
                  </td>
                  <td className="py-4 px-5 text-center font-bold font-mono text-purple-400">
                    Step {log.stepNo}
                  </td>
                  <td className="py-4 px-5 font-medium text-slate-300">
                    {log.operationName}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                    {log.qtyDone} NOS
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400">
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
