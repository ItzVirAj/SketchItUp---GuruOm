import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  Sparkles,
  ArrowRight,
  PackageCheck,
  Hash,
  Landmark,
  BadgePercent
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
import { Modal } from '../../common/Modal';

import { useUrlModal } from '../../../hooks/useUrlModal';

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
  onRecordPayment?: (invoiceNo: string, paymentData: any) => void;
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

  // URL-driven modals
  const createInvoiceModal = useUrlModal('create-invoice');
  const paymentModal = useUrlModal('record-payment');

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
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<CustomerInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>('NEFT_RTGS');
  const [payRefNo, setPayRefNo] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState<string | null>(null);

  // Sync payment modal from URL params if reloaded or deep linked
  useEffect(() => {
    if (paymentModal.isOpen && paymentModal.params.invoiceNo) {
      const inv = invoices.find(i => i.invoiceNo === paymentModal.params.invoiceNo);
      if (inv && (!selectedInvoiceForPayment || selectedInvoiceForPayment.invoiceNo !== inv.invoiceNo)) {
        setSelectedInvoiceForPayment(inv);
        const balance = Number(inv.balanceAmount !== undefined ? inv.balanceAmount : inv.totalAmount);
        setPayAmount(balance > 0 ? balance : Number(inv.totalAmount));
        setPayMode('NEFT_RTGS');
        setPayRefNo(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
        setPayDate(new Date().toISOString().split('T')[0]);
        setPayNotes(`Payment realization against Tax Invoice ${inv.invoiceNo}`);
        setPaymentModalError(null);
      }
    }
  }, [paymentModal.isOpen, paymentModal.params.invoiceNo, invoices, selectedInvoiceForPayment]);

  const handleOpenPaymentModal = (invoice: CustomerInvoice) => {
    setSelectedInvoiceForPayment(invoice);
    const balance = Number(invoice.balanceAmount !== undefined ? invoice.balanceAmount : invoice.totalAmount);
    setPayAmount(balance > 0 ? balance : Number(invoice.totalAmount));
    setPayMode('NEFT_RTGS');
    setPayRefNo(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes(`Payment realization against Tax Invoice ${invoice.invoiceNo}`);
    setPaymentModalError(null);
    paymentModal.open({ invoiceNo: invoice.invoiceNo });
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
      paymentModal.close();
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

  // Compute Eligible Dispatches
  const eligibleDispatches = useMemo(() => {
    const list = dispatches.filter(d => {
      const status = (d.status || '').toUpperCase();
      const isDispatched = ['DISPATCHED', 'PARTIALLY_DISPATCHED', 'DELIVERED', 'IN_TRANSIT', 'READY_TO_DISPATCH', 'DISPATCH_READY'].includes(status);
      return isDispatched;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime() || 0;
      const timeB = new Date(b.date || 0).getTime() || 0;
      return timeB - timeA;
    });
  }, [dispatches]);

  // Dispatches actively awaiting invoicing
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
    const fy = getCurrentFinancialYear();
    const runningNum = Math.floor(1000 + (invoices.length + 1) * 17) % 9000;
    setInvoiceNoInput(formatDocumentNumber('INV', fy, runningNum));

    if (dispatch.lines && dispatch.lines.length > 0) {
      const lines = dispatch.lines.map(l => {
        const master = masters.find(m => m.code === l.itemCode);
        const resolvedRate = Number(
          (l as any).rate ?? (l as any).unitPrice ?? (l as any).unit_rate ?? (l as any).sell_rate ?? master?.saleRate ?? 0
        );
        return {
          itemCode: l.itemCode,
          itemDescription: l.itemDescription || master?.description || 'Precision Machined Component',
          hsnCode: master?.hsnCode || '84834000',
          qty: Number(l.qty || 1),
          unitPrice: resolvedRate,
          gstRate: 18
        };
      });
      setInvoiceLines(lines);
    } else if (linkedOrder && linkedOrder.lines && linkedOrder.lines.length > 0) {
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
  };

  // Preselection logic
  const preselectHandled = React.useRef<string | null>(null);
  React.useEffect(() => {
    const key = preselectedDispatchNo || preselectedOrderPo;
    if (!key || preselectHandled.current === key) return;
    preselectHandled.current = key;

    const matchedDispatch = dispatches.find(d => 
      (preselectedDispatchNo && (d.challanNo.toLowerCase() === preselectedDispatchNo.toLowerCase() || d.id === preselectedDispatchNo)) ||
      (preselectedOrderPo && (d.orderPo.toLowerCase() === preselectedOrderPo.toLowerCase()))
    );

    if (matchedDispatch) {
      handleSelectDispatch(matchedDispatch.challanNo);
      createInvoiceModal.open({ dispatchNo: matchedDispatch.challanNo, orderPo: matchedDispatch.orderPo });
      onInvoiceModalOpened?.();
    } else if (preselectedOrderPo) {
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
        createInvoiceModal.open({ orderPo: preselectedOrderPo, dispatchNo: challan });
        onInvoiceModalOpened?.();
      }
    }
  }, [preselectedDispatchNo, preselectedOrderPo, dispatches, orders, masters, invoices.length, onInvoiceModalOpened, createInvoiceModal]);

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

  // Handle Save Invoice
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

      createInvoiceModal.close();
      setSelectedDispatchNo('');
      setActionSuccessMsg(`Tax Invoice ${invoiceNoInput.trim()} saved as ${status} successfully!`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Invoices — sorted newest first
  const filteredInvoices = invoices
    .filter(inv => {
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
    })
    .sort((a, b) => {
      // Newest invoice first — fallback to invoiceNo string compare
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return (b.invoiceNo || '').localeCompare(a.invoiceNo || '');
    });

  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.totalAmount || 0), 0);
  const totalReceived = invoices.reduce((acc, i) => acc + Number(i.paidAmount || 0), 0);
  const totalBalance = invoices.reduce((acc, i) => acc + Number(i.balanceAmount || 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE' || (Number(i.balanceAmount) > 0 && i.status === 'PARTIAL')).length;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-6">
      
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-3 sm:p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-between text-xs font-mono font-bold animate-in fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── MOBILE-FIRST TOP HEADER (< md) ──                                      */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Customer Billing
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Invoices & Billing ({filteredInvoices.length})
            </h1>
          </div>

          {canCreateInvoice && (
            <button
              type="button"
              onClick={() => {
                setSelectedDispatchNo('');
                setInvoiceLines([]);
                setModalError(null);
                createInvoiceModal.open();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-md active:scale-[0.96] transition-ui"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          )}
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total Invoiced</div>
            <div className="text-base font-black text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight mt-0.5 truncate">
              ₹{totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Collected</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5 truncate">
              ₹{totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Outstanding</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5 truncate">
              ₹{totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Awaiting Invoice</div>
            <div className="text-base font-black text-purple-500 tracking-tight mt-0.5">
              {dispatchesAwaitingInvoicing.length} <span className="text-xs font-normal text-slate-400">Challans</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP HEADER & INTEGRATED KPI ROW (≥ md) ──                          */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        {/* ── HERO HEADER CARD ── */}
        <section className={`relative overflow-hidden rounded-[26px] border ${
          isDarkMode
            ? 'border-white/[0.08] bg-gradient-to-br from-[#121215] via-[#121215] to-[#09090B]'
            : 'border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/60 shadow-[0_16px_48px_rgba(15,23,42,0.08)]'
        }`}>
          {/* Decorative gradient orbs */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-[var(--accent-primary)]/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-emerald-500/[0.05] blur-3xl" />

          {/* Title Row */}
          <div className="relative flex items-center justify-between gap-6 px-7 pt-6 pb-5">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Customer Invoicing · Statutory AR
                </span>
                <span className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                  isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-white text-slate-500'
                }`}>
                  {invoices.length} Total
                </span>
              </div>
              <h1 className="text-[26px] font-black tracking-[-0.045em] text-slate-950 dark:text-white leading-none">
                Invoices &amp; Billing
              </h1>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                Issue GST Tax Invoices against dispatch challans · Auto-calculate CGST/SGST vs IGST · Track receivables &amp; log payments
              </p>
            </div>

            {canCreateInvoice && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDispatchNo('');
                  setInvoiceLines([]);
                  setModalError(null);
                  createInvoiceModal.open();
                }}
                className="group relative inline-flex h-11 shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-[var(--accent-primary)] px-6 text-[13px] font-bold text-white shadow-lg shadow-[var(--accent-shadow)] transition-ui hover:brightness-110 hover:shadow-xl hover:shadow-[var(--accent-shadow)] active:scale-[0.96]"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
                <span>New Invoice</span>
              </button>
            )}
          </div>

          {/* KPI Strip */}
          <div className={`relative grid grid-cols-4 border-t ${
            isDarkMode ? 'border-white/[0.06]' : 'border-slate-200/80'
          }`}>
            {[
              {
                label: 'Total Invoiced',
                value: `₹${totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                sub: `${invoices.length} invoices raised`,
                icon: Receipt,
                bar: 'bg-[var(--accent-primary)]',
                tone: isDarkMode ? 'text-[var(--accent-text-dark)]' : 'text-[var(--accent-text-light)]',
                iconBg: isDarkMode ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)]' : 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)]',
              },
              {
                label: 'Realized Collections',
                value: `₹${totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                sub: 'Cash received in accounts',
                icon: CreditCard,
                bar: 'bg-emerald-500',
                tone: 'text-emerald-500 dark:text-emerald-400',
                iconBg: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400',
              },
              {
                label: 'Outstanding Dues',
                value: `₹${totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                sub: overdueCount > 0 ? `${overdueCount} overdue invoices` : 'Within credit limits',
                icon: Clock,
                bar: overdueCount > 0 ? 'bg-rose-500' : 'bg-amber-500',
                tone: overdueCount > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-amber-500 dark:text-amber-400',
                iconBg: overdueCount > 0 ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400' : 'bg-amber-500/15 text-amber-500 dark:text-amber-400',
              },
              {
                label: 'Awaiting Invoicing',
                value: `${dispatchesAwaitingInvoicing.length}`,
                sub: 'Challans pending invoice',
                icon: Truck,
                bar: 'bg-violet-500',
                tone: 'text-violet-500 dark:text-violet-400',
                iconBg: 'bg-violet-500/15 text-violet-500 dark:text-violet-400',
              },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className={`relative flex flex-col gap-3 px-6 py-5 transition-colors ${
                    isDarkMode ? 'hover:bg-white/[0.025]' : 'hover:bg-slate-50/60'
                  } ${
                    i > 0 ? (isDarkMode ? 'border-l border-white/[0.06]' : 'border-l border-slate-200/80') : ''
                  }`}
                >
                  {/* Accent top bar */}
                  <div className={`absolute inset-x-6 top-0 h-[2px] rounded-full opacity-70 ${m.bar}`} />

                  <div className="flex items-start justify-between">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${m.iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 pt-0.5">
                      {m.label}
                    </span>
                  </div>

                  <div>
                    <div className={`text-[22px] font-black tracking-[-0.04em] leading-none ${m.tone}`}>
                      {m.value}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400 font-mono">{m.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FILTER & SEARCH TOOLBAR ── */}
        <div className={`rounded-2xl border px-4 py-3 ${
          isDarkMode
            ? 'border-white/[0.08] bg-[#121215]'
            : 'border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]'
        }`}>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'DRAFT', label: 'Drafts' },
                { id: 'ISSUED', label: 'Issued' },
                { id: 'PARTIAL', label: 'Partial' },
                { id: 'PAID', label: 'Paid' },
                { id: 'OVERDUE', label: 'Overdue' },
              ].map(tab => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex h-8 items-center gap-1.5 rounded-xl border px-3.5 text-[11px] font-bold transition-ui ${
                      isActive
                        ? isDarkMode
                          ? 'border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] shadow-sm'
                          : 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white shadow-sm shadow-[var(--accent-shadow)]'
                        : isDarkMode
                        ? 'border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className={`flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 ml-auto ${
              isDarkMode
                ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-primary)]/60'
                : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'
            }`}>
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice #, PO #, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-full w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between px-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Showing {filteredInvoices.length} of {invoices.length} invoices · Newest first</span>
            <span>GST Billing · Accounts Receivable</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE INVOICE CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
            isDarkMode ? 'bg-[#121215] border-white/[0.08] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No customer invoices found matching filter criteria.</p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const isPaid = inv.status === 'PAID';
            const isDraft = inv.status === 'DRAFT';
            const isPartial = inv.status === 'PARTIAL' || inv.status === 'PARTIALLY_PAID';

            return (
              <div
                key={inv.id || inv.invoiceNo}
                className={`p-4 rounded-2xl border transition-ui space-y-3.5 shadow-sm ${
                  isPaid
                    ? isDarkMode ? 'bg-[#121215] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isDraft
                    ? isDarkMode ? 'bg-[#121215] border-amber-500/30' : 'bg-amber-50/40 border-amber-200'
                    : isDarkMode ? 'bg-[#121215] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Invoice # + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                      {inv.invoiceNo}
                    </span>
                    <h3 className={`text-xs font-bold font-sans mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {inv.customerName}
                    </h3>
                    {inv.customerGstin && (
                      <div className="text-[10px] text-slate-400 font-mono">GSTIN: {inv.customerGstin}</div>
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border shrink-0 ${
                    isPaid
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isDraft
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : isPartial
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPaid ? 'bg-emerald-400' : isDraft ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                    <span>{inv.status}</span>
                  </span>
                </div>

                {/* PO & Challan Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <span>PO:</span>
                    {onViewOrder ? (
                      <button
                        onClick={() => onViewOrder(inv.orderPo)}
                        className="text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] hover:underline font-bold"
                      >
                        {inv.orderPo}
                      </button>
                    ) : (
                      <strong className="text-slate-200">{inv.orderPo}</strong>
                    )}
                  </div>
                  <div>
                    Challan: <strong className="text-cyan-400">{inv.challanNo || '—'}</strong>
                  </div>
                  <div>
                    Date: <strong className="text-slate-200">{inv.date}</strong>
                  </div>
                </div>

                {/* Financial Overview Tiles */}
                <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-xl border text-xs font-mono text-center ${
                  isDarkMode ? 'bg-black/20 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Taxable</span>
                    <span className="font-bold text-slate-200">
                      ₹{Number(inv.taxableAmount || (inv.totalAmount ? inv.totalAmount / 1.18 : 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Grand Total</span>
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Balance Due</span>
                    <span className={`font-bold ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                      ₹{Number(inv.balanceAmount ?? (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                  {inv.status === 'DRAFT' && onIssueInvoice && (
                    <button
                      onClick={async () => {
                        await onIssueInvoice(inv.invoiceNo);
                        setActionSuccessMsg(`Invoice ${inv.invoiceNo} issued successfully.`);
                        setTimeout(() => setActionSuccessMsg(null), 4000);
                      }}
                      className="flex-1 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-transform duration-150 ease-out active:scale-[0.96]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Issue Invoice</span>
                    </button>
                  )}

                  {inv.status !== 'PAID' && inv.status !== 'DRAFT' && Number(inv.balanceAmount || inv.totalAmount) > 0 && (
                    <button
                      onClick={() => handleOpenPaymentModal(inv)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-transform duration-150 ease-out active:scale-[0.96]"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}

                  {isPaid && (
                    <div className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fully Settled & Paid</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP INVOICES TABLE (Viewport >= md) */}
      {/* ========================================================================= */}
      <div className={`hidden md:block overflow-hidden rounded-[22px] border transition-ui ${
        isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
      }`}>
        <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Customer Invoicing Ledger</div>
            <div className="mt-0.5 text-[10px] text-slate-400">GST tax invoices, statutory splits, collections, and outstanding receivable balances</div>
          </div>
          <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{filteredInvoices.length} invoices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
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
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-mono">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No customer invoices found matching filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id || inv.invoiceNo} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 shrink-0 ${
                          isDarkMode 
                            ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30' 
                            : 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)] border border-[var(--accent-primary)]/20'
                        }`}>
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                            {inv.invoiceNo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      <div>{inv.customerName}</div>
                      {inv.customerGstin && (
                        <div className="text-[10px] text-slate-400 font-mono">GSTIN: {inv.customerGstin}</div>
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400 text-xs">
                      {onViewOrder ? (
                        <button
                          onClick={() => onViewOrder(inv.orderPo)}
                          className="hover:text-[var(--accent-primary)] hover:underline cursor-pointer flex items-center gap-1 font-bold"
                        >
                          <span>{inv.orderPo}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                      ) : (
                        inv.orderPo
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400 text-xs">
                      {inv.challanNo || '—'}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400 text-xs">
                      {inv.date}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-slate-400 text-xs">
                      ₹{Number(inv.taxableAmount || (inv.totalAmount ? inv.totalAmount / 1.18 : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-4 px-5 text-right font-bold font-mono text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-xs text-emerald-500">
                      ₹{Number(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-xs text-amber-500">
                      ₹{Number(inv.balanceAmount ?? (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : inv.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : inv.status === 'PARTIAL' || inv.status === 'PARTIALLY_PAID'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
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
                            className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold transition-ui cursor-pointer flex items-center gap-1 ${
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
                            className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-ui cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
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

      {/* ========================================================================= */}
      {/* ── GENERATE GST TAX INVOICE MODAL ──                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createInvoiceModal.isOpen}
        onClose={() => !isSubmitting && createInvoiceModal.close()}
        maxWidth="3xl"
        isDarkMode={isDarkMode}
        icon={<Receipt className="w-5 h-5 text-emerald-500" />}
        title="Generate GST Tax Invoice"
        subtitle="Pre-populated from outward dispatch challan with statutory intra/inter-state tax split"
      >
        <div className="space-y-4 text-xs font-sans">
          {modalError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Step 1: Select Source Dispatch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                1. Select Source Dispatch Challan (DISPATCHED / DELIVERED) *
              </label>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isDarkMode ? 'text-slate-400 border-slate-700 bg-slate-800' : 'text-slate-500 border-slate-200 bg-white'
              }`}>
                {dispatchesAwaitingInvoicing.length} Awaiting Invoicing
              </span>
            </div>

            {dispatchesAwaitingInvoicing.length === 0 && !selectedDispatch ? (
              <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
                isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
                <p className="font-bold font-mono text-xs">No dispatches currently awaiting invoicing</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Orders must complete Quality/PDI inspection and have an outward Delivery Challan issued before a statutory tax invoice can be generated.
                </p>
              </div>
            ) : (
              <select
                value={selectedDispatchNo}
                onChange={(e) => handleSelectDispatch(e.target.value)}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none cursor-pointer transition-ui ${
                  isDarkMode 
                    ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                }`}
              >
                <option value="">-- Choose an eligible Dispatch Challan --</option>
                {dispatchesAwaitingInvoicing.map(d => (
                  <option key={d.challanNo} value={d.challanNo}>
                    {d.challanNo} • PO: {d.orderPo} • Transporter: {d.transporter || 'Direct'} • Date: {d.date}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Auto-populated Invoice Metadata */}
          {selectedDispatch && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceNoInput}
                    onChange={(e) => setInvoiceNoInput(e.target.value)}
                    className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none transition-ui ${
                      isDarkMode 
                        ? 'bg-[#09090B] border-slate-700/80 text-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                        : 'bg-slate-50 border-slate-300 text-emerald-700 focus:border-emerald-500 shadow-xs'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                      isDarkMode 
                        ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Due Date *
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const base = new Date(invoiceDate || Date.now());
                          base.setDate(base.getDate() + 30);
                          setDueDate(base.toISOString().split('T')[0]);
                        }}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                      >
                        Net 30
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const base = new Date(invoiceDate || Date.now());
                          base.setDate(base.getDate() + 45);
                          setDueDate(base.toISOString().split('T')[0]);
                        }}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                      >
                        Net 45
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                      isDarkMode 
                        ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                    }`}
                  />
                </div>
              </div>

              {/* Customer and GSTIN Info Card */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-[#09090B] border-slate-800' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      <span>Bill To Customer</span>
                    </span>
                    <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{customerName}</div>
                    <div className="text-xs font-mono text-slate-400">GSTIN: <span className="font-bold text-emerald-500">{customerGstin}</span></div>
                  </div>

                  {/* Tax Classification Badge */}
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Tax Regime (State: {calculation.buyerStateCode || '27'})
                    </span>
                    <div>
                      {calculation.isIntraState ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          <Lock className="w-3 h-3" />
                          Intra-State (CGST 9% + SGST 9%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Lock className="w-3 h-3" />
                          Inter-State (IGST 18%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Invoice Line Items & HSN Allocation
                </label>
                <div className={`border rounded-2xl overflow-hidden overflow-x-auto ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`font-mono text-[10px] uppercase ${isDarkMode ? 'bg-[#09090B] text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                      <tr>
                        <th className="py-2.5 px-3.5">Item Code</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">HSN</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3.5 text-right">Taxable</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 bg-slate-900/40' : 'divide-slate-200 bg-white'}`}>
                      {invoiceLines.map((line, idx) => (
                        <tr key={idx} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-400">{line.itemCode}</td>
                          <td className={`py-2.5 px-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{line.itemDescription}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{line.hsnCode}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">{line.qty}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{line.unitPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-400">
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
                isDarkMode ? 'bg-[#09090B] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-2 font-mono text-xs">
                  <div className={`flex justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>Total Taxable Value:</span>
                    <span className="font-bold">₹{calculation.taxable.toFixed(2)}</span>
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
                  <div className={`pt-2.5 border-t flex justify-between text-sm font-bold ${
                    isDarkMode ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
                  }`}>
                    <span>Grand Invoice Total:</span>
                    <span className="text-emerald-500 font-mono text-base">₹{calculation.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-end gap-2.5 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => createInvoiceModal.close()}
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-ui ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSaveInvoice('DRAFT')}
                disabled={isSubmitting || !selectedDispatch}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-mono font-bold border cursor-pointer disabled:opacity-50 transition-ui ${
                  isDarkMode 
                    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' 
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs'
                }`}
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveInvoice('ISSUED')}
                disabled={isSubmitting || !selectedDispatch}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 transition-ui flex items-center justify-center gap-1.5 active:scale-[0.96]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Issue Invoice</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* ── DEDICATED RECORD PAYMENT MODAL ──                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={paymentModal.isOpen && Boolean(selectedInvoiceForPayment)}
        onClose={() => !isSubmittingPayment && paymentModal.close()}
        maxWidth="xl"
        isDarkMode={isDarkMode}
        icon={<CreditCard className="w-5 h-5 text-emerald-500" />}
        title="Record Payment Collection"
        subtitle={
          selectedInvoiceForPayment ? (
            <span className="font-mono text-xs">
              {selectedInvoiceForPayment.invoiceNo} • {selectedInvoiceForPayment.customerName}
            </span>
          ) : undefined
        }
      >
        {selectedInvoiceForPayment && (() => {
          const total = Number(selectedInvoiceForPayment.totalAmount || 0);
          const alreadyPaid = Number(selectedInvoiceForPayment.paidAmount || 0);
          const balance = Number(selectedInvoiceForPayment.balanceAmount !== undefined ? selectedInvoiceForPayment.balanceAmount : total);
          const newBalance = Math.max(0, balance - payAmount);
          const willBeFullyPaid = newBalance <= 0;

          return (
            <div className="space-y-4 text-xs font-sans">
              {paymentModalError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentModalError}</span>
                </div>
              )}

              {/* Commercial Summary Box */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-[#09090B] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                    <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Invoice</span>
                    <span className="text-xs font-bold mt-0.5 block truncate">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                    <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Realized</span>
                    <span className="text-xs font-bold text-emerald-500 mt-0.5 block truncate">₹{alreadyPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800 shadow-xs'}`}>
                    <span className="text-[10px] uppercase font-bold block">Pending Due</span>
                    <span className="text-xs font-bold mt-0.5 block truncate">₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* References */}
                <div className={`pt-2.5 border-t flex flex-wrap items-center justify-between text-[11px] font-mono ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                  <span>PO: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{selectedInvoiceForPayment.orderPo || 'Direct'}</strong></span>
                  {selectedInvoiceForPayment.challanNo && (
                    <span>Challan: <strong className={isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}>{selectedInvoiceForPayment.challanNo}</strong></span>
                  )}
                </div>
              </div>

              {/* Form Controls */}
              <form id="payment-form" onSubmit={handlePaymentSubmit} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Amount (₹) *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPayAmount(balance)}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-ui cursor-pointer ${
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
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-ui cursor-pointer ${
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
                      className={`h-11 w-full pl-8 pr-3.5 rounded-xl border font-mono font-bold text-sm outline-none transition-ui ${
                        isDarkMode 
                          ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Mode *
                    </label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className={`h-11 w-full px-3 rounded-xl border text-xs outline-none cursor-pointer transition-ui ${
                        isDarkMode 
                          ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
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
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Realization Date *
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className={`h-11 w-full px-3 rounded-xl border font-mono text-xs outline-none transition-ui ${
                        isDarkMode 
                          ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    UTR / Transaction Ref # *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-HDFC98234723 or CHQ-004521"
                    value={payRefNo}
                    onChange={(e) => setPayRefNo(e.target.value)}
                    className={`h-11 w-full px-3 rounded-xl border font-mono text-xs outline-none transition-ui ${
                      isDarkMode 
                        ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Settlement Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Current A/c • Verified with Bank Statement"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className={`h-11 w-full px-3 rounded-xl border text-xs outline-none transition-ui ${
                      isDarkMode 
                        ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                    }`}
                  />
                </div>

                {/* Live Settlement Outcome Preview */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between font-mono text-xs ${
                  willBeFullyPaid 
                    ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    {willBeFullyPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                    <span>Remaining Due: <strong>₹{newBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                    willBeFullyPaid 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    {willBeFullyPaid ? 'Fully Paid' : 'Partial Realization'}
                  </span>
                </div>
              </form>

              {/* Actions */}
              <div className={`pt-4 border-t flex items-center justify-end gap-2.5 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => paymentModal.close()}
                  disabled={isSubmittingPayment}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="payment-form"
                  disabled={isSubmittingPayment || payAmount <= 0 || payAmount > balance}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-ui active:scale-[0.96]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isSubmittingPayment ? 'Recording...' : `Settle ₹${payAmount.toLocaleString('en-IN')}`}</span>
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

    </div>
  );
};

export default InvoicesView;
