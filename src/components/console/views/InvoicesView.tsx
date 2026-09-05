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
  BadgePercent, 
  Trash2,
  Check
} from 'lucide-react';
import { 
  CustomerInvoice, 
  DispatchChallan, 
  CustomerOrder, 
  CustomerMaster, 
  MasterItem 
} from '../../../types/console';
import { useCtaPermission } from '../../../hooks/useCtaPermission';
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
  onDeleteInvoice?: (invoiceNo: string) => Promise<void> | void;
  onClearAllInvoices?: () => Promise<void> | void;
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
  onDeleteInvoice,
  onClearAllInvoices,
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
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return (b.invoiceNo || '').localeCompare(a.invoiceNo || '');
    });

  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.totalAmount || 0), 0);
  const totalReceived = invoices.reduce((acc, i) => acc + Number(i.paidAmount || 0), 0);
  const totalBalance = invoices.reduce((acc, i) => acc + Number(i.balanceAmount || 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE' || (Number(i.balanceAmount) > 0 && i.status === 'PARTIAL')).length;

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
              <Receipt className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30">
                  Customer Billing & Accounts Receivable
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>GST Statutory Regime Active</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Customer Invoices & Billing
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Issue statutory GST tax invoices against dispatch challans, verify CGST/SGST vs IGST splits, and track payment realization.
              </p>
            </div>
          </div>

          {useCtaPermission('GENERATE_INVOICE') && (
            <button
              type="button"
              onClick={() => {
                setSelectedDispatchNo('');
                setInvoiceLines([]);
                setModalError(null);
                createInvoiceModal.open();
              }}
              className="px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] active:scale-[0.98] text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition-all self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>New Tax Invoice</span>
            </button>
          )}
        </div>

        {/* Apple 4-Column Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {[
            {
              label: 'Total Invoiced',
              value: `₹${totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              sub: `${invoices.length} invoices raised`,
              icon: Receipt,
              tone: isDarkMode ? 'text-white' : 'text-slate-900',
              iconBg: 'bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20',
            },
            {
              label: 'Realized Collections',
              value: `₹${totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              sub: 'Settled to bank accounts',
              icon: CreditCard,
              tone: 'text-emerald-400',
              iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            },
            {
              label: 'Outstanding Dues',
              value: `₹${totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              sub: overdueCount > 0 ? `${overdueCount} overdue invoices` : 'Within credit terms',
              icon: Clock,
              tone: overdueCount > 0 ? 'text-rose-400' : 'text-amber-400',
              iconBg: overdueCount > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
            },
            {
              label: 'Awaiting Invoicing',
              value: `${dispatchesAwaitingInvoicing.length}`,
              sub: 'Challans ready for billing',
              icon: Truck,
              tone: 'text-purple-400',
              iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
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
                  {m.sub}
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
              { id: 'ALL', label: 'All Invoices' },
              { id: 'DRAFT', label: 'Drafts' },
              { id: 'ISSUED', label: 'Issued' },
              { id: 'PARTIAL', label: 'Partial' },
              { id: 'PAID', label: 'Paid' },
              { id: 'OVERDUE', label: 'Overdue' },
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
              placeholder="Search invoice #, PO #, customer..."
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
      {/* ── 3. MOBILE INVOICE CARDS (< md) ──                                      */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3.5">
        {filteredInvoices.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border text-xs font-mono ${
            isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#007AFF]" />
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
                className={`p-4 rounded-3xl border space-y-3 shadow-md ${
                  isDarkMode ? 'bg-[#09090B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-[#007AFF]">
                      {inv.invoiceNo}
                    </span>
                    <h3 className="text-xs font-bold mt-0.5">
                      {inv.customerName}
                    </h3>
                    {inv.customerGstin && (
                      <div className="text-[10px] text-slate-400 font-mono">GSTIN: {inv.customerGstin}</div>
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border shrink-0 ${
                    isPaid
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : isDraft
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : isPartial
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPaid ? 'bg-emerald-400' : isDraft ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                    <span>{inv.status}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <span>PO:</span>
                    {onViewOrder ? (
                      <button
                        onClick={() => onViewOrder(inv.orderPo)}
                        className="text-[#007AFF] hover:underline font-bold"
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

                <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-2xl border text-xs font-mono text-center ${
                  isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Taxable</span>
                    <span className="font-bold">
                      ₹{Number(inv.taxableAmount || (inv.totalAmount ? inv.totalAmount / 1.18 : 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Grand Total</span>
                    <span className="font-bold text-white dark:text-white">
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

                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  {inv.status === 'DRAFT' && onIssueInvoice && (
                    <button
                      onClick={async () => {
                        await onIssueInvoice(inv.invoiceNo);
                        setActionSuccessMsg(`Invoice ${inv.invoiceNo} issued successfully.`);
                        setTimeout(() => setActionSuccessMsg(null), 4000);
                      }}
                      className="flex-1 py-2 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Issue Invoice</span>
                    </button>
                  )}

                  {inv.status !== 'PAID' && inv.status !== 'DRAFT' && Number(inv.balanceAmount || inv.totalAmount) > 0 && useCtaPermission('RECORD_PAYMENT') && (
                    <button
                      onClick={() => handleOpenPaymentModal(inv)}
                      className="flex-1 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-[0.98]"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}

                  {isPaid && (
                    <div className="w-full py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fully Paid</span>
                    </div>
                  )}

                  {onDeleteInvoice && (
                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete invoice ${inv.invoiceNo}?`)) {
                          await onDeleteInvoice(inv.invoiceNo);
                          setActionSuccessMsg(`Invoice ${inv.invoiceNo} deleted.`);
                          setTimeout(() => setActionSuccessMsg(null), 4000);
                        }
                      }}
                      className="p-2 rounded-full border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all"
                      title={`Delete invoice ${inv.invoiceNo}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ── 4. DESKTOP INVOICES TABLE (≥ md) ──                                    */}
      {/* ========================================================================= */}
      <div className={`hidden md:block rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-[#09090B] border-white/10 text-white' : 'bg-white border-slate-200/80 text-slate-900'
      }`}>
        <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 px-6 py-4">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Customer Invoicing Ledger</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Official GST tax invoices, statutory splits, and payment realization</p>
          </div>
          <div className="flex items-center gap-2">
            {filteredInvoices.length > 0 && onClearAllInvoices && (
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete ALL customer invoices from the table?')) {
                    await onClearAllInvoices();
                    setActionSuccessMsg('All customer invoices deleted successfully.');
                    setTimeout(() => setActionSuccessMsg(null), 4000);
                  }
                }}
                className="px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                title="Delete all invoices from table"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete All Entries</span>
              </button>
            )}
            <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] font-semibold text-slate-400">
              {filteredInvoices.length} invoices
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-semibold uppercase tracking-wider text-[10px] ${
                isDarkMode ? 'border-white/10 bg-black/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}>
                <th className="py-3.5 px-5">Invoice #</th>
                <th className="py-3.5 px-5">Customer Name</th>
                <th className="py-3.5 px-5">Order PO</th>
                <th className="py-3.5 px-5">Challan Ref</th>
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5 text-right">Taxable</th>
                <th className="py-3.5 px-5 text-right">Grand Total</th>
                <th className="py-3.5 px-5 text-right">Paid Amount</th>
                <th className="py-3.5 px-5 text-right">Balance Due</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-mono">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#007AFF]" />
                    <p>No customer invoices found matching filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id || inv.invoiceNo} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.025]' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 shrink-0">
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono font-bold text-xs text-[#007AFF]">
                          {inv.invoiceNo}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-white dark:text-white">{inv.customerName}</div>
                      {inv.customerGstin && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">GSTIN: {inv.customerGstin}</div>
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-300 text-xs">
                      {onViewOrder ? (
                        <button
                          onClick={() => onViewOrder(inv.orderPo)}
                          className="text-[#007AFF] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                        >
                          <span>{inv.orderPo}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                      ) : (
                        inv.orderPo
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-cyan-400 text-xs font-semibold">
                      {inv.challanNo || '—'}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400 text-xs">
                      {inv.date}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-slate-400 text-xs">
                      ₹{Number(inv.taxableAmount || (inv.totalAmount ? inv.totalAmount / 1.18 : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-xs text-white dark:text-white">
                      ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-xs text-emerald-400">
                      ₹{Number(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-xs text-amber-400">
                      ₹{Number(inv.balanceAmount ?? (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : inv.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : inv.status === 'PARTIAL' || inv.status === 'PARTIALLY_PAID'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          inv.status === 'PAID' ? 'bg-emerald-400' : inv.status === 'DRAFT' ? 'bg-amber-400' : 'bg-blue-400'
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
                            className="px-3 py-1.5 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            <Send className="w-3 h-3" />
                            <span>Issue</span>
                          </button>
                        )}
                        {inv.status !== 'PAID' && inv.status !== 'DRAFT' && Number(inv.balanceAmount || inv.totalAmount) > 0 && useCtaPermission('RECORD_PAYMENT') && (
                          <button
                            onClick={() => handleOpenPaymentModal(inv)}
                            className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        )}
                        {onDeleteInvoice && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Delete invoice ${inv.invoiceNo}?`)) {
                                await onDeleteInvoice(inv.invoiceNo);
                                setActionSuccessMsg(`Invoice ${inv.invoiceNo} deleted.`);
                                setTimeout(() => setActionSuccessMsg(null), 4000);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title={`Delete invoice ${inv.invoiceNo}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      {/* ── 5. GENERATE GST TAX INVOICE MODAL ──                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createInvoiceModal.isOpen}
        onClose={() => !isSubmitting && createInvoiceModal.close()}
        maxWidth="3xl"
        isDarkMode={isDarkMode}
        icon={<Receipt className="w-5 h-5 text-[#007AFF]" />}
        title="Generate GST Tax Invoice"
        subtitle="Pre-populated from outward dispatch challan with statutory intra/inter-state tax split"
      >
        <div className="space-y-4 text-xs font-sans">
          {modalError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Step 1: Select Source Dispatch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                1. Select Outward Dispatch Challan (Rule 55) *
              </label>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-white/10 bg-black/40 text-slate-400">
                {dispatchesAwaitingInvoicing.length} Awaiting Invoicing
              </span>
            </div>

            {dispatchesAwaitingInvoicing.length === 0 && !selectedDispatch ? (
              <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 text-center space-y-1.5">
                <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
                <p className="font-bold text-xs">No dispatches currently awaiting invoicing</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Orders must complete Quality/PDI inspection and have an outward Delivery Challan issued before a statutory tax invoice can be generated.
                </p>
              </div>
            ) : (
              <select
                value={selectedDispatchNo}
                onChange={(e) => handleSelectDispatch(e.target.value)}
                className={`${inputClass} font-mono cursor-pointer`}
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
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceNoInput}
                    onChange={(e) => setInvoiceNoInput(e.target.value)}
                    className={`${inputClass} font-mono font-bold text-emerald-400`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
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
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
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
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                      >
                        Net 45
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              {/* Customer and GSTIN Info Card */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#007AFF]" />
                      <span>Bill To Customer</span>
                    </span>
                    <div className="text-sm font-bold text-white dark:text-white">{customerName}</div>
                    <div className="text-xs font-mono text-slate-400">GSTIN: <span className="font-bold text-emerald-400">{customerGstin}</span></div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Tax Regime (State: {calculation.buyerStateCode || '27'})
                    </span>
                    <div>
                      {calculation.isIntraState ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Lock className="w-3 h-3" />
                          Intra-State (CGST 9% + SGST 9%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
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
                <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Invoice Line Items & HSN Allocation
                </label>
                <div className="border border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`font-mono text-[10px] uppercase ${isDarkMode ? 'bg-black/60 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                      <tr>
                        <th className="py-2.5 px-3.5">Item Code</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">HSN</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3.5 text-right">Taxable</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/5 bg-black/40' : 'divide-slate-200 bg-white'}`}>
                      {invoiceLines.map((line, idx) => (
                        <tr key={idx}>
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
                isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Taxable Value:</span>
                    <span className="font-bold text-white dark:text-white">₹{calculation.taxable.toFixed(2)}</span>
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
                  <div className="pt-2.5 border-t border-white/10 flex justify-between text-sm font-bold text-white dark:text-white">
                    <span>Grand Invoice Total:</span>
                    <span className="text-emerald-400 font-mono text-base">₹{calculation.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-2.5 font-sans">
            <button
              type="button"
              onClick={() => createInvoiceModal.close()}
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSaveInvoice('DRAFT')}
                disabled={isSubmitting || !selectedDispatch}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-semibold border cursor-pointer disabled:opacity-50 transition-all ${
                  isDarkMode 
                    ? 'border-white/10 bg-white/[0.04] hover:bg-white/10 text-slate-200' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs'
                }`}
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveInvoice('ISSUED')}
                disabled={isSubmitting || !selectedDispatch}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Issue invoice</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* ── 6. DEDICATED RECORD PAYMENT MODAL ──                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={paymentModal.isOpen && Boolean(selectedInvoiceForPayment)}
        onClose={() => !isSubmittingPayment && paymentModal.close()}
        maxWidth="xl"
        isDarkMode={isDarkMode}
        icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
        title="Record Payment Realization"
        subtitle={
          selectedInvoiceForPayment ? (
            <span className="font-mono text-xs text-slate-400">
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
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{paymentModalError}</span>
                </div>
              )}

              {/* Commercial Summary Box */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200 shadow-xs'}`}>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Invoice</span>
                    <span className="text-xs font-bold text-white dark:text-white mt-0.5 block truncate">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200 shadow-xs'}`}>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Realized</span>
                    <span className="text-xs font-bold text-emerald-400 mt-0.5 block truncate">₹{alreadyPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                    <span className="text-[10px] uppercase font-semibold block">Pending Due</span>
                    <span className="text-xs font-bold mt-0.5 block truncate">₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>PO: <strong className="text-white">{selectedInvoiceForPayment.orderPo || 'Direct'}</strong></span>
                  {selectedInvoiceForPayment.challanNo && (
                    <span>Challan: <strong className="text-cyan-400">{selectedInvoiceForPayment.challanNo}</strong></span>
                  )}
                </div>
              </div>

              {/* Form Controls */}
              <form id="payment-form" onSubmit={handlePaymentSubmit} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Amount (₹) *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPayAmount(balance)}
                        className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                          payAmount === balance 
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        ⚡ Full (₹{balance.toLocaleString('en-IN')})
                      </button>
                      {balance > 100 && (
                        <button
                          type="button"
                          onClick={() => setPayAmount(Math.round(balance / 2))}
                          className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                            payAmount === Math.round(balance / 2)
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          50% Partial
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 font-mono font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      className={`${inputClass} pl-8 font-mono font-bold text-sm`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Mode *
                    </label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
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
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Realization Date *
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className={`${inputClass} font-mono`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    UTR / Transaction Ref # *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-HDFC98234723 or CHQ-004521"
                    value={payRefNo}
                    onChange={(e) => setPayRefNo(e.target.value)}
                    className={`${inputClass} font-mono`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Settlement Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Current A/c • Verified with Bank Statement"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Live Settlement Outcome Preview */}
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between font-mono text-xs ${
                  willBeFullyPaid 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-black/40 border-white/10 text-slate-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {willBeFullyPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                    <span>Remaining Due: <strong className="text-white">₹{newBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] uppercase border ${
                    willBeFullyPaid 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {willBeFullyPaid ? 'Fully Paid' : 'Partial Realization'}
                  </span>
                </div>
              </form>

              {/* Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5 font-sans">
                <button
                  type="button"
                  onClick={() => paymentModal.close()}
                  disabled={isSubmittingPayment}
                  className={`px-4 py-2.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                    isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                {useCtaPermission('RECORD_PAYMENT') && (
                  <button
                    type="submit"
                    form="payment-form"
                    disabled={isSubmittingPayment || payAmount <= 0 || payAmount > balance}
                    className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/25 disabled:opacity-50 transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isSubmittingPayment ? 'Recording...' : `Settle ₹${payAmount.toLocaleString('en-IN')}`}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

    </div>
  );
};

export default InvoicesView;
