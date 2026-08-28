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
  Building,
  ArrowUpRight,
  ShieldCheck,
  X,
  ExternalLink,
  ChevronRight
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

  const totalAmount = payables.reduce((acc, b) => acc + Number(b.amount || 0), 0);
  const paidAmount = payables.reduce((acc, b) => acc + Number(b.paidAmount || 0), 0);
  const balanceAmount = payables.reduce((acc, b) => acc + Number(b.balanceAmount || 0), 0);
  const overdueCount = payables.filter(b => b.status === 'OVERDUE' || (Number(b.balanceAmount) > 0 && b.status === 'OPEN')).length;

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
                Vendor Accounts
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                • Accounts Payable Telemetry
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Vendor Bills & Payables
            </h1>
            <p className={`text-xs mt-0.5 sm:mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Manage raw material supplier bills, outwork plating invoices, disbursement schedules, and accounts payable cashflows.
            </p>
          </div>

          {onAddBill && (
            <button
              onClick={onAddBill}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Record Vendor Bill</span>
            </button>
          )}
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-6">
          {/* Total Payables */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Payables
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-base sm:text-2xl font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Disbursed Payments */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Disbursed
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className="text-base sm:text-2xl font-bold text-emerald-500 truncate">
                ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Outstanding Liability */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Outstanding
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className="text-base sm:text-2xl font-bold text-rose-500 truncate">
                ₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Pending / Overdue */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Pending / Due
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-base sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {overdueCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-amber-500">Bills</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className={`p-3.5 sm:p-4 rounded-3xl border transition-all space-y-3 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Bills' },
            { id: 'OPEN', label: 'Open' },
            { id: 'PAID', label: 'Paid' },
            { id: 'OVERDUE', label: 'Overdue' }
          ].map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className={`relative flex items-center rounded-2xl border px-3.5 py-2 transition-all flex-1 ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search Bill #, Vendor Name, PO #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-xs w-full font-mono"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className={`text-[11px] font-mono shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Showing {filtered.length} of {payables.length} Bill{payables.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VENDOR BILL CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border font-mono text-xs ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No vendor bills found matching search criteria.</p>
          </div>
        ) : (
          filtered.map((bill) => {
            const isPaid = bill.status === 'PAID';
            const isOverdue = bill.status === 'OVERDUE';
            const isMatched = bill.matchStatus === 'MATCHED' || bill.isThreeWayMatched;

            return (
              <div
                key={bill.billNo}
                className={`p-4 rounded-3xl border transition-all space-y-3.5 shadow-sm ${
                  isPaid
                    ? isDarkMode ? 'bg-slate-950/70 border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isOverdue
                    ? isDarkMode ? 'bg-slate-950/70 border-rose-500/30' : 'bg-rose-50/40 border-rose-200'
                    : isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Bill # + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF]">
                      {bill.billNo}
                    </span>
                    <h3 className={`text-xs font-bold font-sans mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {bill.vendorName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 3-Way Match Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase border ${
                      isMatched
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>{bill.matchStatus || 'MATCHED'}</span>
                    </span>

                    {/* Payment Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                      isPaid
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : isOverdue
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isPaid ? 'bg-emerald-400' : isOverdue ? 'bg-rose-400' : 'bg-amber-400'
                      }`} />
                      <span>{bill.status}</span>
                    </span>
                  </div>
                </div>

                {/* PO & Date Metadata */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div>PO: <strong className="text-slate-200">{bill.poNo}</strong></div>
                  <div>Bill Date: <strong className="text-slate-200">{bill.date}</strong></div>
                </div>

                {/* Commercial 3-Tile Row */}
                <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-2xl border text-xs font-mono text-center ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Bill Amount</span>
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      ₹{Number(bill.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Disbursed</span>
                    <span className="font-bold text-emerald-400">
                      ₹{Number(bill.paidAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Outstanding</span>
                    <span className={`font-bold ${isPaid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{Number(bill.balanceAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-1 border-t border-slate-800/60">
                  {!isPaid && Number(bill.balanceAmount) > 0 ? (
                    <button
                      onClick={() => handleDisbursementClick(bill.billNo)}
                      className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer active:scale-[0.98]"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Disburse Funds (₹{Number(bill.balanceAmount).toLocaleString('en-IN')})</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fully Disbursed & Settled</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP PAYABLES TABLE (Viewport >= md) */}
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
                <th className="py-4 px-5">Bill #</th>
                <th className="py-4 px-5">Vendor / Supplier Name</th>
                <th className="py-4 px-5">Purchase Order</th>
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5 text-right">Bill Amount</th>
                <th className="py-4 px-5 text-right">Paid Amount</th>
                <th className="py-4 px-5 text-right">Outstanding Dues</th>
                <th className="py-4 px-5 text-center">3-Way Match</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filtered.map((bill) => (
                <tr key={bill.billNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
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
                    ₹{Number(bill.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                    ₹{Number(bill.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-rose-500">
                    ₹{Number(bill.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase border ${
                      bill.matchStatus === 'MATCHED' || bill.isThreeWayMatched
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : bill.matchStatus === 'PRICE_VARIANCE_FLAGGED' || bill.matchStatus === 'QTY_VARIANCE_FLAGGED'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    }`}>
                      {bill.matchStatus || 'MATCHED'}
                    </span>
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
                    {bill.status !== 'PAID' && Number(bill.balanceAmount) > 0 && (
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
