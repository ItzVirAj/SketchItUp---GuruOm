import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Percent, 
  Trash2, 
  DollarSign,
  Check,
  X
} from 'lucide-react';
import { PendingApproval } from '../../../types/console';

interface ApprovalsViewProps {
  approvals: PendingApproval[];
  isDarkMode?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  approvals,
  isDarkMode = true,
  onApprove,
  onReject,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = approvals.filter(item => {
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  const getTypeBadge = (type: PendingApproval['type']) => {
    switch (type) {
      case 'DISCOUNT_OVERRIDE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Percent className="w-3.5 h-3.5" /> Discount Override
          </span>
        );
      case 'HIGH_VALUE_PO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
            <DollarSign className="w-3.5 h-3.5" /> High Value PO
          </span>
        );
      case 'ORDER_CANCEL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Order Cancel
          </span>
        );
      case 'SCRAP_WRITE_OFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Trash2 className="w-3.5 h-3.5" /> Scrap Write-off
          </span>
        );
    }
  };

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
                isDarkMode ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200'
              }`}>
                Governance & Controls
              </span>
              <span className="text-xs text-slate-400 font-mono">• Executive Authorization Desk</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Pending Executive Approvals
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Review high-value customer POs, discount override requests, order cancellations, and scrap material write-offs.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: `All Requests (${approvals.length})` },
            { id: 'HIGH_VALUE_PO', label: 'High Value PO' },
            { id: 'DISCOUNT_OVERRIDE', label: 'Discount Override' },
            { id: 'ORDER_CANCEL', label: 'Order Cancellation' },
            { id: 'SCRAP_WRITE_OFF', label: 'Scrap Write-off' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === tab.id
                  ? isDarkMode 
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs' 
                    : 'bg-teal-600 text-white shadow-xs'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className={`p-12 rounded-3xl border text-center font-mono ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200'
          }`}>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-bold">No Pending Approvals</h3>
            <p className="text-xs text-slate-400 mt-1">All executive authorization requests have been resolved.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  {getTypeBadge(item.type)}
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {item.timestamp}
                  </span>
                </div>

                <h3 className="text-base font-bold font-mono text-teal-400">{item.title}</h3>
                <p className="text-xs text-slate-300 font-medium">{item.details}</p>

                <div className="text-xs font-mono text-slate-400">
                  Requested by: <strong className="text-white font-bold">{item.requestedBy}</strong>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                {item.amount && (
                  <div className="text-right font-mono pr-4 border-r border-slate-800 hidden sm:block">
                    <span className="text-[10px] text-slate-400 block uppercase">Request Value</span>
                    <span className="text-lg font-bold text-emerald-400">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => onReject(item.id)}
                  className="px-4 py-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => onApprove(item.id)}
                  className="px-5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  <Check className="w-4 h-4" />
                  <span>Authorize</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default ApprovalsView;
