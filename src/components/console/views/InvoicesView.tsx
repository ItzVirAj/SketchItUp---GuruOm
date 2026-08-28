import React, { useState, useMemo } from 'react';
import { 
  FileCheck, 
  Search, 
  Download, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  Receipt,
  TrendingUp,
  CreditCard,
  Building2,
  Truck,
  ShieldCheck,
  Send,
  X,
  FileText,
  Lock,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { 
  CustomerInvoice, 
  DispatchChallan, 
  CustomerOrder, 
  CustomerMaster, 
  MasterItem 
} from '../../../types/console';
import { 
  calculateGstTaxSplit, 
  getCurrentFinancialYear, 
  formatDocumentNumber 
} from '../../../utils/statutoryAccountingEngine';

interface InvoicesViewProps {
  invoices: CustomerInvoice[];
  dispatches?: DispatchChallan[];
  orders?: CustomerOrder[];
  customers?: CustomerMaster[];
  masters?: MasterItem[];
  isDarkMode?: boolean;
  currentRole?: string;
  onCreateInvoice?: (invoice: any) => Promise<void> | void;
  onIssueInvoice?: (invoiceNo: string) => Promise<void> | void;
  onRecordPayment?: (invoiceNo: string) => void;
  onViewOrder?: (orderId: string) => void;
  preselectedDispatchNo?: string | null;
  preselectedOrderPo?: string | null;
  onInvoiceModalOpened?: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  dispatches = [],
  orders = [],
  customers = [],
  masters = [],
  isDarkMode = true,
  currentRole = 'OWNER',
  onCreateInvoice,
  onIssueInvoice,
  onRecordPayment,
  onViewOrder,
  preselectedDispatchNo,
  preselectedOrderPo,
  onInvoiceModalOpened
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDispatchNo, setSelectedDispatchNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [invoiceNoInput, setInvoiceNoInput] = useState('');
  const [invoiceLines, setInvoiceLines] = useState<Array<{
    itemCode: string;
    itemDescription: string;
    hsnCode: string;
    qty: number;
    unitPrice: number;
    gstRate: number;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Dedicated Record Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<CustomerInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>('NEFT_RTGS');
  const [payRefNo, setPayRefNo] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState<string | null>(null);

  const handleOpenPaymentModal = (invoice: CustomerInvoice) => {
    setSelectedInvoiceForPayment(invoice);
    const balance = Number(invoice.balanceAmount !== undefined ? invoice.balanceAmount : invoice.totalAmount);
    setPayAmount(balance > 0 ? balance : Number(invoice.totalAmount));
    setPayMode('NEFT_RTGS');
    setPayRefNo(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes(`Payment realization against Tax Invoice ${invoice.invoiceNo}`);
    setPaymentModalError(null);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    if (payAmount <= 0) {
      setPaymentModalError('Payment amount must be greater than 0');
      return;
    }
    const balance = Number(selectedInvoiceForPayment.balanceAmount !== undefined ? selectedInvoiceForPayment.balanceAmount : selectedInvoiceForPayment.totalAmount);
    if (payAmount > balance) {
      setPaymentModalError(`Payment amount cannot exceed outstanding balance of ₹${balance.toLocaleString('en-IN')}`);
      return;
    }

    try {
      setIsSubmittingPayment(true);
      setPaymentModalError(null);
      if (onRecordPayment) {
        await onRecordPayment(selectedInvoiceForPayment.invoiceNo, {
          paymentAmount: payAmount,
          paymentMode: payMode,
          referenceNo: payRefNo,
          paymentDate: payDate,
          notes: payNotes
        });
      }
      setShowPaymentModal(false);
      setActionSuccessMsg(`Payment of ₹${payAmount.toLocaleString('en-IN')} recorded successfully against ${selectedInvoiceForPayment.invoiceNo}.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      setPaymentModalError(err?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Role Permissions
  const canCreateInvoice = !currentRole || 
    ['OWNER', 'FINANCE', 'ACCOUNTS', 'SUPER ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'ACCOUNTS_ADMIN', 'Accounts / Finance'].includes(currentRole.toUpperCase()) || 
    currentRole === 'Executive Leadership (Owner)';

  // Compute Invoiced Challan Map
  const fullyInvoicedChallans = useMemo(() => {
    const map = new Set<string>();
    invoices.forEach(inv => {
      if (inv.challanNo && inv.status !== 'CANCELLED') {
        map.add(inv.challanNo);
      }
    });
    return map;
  }, [invoices]);

  // Compute Eligible Dispatches (Dispatches with pending invoice, sorted newest-first)
  const eligibleDispatches = useMemo(() => {
    const list = dispatches.filter(d => {
      const status = (d.status || '').toUpperCase();
      const isDispatched = ['DISPATCHED', 'PARTIALLY_DISPATCHED', 'DELIVERED', 'IN_TRANSIT', 'READY_TO_DISPATCH', 'DISPATCH_READY'].includes(status);
      return isDispatched;
    });

    // Sort newest-first
    return list.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime() || 0;
      const timeB = new Date(b.date || 0).getTime() || 0;
      return timeB - timeA;
    });
  }, [dispatches]);

  // Dispatches actively awaiting invoicing (not yet invoiced)
  const dispatchesAwaitingInvoicing = useMemo(() => {
    return eligibleDispatches.filter(d => !fullyInvoicedChallans.has(d.challanNo));
  }, [eligibleDispatches, fullyInvoicedChallans]);

  // Handle Dispatch Selection
  const handleSelectDispatch = (challanNo: string) => {
    setSelectedDispatchNo(challanNo);
    setModalError(null);

    const dispatch = dispatches.find(d => d.challanNo === challanNo || d.id === challanNo);
    if (!dispatch) {
      setInvoiceLines([]);
      return;
    }

    const linkedOrder = orders.find(o => o.poNo === dispatch.orderPo || o.id === dispatch.orderPo);
    
    // Auto-generate invoice number
    const fy = getCurrentFinancialYear();
    const runningNum = Math.floor(1000 + (invoices.length + 1) * 17) % 9000;
    setInvoiceNoInput(formatDocumentNumber('INV', fy, runningNum));

    // Build line items from Order lines or fallback
    if (linkedOrder && linkedOrder.lines && linkedOrder.lines.length > 0) {
      const lines = linkedOrder.lines.map(l => {
        const master = masters.find(m => m.code === l.itemCode);
        const resolvedRate = Number(
          (l as any).rate ?? (l as any).unitPrice ?? (l as any).unit_rate ?? (l as any).sell_rate ?? master?.saleRate ?? 0
        );
        return {
          itemCode: l.itemCode,
          itemDescription: l.itemDescription || l.description || master?.description || 'Precision Machined Component',
          hsnCode: master?.hsnCode || '84834000',
          qty: Number(l.dispatchedQty || l.orderQty || 1),
          unitPrice: resolvedRate,
          gstRate: 18
        };
      });
      setInvoiceLines(lines);
    } else {
      setInvoiceLines([
        {
          itemCode: 'ITEM-PRECISION-01',
          itemDescription: 'Machined Component Batch',
          hsnCode: '84834000',
          qty: dispatch.linesCount || 1,
          unitPrice: 2500,
          gstRate: 18
        }
      ]);
    }
  };

  // Handle Preselection from Order Detail View or External CTA
  const preselectHandled = React.useRef<string | null>(null);
  React.useEffect(() => {
    const key = preselectedDispatchNo || preselectedOrderPo;
    if (!key || preselectHandled.current === key) return;
    preselectHandled.current = key;

    // 1. Try finding matching dispatch by challanNo or orderPo
    const matchedDispatch = dispatches.find(d => 
      (preselectedDispatchNo && (d.challanNo === preselectedDispatchNo || d.id === preselectedDispatchNo)) ||
      (preselectedOrderPo && (d.orderPo === preselectedOrderPo || d.orderId === preselectedOrderPo))
    );

    if (matchedDispatch) {
      handleSelectDispatch(matchedDispatch.challanNo);
      setShowCreateModal(true);
      onInvoiceModalOpened?.();
    } else if (preselectedOrderPo) {
      // 2. Direct order fallback if dispatch object isn't indexed yet
      const linkedOrder = orders.find(o => o.poNo === preselectedOrderPo || o.id === preselectedOrderPo);
      if (linkedOrder) {
        const challan = preselectedDispatchNo || linkedOrder.deliveryChallanNo || `CHL-${linkedOrder.poNo || linkedOrder.id}`;
        setSelectedDispatchNo(challan);
        setModalError(null);
        const fy = getCurrentFinancialYear();
        const runningNum = Math.floor(1000 + (invoices.length + 1) * 17) % 9000;
        setInvoiceNoInput(formatDocumentNumber('INV', fy, runningNum));

        if (linkedOrder.lines && linkedOrder.lines.length > 0) {
          const lines = linkedOrder.lines.map(l => {
            const master = masters.find(m => m.code === l.itemCode);
            const resolvedRate = Number(
              (l as any).rate ?? (l as any).unitPrice ?? (l as any).unit_rate ?? (l as any).sell_rate ?? master?.saleRate ?? 0
            );
            return {
              itemCode: l.itemCode,
              itemDescription: l.itemDescription || l.description || master?.description || 'Precision Machined Component',
              hsnCode: master?.hsnCode || '84834000',
              qty: Number(l.dispatchedQty || l.orderQty || 1),
              unitPrice: resolvedRate,
              gstRate: 18
            };
          });
          setInvoiceLines(lines);
        } else {
          setInvoiceLines([
            {
              itemCode: 'ITEM-PRECISION-01',
              itemDescription: 'Machined Component Batch',
              hsnCode: '84834000',
              qty: 1,
              unitPrice: 2500,
              gstRate: 18
            }
          ]);
        }
        setShowCreateModal(true);
        onInvoiceModalOpened?.();
      }
    }
  }, [preselectedDispatchNo, preselectedOrderPo, dispatches, orders, masters, invoices.length, onInvoiceModalOpened]);

  // Selected Dispatch Metadata
  const selectedDispatch = useMemo(() => {
    return dispatches.find(d => d.challanNo === selectedDispatchNo || d.id === selectedDispatchNo);
  }, [dispatches, selectedDispatchNo]);

  const selectedOrder = useMemo(() => {
    if (selectedDispatch) {
      return orders.find(o => o.poNo === selectedDispatch.orderPo || o.id === selectedDispatch.orderPo);
    }
    return orders.find(o => o.deliveryChallanNo === selectedDispatchNo || o.poNo === selectedDispatchNo || o.id === selectedDispatchNo);
  }, [orders, selectedDispatch, selectedDispatchNo]);

  const selectedCustomer = useMemo(() => {
    if (!selectedOrder) return null;
    return customers.find(c => c.name.toLowerCase() === selectedOrder.customerName.toLowerCase() || (selectedOrder.customerId && c.id === selectedOrder.customerId));
  }, [customers, selectedOrder]);

  const customerGstin = selectedCustomer?.gstin || selectedOrder?.customerGstin || '27AABCG1234F1Z5';
  const customerName = selectedOrder?.customerName || selectedCustomer?.name || 'Customer';

  // Tax & Totals Calculation
  const calculation = useMemo(() => {
    const taxable = invoiceLines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.unitPrice || 0)), 0);
    const taxSplit = calculateGstTaxSplit({
      taxableAmount: taxable,
      gstRate: 18,
      buyerGstin: customerGstin,
      sellerStateCode: '27'
    });
    return {
      taxable,
      ...taxSplit
    };
  }, [invoiceLines, customerGstin]);

  // Handle Save Invoice (Draft or Immediate Issue)
  const handleSaveInvoice = async (status: 'DRAFT' | 'ISSUED') => {
    if (!selectedDispatch && !selectedOrder && !selectedDispatchNo) {
      setModalError('Please select a source dispatch challan.');
      return;
    }
    if (invoiceLines.length === 0) {
      setModalError('Invoice must contain at least one line item.');
      return;
    }
    if (!invoiceNoInput.trim()) {
      setModalError('Invoice number is mandatory.');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);

      const invoicePayload = {
        invoiceNo: invoiceNoInput.trim(),
        customerId: selectedOrder?.customerId || selectedCustomer?.id || 'CUST-AUTO',
        customerName,
        customerGstin,
        orderPo: selectedDispatch?.orderPo || selectedOrder?.poNo || selectedOrder?.id || 'PO-AUTO',
        challanNo: selectedDispatch?.challanNo || selectedOrder?.deliveryChallanNo || selectedDispatchNo,
        status,
        date: invoiceDate,
        dueDate,
        items: invoiceLines.map(l => ({
          itemCode: l.itemCode,
          itemDescription: l.itemDescription,
          hsnCode: l.hsnCode,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          taxableValue: Number(l.qty) * Number(l.unitPrice),
          gstRate: Number(l.gstRate)
        })),
        taxableAmount: calculation.taxable,
        cgstAmount: calculation.cgstAmount,
        sgstAmount: calculation.sgstAmount,
        igstAmount: calculation.igstAmount,
        totalAmount: calculation.totalAmount,
        paidAmount: 0,
        balanceAmount: calculation.totalAmount
      };

      if (onCreateInvoice) {
        await onCreateInvoice(invoicePayload);
      }

      setShowCreateModal(false);
      setSelectedDispatchNo('');
      setActionSuccessMsg(`Tax Invoice ${invoiceNoInput.trim()} saved as ${status} successfully!`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Invoices for Table
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.orderPo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'DRAFT') return matchesSearch && inv.status === 'DRAFT';
    if (statusFilter === 'ISSUED') return matchesSearch && (inv.status === 'ISSUED' || inv.status === 'UNPAID');
    if (statusFilter === 'PAID') return matchesSearch && inv.status === 'PAID';
    if (statusFilter === 'PARTIAL') return matchesSearch && (inv.status === 'PARTIAL' || inv.status === 'PARTIALLY_PAID');
    if (statusFilter === 'OVERDUE') return matchesSearch && inv.status === 'OVERDUE';
    return matchesSearch && inv.status === statusFilter;
  });

  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.totalAmount || 0), 0);
  const totalReceived = invoices.reduce((acc, i) => acc + Number(i.paidAmount || 0), 0);
  const totalBalance = invoices.reduce((acc, i) => acc + Number(i.balanceAmount || 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE' || (Number(i.balanceAmount) > 0 && i.status === 'PARTIAL')).length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-between text-xs font-mono font-bold animate-in fade-in slide-in-from-top-2 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                Stage 9 • Customer Billing
              </span>
              <span className="text-xs text-slate-400 font-mono">• Statutory GST Invoicing & AR</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Customer Invoices & Billing
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Issue GST Tax Invoices against outward dispatch challans, auto-calculate CGST/SGST vs IGST, track receivables, and log payment receipts.
            </p>
          </div>

          {/* Primary CTA: + Create New Invoice */}
          {canCreateInvoice && (
            <button
              onClick={() => {
                setSelectedDispatchNo('');
                setInvoiceLines([]);
                setModalError(null);
                setShowCreateModal(true);
              }}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Invoice</span>
            </button>
          )}
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Invoiced</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                ₹{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Collections Realized</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-500">
                ₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Outstanding Dues</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-amber-500">
                ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending Dispatches</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {dispatchesAwaitingInvoicing.length}
              </span>
              <span className="text-[11px] font-mono font-semibold text-cyan-400">Awaiting Invoice</span>
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
            { id: 'ALL', label: 'All Invoices' },
            { id: 'DRAFT', label: 'Drafts' },
            { id: 'ISSUED', label: 'Issued (Unpaid)' },
            { id: 'PARTIAL', label: 'Partial Dues' },
            { id: 'PAID', label: 'Paid' },
            { id: 'OVERDUE', label: 'Overdue' }
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
            placeholder="Search Inv #, PO #, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none text-xs w-64 font-mono"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-4 px-5">Invoice #</th>
                <th className="py-4 px-5">Customer Name</th>
                <th className="py-4 px-5">Order PO</th>
                <th className="py-4 px-5">Challan Ref</th>
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5 text-right">Taxable</th>
                <th className="py-4 px-5 text-right">Total Amount</th>
                <th className="py-4 px-5 text-right">Paid Amount</th>
                <th className="py-4 px-5 text-right">Balance Due</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-mono">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No customer invoices found matching filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id || inv.invoiceNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                      {inv.invoiceNo}
                    </td>
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      <div>{inv.customerName}</div>
                      {inv.customerGstin && (
                        <div className="text-[10px] text-slate-400 font-mono">{inv.customerGstin}</div>
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400">
                      {onViewOrder ? (
                        <button
                          onClick={() => onViewOrder(inv.orderPo)}
                          className="hover:text-[#5B75F8] hover:underline cursor-pointer flex items-center gap-1 font-bold"
                        >
                          <span>{inv.orderPo}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                      ) : (
                        inv.orderPo
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400">
                      {inv.challanNo || '—'}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400">
                      {inv.date}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-slate-300">
                      ₹{Number(inv.taxableAmount || (inv.totalAmount ? inv.totalAmount / 1.18 : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-4 px-5 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                      ₹{Number(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-amber-500">
                      ₹{Number(inv.balanceAmount ?? (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : inv.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : inv.status === 'PARTIAL' || inv.status === 'PARTIALLY_PAID'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          inv.status === 'PAID' ? 'bg-emerald-500' : inv.status === 'DRAFT' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <span>{inv.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {inv.status === 'DRAFT' && onIssueInvoice && (
                          <button
                            onClick={async () => {
                              await onIssueInvoice(inv.invoiceNo);
                              setActionSuccessMsg(`Invoice ${inv.invoiceNo} issued successfully.`);
                              setTimeout(() => setActionSuccessMsg(null), 4000);
                            }}
                            className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                            }`}
                          >
                            <Send className="w-3 h-3" />
                            <span>Issue</span>
                          </button>
                        )}
                        {inv.status !== 'PAID' && inv.status !== 'DRAFT' && Number(inv.balanceAmount || inv.totalAmount) > 0 && (
                          <button
                            onClick={() => handleOpenPaymentModal(inv)}
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                              isDarkMode ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified Standalone Invoice Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-3xl rounded-3xl border p-6 max-h-[90vh] overflow-y-auto shadow-2xl transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold">Generate Statutory GST Tax Invoice</h2>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Pre-populated from outward dispatch challan with automated intra/inter-state tax split
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="mt-6 space-y-5">
              {/* Step 1: Select Source Dispatch */}
              <div>
                <label className="block text-xs font-bold font-mono text-slate-300 mb-1.5">
                  1. Select Source Dispatch Challan (DISPATCHED / DELIVERED) *
                </label>
                {dispatchesAwaitingInvoicing.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    <p className="font-bold font-mono flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      No dispatches currently awaiting invoicing
                    </p>
                    <p className="mt-1 text-slate-400 text-[11px]">
                      Orders must complete Quality/PDI inspection and have an outward Delivery Challan issued before a tax invoice can be generated.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedDispatchNo}
                    onChange={(e) => handleSelectDispatch(e.target.value)}
                    className={`w-full p-3 rounded-2xl border text-xs font-mono transition-all outline-none ${
                      isDarkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-[#5B75F8]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  >
                    <option value="">-- Choose an eligible Dispatch Challan --</option>
                    {dispatchesAwaitingInvoicing.map(d => (
                      <option key={d.challanNo} value={d.challanNo}>
                        {d.challanNo} • Order PO: {d.orderPo} • Transporter: {d.transporter || 'Self/Local'} • Date: {d.date}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Step 2: Auto-populated Invoice Metadata */}
              {selectedDispatch && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Invoice Number (Atomic Sequence)</label>
                      <input
                        type="text"
                        value={invoiceNoInput}
                        onChange={(e) => setInvoiceNoInput(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold ${
                          isDarkMode ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-700'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                          isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Payment Due Date (Net 30)</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                          isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Customer and GSTIN Info */}
                  <div className={`p-3.5 rounded-2xl border ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400">Bill To Customer</span>
                        <div className="text-sm font-bold">{customerName}</div>
                        <div className="text-xs font-mono text-slate-400">GSTIN: {customerGstin}</div>
                      </div>

                      {/* Tax Classification Badge */}
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase text-slate-400">Tax Regime (State: {calculation.buyerStateCode})</span>
                        <div className="mt-0.5">
                          {calculation.isIntraState ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                              <Lock className="w-3 h-3" />
                              Intra-State (CGST 9% + SGST 9%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              <Lock className="w-3 h-3" />
                              Inter-State (IGST 18%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <label className="block text-xs font-bold font-mono text-slate-300 mb-1.5">
                      Invoice Line Items & HSN Allocation
                    </label>
                    <div className="border border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Item Code</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">HSN Code</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                            <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {invoiceLines.map((line, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{line.itemCode}</td>
                              <td className="py-2.5 px-3">{line.itemDescription}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-400">{line.hsnCode}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold">{line.qty}</td>
                              <td className="py-2.5 px-3 text-right font-mono">₹{line.unitPrice.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold">
                                ₹{(line.qty * line.unitPrice).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Totals */}
                  <div className={`p-4 rounded-2xl border ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Total Taxable Value:</span>
                        <span>₹{calculation.taxable.toFixed(2)}</span>
                      </div>
                      {calculation.isIntraState ? (
                        <>
                          <div className="flex justify-between text-indigo-400">
                            <span>CGST (9.0%):</span>
                            <span>₹{calculation.cgstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-indigo-400">
                            <span>SGST (9.0%):</span>
                            <span>₹{calculation.sgstAmount.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-amber-400">
                          <span>IGST (18.0%):</span>
                          <span>₹{calculation.igstAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                        <span>Grand Invoice Total:</span>
                        <span className="text-emerald-400 font-mono">₹{calculation.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveInvoice('DRAFT')}
                disabled={isSubmitting || !selectedDispatch}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer disabled:opacity-50 transition-all"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveInvoice('ISSUED')}
                disabled={isSubmitting || !selectedDispatch}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Create & Issue Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Record Payment Modal Dialog */}
      {showPaymentModal && selectedInvoiceForPayment && (() => {
        const total = Number(selectedInvoiceForPayment.totalAmount || 0);
        const alreadyPaid = Number(selectedInvoiceForPayment.paidAmount || 0);
        const balance = Number(selectedInvoiceForPayment.balanceAmount !== undefined ? selectedInvoiceForPayment.balanceAmount : total);
        const newBalance = Math.max(0, balance - payAmount);
        const willBeFullyPaid = newBalance <= 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in font-sans">
            <div className={`relative w-full max-w-xl rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-all ${
              isDarkMode ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            }`}>
              {/* Header */}
              <div className={`flex items-center justify-between pb-3.5 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-tight text-emerald-500 dark:text-emerald-400">
                      Record Payment Collection
                    </h3>
                    <p className={`text-[11px] font-mono mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {selectedInvoiceForPayment.invoiceNo} • {selectedInvoiceForPayment.customerName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {paymentModalError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentModalError}</span>
                </div>
              )}

              {/* Commercial Summary Box */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                    <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Invoice</span>
                    <span className="text-xs font-bold mt-0.5 block">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                    <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Already Paid</span>
                    <span className="text-xs font-bold text-emerald-500 mt-0.5 block">₹{alreadyPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    <span className="text-[10px] uppercase font-bold block">Current Balance</span>
                    <span className="text-xs font-bold mt-0.5 block">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* References */}
                <div className={`pt-2 border-t flex flex-wrap items-center justify-between text-[11px] font-mono ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                  <span>PO: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{selectedInvoiceForPayment.orderPo || 'Direct Invoice'}</strong></span>
                  {selectedInvoiceForPayment.challanNo && (
                    <span>Challan: <strong className={isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}>{selectedInvoiceForPayment.challanNo}</strong></span>
                  )}
                  <span>Due: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{selectedInvoiceForPayment.dueDate || '—'}</strong></span>
                </div>
              </div>

              {/* Form Controls */}
              <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-[11px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Payment Amount (₹) *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPayAmount(balance)}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          payAmount === balance 
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        ⚡ Full (₹{balance.toLocaleString('en-IN')})
                      </button>
                      {balance > 100 && (
                        <button
                          type="button"
                          onClick={() => setPayAmount(Math.round(balance / 2))}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            payAmount === Math.round(balance / 2)
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          50% Partial
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-mono font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border font-mono font-bold text-sm outline-none transition-all ${
                        isDarkMode 
                          ? 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500' 
                          : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Payment Mode *
                    </label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none cursor-pointer transition-all ${
                        isDarkMode 
                          ? 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500' 
                          : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                    >
                      <option value="NEFT_RTGS">Bank NEFT / RTGS</option>
                      <option value="UPI">UPI Payment</option>
                      <option value="CHEQUE">Bank Cheque / DD</option>
                      <option value="IMPS">IMPS Instant Transfer</option>
                      <option value="BANK_TRANSFER">Direct Account Transfer</option>
                      <option value="CASH">Cash Deposit</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Payment Realization Date *
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none transition-all ${
                        isDarkMode 
                          ? 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500' 
                          : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Bank Transaction / UTR / Cheque Ref # *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-HDFC98234723 or CHQ-004521"
                    value={payRefNo}
                    onChange={(e) => setPayRefNo(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none transition-all ${
                      isDarkMode 
                        ? 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500' 
                        : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Deposit Account / Settlement Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Current A/c • Verified with Bank Statement"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isDarkMode 
                        ? 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500' 
                        : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Live Settlement Outcome Preview */}
                <div className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
                  willBeFullyPaid 
                    ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    {willBeFullyPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                    <span>Remaining Balance: <strong>₹{newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                    willBeFullyPaid 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    {willBeFullyPaid ? 'Fully Settled (PAID)' : 'Partial Payment'}
                  </span>
                </div>

                {/* Actions */}
                <div className={`pt-3 flex justify-end gap-2.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    disabled={isSubmittingPayment}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment || payAmount <= 0 || payAmount > balance}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isSubmittingPayment ? 'Recording...' : `Confirm & Settle ₹${payAmount.toLocaleString('en-IN')}`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default InvoicesView;
