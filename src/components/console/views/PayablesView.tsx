import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign,
  Receipt,
  CreditCard,
  Building
} from 'lucide-react';
import { VendorBill } from '../../../types/console';

interface PayablesViewProps {
  payables: VendorBill[];
  isDarkMode?: boolean;
  onAddBill?: () => void;
  onRecordPayment?: (billNo: string) => void;
  onRecordDisbursement?: (billNo: string) => void;
}

export const PayablesView: React.FC<PayablesViewProps> = ({
  payables,
  isDarkMode = true,
  onAddBill,
  onRecordPayment,
  onRecordDisbursement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleDisbursementClick = (billNo: string) => {
    if (onRecordDisbursement) {
      onRecordDisbursement(billNo);
    } else if (onRecordPayment) {
      onRecordPayment(billNo);
    }
  };

  const filtered = payables.filter(bill => {
    const matchesSearch = 
      bill.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.poNo.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && bill.status === statusFilter;
  });

  const totalAmount = payables.reduce((acc, b) => acc + b.amount, 0);
  const paidAmount = payables.reduce((acc, b) => acc + b.paidAmount, 0);
  const balanceAmount = payables.reduce((acc, b) => acc + b.balanceAmount, 0);
  const overdueCount = payables.filter(b => b.status === 'OVERDUE' || (b.balanceAmount > 0 && b.status === 'OPEN')).length;

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
                Vendor Accounts
              </span>
              <span className="text-xs text-slate-400 font-mono">• Accounts Payable Telemetry</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Vendor Bills & Payables
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Manage raw material supplier bills, outwork plating invoices, disbursement schedules, and accounts payable cashflows.
            </p>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Vendor Payables</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Disbursed Payments</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono text-emerald-500`}>
                ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Outstanding Liability</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono text-rose-500`}>
                ₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending / Overdue</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{overdueCount}</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">Bills Due</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Bills' },
            { id: 'OPEN', label: 'Open' },
            { id: 'PAID', label: 'Paid' },
            { id: 'OVERDUE', label: 'Overdue' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? isDarkMode 
                    ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' 
                    : 'bg-[#5B75F8] text-white shadow-xs'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`relative flex items-center rounded-2xl border px-3.5 py-1.5 transition-all ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
        }`}>
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search Bill #, Vendor, PO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none text-xs w-64 font-mono"
          />
        </div>
      </div>

      {/* Payables Table */}
      <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-4 px-5">Bill #</th>
                <th className="py-4 px-5">Vendor / Supplier Name</th>
                <th className="py-4 px-5">Purchase Order</th>
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5 text-right">Bill Amount</th>
                <th className="py-4 px-5 text-right">Paid Amount</th>
                <th className="py-4 px-5 text-right">Outstanding Dues</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filtered.map((bill) => (
                <tr key={bill.id || bill.billNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                  <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                    {bill.billNo}
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {bill.vendorName}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400">
                    {bill.poNo}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400">
                    {bill.date}
                  </td>
                  <td className={`py-4 px-5 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    ₹{bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                    ₹{bill.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-rose-500">
                    ₹{bill.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                      bill.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${bill.status === 'PAID' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span>{bill.status}</span>
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    {bill.status !== 'PAID' && bill.balanceAmount > 0 && (
                      <button
                        onClick={() => handleDisbursementClick(bill.billNo)}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          isDarkMode ? 'bg-[#5B75F8]/10 text-[#7B92FF] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/20'
                        }`}
                      >
                        Disburse Funds
                      </button>
                    )}
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

export default PayablesView;
