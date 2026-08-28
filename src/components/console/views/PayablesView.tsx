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
                Vendor Accounts
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Vendor Bills & AP ({filtered.length})
            </h1>
          </div>

          {onAddBill && (
            <button
              type="button"
              onClick={onAddBill}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bill</span>
            </button>
          )}
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total Payables</div>
            <div className="text-base font-black text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight mt-0.5 truncate">
              ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Disbursed</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5 truncate">
              ₹{paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Outstanding</div>
            <div className="text-base font-black text-rose-500 tracking-tight mt-0.5 truncate">
              ₹{balanceAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Pending / Due</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5">
              {overdueCount} <span className="text-xs font-normal text-slate-400">Bills</span>
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
                Vendor Accounts & Accounts Payable Telemetry
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{filtered.length} Vendor Bills</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                  Vendor Bills & Payables
                </h1>
                <span className="hidden font-mono text-[10px] font-semibold text-slate-400 xl:inline">
                  3-WAY MATCHING • RAW MATERIAL INVOICES • OUTWORK DISBURSEMENTS
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Manage raw material supplier bills, outwork plating invoices, disbursement schedules, and accounts payable cashflows.
              </p>
            </div>

            {onAddBill && (
              <button
                type="button"
                onClick={onAddBill}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 text-xs font-bold text-white shadow-lg shadow-[var(--accent-shadow)] transition hover:brightness-110 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Record Vendor Bill</span>
              </button>
            )}
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            {[
              { label: 'Total Payables (Gross)', value: `₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, detail: `${payables.length} vendor bills`, icon: Building, tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]' },
              { label: 'Disbursed Payments', value: `₹${paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, detail: 'Settled to vendors', icon: CreditCard, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10' },
              { label: 'Outstanding Liabilities', value: `₹${balanceAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, detail: 'Unsettled balances', icon: Clock, tone: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-500/10' },
              { label: 'Pending / Due Bills', value: `${overdueCount} Bills`, detail: 'Action required', icon: AlertCircle, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
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
              <Building2 className="h-4 w-4" />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
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
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors ${
                      isActive
                        ? isDarkMode
                          ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] shadow-xs'
                          : 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white shadow-sm shadow-[var(--accent-shadow)]'
                        : isDarkMode
                        ? 'border-white/[0.08] bg-black/20 text-slate-400 hover:bg-white/[0.04] hover:text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className={`flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 ml-auto ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]' : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search Bill #, Vendor Name, PO #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-full w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 font-mono"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Showing {filtered.length} of {payables.length} vendor bills</span>
            <span>Accounts Payable & 3-Way Match Audit</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VENDOR BILL CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
            isDarkMode ? 'bg-[#171b24] border-white/[0.08] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
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
                className={`p-4 rounded-2xl border transition-all space-y-3.5 shadow-sm ${
                  isPaid
                    ? isDarkMode ? 'bg-[#171b24] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isOverdue
                    ? isDarkMode ? 'bg-[#171b24] border-rose-500/30' : 'bg-rose-50/40 border-rose-200'
                    : isDarkMode ? 'bg-[#171b24] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Bill # + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
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
                <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-xl border text-xs font-mono text-center ${
                  isDarkMode ? 'bg-black/20 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
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
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer active:scale-[0.98]"
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
      <div className={`hidden md:block overflow-hidden rounded-[22px] border transition-all ${
        isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
      }`}>
        <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Vendor Bills Register</div>
            <div className="mt-0.5 text-[10px] text-slate-400">Supplier invoices, 3-way matching validation, and disbursement records</div>
          </div>
          <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{filtered.length} bills</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
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
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filtered.map((bill) => (
                <tr key={bill.billNo} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 shrink-0 ${
                        isDarkMode 
                          ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30' 
                          : 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)] border border-[var(--accent-primary)]/20'
                      }`}>
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                          {bill.billNo}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {bill.vendorName}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400 text-xs">
                    {bill.poNo}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400 text-xs">
                    {bill.date}
                  </td>
                  <td className={`py-4 px-5 text-right font-bold font-mono text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    ₹{Number(bill.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-xs text-emerald-500">
                    ₹{Number(bill.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-xs text-rose-500">
                    ₹{Number(bill.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase border ${
                      bill.matchStatus === 'MATCHED' || bill.isThreeWayMatched
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : bill.matchStatus === 'PRICE_VARIANCE_FLAGGED' || bill.matchStatus === 'QTY_VARIANCE_FLAGGED'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
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
                          isDarkMode ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-dark)] hover:bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30' : 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)] hover:bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/20'
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
