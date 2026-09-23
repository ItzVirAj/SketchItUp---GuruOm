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
  Check,
  Printer,
  Wallet,
  Smartphone,
  Zap
} from 'lucide-react';
import { 
  CustomerInvoice, 
  DispatchChallan, 
  CustomerOrder, 
  CustomerMaster, 
  MasterItem,
  CompanyProfile
} from '../../../types/console';
import { useCanPerformCta } from '../../../hooks/useCtaPermission';
import { 
  calculateGstTaxSplit, 
  getCurrentFinancialYear, 
  formatDocumentNumber 
} from '../../../utils/statutoryAccountingEngine';
import { Modal } from '../../common/Modal';
import { TaxInvoicePrint } from '../shared/TaxInvoicePrint';
import { printElementById } from '../../../utils/printDocument';

import { useUrlModal } from '../../../hooks/useUrlModal';
import { useRevealMore } from '../../../hooks/useRevealMore';

interface InvoicesViewProps {
  invoices: CustomerInvoice[];
  dispatches?: DispatchChallan[];
  orders?: CustomerOrder[];
  customers?: CustomerMaster[];
  masters?: MasterItem[];
  companyProfile?: CompanyProfile | null;
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
  companyProfile,
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
  const canPerformCta = useCanPerformCta();
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

  // Dedicated View Invoice Modal State (Print & PDF)
  const viewInvoiceModal = useUrlModal('view-invoice');
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<CustomerInvoice | null>(null);

  // Sync view invoice modal from URL params if reloaded or deep linked
  useEffect(() => {
    if (viewInvoiceModal.isOpen && viewInvoiceModal.params.invoiceNo) {
      const inv = invoices.find(i => i.invoiceNo === viewInvoiceModal.params.invoiceNo);
      if (inv && (!selectedInvoiceForView || selectedInvoiceForView.invoiceNo !== inv.invoiceNo)) {
        setSelectedInvoiceForView(inv);
      }
    }
  }, [viewInvoiceModal.isOpen, viewInvoiceModal.params.invoiceNo, invoices, selectedInvoiceForView]);

  const handleOpenViewInvoiceModal = (invoice: CustomerInvoice) => {
    setSelectedInvoiceForView(invoice);
    viewInvoiceModal.open({ invoiceNo: invoice.invoiceNo });
  };

