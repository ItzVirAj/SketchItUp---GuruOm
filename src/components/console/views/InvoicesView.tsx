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
  ExternalLink,
  Sparkles
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
      setShowCreateModal(true);
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

  // Filtered Invoices
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
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-md active:scale-95 transition-all"
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
        <section className={`overflow-hidden rounded-[24px] border ${isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'}`}>
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Customer Invoicing & Statutory Accounts Receivable
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{filteredInvoices.length} Tax Invoices</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                  Invoices & Billing Hub
                </h1>
                <span className="hidden font-mono text-[10px] font-semibold text-slate-400 xl:inline">
                  GST TAX INVOICING • RECEIVABLES AGING • PAYMENT DISBURSEMENTS
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Issue GST Tax Invoices against outward dispatch challans, auto-calculate CGST/SGST vs IGST, track receivables, and log payment receipts.
              </p>
            </div>

            {canCreateInvoice && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDispatchNo('');
                  setInvoiceLines([]);
                  setModalError(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 text-xs font-bold text-white shadow-lg shadow-[var(--accent-shadow)] transition hover:brightness-110 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Invoice</span>
              </button>
            )}
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            {[
              { label: 'Total Invoiced (Gross)', value: `₹${totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, detail: `${invoices.length} billed invoices`, icon: Receipt, tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]' },
              { label: 'Realized Collections', value: `₹${totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, detail: 'Received into accounts', icon: CreditCard, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10' },
              { label: 'Outstanding Receivables', value: `₹${totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, detail: `${overdueCount > 0 ? `${overdueCount} overdue` : 'Within credit limits'}`, icon: Clock, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
              { label: 'Awaiting Invoicing', value: `${dispatchesAwaitingInvoicing.length} Challans`, detail: 'Delivered ready to bill', icon: Truck, tone: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-500/10' },
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
              <Receipt className="h-4 w-4" />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Invoices' },
                { id: 'DRAFT', label: 'Drafts' },
                { id: 'ISSUED', label: 'Issued (Unpaid)' },
                { id: 'PARTIAL', label: 'Partial Dues' },
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
                placeholder="Search Inv #, PO #, Customer Name..."
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
            <span>Showing {filteredInvoices.length} of {invoices.length} customer invoices</span>
            <span>Statutory GST Billing & Accounts Receivable Ledger</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE INVOICE CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
            isDarkMode ? 'bg-[#171b24] border-white/[0.08] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
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
                className={`p-4 rounded-2xl border transition-all space-y-3.5 shadow-sm ${
                  isPaid
                    ? isDarkMode ? 'bg-[#171b24] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isDraft
                    ? isDarkMode ? 'bg-[#171b24] border-amber-500/30' : 'bg-amber-50/40 border-amber-200'
                    : isDarkMode ? 'bg-[#171b24] border-white/[0.08]' : 'bg-white border-slate-200'
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
                      className="flex-1 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Issue Invoice</span>
                    </button>
                  )}

                  {inv.status !== 'PAID' && inv.status !== 'DRAFT' && Number(inv.balanceAmount || inv.totalAmount) > 0 && (
                    <button
                      onClick={() => handleOpenPaymentModal(inv)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-[0.98]"
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
      <div className={`hidden md:block overflow-hidden rounded-[22px] border transition-all ${
        isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
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
                            className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in font-sans overflow-y-auto">
          <div className={`relative w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl transition-all overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Mobile Grab Handle */}
            <div className="pt-2.5 pb-0 block sm:hidden">
              <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto" />
            </div>

            {/* Modal Header */}
            <div className={`flex items-center justify-between p-4 sm:p-6 border-b shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400 shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold">Generate GST Tax Invoice</h2>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Pre-populated from outward dispatch challan with intra/inter-state tax split
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Invoice Number</label>
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
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Due Date (Net 30)</label>
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
                    <div className="border border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Item Code</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">HSN</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Rate</th>
                            <th className="py-2.5 px-3 text-right">Taxable</th>
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
            <div className={`p-4 sm:p-6 border-t shrink-0 flex flex-col sm:flex-row items-center justify-end gap-2.5 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-slate-700 text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveInvoice('DRAFT')}
                  disabled={isSubmitting || !selectedDispatch}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer disabled:opacity-50 transition-all"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInvoice('ISSUED')}
                  disabled={isSubmitting || !selectedDispatch}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Issue Invoice</span>
                </button>
              </div>
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in font-sans overflow-y-auto">
            <div className={`relative w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl transition-all overflow-hidden ${
              isDarkMode ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            }`}>
              {/* Mobile Grab Handle */}
              <div className="pt-2.5 pb-0 block sm:hidden">
                <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto" />
              </div>

              {/* Header */}
              <div className={`flex items-center justify-between p-4 sm:p-6 pb-3.5 border-b shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
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
                  className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                    isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {paymentModalError && (
                <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentModalError}</span>
                </div>
              )}

              {/* Form Body */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 font-sans text-xs">
                
                {/* Commercial Summary Box */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                    <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                      <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total</span>
                      <span className="text-xs font-bold mt-0.5 block truncate">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                      <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Paid</span>
                      <span className="text-xs font-bold text-emerald-500 mt-0.5 block truncate">₹{alreadyPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                      <span className="text-[10px] uppercase font-bold block">Balance</span>
                      <span className="text-xs font-bold mt-0.5 block truncate">₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  {/* References */}
                  <div className={`pt-2 border-t flex flex-wrap items-center justify-between text-[11px] font-mono ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                    <span>PO: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{selectedInvoiceForPayment.orderPo || 'Direct'}</strong></span>
                    {selectedInvoiceForPayment.challanNo && (
                      <span>Challan: <strong className={isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}>{selectedInvoiceForPayment.challanNo}</strong></span>
                    )}
                  </div>
                </div>

                {/* Form Controls */}
                <form id="payment-form" onSubmit={handlePaymentSubmit} className="space-y-3.5">
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
                        Realization Date *
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
                      UTR / Transaction Ref # *
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
                      Settlement Remarks
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
                      <span>Remaining: <strong>₹{newBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                      willBeFullyPaid 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}>
                      {willBeFullyPaid ? 'Fully Paid' : 'Partial'}
                    </span>
                  </div>
                </form>
              </div>

              {/* Actions */}
              <div className={`p-4 sm:p-6 pt-3 flex items-center justify-end gap-2.5 border-t shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isSubmittingPayment}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="payment-form"
                  disabled={isSubmittingPayment || payAmount <= 0 || payAmount > balance}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isSubmittingPayment ? 'Recording...' : `Settle ₹${payAmount.toLocaleString('en-IN')}`}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default InvoicesView;
