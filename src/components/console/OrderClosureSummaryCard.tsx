import React from 'react';
import { CheckCircle, Calendar, User, IndianRupee, FileText, Truck, ArrowUpRight, Layers } from 'lucide-react';

interface OrderClosureSummaryCardProps {
  isDarkMode?: boolean;
  closedAt?: string;
  closedBy?: string;
  paymentStatus?: string;
  podReceivedDate?: string;
  podReceivedBy?: string;
  invoiceNo?: string;
  totalJobCards: number;
  completedJobCards: number;
  onNavigateToProduction?: () => void;
}

const StatItem: React.FC<{
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  isDarkMode?: boolean;
}> = ({ icon: Icon, label, value, isDarkMode }) => (
  <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'}`}>
    <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-bold">
      <Icon className="w-3 h-3" />
      {label}
    </div>
    <div className={`mt-1 text-xs font-bold font-mono ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
      {value ?? '—'}
    </div>
  </div>
);

/**
 * Read-only summary card shown only for settled orders (COMPLETED / CLOSED / PAID),
 * consolidating final closure details that already exist on CustomerOrder but were
 * not surfaced anywhere in the order detail view.
 */
export const OrderClosureSummaryCard: React.FC<OrderClosureSummaryCardProps> = ({
  isDarkMode,
  closedAt,
  closedBy,
  paymentStatus,
  podReceivedDate,
  podReceivedBy,
  invoiceNo,
  totalJobCards,
  completedJobCards,
  onNavigateToProduction
}) => {
  return (
    <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-4 font-mono text-xs transition-ui shadow-lg ${isDarkMode ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/60 border-emerald-200'
      }`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={`font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
          <CheckCircle className="w-4 h-4" />
          <span>Order Closure Summary</span>
        </h3>
        {onNavigateToProduction && (
          <button
            type="button"
            onClick={onNavigateToProduction}
            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer transition-ui hover:brightness-110 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
              }`}
          >
            <Layers className="w-3 h-3" />
            Production
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <StatItem icon={Calendar} label="Closed On" value={closedAt ? new Date(closedAt).toLocaleDateString('en-IN') : '—'} isDarkMode={isDarkMode} />
        <StatItem icon={User} label="Closed By" value={closedBy} isDarkMode={isDarkMode} />
        <StatItem icon={IndianRupee} label="Payment Status" value={paymentStatus} isDarkMode={isDarkMode} />
        <StatItem icon={FileText} label="Invoice No" value={invoiceNo} isDarkMode={isDarkMode} />
        <StatItem icon={Truck} label="POD Received" value={podReceivedDate ? `${new Date(podReceivedDate).toLocaleDateString('en-IN')}${podReceivedBy ? ` · ${podReceivedBy}` : ''}` : '—'} isDarkMode={isDarkMode} />
        <StatItem icon={CheckCircle} label="Job Cards" value={`${completedJobCards}/${totalJobCards} completed`} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
};