  const handleCloseViewInvoiceModal = () => {
    viewInvoiceModal.close();
    setSelectedInvoiceForView(null);
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoiceForView) return;
    printElementById('tax-invoice-printable-document', `Tax Invoice - ${selectedInvoiceForView.invoiceNo}`);
  };

  const handlePdfInvoice = () => {
    if (!selectedInvoiceForView) return;
    printElementById('tax-invoice-printable-document', `Tax Invoice - ${selectedInvoiceForView.invoiceNo}`);
  };

  // Helper to determine if an invoice is settled
  const isInvoiceSettled = (inv: CustomerInvoice): boolean => {
    if (inv.status === 'PAID' || inv.status === 'SETTLED') return true;
    const balance = Number(inv.balanceAmount !== undefined ? inv.balanceAmount : (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)));
    return balance <= 0;
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

  // The invoice line-items table is read-only display (auto-populated from
  // the selected dispatch/order), so it's safe to page it the same way as
  // the other line-item views. Keyed by selectedDispatchNo so switching the
  // source dispatch resets back to page 1.
  const invoiceLinesPage = useRevealMore(invoiceLines, 20, selectedDispatchNo);

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
      <section className={`overflow-hidden rounded-2xl border transition-all ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
          : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
      }`}>
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl shrink-0 shadow-inner ${
              isDarkMode
                ? 'bg-white/10 text-white border border-white/15'
                : 'bg-white/20 text-white border border-white/30 backdrop-blur-md'
            }`}>
              <Receipt className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                  isDarkMode
                    ? 'bg-white/10 border border-white/15 text-white'
                    : 'bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Customer Billing & Accounts Receivable</span>
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isDarkMode
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/20 text-white border border-white/30 backdrop-blur-md'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>GST Statutory Regime Active</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-[26px] font-black tracking-tight text-white">
                Customer Invoices & Billing
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed font-normal mt-1 ${
                isDarkMode ? 'text-white/60' : 'text-blue-100/90'
              }`}>
                Issue statutory GST tax invoices against dispatch challans, verify CGST/SGST vs IGST splits, and track payment realization.
              </p>
            </div>
          </div>

          {canPerformCta('GENERATE_INVOICE') && (
            <button
              type="button"
              onClick={() => {
                setSelectedDispatchNo('');
                setInvoiceLines([]);
                setModalError(null);
                createInvoiceModal.open();
              }}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                  : 'bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>New Tax Invoice</span>
            </button>
          )}
        </div>

        {/* Integrated 4-Column Apple Metric Strip */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 border-t divide-y sm:divide-y-0 sm:divide-x ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 divide-white/10 backdrop-blur-md'
            : 'border-white/20 bg-white/[0.06] divide-white/15 backdrop-blur-sm'
        }`}>
          {[
            {
              label: 'Total Invoiced',
              value: `₹${totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              sub: `${invoices.length} invoices raised`,
              icon: Receipt,
              iconBg: 'bg-white text-blue-600 shadow-md shadow-black/10',
            },
            {
              label: 'Realized Collections',
              value: `₹${totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              sub: 'Settled to bank accounts',
              icon: CreditCard,
              iconBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30',
            },
            {
              label: 'Outstanding Dues',
              value: `₹${totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              sub: overdueCount > 0 ? `${overdueCount} overdue invoices` : 'Within credit terms',
              icon: Clock,
              iconBg: 'bg-rose-600 text-white shadow-md shadow-rose-500/30',
            },
            {
              label: 'Awaiting Invoicing',
              value: `${dispatchesAwaitingInvoicing.length}`,
              sub: 'Challans ready for billing',
              icon: Truck,
              iconBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/30',
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="p-4 sm:p-5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-mono uppercase tracking-wider font-bold ${
                    isDarkMode ? 'text-white/50' : 'text-blue-100/70'
                  }`}>
                    {m.label}
                  </span>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${m.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-[26px] font-black tracking-tight text-white tabular-nums my-0.5 leading-tight">
                  {m.value}
                </div>
                <div className={`text-[11px] font-medium truncate ${
                  isDarkMode ? 'text-white/50' : 'text-blue-100/80'
                }`}>
                  {m.sub}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ── 2. SEGMENTED FILTER & SEARCH TOOLBAR (2-TIER COMMAND DECK) ──          */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-3.5 space-y-3 transition-all ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
          : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
      }`}>
        {/* Tier 1: Segmented status tabs with count badges */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {[
              { id: 'ALL', label: 'All Invoices', count: invoices.length },
              { id: 'DRAFT', label: 'Drafts', count: invoices.filter(i => i.status === 'DRAFT').length },
              { id: 'ISSUED', label: 'Issued', count: invoices.filter(i => i.status === 'ISSUED').length },
              { id: 'PARTIAL', label: 'Partial', count: invoices.filter(i => i.status === 'PARTIAL' || i.status === 'PARTIALLY_PAID').length },
              { id: 'PAID', label: 'Paid', count: invoices.filter(i => i.status === 'PAID').length },
              { id: 'OVERDUE', label: 'Overdue', count: overdueCount },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'bg-[#155dfc] text-white shadow-sm'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                    isActive
                      ? isDarkMode ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'
                      : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier 2: Search Bar & Info */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/50 dark:border-white/5">
          <div className="relative flex-1 max-w-md">
            <Search className={`w-4 h-4 absolute left-3.5 top-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search invoice #, PO #, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`h-10 w-full pl-10 pr-16 rounded-full border text-xs font-medium outline-none transition-all ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-white placeholder:text-slate-500 focus:border-[#5B75F8] focus:ring-4 focus:ring-[#5B75F8]/15' 
                  : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#155dfc] focus:ring-4 focus:ring-[#155dfc]/15 shadow-xs'
              }`}
            />
            <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
              {searchTerm ? (
                <button 
                  type="button" 
                  onClick={() => setSearchTerm('')} 
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-white/10">
                  ⌘F
                </span>
              )}
            </div>
          </div>

          <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full border ${
            isDarkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
          }`}>
            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'Invoice' : 'Invoices'}
          </span>
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
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#5B75F8]" />
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
                className="p-4 rounded-3xl border space-y-3 shadow-md bg-white dark:bg-[#09090B] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-[#5B75F8]">
                      {inv.invoiceNo}
                    </span>
                    <h3 className="text-xs font-bold mt-0.5 text-slate-900 dark:text-white">
                      {inv.customerName}
                    </h3>
                    {inv.customerGstin && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">GSTIN: {inv.customerGstin}</div>
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border shrink-0 ${
                    isPaid
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : isDraft
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : isPartial
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPaid ? 'bg-emerald-500 dark:bg-emerald-400' : isDraft ? 'bg-amber-500 dark:bg-amber-400' : 'bg-blue-500 dark:bg-blue-400'
                    }`} />
                    <span>{inv.status}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span>PO:</span>
                    {onViewOrder ? (
                      <button
                        onClick={() => onViewOrder(inv.orderPo)}
                        className="text-[#5B75F8] hover:underline font-bold"
                      >
                        {inv.orderPo}
                      </button>
                    ) : (
                      <strong className="text-slate-700 dark:text-slate-200">{inv.orderPo}</strong>
                    )}
                  </div>
                  <div>
                    Challan: <strong className="text-cyan-600 dark:text-cyan-400">{inv.challanNo || '—'}</strong>
                  </div>
                  <div>
                    Date: <strong className="text-slate-700 dark:text-slate-200">{inv.date}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl border text-xs font-mono text-center bg-slate-50 dark:bg-black/60 border-slate-200 dark:border-white/10">
                  <div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block">Taxable</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      ₹{Number(inv.taxableAmount || (inv.totalAmount ? inv.totalAmount / 1.18 : 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block">Grand Total</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block">Balance Due</span>
                    <span className={`font-bold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      ₹{Number(inv.balanceAmount ?? (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  {inv.status === 'DRAFT' && onIssueInvoice && (
                    <button
                      onClick={async () => {
                        await onIssueInvoice(inv.invoiceNo);
                        setActionSuccessMsg(`Invoice ${inv.invoiceNo} issued successfully.`);
                        setTimeout(() => setActionSuccessMsg(null), 4000);
                      }}
                      className="flex-1 min-h-[38px] py-1.5 px-4 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-ui cursor-pointer active:scale-[0.96]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Issue Invoice</span>
                    </button>
                  )}

                  {isInvoiceSettled(inv) ? (
                    <button
                      onClick={() => handleOpenViewInvoiceModal(inv)}
                      className={`flex-1 min-h-[36px] py-1.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.96] whitespace-nowrap ${
                        isDarkMode
                          ? 'bg-white hover:bg-slate-100 text-slate-900 shadow-white/10'
                          : 'bg-[#181920] hover:bg-[#252730] text-white shadow-black/20'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Invoice</span>
                    </button>
                  ) : (
                    <>
                      {inv.status !== 'DRAFT' && canPerformCta('RECORD_PAYMENT') && (
                        <button
                          onClick={() => handleOpenPaymentModal(inv)}
                          className={`flex-1 min-h-[36px] py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.96] whitespace-nowrap ${
                            isDarkMode
                              ? 'bg-white hover:bg-slate-100 text-slate-900 shadow-white/10'
                              : 'bg-[#181920] hover:bg-[#252730] text-white shadow-black/20'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Record Payment</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenViewInvoiceModal(inv)}
                        className={`min-h-[36px] px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.96] shadow-2xs whitespace-nowrap ${
                          isDarkMode 
                            ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white' 
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                        }`}
                        title="View Invoice"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </>
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
      <div className={`hidden md:block overflow-hidden rounded-3xl border transition-all ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
          : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
      }`}>
        {/* Top Specular Highlight */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/70 dark:via-white/10 to-transparent" />

        <div className={`flex items-center justify-between border-b px-6 py-4 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <div>
            <div className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase font-mono">Customer Invoicing Ledger</div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-sans">Official GST tax invoices, statutory splits, and payment realization</div>
          </div>
          <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
            isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600 shadow-2xs'
          }`}>
            {filteredInvoices.length} invoices
          </span>
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
                <th className="py-4 px-5 text-right">Grand Total</th>
                <th className="py-4 px-5 text-right">Paid Amount</th>
                <th className="py-4 px-5 text-right">Balance Due</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-center whitespace-nowrap w-[240px]">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-mono text-xs">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#5B75F8]" />
                    <p>No customer invoices found matching filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id || inv.invoiceNo} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
                    <td className="py-4 px-5">
                      <div 
                        onClick={() => handleOpenViewInvoiceModal(inv)}
                        className="flex items-center gap-3 cursor-pointer group/inv"
                        title="Click to view full Tax Invoice"
                      >
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover/inv:scale-105 shadow-sm ${
                          isDarkMode 
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
                            : 'bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-xs'
                        }`}>
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black group-hover/inv:underline">
                            {inv.invoiceNo}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {inv.date || 'GST Invoice'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900 dark:text-white">{inv.customerName}</div>
                      {inv.customerGstin && (
                        <div className="text-[10px] font-mono mt-0.5 text-slate-500 dark:text-slate-400">GSTIN: {inv.customerGstin}</div>
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {onViewOrder ? (
                        <button
                          onClick={() => onViewOrder(inv.orderPo)}
                          className="text-[#5B75F8] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                        >
                          <span>{inv.orderPo}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                      ) : (
                        inv.orderPo
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
                      {inv.challanNo || '—'}
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {inv.date}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                      ₹{Number(inv.taxableAmount || (inv.totalAmount ? inv.totalAmount / 1.18 : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-xs text-slate-900 dark:text-white">
                      ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      ₹{Number(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-xs text-amber-600 dark:text-amber-400">
                      ₹{Number(inv.balanceAmount ?? (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : inv.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : inv.status === 'PARTIAL' || inv.status === 'PARTIALLY_PAID'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          inv.status === 'PAID' ? 'bg-emerald-500' : inv.status === 'DRAFT' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <span>{inv.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="w-[220px] mx-auto flex items-center justify-center gap-2">
                        {inv.status === 'DRAFT' ? (
                          <>
                            {onIssueInvoice ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await onIssueInvoice(inv.invoiceNo);
                                  setActionSuccessMsg(`Invoice ${inv.invoiceNo} issued successfully.`);
                                  setTimeout(() => setActionSuccessMsg(null), 4000);
                                }}
                                className="flex-1 h-8 px-3 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-500 dark:text-blue-400 border border-blue-500/30 text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.96] shadow-2xs"
                                title={`Issue Invoice ${inv.invoiceNo}`}
                              >
                                <Send className="w-3.5 h-3.5 shrink-0" />
                                <span>Issue</span>
                              </button>
                            ) : (
                              <div className={`flex-1 h-8 px-3 rounded-full border text-xs font-bold inline-flex items-center justify-center gap-1.5 select-none font-mono ${
                                isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                              }`}>
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span>Draft</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenViewInvoiceModal(inv)}
                              className={`w-[76px] h-8 px-2.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.96] shadow-2xs shrink-0 ${
                                isDarkMode 
                                  ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white' 
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                              }`}
                              title={`View Invoice ${inv.invoiceNo}`}
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span>View</span>
                            </button>
                          </>
                        ) : isInvoiceSettled(inv) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenViewInvoiceModal(inv)}
                              className={`flex-1 h-8 px-3 rounded-full border text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.96] shadow-2xs ${
                                isDarkMode 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15' 
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80'
                              }`}
                              title="Invoice fully paid • View invoice details"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                              <span>Realized</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenViewInvoiceModal(inv)}
                              className={`w-[76px] h-8 px-2.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.96] shadow-2xs shrink-0 ${
                                isDarkMode 
                                  ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white' 
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                              }`}
                              title={`View Invoice ${inv.invoiceNo}`}
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span>View</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {canPerformCta('RECORD_PAYMENT') ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(inv)}
                                className={`flex-1 h-8 px-3 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.96] ${
                                  isDarkMode
                                    ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-white/10'
                                    : 'bg-[#155dfc] hover:bg-blue-700 text-white shadow-blue-500/20'
                                }`}
                                title={`Record Payment for ${inv.invoiceNo}`}
                              >
                                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                <span>Record Payment</span>
                              </button>
                            ) : (
                              <div className={`flex-1 h-8 px-3 rounded-full border text-xs font-bold inline-flex items-center justify-center gap-1.5 select-none font-mono ${
                                isDarkMode ? 'bg-white/[0.03] border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                              }`}>
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span>Pending</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenViewInvoiceModal(inv)}
                              className={`w-[76px] h-8 px-2.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.96] shadow-2xs shrink-0 ${
                                isDarkMode 
                                  ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white' 
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                              }`}
                              title={`View Invoice ${inv.invoiceNo}`}
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span>View</span>
                            </button>
                          </>
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
      {/* ========================================================================= */}
      {/* ── 5. GENERATE GST TAX INVOICE MODAL (Apple HIG Design) ──                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createInvoiceModal.isOpen}
        onClose={() => !isSubmitting && createInvoiceModal.close()}
        maxWidth="3xl"
        isDarkMode={isDarkMode}
        icon={<Receipt className="w-5 h-5" />}
        title="Generate GST Tax Invoice"
        subtitle="Statutory outward billing pre-populated from cleared Delivery Challans (Rule 46 / Rule 55)"
      >
        <div className="space-y-4 text-xs font-sans">
          {modalError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-medium">{modalError}</span>
            </div>
          )}

          {/* Step 1: Select Source Dispatch */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-black/30 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center text-[11px] font-bold">
                  1
                </div>
                <label className={`text-xs font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Select Outward Dispatch Challan (Rule 55) *
                </label>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold">
                {dispatchesAwaitingInvoicing.length} Ready for Invoicing
              </span>
            </div>

            {dispatchesAwaitingInvoicing.length === 0 && !selectedDispatch ? (
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 text-center space-y-1.5">
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
              {/* Form Metadata Grid */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-black/30 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-[11px] font-bold">
                    2
                  </div>
                  <label className={`text-xs font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Statutory Invoice Details
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Invoice Number *
                    </label>
                    <input
                      type="text"
                      value={invoiceNoInput}
                      onChange={(e) => setInvoiceNoInput(e.target.value)}
                      className={`${inputClass} font-mono font-bold text-emerald-500 dark:text-emerald-400`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
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
                      <label className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
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
                          className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer active:scale-95"
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
                          className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer active:scale-95"
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
              </div>

              {/* Customer and GSTIN Info Card */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-black/30 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5 font-bold tracking-wider">
                      <Building2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      <span>Consignee & Bill-To Entity</span>
                    </span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{customerName}</div>
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span>GSTIN:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{customerGstin || 'Unregistered'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold tracking-wider">
                      GST Place of Supply (Code: {calculation.buyerStateCode || '27'})
                    </span>
                    <div>
                      {calculation.isIntraState ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-2xs">
                          <Lock className="w-3 h-3" />
                          <span>Intra-State Supply (CGST 9% + SGST 9%)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-2xs">
                          <Lock className="w-3 h-3" />
                          <span>Inter-State Supply (IGST 18%)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Table: Canonical Apple Ledger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className={`text-xs font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Invoice Line Items & Statutory HSN Allocation
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {invoiceLines.length} {invoiceLines.length === 1 ? 'Line Item' : 'Line Items'}
                  </span>
                </div>
                <div className={`border rounded-2xl overflow-hidden overflow-x-auto ${
                  isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
                }`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] select-none ${
                        isDarkMode ? 'border-white/[0.07] bg-black/40 text-slate-400' : 'border-slate-200 bg-slate-100/80 text-slate-500'
                      }`}>
                        <th className="py-3 px-4">Item Code</th>
                        <th className="py-3 px-3">Description</th>
                        <th className="py-3 px-3">HSN Code</th>
                        <th className="py-3 px-3 text-right">Quantity</th>
                        <th className="py-3 px-3 text-right">Unit Rate</th>
                        <th className="py-3 px-4 text-right">Taxable Value</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.05] bg-black/20' : 'divide-slate-200 bg-white'}`}>
                      {invoiceLinesPage.shown.map((line, idx) => (
                        <tr key={idx} className={isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-4 font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                            {line.itemCode}
                          </td>
                          <td className={`py-3 px-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {line.itemDescription}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400">
                            {line.hsnCode}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            {line.qty} NOS
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            ₹{line.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{(line.qty * line.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {invoiceLinesPage.hasMore && (
                        <tr>
                          <td colSpan={6} className="py-3 px-4 text-center">
                            <button
                              onClick={() => invoiceLinesPage.showMore()}
                              className={`px-4 py-2 rounded-xl border font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-ui ${
                                isDarkMode ? 'border-white/[0.08] bg-black/30 text-slate-400 hover:text-white hover:border-white/20' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300'
                              }`}
                            >
                              Show {Math.min(20, invoiceLinesPage.remaining)} more ({invoiceLinesPage.remaining} left)
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Totals Card */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-black/30 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Total Taxable Base Value:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{calculation.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {calculation.isIntraState ? (
                    <>
                      <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                        <span>Central GST (CGST 9.0%):</span>
                        <span>₹{calculation.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                        <span>State GST (SGST 9.0%):</span>
                        <span>₹{calculation.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>Integrated GST (IGST 18.0%):</span>
                      <span>₹{calculation.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 flex justify-between items-baseline text-sm font-bold text-slate-900 dark:text-white">
                    <span>Statutory Invoice Total:</span>
                    <span className={`font-mono text-lg font-extrabold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      ₹{calculation.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-end gap-2.5 font-sans ${
            isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => createInvoiceModal.close()}
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all active:scale-95 ${
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
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  isDarkMode 
                    ? 'border-white/10 bg-white/[0.04] hover:bg-white/10 text-slate-200' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveInvoice('ISSUED')}
                disabled={isSubmitting || !selectedDispatch}
                className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl active:scale-[0.96] text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 ${
                  isDarkMode
                    ? 'bg-white hover:bg-slate-100 text-slate-900 shadow-white/10'
                    : 'bg-[#181920] hover:bg-[#252730] text-white shadow-black/20'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Issue Invoice</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* ── 6. DEDICATED RECORD PAYMENT MODAL (Apple HIG Design) ──                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={paymentModal.isOpen && Boolean(selectedInvoiceForPayment)}
        onClose={() => !isSubmittingPayment && paymentModal.close()}
        maxWidth="2xl"
        isDarkMode={isDarkMode}
        icon={<Wallet className="w-5 h-5 text-[var(--accent-primary)]" />}
        title="Record Payment Realization"
        subtitle={
          selectedInvoiceForPayment ? (
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 shadow-2xs">
                {selectedInvoiceForPayment.invoiceNo}
              </span>
              <span className="text-xs text-slate-400 font-medium truncate max-w-[280px]">
                {selectedInvoiceForPayment.customerName}
              </span>
            </div>
          ) : undefined
        }
      >
        {selectedInvoiceForPayment && (() => {
          const total = Number(selectedInvoiceForPayment.totalAmount || 0);
          const alreadyPaid = Number(selectedInvoiceForPayment.paidAmount || 0);
          const balance = Number(selectedInvoiceForPayment.balanceAmount !== undefined ? selectedInvoiceForPayment.balanceAmount : total);
          const newBalance = Math.max(0, balance - payAmount);
          const willBeFullyPaid = newBalance <= 0;
          const currentPercent = total > 0 ? Math.min(100, Math.round((alreadyPaid / total) * 100)) : 0;
          const projectedPercent = total > 0 ? Math.min(100, Math.round(((alreadyPaid + payAmount) / total) * 100)) : 0;
          const activeSettlePercent = Math.max(0, Math.min(100 - currentPercent, projectedPercent - currentPercent));

          const paymentModes = [
            { id: 'NEFT_RTGS', label: 'NEFT / RTGS', badge: 'RBI Clearing', icon: Landmark },
            { id: 'UPI', label: 'Corporate UPI', badge: 'Instant VPA', icon: Smartphone },
            { id: 'IMPS', label: 'Instant IMPS', badge: '24x7 Realtime', icon: Zap },
            { id: 'CHEQUE', label: 'Cheque / DD', badge: 'Bank Voucher', icon: Receipt },
            { id: 'BANK_TRANSFER', label: 'Direct Transfer', badge: 'Ledger Credit', icon: Building2 },
            { id: 'CASH', label: 'Cash Deposit', badge: 'Direct Desk', icon: DollarSign },
          ];

          return (
            <div className="space-y-4 text-xs font-sans">
              {paymentModalError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5 shadow-2xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="font-medium">{paymentModalError}</span>
                </div>
              )}

              {/* 1. Commercial Summary Apple Bento Card */}
              <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all ${
                isDarkMode
                  ? 'bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent border-white/[0.12] shadow-inner'
                  : 'bg-gradient-to-br from-slate-50 via-white to-slate-100/70 border-slate-200/90 shadow-2xs'
              }`}>
                {/* Ambient radial lighting glow */}
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none bg-[var(--accent-primary)]/10" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full blur-3xl pointer-events-none bg-emerald-500/10" />

                {/* Top Badge Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-white/[0.08] dark:border-white/[0.08] text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                      isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      PO: <strong>{selectedInvoiceForPayment.orderPo || 'Direct'}</strong>
                    </span>
                    {selectedInvoiceForPayment.challanNo && (
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                        isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                      }`}>
                        Challan: <strong>{selectedInvoiceForPayment.challanNo}</strong>
                      </span>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    currentPercent === 100
                      ? isDarkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : currentPercent > 0
                        ? isDarkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
                        : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    {currentPercent === 100 ? 'Fully Cleared' : currentPercent > 0 ? `${currentPercent}% Realized` : 'Uncollected'}
                  </span>
                </div>

                {/* Bento Metrics 3-Col Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3.5 font-mono">
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isDarkMode ? 'bg-black/40 border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      <span>Total Invoice</span>
                      <Receipt className="w-3.5 h-3.5 opacity-60" />
                    </div>
                    <div className="text-sm sm:text-base font-extrabold font-mono mt-1.5 truncate text-slate-900 dark:text-white">
                      ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50/70 border-emerald-200/80 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                      <span>Realized to Date</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-sm sm:text-base font-extrabold font-mono mt-1.5 truncate text-emerald-600 dark:text-emerald-400">
                      ₹{alreadyPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isDarkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50/70 border-amber-200/80 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                      <span>Pending Due</span>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-sm sm:text-base font-extrabold font-mono mt-1.5 truncate text-amber-600 dark:text-amber-400">
                      ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                {/* Apple Multi-Segment Progress Track */}
                <div className="mt-3.5 pt-3 border-t border-white/[0.08] dark:border-white/[0.08] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Realization Progress</span>
                    <span>{projectedPercent}% of ₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-black/20 dark:bg-white/10">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${currentPercent}%` }}
                      title={`Realized: ₹${alreadyPaid.toLocaleString('en-IN')} (${currentPercent}%)`}
                    />
                    <div
                      className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                      style={{ width: `${activeSettlePercent}%` }}
                      title={`Now Settling: ₹${payAmount.toLocaleString('en-IN')} (${activeSettlePercent}%)`}
                    />
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <form id="payment-form" onSubmit={handlePaymentSubmit} className="space-y-4">
                
                {/* 2. Hero Payment Realization Amount Card */}
                <div className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                  isDarkMode ? 'bg-white/[0.03] border-white/[0.10]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Amount (₹) *
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPayAmount(balance)}
                        className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                          payAmount === balance 
                            ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-2xs'
                            : isDarkMode 
                              ? 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/10'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs'
                        }`}
                      >
                        ⚡ Full (₹{balance.toLocaleString('en-IN')})
                      </button>
                      {balance > 500 && (
                        <button
                          type="button"
                          onClick={() => setPayAmount(Math.round(balance * 0.75))}
                          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                            payAmount === Math.round(balance * 0.75)
                              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-2xs'
                              : isDarkMode 
                                ? 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/10'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs'
                          }`}
                        >
                          75%
                        </button>
                      )}
                      {balance > 100 && (
                        <button
                          type="button"
                          onClick={() => setPayAmount(Math.round(balance / 2))}
                          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                            payAmount === Math.round(balance / 2)
                              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-2xs'
                              : isDarkMode 
                                ? 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/10'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs'
                          }`}
                        >
                          50% Partial
                        </button>
                      )}
                      {balance > 1000 && (
                        <button
                          type="button"
                          onClick={() => setPayAmount(Math.round(balance * 0.25))}
                          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                            payAmount === Math.round(balance * 0.25)
                              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-2xs'
                              : isDarkMode 
                                ? 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/10'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs'
                          }`}
                        >
                          25%
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-xl sm:text-2xl text-slate-400 pointer-events-none select-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={balance}
                      step="0.01"
                      value={payAmount || ''}
                      onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border font-mono font-black text-xl sm:text-2xl outline-none transition-all ${
                        isDarkMode
                          ? 'bg-black/50 border-white/[0.12] text-emerald-400 focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/15'
                          : 'bg-white border-slate-300 text-emerald-600 focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/15 shadow-2xs'
                      }`}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono px-1">
                    <span className="text-slate-400">
                      Allowable limit: <strong>₹{balance.toLocaleString('en-IN')}</strong>
                    </span>
                    {payAmount > balance && (
                      <span className="text-rose-400 font-bold">
                        Exceeds balance by ₹{(payAmount - balance).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Payment Instrument Segmented Grid */}
                <div>
                  <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Payment Instrument Mode *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {paymentModes.map((mode) => {
                      const isSelected = payMode === mode.id;
                      const ModeIcon = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPayMode(mode.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative active:scale-[0.98] ${
                            isSelected
                              ? isDarkMode
                                ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-white ring-1 ring-[var(--accent-primary)]/30 shadow-[0_4px_16px_var(--accent-shadow)]'
                                : 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-slate-900 ring-1 ring-[var(--accent-primary)]/30 shadow-2xs'
                              : isDarkMode
                                ? 'bg-white/[0.02] border-white/[0.08] hover:border-white/20 text-slate-300 hover:bg-white/[0.04]'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-1.5 rounded-lg border shrink-0 ${
                                isSelected
                                  ? 'bg-[var(--accent-primary)] text-white border-transparent'
                                  : isDarkMode
                                    ? 'bg-white/5 border-white/10 text-slate-400'
                                    : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                                <ModeIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-[11px] block truncate leading-tight">{mode.label}</span>
                                <span className="text-[9px] font-mono opacity-70 block truncate">{mode.badge}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Date & UTR Reference 2-Col Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Realization Date *
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className={`${inputClass} pl-10 font-mono`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      UTR / Transaction Ref # *
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="e.g. UTR-HDFC98234723"
                        value={payRefNo}
                        onChange={(e) => setPayRefNo(e.target.value)}
                        className={`${inputClass} pl-10 font-mono`}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Settlement Remarks */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Settlement Remarks / Bank Ledger Note
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. HDFC Current A/c • Verified against bank statement"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
              </form>

              {/* 7. Modal Actions Footer */}
              <div className={`pt-4 border-t flex items-center justify-end gap-2.5 font-sans ${
                isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => paymentModal.close()}
                  disabled={isSubmittingPayment}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                    isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                {canPerformCta('RECORD_PAYMENT') && (
                  <button
                    type="submit"
                    form="payment-form"
                    disabled={isSubmittingPayment || payAmount <= 0 || payAmount > balance}
                    className={`px-5 py-2.5 rounded-xl active:scale-[0.97] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-all ${
                      isDarkMode
                        ? 'bg-white hover:bg-slate-100 text-slate-900 shadow-white/10'
                        : 'bg-[#181920] hover:bg-[#252730] text-white shadow-black/20'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isSubmittingPayment ? 'Recording Settlement...' : `Confirm & Settle ₹${payAmount.toLocaleString('en-IN')}`}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ========================================================================= */}
      {/* VIEW TAX INVOICE MODAL (JobCard Print Page Design UI) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={viewInvoiceModal.isOpen && !!selectedInvoiceForView}
        onClose={handleCloseViewInvoiceModal}
        maxWidth="5xl"
        isDarkMode={isDarkMode}
        icon={<Receipt className="w-5 h-5 text-[var(--accent-primary)]" />}
        title={
          <div className="flex items-center gap-3">
            <span>Tax Invoice: {selectedInvoiceForView?.invoiceNo}</span>
            {selectedInvoiceForView && (
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                isInvoiceSettled(selectedInvoiceForView)
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {isInvoiceSettled(selectedInvoiceForView) ? 'PAID & SETTLED' : selectedInvoiceForView.status}
              </span>
            )}
          </div>
        }
        subtitle={
          selectedInvoiceForView ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span>Customer: <strong className="text-slate-900 dark:text-white">{selectedInvoiceForView.customerName}</strong></span>
              <span>•</span>
              <span>PO: <strong className="font-mono text-[#5B75F8]">{selectedInvoiceForView.orderPo}</strong></span>
              {selectedInvoiceForView.dispatchNo && (
                <>
                  <span>•</span>
                  <span>Challan: <strong className="font-mono text-cyan-400">{selectedInvoiceForView.dispatchNo}</strong></span>
                </>
              )}
            </div>
          ) : undefined
        }
        headerRight={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintInvoice}
              className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-semibold transition-ui cursor-pointer ${
                isDarkMode
                  ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Print Tax Invoice"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handlePdfInvoice}
              className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-semibold transition-ui cursor-pointer ${
                isDarkMode
                  ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Download / Save as PDF"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>PDF</span>
            </button>
          </div>
        }
      >
        {selectedInvoiceForView && (() => {
          const matchedOrder = orders.find(o => o.poNo === selectedInvoiceForView.orderPo || o.id === selectedInvoiceForView.orderPo);
          const matchedDispatch = dispatches.find(d => d.challanNo === selectedInvoiceForView.dispatchNo || d.id === selectedInvoiceForView.dispatchNo);
          const matchedCustomer = customers.find(c => 
            c.customerName?.toLowerCase() === selectedInvoiceForView.customerName?.toLowerCase() || 
            c.id === matchedOrder?.customerId
          );

          return (
            <div className="space-y-4">
              {/* Document Actions & Summary Header */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                isDarkMode ? 'bg-black/30 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Statutory GST Tax Invoice (Rule 46) • Standard Industrial Layout</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-400">Grand Total:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹{Number(selectedInvoiceForView.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Printable Tax Invoice Container using Jobcard Print page design UI */}
              <div 
                id="tax-invoice-printable-document" 
                className="w-full bg-white text-slate-900 rounded-2xl p-3 sm:p-6 shadow-sm overflow-x-auto"
              >
                <TaxInvoicePrint
                  invoice={selectedInvoiceForView}
                  order={matchedOrder}
                  dispatch={matchedDispatch}
                  customer={matchedCustomer}
                  companyProfile={companyProfile}
                />
              </div>
            </div>
          );
        })()}
      </Modal>

    </div>
  );
};

export default InvoicesView;
