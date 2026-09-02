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
  ChevronRight,
  Check,
  Landmark,
  FileText,
  BadgePercent
} from 'lucide-react';
import { VendorBill, VendorMaster } from '../../../types/console';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { insertVendorBill } from '../../../services/supabaseServices';

interface PayablesViewProps {
  payables: VendorBill[];
  vendors?: VendorMaster[];
  isDarkMode?: boolean;
  onAddBill?: (bill: VendorBill) => void | Promise<void>;
  onRecordPayment?: (billNo: string) => void;
  onRecordDisbursement?: (billNo: string) => void;
}

export const PayablesView: React.FC<PayablesViewProps> = ({
  payables,
  vendors = [],
  isDarkMode = true,
  onAddBill,
  onRecordPayment,
  onRecordDisbursement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // URL-driven modals
  const createBillModal = useUrlModal('create-bill');
  const disburseModal = useUrlModal('disburse-bill');

  // Controlled Bill Form States
  const [formVendorName, setFormVendorName] = useState('Mahalaxmi Steel Traders');
  const [formVendorType, setFormVendorType] = useState('Supplier');
  const [formVendorPan, setFormVendorPan] = useState('AAACM1234F');
  const [formBillNo, setFormBillNo] = useState(`BILL-26-${Date.now().toString().slice(-4)}`);
  const [formPoNo, setFormPoNo] = useState('PO-PUR-2026-001');
  const [formGrnNo, setFormGrnNo] = useState('GRN-26-001');
  const [formGrossAmount, setFormGrossAmount] = useState<number | string>(150000);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [formIsPurchaseOfGoods, setFormIsPurchaseOfGoods] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Selected bill for disbursement modal
  const [selectedBillForDisbursement, setSelectedBillForDisbursement] = useState<VendorBill | null>(null);
  const [disbursePaymentMode, setDisbursePaymentMode] = useState('NEFT_RTGS');
  const [disburseRefNo, setDisburseRefNo] = useState('');
  const [isSubmittingDisbursement, setIsSubmittingDisbursement] = useState(false);

  const handleVendorNameChange = (nameVal: string) => {
    setFormVendorName(nameVal);
    const matchedVendor = vendors?.find(v => v.name.toLowerCase().trim() === nameVal.toLowerCase().trim());
    if (matchedVendor) {
      if (matchedVendor.vendorType) setFormVendorType(matchedVendor.vendorType);
      if (matchedVendor.pan) setFormVendorPan(matchedVendor.pan);
    }
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const gross = Number(formGrossAmount || 0);
    if (!gross || gross <= 0) {
      setFormError('Gross amount must be greater than 0');
      setIsSubmitting(false);
      return;
    }

    const newBill: VendorBill = {
      billNo: formBillNo,
      vendorName: formVendorName,
      poNo: formPoNo,
      grnNo: formGrnNo || undefined,
      status: 'OPEN',
      date: formDate,
      dueDate: formDueDate,
      amount: gross,
      paidAmount: 0,
      balanceAmount: gross,
      matchStatus: 'MATCHED',
      isThreeWayMatched: true
    };
    (newBill as any).vendorType = formVendorType;
    (newBill as any).vendorPan = formVendorPan || undefined;
    (newBill as any).grossAmount = gross;
    (newBill as any).isPurchaseOfGoods = formIsPurchaseOfGoods;

    try {
      if (onAddBill) {
        await onAddBill(newBill);
      } else {
        await insertVendorBill(newBill);
      }
      createBillModal.close();
      setActionSuccessMsg(`Vendor Bill ${formBillNo} recorded successfully.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
      setFormBillNo(`BILL-26-${Date.now().toString().slice(-4)}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to record vendor bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDisburseModal = (bill: VendorBill) => {
    setSelectedBillForDisbursement(bill);
    setDisbursePaymentMode('NEFT_RTGS');
    setDisburseRefNo(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    disburseModal.open({ billNo: bill.billNo });
  };

  const handleConfirmDisbursement = async () => {
    if (!selectedBillForDisbursement) return;
    try {
      setIsSubmittingDisbursement(true);
      if (onRecordDisbursement) {
        await onRecordDisbursement(selectedBillForDisbursement.billNo);
      } else if (onRecordPayment) {
        await onRecordPayment(selectedBillForDisbursement.billNo);
      }
      disburseModal.close();
      setActionSuccessMsg(`Disbursement of ₹${Number(selectedBillForDisbursement.balanceAmount || selectedBillForDisbursement.amount).toLocaleString('en-IN')} settled to ${selectedBillForDisbursement.vendorName}.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmittingDisbursement(false);
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

  const inputClass = `h-11 w-full rounded-xl border px-3.5 text-xs font-medium outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 ${
    isDarkMode 
      ? 'border-white/10 bg-black/60 text-white placeholder:text-slate-500 hover:border-white/20 focus:bg-black/80' 
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white'
  }`;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-6">
      
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-between text-xs font-mono font-bold animate-in fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── 1. EXECUTIVE CONTROL DECK & KPI OVERVIEW ──                            */}
      {/* ========================================================================= */}
      <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]' 
          : 'bg-white border-slate-200/80 shadow-sm text-slate-900'
      }`}>
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/10 dark:border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30">
                  Vendor Accounts & Accounts Payable
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>3-Way Match Verified</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Vendor Bills & Payables
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Manage raw material supplier bills, outwork plating invoices, disbursement schedules, and statutory TDS compliance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              createBillModal.open();
            }}
            className="px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] active:scale-[0.98] text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition-all self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>New Vendor Bill</span>
          </button>
        </div>

        {/* Apple 4-Column Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {[
            {
              label: 'Total Payables',
              value: `₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              detail: `${payables.length} vendor bills`,
              icon: Building,
              tone: isDarkMode ? 'text-white' : 'text-slate-900',
              iconBg: 'bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20',
            },
            {
              label: 'Disbursed Payments',
              value: `₹${paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              detail: 'Settled to vendors',
              icon: CreditCard,
              tone: 'text-emerald-400',
              iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            },
            {
              label: 'Outstanding Liabilities',
              value: `₹${balanceAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              detail: 'Unsettled balances',
              icon: Clock,
              tone: 'text-rose-400',
              iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
            },
            {
              label: 'Pending / Due Bills',
              value: `${overdueCount} Bills`,
              detail: overdueCount > 0 ? 'Disbursement due' : 'All accounts settled',
              icon: AlertCircle,
              tone: 'text-amber-400',
              iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/10 hover:border-white/20' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${m.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
                    {m.label}
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${m.tone}`}>
                  {m.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  {m.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── 2. SEGMENTED FILTER & SEARCH TOOLBAR ──                                 */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-[#09090B] border-white/10 text-white shadow-sm' 
          : 'bg-white border-slate-200/80 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Apple Segmented Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'All Bills' },
              { id: 'OPEN', label: 'Open' },
              { id: 'PAID', label: 'Paid' },
              { id: 'OVERDUE', label: 'Overdue' }
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#007AFF] text-white shadow-sm'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className={`w-4 h-4 absolute left-3.5 top-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search Bill #, Vendor Name, PO #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`h-10 w-full pl-10 pr-8 rounded-full border text-xs font-medium outline-none transition-all ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-white placeholder:text-slate-500 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15' 
                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15'
              }`}
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── 3. MOBILE VENDOR BILL CARDS (< md) ──                                 */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3.5">
        {filtered.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border text-xs font-mono ${
            isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#007AFF]" />
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
                className={`p-4 rounded-3xl border space-y-3 shadow-md ${
                  isDarkMode ? 'bg-[#09090B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-[#007AFF]">
                      {bill.billNo}
                    </span>
                    <h3 className="text-xs font-bold mt-0.5">
                      {bill.vendorName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{bill.matchStatus || 'MATCHED'}</span>
                    </span>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                      isPaid
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : isOverdue
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isPaid ? 'bg-emerald-400' : isOverdue ? 'bg-rose-400' : 'bg-amber-400'
                      }`} />
                      <span>{bill.status}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div>PO: <strong className="text-slate-200">{bill.poNo}</strong></div>
                  <div>Bill Date: <strong className="text-slate-200">{bill.date}</strong></div>
                </div>

                <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-2xl border text-xs font-mono text-center ${
                  isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Bill Amount</span>
                    <span className="font-bold text-white dark:text-white">
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

                <div className="pt-2 border-t border-white/10">
                  {!isPaid && Number(bill.balanceAmount) > 0 ? (
                    <button
                      onClick={() => handleOpenDisburseModal(bill)}
                      className="w-full py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer active:scale-[0.98]"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Disburse Funds (₹{Number(bill.balanceAmount).toLocaleString('en-IN')})</span>
                    </button>
                  ) : (
                    <div className="w-full py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center justify-center gap-1">
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
      {/* ── 4. DESKTOP PAYABLES TABLE (≥ md) ──                                   */}
      {/* ========================================================================= */}
      <div className={`hidden md:block rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-[#09090B] border-white/10 text-white' : 'bg-white border-slate-200/80 text-slate-900'
      }`}>
        <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 px-6 py-4">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Vendor Bills Register</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Supplier invoices, 3-way matching validation, and disbursement records</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] font-semibold text-slate-400">
            {filtered.length} bills
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-semibold uppercase tracking-wider text-[10px] ${
                isDarkMode ? 'border-white/10 bg-black/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}>
                <th className="py-3.5 px-5">Bill #</th>
                <th className="py-3.5 px-5">Vendor / Supplier Name</th>
                <th className="py-3.5 px-5">Purchase Order</th>
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5 text-right">Bill Amount</th>
                <th className="py-3.5 px-5 text-right">Paid Amount</th>
                <th className="py-3.5 px-5 text-right">Outstanding Dues</th>
                <th className="py-3.5 px-5 text-center">3-Way Match</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
              {filtered.map((bill) => (
                <tr key={bill.billNo} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.025]' : 'hover:bg-slate-50'}`}>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-mono font-bold text-xs text-[#007AFF]">
                        {bill.billNo}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 font-semibold text-white dark:text-white">
                    {bill.vendorName}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-300 text-xs">
                    {bill.poNo}
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400 text-xs">
                    {bill.date}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-xs text-white dark:text-white">
                    ₹{Number(bill.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-xs text-emerald-400">
                    ₹{Number(bill.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right font-bold font-mono text-xs text-rose-400">
                    ₹{Number(bill.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {bill.matchStatus || 'MATCHED'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
                      bill.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${bill.status === 'PAID' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span>{bill.status}</span>
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    {bill.status !== 'PAID' && Number(bill.balanceAmount) > 0 && (
                      <button
                        onClick={() => handleOpenDisburseModal(bill)}
                        className="px-3.5 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
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

      {/* ========================================================================= */}
      {/* ── 5. RECORD VENDOR BILL ENTRY MODAL ──                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createBillModal.isOpen}
        onClose={() => !isSubmitting && createBillModal.close()}
        maxWidth="xl"
        isDarkMode={isDarkMode}
        icon={<Receipt className="w-5 h-5 text-[#007AFF]" />}
        title="Record Vendor Bill"
        subtitle="Enter supplier invoice and accounts payable liability"
      >
        <form onSubmit={handleBillSubmit} className="space-y-4 text-xs font-sans">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center justify-between">
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Vendor / Supplier *
              </label>
              <input
                name="vendorName"
                required
                value={formVendorName}
                onChange={(e) => handleVendorNameChange(e.target.value)}
                list="vendors-datalist"
                placeholder="e.g. Mahalaxmi Steel Traders"
                className={inputClass}
              />
              {vendors && vendors.length > 0 && (
                <datalist id="vendors-datalist">
                  {vendors.map(v => (
                    <option key={v.id || v.code} value={v.name}>
                      {v.code} • {v.vendorType || 'Supplier'}
                    </option>
                  ))}
                </datalist>
              )}
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Vendor Type *
              </label>
              <select
                name="vendorType"
                value={formVendorType}
                onChange={(e) => setFormVendorType(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="Supplier">Supplier (Goods / Raw Material)</option>
                <option value="Subcontractor / Job Worker">Subcontractor / Job Worker</option>
                <option value="Transporter">Transporter / Logistics</option>
                <option value="Manpower Provider">Manpower Provider</option>
                <option value="Other">Other Service Provider</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Bill / Invoice Number *
              </label>
              <input
                name="billNo"
                required
                value={formBillNo}
                onChange={(e) => setFormBillNo(e.target.value)}
                placeholder="e.g. INV-MST-2026-089"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Vendor PAN (for Statutory TDS)
              </label>
              <input
                name="vendorPan"
                value={formVendorPan}
                onChange={(e) => setFormVendorPan(e.target.value.toUpperCase())}
                placeholder="e.g. AAACM1234F"
                maxLength={10}
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Linked Purchase Order (PO #) *
              </label>
              <input
                name="poNo"
                required
                value={formPoNo}
                onChange={(e) => setFormPoNo(e.target.value)}
                placeholder="e.g. PO-PUR-2026-001"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Linked Goods Receipt Note (GRN #)
              </label>
              <input
                name="grnNo"
                value={formGrnNo}
                onChange={(e) => setFormGrnNo(e.target.value)}
                placeholder="e.g. GRN-26-001"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Gross Amount (₹) *
              </label>
              <input
                name="grossAmount"
                type="number"
                min="1"
                step="any"
                required
                value={formGrossAmount}
                onChange={(e) => setFormGrossAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="150000"
                className={`${inputClass} font-mono font-bold`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Bill Date *
              </label>
              <input
                name="date"
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Due Date *
              </label>
              <input
                name="dueDate"
                type="date"
                required
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="font-semibold text-xs text-white dark:text-white">Statutory TDS Section 194Q Applicability</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Mark if this bill is for purchase of goods exceeding statutory thresholds</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formIsPurchaseOfGoods}
                onChange={(e) => setFormIsPurchaseOfGoods(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5 font-sans">
            <button
              type="button"
              onClick={() => createBillModal.close()}
              className={`px-4 py-2.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] active:scale-[0.98] text-white font-semibold text-xs cursor-pointer shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Record vendor bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* ── 6. DEDICATED DISBURSEMENT MODAL SHEET ──                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={disburseModal.isOpen && Boolean(selectedBillForDisbursement)}
        onClose={() => !isSubmittingDisbursement && disburseModal.close()}
        maxWidth="lg"
        isDarkMode={isDarkMode}
        icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
        title="Disburse Vendor Funds"
        subtitle={
          selectedBillForDisbursement ? (
            <span className="font-mono text-xs text-slate-400">
              {selectedBillForDisbursement.billNo} • {selectedBillForDisbursement.vendorName}
            </span>
          ) : undefined
        }
      >
        {selectedBillForDisbursement && (
          <div className="space-y-4 text-xs font-sans">
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="grid grid-cols-2 gap-3 text-center font-mono">
                <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Bill Amount</span>
                  <span className="text-sm font-bold text-white mt-0.5 block">
                    ₹{Number(selectedBillForDisbursement.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
                  <span className="text-[10px] uppercase font-semibold block">Outstanding Due</span>
                  <span className="text-sm font-bold mt-0.5 block">
                    ₹{Number(selectedBillForDisbursement.balanceAmount || selectedBillForDisbursement.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>PO Reference: <strong className="text-white">{selectedBillForDisbursement.poNo}</strong></span>
                <span>Bill Date: <strong className="text-white">{selectedBillForDisbursement.date}</strong></span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Disbursement Mode *
                </label>
                <select
                  value={disbursePaymentMode}
                  onChange={(e) => setDisbursePaymentMode(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="NEFT_RTGS">Bank NEFT / RTGS (Direct Beneficiary Transfer)</option>
                  <option value="IMPS">Instant IMPS Transfer</option>
                  <option value="CHEQUE">Account Payee Cheque</option>
                  <option value="UPI">Corporate UPI</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Bank Reference / UTR # *
                </label>
                <input
                  type="text"
                  value={disburseRefNo}
                  onChange={(e) => setDisburseRefNo(e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="e.g. UTR-HDFC8492049"
                  required
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5 font-sans">
              <button
                type="button"
                onClick={() => disburseModal.close()}
                disabled={isSubmittingDisbursement}
                className={`px-4 py-2.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                  isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisbursement}
                disabled={isSubmittingDisbursement}
                className="px-6 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 disabled:opacity-50 transition-all"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isSubmittingDisbursement ? 'Settling...' : `Confirm & Disburse ₹${Number(selectedBillForDisbursement.balanceAmount || selectedBillForDisbursement.amount).toLocaleString('en-IN')}`}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default PayablesView;
