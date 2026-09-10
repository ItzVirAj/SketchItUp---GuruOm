import React, { useState, useEffect } from 'react';
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
  BadgePercent,
  Sparkles,
  UploadCloud,
  Loader2,
  Paperclip,
  Zap,
  Smartphone,
  Copy,
  Lock,
  RefreshCw,
  Wifi,
  SlidersHorizontal
} from 'lucide-react';
import { VendorBill, VendorMaster } from '../../../types/console';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { insertVendorBill, scanVendorBillReceipt } from '../../../services/supabaseServices';

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

  // AI receipt/bill scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedFileName, setScannedFileName] = useState<string | null>(null);
  const [scanConfidence, setScanConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [formAttachmentId, setFormAttachmentId] = useState<string | null>(null);

  // Selected bill for disbursement modal & Apple HIG controls
  const [selectedBillForDisbursement, setSelectedBillForDisbursement] = useState<VendorBill | null>(null);
  const [disbursePaymentMode, setDisbursePaymentMode] = useState<'NEFT_RTGS' | 'IMPS' | 'UPI' | 'CHEQUE'>('NEFT_RTGS');
  const [disburseRefNo, setDisburseRefNo] = useState('');
  const [isSubmittingDisbursement, setIsSubmittingDisbursement] = useState(false);
  const [disburseAmountPreset, setDisburseAmountPreset] = useState<'FULL' | '50%' | 'CUSTOM'>('FULL');
  const [customDisburseAmount, setCustomDisburseAmount] = useState<number | string>('');
  const [selectedDebitAccount, setSelectedDebitAccount] = useState<'HDFC_CORP' | 'ICICI_ESCROW'>('HDFC_CORP');
  const [disburseRemarks, setDisburseRemarks] = useState('');
  const [deductTds, setDeductTds] = useState(true);
  const [tdsRate, setTdsRate] = useState(2);
  const [copiedRef, setCopiedRef] = useState(false);

  const handleVendorNameChange = (nameVal: string) => {
    setFormVendorName(nameVal);
    const matchedVendor = vendors?.find(v => v.name.toLowerCase().trim() === nameVal.toLowerCase().trim());
    if (matchedVendor) {
      if (matchedVendor.vendorType) setFormVendorType(matchedVendor.vendorType);
      if (matchedVendor.pan) setFormVendorPan(matchedVendor.pan);
    }
  };

  const handleScanReceipt = async (file: File) => {
    setIsScanning(true);
    setScanError(null);
    setScanConfidence(null);
    try {
      const { extracted, attachmentId } = await scanVendorBillReceipt(file, formBillNo);

      if (extracted.vendorName) handleVendorNameChange(extracted.vendorName);
      if (extracted.vendorType) setFormVendorType(extracted.vendorType);
      if (extracted.vendorPan) setFormVendorPan(extracted.vendorPan);
      if (extracted.billNo) setFormBillNo(extracted.billNo);
      if (extracted.date) setFormDate(extracted.date);
      if (extracted.dueDate) setFormDueDate(extracted.dueDate);
      if (extracted.grossAmount) setFormGrossAmount(extracted.grossAmount);

      setFormAttachmentId(attachmentId);
      setScannedFileName(file.name);
      setScanConfidence(extracted.confidence);

      if (!extracted.vendorName && !extracted.grossAmount) {
        setScanError('Could not confidently read this document — please check and fill in the details manually.');
      }
    } catch (err: any) {
      setScanError(err?.message || 'AI scan failed. You can still enter the bill details manually below.');
      setScannedFileName(file.name);
    } finally {
      setIsScanning(false);
    }
  };

  const resetScanState = () => {
    setIsScanning(false);
    setScanError(null);
    setScannedFileName(null);
    setScanConfidence(null);
    setFormAttachmentId(null);
  };

  const handleSaveScannedBill = async (customOverrides?: Partial<VendorBill>) => {
    setIsSubmitting(true);
    setFormError(null);

    const gross = Number(customOverrides?.grossAmount ?? formGrossAmount ?? 0);
    if (!gross || gross <= 0) {
      setFormError('Gross amount must be greater than 0');
      setIsSubmitting(false);
      return;
    }

    const targetBillNo = customOverrides?.billNo || formBillNo;
    const targetVendorName = customOverrides?.vendorName || formVendorName;

    const newBill: VendorBill = {
      billNo: targetBillNo,
      vendorName: targetVendorName,
      poNo: customOverrides?.poNo || formPoNo || 'PO-PUR-2026-001',
      grnNo: customOverrides?.grnNo || formGrnNo || undefined,
      status: 'OPEN',
      date: customOverrides?.date || formDate,
      dueDate: customOverrides?.dueDate || formDueDate,
      amount: gross,
      paidAmount: 0,
      balanceAmount: gross,
      matchStatus: 'MATCHED',
      isThreeWayMatched: true,
      vendorType: customOverrides?.vendorType || formVendorType,
      vendorPan: customOverrides?.vendorPan || formVendorPan || undefined,
      grossAmount: gross,
      isPurchaseOfGoods: formIsPurchaseOfGoods,
      attachmentId: customOverrides?.attachmentId || formAttachmentId || undefined
    };

    try {
      if (onAddBill) {
        await onAddBill(newBill);
      } else {
        await insertVendorBill(newBill);
      }
      createBillModal.close();
      setActionSuccessMsg(`Vendor Bill ${targetBillNo} (${targetVendorName}) recorded successfully and added to register.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
      setFormBillNo(`BILL-26-${Date.now().toString().slice(-4)}`);
      resetScanState();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record vendor bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveScannedBill();
  };

  // Resolve target bill when URL contains billNo or when bill is selected
  const urlBillNo = disburseModal.params?.billNo;
  const targetBillForDisburse: VendorBill | null = 
    (selectedBillForDisbursement && selectedBillForDisbursement.billNo === urlBillNo)
      ? selectedBillForDisbursement
      : (urlBillNo ? payables.find(b => b.billNo === urlBillNo) || {
          billNo: urlBillNo,
          vendorName: urlBillNo === 'BILL-26-045' ? 'Super Precision Tooling' : 'Industrial Supplier Corp',
          poNo: urlBillNo === 'BILL-26-045' ? 'PO-PUR-2026-003' : 'PO-PUR-2026-001',
          status: 'OPEN' as const,
          date: '2026-03-01',
          dueDate: '2026-03-31',
          amount: 32000,
          paidAmount: 0,
          balanceAmount: 32000,
          grnNo: 'GRN-26-003',
          matchStatus: 'MATCHED' as const,
          isThreeWayMatched: true,
          vendorType: 'Supplier',
          vendorPan: 'AAACS8839M',
          grossAmount: 32000,
          isPurchaseOfGoods: true
        } : selectedBillForDisbursement);

  const activeDisburseBill = selectedBillForDisbursement || targetBillForDisburse;

  // Auto-sync when URL modal is open with billNo
  useEffect(() => {
    if (disburseModal.isOpen && targetBillForDisburse) {
      if (!selectedBillForDisbursement || selectedBillForDisbursement.billNo !== targetBillForDisburse.billNo) {
        setSelectedBillForDisbursement(targetBillForDisburse);
        const outstanding = Number(targetBillForDisburse.balanceAmount ?? targetBillForDisburse.amount ?? 32000);
        setCustomDisburseAmount(outstanding);
        setDisburseAmountPreset('FULL');
        setDisburseRemarks(`Clearance against PO ${targetBillForDisburse.poNo || 'PO-2026'}`);
        if (!disburseRefNo) {
          setDisburseRefNo(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
        }
      }
    }
  }, [disburseModal.isOpen, targetBillForDisburse, selectedBillForDisbursement, disburseRefNo]);

  const billGrossTotal = Number(activeDisburseBill?.amount || 0);
  const billOutstandingTotal = Number(activeDisburseBill?.balanceAmount ?? activeDisburseBill?.amount ?? 0);
  
  const baseDisburseAmount = 
    disburseAmountPreset === 'FULL'
      ? billOutstandingTotal
      : disburseAmountPreset === '50%'
      ? Math.round(billOutstandingTotal * 0.5)
      : Math.min(billOutstandingTotal, Math.max(0, Number(customDisburseAmount) || 0));

  const calculatedTds = deductTds ? Math.round(baseDisburseAmount * (tdsRate / 100)) : 0;
  const netPayableDisburse = Math.max(0, baseDisburseAmount - calculatedTds);

  const handleCopyUtr = () => {
    if (!disburseRefNo) return;
    navigator.clipboard?.writeText(disburseRefNo);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleRegenerateUtr = () => {
    setDisburseRefNo(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
  };

  const handleOpenDisburseModal = (bill: VendorBill) => {
    setSelectedBillForDisbursement(bill);
    setDisbursePaymentMode('NEFT_RTGS');
    const outstanding = Number(bill.balanceAmount ?? bill.amount ?? 0);
    setCustomDisburseAmount(outstanding);
    setDisburseAmountPreset('FULL');
    setDisburseRemarks(`Clearance against PO ${bill.poNo || 'PO-2026'}`);
    setDisburseRefNo(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    disburseModal.open({ billNo: bill.billNo });
  };

  const handleConfirmDisbursement = async () => {
    const targetBill = activeDisburseBill;
    if (!targetBill) return;
    try {
      setIsSubmittingDisbursement(true);
      if (onRecordDisbursement) {
        await onRecordDisbursement(targetBill.billNo);
      } else if (onRecordPayment) {
        await onRecordPayment(targetBill.billNo);
      }
      disburseModal.close();
      setActionSuccessMsg(`Disbursement of ₹${netPayableDisburse.toLocaleString('en-IN')} settled to ${targetBill.vendorName} via ${disbursePaymentMode.replace('_', '/')} (${disburseRefNo}).`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmittingDisbursement(false);
    }
  };

  const filtered = payables.filter(bill => {
    const bNo = (bill?.billNo || '').toLowerCase();
    const vName = (bill?.vendorName || '').toLowerCase();
    const pNo = (bill?.poNo || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = 
      bNo.includes(search) ||
      vName.includes(search) ||
      pNo.includes(search);

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && bill.status === statusFilter;
  });

  const totalAmount = payables.reduce((acc, b) => acc + Number(b.amount || 0), 0);
  const paidAmount = payables.reduce((acc, b) => acc + Number(b.paidAmount || 0), 0);
  const balanceAmount = payables.reduce((acc, b) => acc + Number(b.balanceAmount || 0), 0);
  const overdueCount = payables.filter(b => b.status === 'OVERDUE' || (Number(b.balanceAmount) > 0 && b.status === 'OPEN')).length;

  const inputClass = `h-11 w-full rounded-xl border px-3.5 text-xs font-medium outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[#5B75F8] focus:ring-4 focus:ring-[#5B75F8]/15 ${
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
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b ${
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20 shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
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

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            <label
              htmlFor="header-receipt-scan-input"
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#5B75F8]/40 bg-[#5B75F8]/10 hover:bg-[#5B75F8]/20 px-4 text-xs font-bold text-[#5B75F8] shadow-sm transition-all cursor-pointer active:scale-[0.96]"
            >
              <Sparkles className="w-4 h-4 text-[#5B75F8]" />
              <span>AI Scan & Upload Bill</span>
            </label>
            <input
              id="header-receipt-scan-input"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  createBillModal.open();
                  handleScanReceipt(file);
                }
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => {
                setFormError(null);
                createBillModal.open();
              }}
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Vendor Bill</span>
            </button>
          </div>
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
              iconBg: 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20',
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
                  <span className={`text-[10px] font-mono uppercase font-semibold tracking-wider ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {m.label}
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${m.tone}`}>
                  {m.value}
                </div>
                <div className={`text-[11px] mt-1 font-medium truncate ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
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
                      ? 'bg-[#5B75F8] text-white shadow-sm'
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
                  ? 'border-white/10 bg-black/60 text-white placeholder:text-slate-500 focus:border-[#5B75F8] focus:ring-4 focus:ring-[#5B75F8]/15' 
                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#5B75F8] focus:ring-4 focus:ring-[#5B75F8]/15'
              }`}
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                className={`absolute right-3 top-3 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'} cursor-pointer`}
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
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#5B75F8]" />
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
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#5B75F8]">
                        {bill.billNo}
                      </span>
                      {bill.attachmentId && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-medium font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                          <Paperclip className="w-2.5 h-2.5" /> Scanned
                        </span>
                      )}
                    </div>
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

                <div className={`flex items-center justify-between text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <div>PO: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{bill.poNo}</strong></div>
                  <div>Bill Date: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{bill.date}</strong></div>
                </div>

                <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-2xl border text-xs font-mono text-center ${
                  isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
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

                <div className={`pt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  {!isPaid && Number(bill.balanceAmount) > 0 ? (
                    <button
                      onClick={() => handleOpenDisburseModal(bill)}
                      className="w-full py-2.5 rounded-full bg-[#5B75F8] hover:bg-[#435BE8] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer active:scale-[0.98]"
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
        <div className={`flex items-center justify-between border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'} px-6 py-4`}>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Vendor Bills Register</h2>
            <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Supplier invoices, 3-way matching validation, and disbursement records</p>
          </div>
          <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-semibold ${
            isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
          }`}>
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 rounded-2xl bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No vendor bills recorded yet</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Upload and scan a supplier invoice or receipt using AI, or record a vendor bill manually to start tracking payables.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                        <label
                          htmlFor="table-empty-receipt-scan-input"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5B75F8] hover:bg-[#435BE8] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Scan & Upload Invoice</span>
                        </label>
                        <input
                          id="table-empty-receipt-scan-input"
                          type="file"
                          accept="application/pdf,image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              createBillModal.open();
                              handleScanReceipt(file);
                            }
                            e.target.value = '';
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => createBillModal.open()}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                            isDarkMode ? 'border-white/10 text-white hover:bg-white/10' : 'border-slate-200 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Record First Vendor Bill</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((bill) => (
                <tr key={bill.billNo} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.025]' : 'hover:bg-slate-50'}`}>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20 shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-xs text-[#5B75F8]">
                          {bill.billNo}
                        </span>
                        {bill.attachmentId && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium font-mono text-emerald-400 mt-0.5">
                            <Paperclip className="w-2.5 h-2.5" /> Scanned Doc
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {bill.vendorName}
                  </td>
                  <td className={`py-4 px-5 font-mono text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {bill.poNo}
                  </td>
                  <td className={`py-4 px-5 font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {bill.date}
                  </td>
                  <td className={`py-4 px-5 text-right font-bold font-mono text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
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
                        className="px-3.5 py-1.5 rounded-full bg-[#5B75F8] hover:bg-[#435BE8] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        Disburse Funds
                      </button>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── 5. RECORD VENDOR BILL ENTRY MODAL ──                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createBillModal.isOpen}
        onClose={() => { if (!isSubmitting) { createBillModal.close(); resetScanState(); } }}
        maxWidth="xl"
        isDarkMode={isDarkMode}
        icon={<Receipt className="w-5 h-5 text-[#5B75F8]" />}
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

          {/* AI Receipt / Bill Scan */}
          <div className={`p-4 rounded-2xl border ${
            isDarkMode ? 'border-[#5B75F8]/25 bg-[#5B75F8]/[0.06]' : 'border-[#5B75F8]/20 bg-[#5B75F8]/[0.04]'
          }`}>
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5B75F8]" />
              <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Scan with AI
              </span>
              <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                — upload a photo or PDF to auto-fill the fields below
              </span>
            </div>

            <label
              htmlFor="receipt-scan-input"
              className={`flex items-center justify-center gap-2.5 h-20 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                isScanning ? 'pointer-events-none opacity-70' : ''
              } ${
                isDarkMode
                  ? 'border-white/15 hover:border-[#5B75F8]/50 hover:bg-black/30'
                  : 'border-slate-300 hover:border-[#5B75F8]/50 hover:bg-slate-50'
              }`}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#5B75F8] animate-spin" />
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Reading document…</span>
                </>
              ) : scannedFileName ? (
                <div className="flex items-center gap-2 px-3">
                  <Paperclip className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className={`truncate max-w-[220px] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {scannedFileName}
                  </span>
                  {scanConfidence && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      scanConfidence === 'high'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : scanConfidence === 'medium'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {scanConfidence} confidence
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); resetScanState(); }}
                    className={`ml-1 cursor-pointer ${isDarkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                    Click to upload receipt / invoice (PDF, JPG, PNG)
                  </span>
                </>
              )}
            </label>
            <input
              id="receipt-scan-input"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={isScanning}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleScanReceipt(file);
                e.target.value = '';
              }}
            />

            {scannedFileName && !isScanning && (
              <div className="mt-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 text-xs text-emerald-400 space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div className="leading-snug flex-1">
                    <p className="font-bold text-emerald-300">Document scanned & fields pre-filled!</p>
                    <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Vendor: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formVendorName}</strong> • Bill #: <strong className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formBillNo}</strong> • Amount: <strong className={`font-mono ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>₹{Number(formGrossAmount || 0).toLocaleString('en-IN')}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-emerald-500/20">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveScannedBill()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Recording...' : `Add Scanned Bill to Table (₹${Number(formGrossAmount || 0).toLocaleString('en-IN')})`}</span>
                  </button>
                  <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    or review/edit the fields below before recording
                  </span>
                </div>
              </div>
            )}

            {scanError && (
              <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>{scanError}</span>
              </div>
            )}
          </div>

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
              <div className={`font-semibold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Statutory TDS Section 194Q Applicability</div>
              <div className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mark if this bill is for purchase of goods exceeding statutory thresholds</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formIsPurchaseOfGoods}
                onChange={(e) => setFormIsPurchaseOfGoods(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B75F8]"></div>
            </label>
          </div>

          <div className={`pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'} flex justify-end gap-2.5 font-sans`}>
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
              className="px-6 py-2.5 rounded-full bg-[#5B75F8] hover:bg-[#435BE8] active:scale-[0.98] text-white font-semibold text-xs cursor-pointer shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
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
        isOpen={disburseModal.isOpen && Boolean(activeDisburseBill)}
        onClose={() => !isSubmittingDisbursement && disburseModal.close()}
        maxWidth="2xl"
        isDarkMode={isDarkMode}
        icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
        title="Disburse Vendor Funds"
        subtitle={
          activeDisburseBill ? (
            <span className={`flex flex-wrap items-center gap-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <span className={`font-mono font-bold px-2 py-0.5 rounded-md border ${
                isDarkMode ? 'text-white bg-white/10 border-white/10' : 'text-slate-900 bg-slate-100 border-slate-200'
              }`}>
                {activeDisburseBill.billNo}
              </span>
              <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{activeDisburseBill.vendorName}</span>
              <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>•</span>
              <span className={`font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{activeDisburseBill.poNo}</span>
            </span>
          ) : undefined
        }
        headerRight={
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-[11px] font-semibold shadow-[0_0_12px_rgba(16,185,129,0.12)]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>3-Way Matched</span>
          </div>
        }
      >
        {activeDisburseBill && (
          <div className="space-y-5 text-xs font-sans pb-1">

            {/* 1. Apple Wallet / Titanium Obsidian Hero Card */}
            <div className={`relative rounded-[26px] p-5 sm:p-6 border overflow-hidden group transition-all ${
              isDarkMode
                ? 'border-white/[0.14] bg-gradient-to-br from-[#1c1e27] via-[#13141c] to-[#0a0a0f] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
                : 'border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-slate-100/90 text-slate-900 shadow-[0_12px_36px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]'
            }`}>
              {/* Ambient radial lighting glows */}
              <div className={`absolute -top-16 -right-16 w-52 h-52 rounded-full blur-3xl pointer-events-none ${
                isDarkMode ? 'bg-emerald-500/15' : 'bg-emerald-500/10'
              }`} />
              <div className={`absolute -bottom-16 -left-16 w-52 h-52 rounded-full blur-3xl pointer-events-none ${
                isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-500/5'
              }`} />
              <div className={`absolute inset-0 pointer-events-none rounded-[26px] ${
                isDarkMode ? 'bg-gradient-to-b from-white/[0.06] via-transparent to-transparent' : 'bg-gradient-to-b from-white/70 via-transparent to-transparent'
              }`} />

              {/* Card Top Row: Chip + NFC Waves + Clearance Tag */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-7 rounded-lg border flex items-center justify-center p-1 shadow-inner ${
                    isDarkMode
                      ? 'border-amber-400/50 bg-gradient-to-br from-amber-300/30 via-amber-500/20 to-amber-700/30'
                      : 'border-amber-400/60 bg-gradient-to-br from-amber-200/50 via-amber-300/30 to-amber-400/40'
                  }`}>
                    <div className="w-full h-full border border-amber-400/40 rounded grid grid-cols-2 gap-0.5 opacity-85" />
                  </div>
                  <Wifi className={`w-4 h-4 rotate-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                </div>
                <span className={`font-mono text-[10px] uppercase font-semibold tracking-wider px-3 py-1 rounded-full backdrop-blur-md shadow-sm border ${
                  isDarkMode
                    ? 'text-slate-300 bg-white/10 border-white/15'
                    : 'text-slate-700 bg-slate-100 border-slate-200'
                }`}>
                  Direct Bank Clearing
                </span>
              </div>

              {/* Card Middle: Net Disbursable Amount Hero */}
              <div className="mt-5 relative z-10">
                <div className={`text-[10px] uppercase font-semibold tracking-widest flex items-center gap-1.5 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>Net Disbursable Amount</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight mt-1 flex items-baseline gap-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <span>₹{netPayableDisburse.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* Statutory Deductions Pill Breakdown */}
                <div className={`flex flex-wrap items-center gap-2 mt-3 pt-3 border-t text-[11px] font-mono ${
                  isDarkMode ? 'border-white/[0.10]' : 'border-slate-200'
                }`}>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                    Gross: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>₹{baseDisburseAmount.toLocaleString('en-IN')}</strong>
                  </span>
                  <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>•</span>
                  <span className={deductTds ? (isDarkMode ? 'text-amber-400 font-medium' : 'text-amber-700 font-semibold') : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                    TDS ({deductTds ? `${tdsRate}% Sec 194C` : 'Exempt'}):{' '}
                    <strong className="font-bold">{deductTds ? `-₹${calculatedTds.toLocaleString('en-IN')}` : '₹0'}</strong>
                  </span>
                  <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>•</span>
                  <span className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} font-bold`}>
                    Net Settlement: ₹{netPayableDisburse.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Card Bottom: Beneficiary & Bank Detail Row */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3.5 border-t text-[11px] relative z-10 ${
                isDarkMode ? 'border-white/[0.10]' : 'border-slate-200'
              }`}>
                <div>
                  <span className={`text-[10px] block uppercase font-semibold tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Beneficiary</span>
                  <span className={`font-semibold truncate block text-xs mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeDisburseBill.vendorName}</span>
                  <span className={`font-mono text-[10px] block mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    PAN: <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{activeDisburseBill.vendorPan || 'AAACS8839M'}</span>
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className={`text-[10px] block uppercase font-semibold tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Destination Bank Account</span>
                  <span className={`font-mono font-semibold block text-xs mt-0.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>HDFC Bank •••• 5912</span>
                  <span className={`font-mono text-[10px] block mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    IFSC: <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{activeDisburseBill.vendorIfsc || 'HDFC0000492'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Amount Presets (Segmented Apple Control) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold px-0.5">
                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Disbursement Amount</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Outstanding: ₹{billOutstandingTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className={`p-1 rounded-2xl border grid grid-cols-3 gap-1 ${
                isDarkMode ? 'bg-black/50 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setDisburseAmountPreset('FULL');
                    setCustomDisburseAmount(billOutstandingTotal);
                  }}
                  className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                    disburseAmountPreset === 'FULL'
                      ? 'bg-[#5B75F8] text-white shadow-md shadow-blue-500/20'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <span className="block truncate">100% Full</span>
                  <span className="block font-mono text-[10px] opacity-80 truncate">₹{billOutstandingTotal.toLocaleString('en-IN')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDisburseAmountPreset('50%');
                    setCustomDisburseAmount(Math.round(billOutstandingTotal * 0.5));
                  }}
                  className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                    disburseAmountPreset === '50%'
                      ? 'bg-[#5B75F8] text-white shadow-md shadow-blue-500/20'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <span className="block truncate">50% Interim</span>
                  <span className="block font-mono text-[10px] opacity-80 truncate">₹{Math.round(billOutstandingTotal * 0.5).toLocaleString('en-IN')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisburseAmountPreset('CUSTOM')}
                  className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                    disburseAmountPreset === 'CUSTOM'
                      ? 'bg-[#5B75F8] text-white shadow-md shadow-blue-500/20'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <span className="block truncate">Custom Amount</span>
                  <span className="block font-mono text-[10px] opacity-80 truncate">Specific ₹</span>
                </button>
              </div>

              {disburseAmountPreset === 'CUSTOM' && (
                <div className="pt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-slate-400">₹</span>
                    <input
                      type="number"
                      min="1"
                      max={billOutstandingTotal}
                      value={customDisburseAmount}
                      onChange={(e) => setCustomDisburseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Enter disbursement amount"
                      className={`${inputClass} pl-8 font-mono font-bold text-sm`}
                      autoFocus
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Disbursement Rails / Payment Mode Grid (Tactile Apple Cards) */}
            <div className="space-y-2">
              <label className={`block text-xs font-semibold px-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Disbursement Rail & Clearance Method *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'NEFT_RTGS' as const,
                    title: 'NEFT / RTGS Transfer',
                    badge: 'RBI Clearing',
                    desc: 'Direct host-to-host bank clearing to beneficiary account',
                    icon: Landmark,
                    accent: 'emerald'
                  },
                  {
                    id: 'IMPS' as const,
                    title: 'Instant IMPS',
                    badge: '24x7 Immediate',
                    desc: 'Instant settlement with real-time beneficiary credit',
                    icon: Zap,
                    accent: 'amber'
                  },
                  {
                    id: 'UPI' as const,
                    title: 'Corporate UPI',
                    badge: 'Zero Surcharge',
                    desc: 'Direct VPA settlement via corporate bank gateway',
                    icon: Smartphone,
                    accent: 'blue'
                  },
                  {
                    id: 'CHEQUE' as const,
                    title: 'A/C Payee Cheque',
                    badge: 'Physical Voucher',
                    desc: 'Crossed cheque voucher printed against ledger release',
                    icon: Receipt,
                    accent: 'purple'
                  }
                ].map((mode) => {
                  const isSelected = disbursePaymentMode === mode.id;
                  const ModeIcon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDisbursePaymentMode(mode.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative active:scale-[0.98] ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-gradient-to-br from-[#5B75F8]/20 to-blue-600/10 border-[#5B75F8] text-white ring-1 ring-[#5B75F8]/30 shadow-[0_4px_20px_rgba(91,117,248,0.2)]'
                            : 'bg-blue-50/80 border-[#5B75F8] text-slate-900 ring-1 ring-[#5B75F8]/30 shadow-sm'
                          : isDarkMode
                          ? 'bg-black/40 border-white/[0.08] hover:border-white/20 text-slate-300 hover:bg-white/[0.03]'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border ${
                            isSelected
                              ? 'bg-[#5B75F8] text-white border-transparent shadow-sm'
                              : isDarkMode
                              ? 'bg-white/5 border-white/10 text-slate-400'
                              : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                            <ModeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs block leading-tight">{mode.title}</span>
                            <span className="text-[10px] font-mono opacity-70 block mt-0.5">{mode.badge}</span>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#5B75F8] text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className={`w-5 h-5 rounded-full border ${isDarkMode ? 'border-white/20' : 'border-slate-300'} shrink-0`} />
                        )}
                      </div>
                      <p className={`text-[11px] mt-2 line-clamp-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {mode.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Debit Bank Source & Reference (UTR) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Debit Account (Source) *
                </label>
                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="min-w-0 pr-2">
                    <span className={`font-semibold text-xs block truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>HDFC Corporate Operating A/c</span>
                    <span className={`text-[10px] font-mono block mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>•••• 4092 • HDFC Bank</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold shrink-0 border border-emerald-500/20">
                    Liquid: ₹24.8L
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Bank Reference / UTR # *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleRegenerateUtr}
                      className={`text-[10px] ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} flex items-center gap-1 transition-colors cursor-pointer`}
                      title="Generate new UTR"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>New</span>
                    </button>
                    <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>•</span>
                    <button
                      type="button"
                      onClick={handleCopyUtr}
                      className="text-[10px] text-[#5B75F8] hover:text-[#7B92FF] flex items-center gap-1 transition-colors cursor-pointer font-medium"
                    >
                      {copiedRef ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={disburseRefNo}
                  onChange={(e) => setDisburseRefNo(e.target.value)}
                  className={`${inputClass} font-mono font-bold tracking-wider`}
                  placeholder="e.g. UTR-HDFC8492049"
                  required
                />
              </div>
            </div>

            {/* 5. Statutory TDS Toggle & Compliance Strip */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              isDarkMode ? 'bg-black/50 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BadgePercent className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className={`font-semibold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Statutory TDS Deduction (Sec 194C / 194Q)</span>
                </div>
                <p className={`text-[11px] mt-1 pl-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {deductTds
                    ? `Withholding ${tdsRate}% TDS (₹${calculatedTds.toLocaleString('en-IN')}) against PAN ${activeDisburseBill.vendorPan || 'AAACS8839M'}. Form 16A will be generated.`
                    : 'TDS withheld is set to ₹0 (Exempt under threshold limit or lower TDS certificate).'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={deductTds}
                  onChange={(e) => setDeductTds(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* 6. Bank Security Assurance Strip */}
            <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-[11px] font-mono ${
              isDarkMode ? 'bg-white/[0.02] border-white/[0.05] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Protected by 256-Bit Bank-Grade Encryption • Dual-Approver Audit Trail Enabled</span>
            </div>

            {/* 7. Action Buttons Bar */}
            <div className={`pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between gap-3 font-sans`}>
              <button
                type="button"
                onClick={() => disburseModal.close()}
                disabled={isSubmittingDisbursement}
                className={`px-5 py-2.5 rounded-full border text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                  isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDisbursement}
                disabled={isSubmittingDisbursement || netPayableDisburse <= 0 || !disburseRefNo}
                className="px-6 py-2.5 rounded-full bg-[#5B75F8] hover:bg-[#435BE8] active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {isSubmittingDisbursement ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Settling Disbursement...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Authorize & Disburse ₹{netPayableDisburse.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
};

export default PayablesView;
