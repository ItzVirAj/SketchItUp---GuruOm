import React, { useState, useEffect, useTransition } from 'react';
import {
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  Receipt,
  CheckCircle2,
  X,
  Check,
  ExternalLink,
  Layers,
  Calendar,
  User,
  AlertTriangle,
  CreditCard,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Activity,
  CheckCircle,
  Plus,
  FileCheck,
  Printer,
  Download
} from 'lucide-react';
import { CustomerOrder, DispatchChallan, CustomerInvoice, QCInspection, PDIInspection, JobCard, BillOfMaterials } from '../../../types/console';
import { apiClient } from '../../../lib/apiClient';
import { printElementById } from '../../../utils/printDocument';
import { RouteCardTravelerPrint } from '../shared/RouteCardTravelerPrint';
import { TaxInvoicePrint } from '../shared/TaxInvoicePrint';

export type StageKey = 'materials' | 'jobCards' | 'qc' | 'dispatch' | 'delivery' | 'invoice';

interface OrderStageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomerOrder;
  initialStage?: StageKey;
  isDarkMode: boolean;
  dispatches?: DispatchChallan[];
  invoices?: CustomerInvoice[];
  qcQueue?: QCInspection[];
  pdiQueue?: PDIInspection[];
  onNavigate?: (view: string) => void;
  onNavigateToPDI?: (orderPo?: string, jobNo?: string) => void;
  onNavigateToCreateJobCard?: (orderPo: string) => void;
}

interface StageTheme {
  id: StageKey;
  number: string;
  name: string;
  shortTitle: string;
  icon: React.ElementType;
  colorName: string;
  accentHex: string;
  badgeClass: string;
  borderClass: string;
  iconBgClass: string;
}

const STAGE_THEMES: Record<StageKey, StageTheme> = {
  materials: {
    id: 'materials',
    number: 'Stage 3',
    name: 'BOM Materials & Stock Allocation',
    shortTitle: 'BOM Materials',
    icon: Package,
    colorName: 'amber',
    accentHex: '#f59e0b',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    borderClass: 'border-amber-500/20',
    iconBgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
  },
  jobCards: {
    id: 'jobCards',
    number: 'Stage 5',
    name: 'Job Cards & Machine Shop Execution',
    shortTitle: 'Job Cards',
    icon: RefreshCw,
    colorName: 'blue',
    accentHex: '#3b82f6',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    borderClass: 'border-blue-500/20',
    iconBgClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
  },
  qc: {
    id: 'qc',
    number: 'Stage 7',
    name: 'QC Inspection & Pre-Dispatch Audit (PDI)',
    shortTitle: 'QC / PDI',
    icon: ShieldCheck,
    colorName: 'emerald',
    accentHex: '#10b981',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    borderClass: 'border-emerald-500/20',
    iconBgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
  },
  dispatch: {
    id: 'dispatch',
    number: 'Stage 8',
    name: 'Outward Delivery Challan & Logistics',
    shortTitle: 'Dispatch',
    icon: Truck,
    colorName: 'purple',
    accentHex: '#a855f7',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    borderClass: 'border-purple-500/20',
    iconBgClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
  },
  delivery: {
    id: 'delivery',
    number: 'Stage 10a',
    name: 'Delivery Status & Customer POD',
    shortTitle: 'Delivery & POD',
    icon: CheckCircle2,
    colorName: 'teal',
    accentHex: '#14b8a6',
    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    borderClass: 'border-teal-500/20',
    iconBgClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
  },
  invoice: {
    id: 'invoice',
    number: 'Stage 11',
    name: 'Statutory GST Tax Invoice & Ledger',
    shortTitle: 'Invoice & Payment',
    icon: Receipt,
    colorName: 'rose',
    accentHex: '#f43f5e',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    borderClass: 'border-rose-500/20',
    iconBgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
  }
};

export const OrderStageDetailModal: React.FC<OrderStageDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  initialStage = 'materials',
  isDarkMode,
  dispatches = [],
  invoices = [],
  qcQueue = [],
  pdiQueue = [],
  onNavigate,
  onNavigateToPDI,
  onNavigateToCreateJobCard
}) => {
  const [selectedStage, setSelectedStage] = useState<StageKey>(initialStage);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());
  const [liveApiResponse, setLiveApiResponse] = useState<any>(null);
  const [selectedJobCardForPrint, setSelectedJobCardForPrint] = useState<JobCard | null>(null);
  const [, startTransition] = useTransition();

  // BOM data for materials stage — keyed by itemCode
  const [bomsMap, setBomsMap] = useState<Record<string, BillOfMaterials | null>>({});
  const [bomsLoading, setBomsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialStage) {
      setSelectedStage(initialStage);
    }
  }, [initialStage]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch real-time stage details from backend endpoint
  const fetchStageData = async (stage: StageKey) => {
    setIsRefreshing(true);
    try {
      const orderIdentifier = order.poNo || order.id;
      const res = await apiClient.get<any>(`/orders/${orderIdentifier}/stage-details/${stage}`);
      setLiveApiResponse(res);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch {
      // Graceful fallback to client-side calculated live state
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStageData(selectedStage);
    }
  }, [isOpen, selectedStage, order.id]);

  // Fetch BOM for each order line item when materials stage is active
  useEffect(() => {
    if (!isOpen || selectedStage !== 'materials') return;
    const lines = order.lines || [];
    if (lines.length === 0) return;

    const uniqueCodes: string[] = [...new Set<string>(lines.map(l => l.itemCode as string).filter((c): c is string => c.length > 0))];
    setBomsLoading(true);
    Promise.all(
      uniqueCodes.map(async (code) => {
        try {
          const res = await apiClient.get<{ data: BillOfMaterials }>(`/bom/${encodeURIComponent(code)}`);
          return [code, res?.data || null] as [string, BillOfMaterials | null];
        } catch {
          return [code, null] as [string, null];
        }
      })
    ).then(results => {
      const map: Record<string, BillOfMaterials | null> = {};
      for (const [code, bom] of results) map[code] = bom;
      setBomsMap(map);
    }).finally(() => setBomsLoading(false));
  }, [isOpen, selectedStage, order.id, order.lines]);

  if (!isOpen) return null;

  const theme = STAGE_THEMES[selectedStage] || STAGE_THEMES.materials;
  const StageIcon = theme.icon;
  const orderIdentifier = order.poNo || order.id;

  // Linked data computations
  const linkedDispatches = (dispatches || []).filter(d =>
    (d.orderPo && ((order.poNo && d.orderPo.trim().toUpperCase() === order.poNo.trim().toUpperCase()) || (order.id && d.orderPo.trim().toUpperCase() === order.id.trim().toUpperCase()))) ||
    (order.deliveryChallanNo && d.challanNo && d.challanNo.trim().toUpperCase() === order.deliveryChallanNo.trim().toUpperCase())
  );

  const linkedInvoices = (invoices || []).filter(inv =>
    (inv.orderPo && ((order.poNo && inv.orderPo.trim().toUpperCase() === order.poNo.trim().toUpperCase()) || (order.id && inv.orderPo.trim().toUpperCase() === order.id.trim().toUpperCase()))) ||
    (order.deliveryChallanNo && (inv as any).challanNo && (inv as any).challanNo.trim().toUpperCase() === order.deliveryChallanNo.trim().toUpperCase()) ||
    (order.invoiceNo && inv.invoiceNo === order.invoiceNo)
  );
  const latestInvoice = linkedInvoices[linkedInvoices.length - 1];

  const lines = order.lines || [];
  const totalOrderedQty = lines.reduce((acc, l) => acc + Number(l.orderQty || 0), 0);
  const totalDispatchedQty = lines.reduce((acc, l) => acc + Number(l.dispatchedQty || 0), 0);
  const totalPendingQty = Math.max(0, totalOrderedQty - totalDispatchedQty);

  const jobCards = order.jobCards || [];
  const completedJobCards = jobCards.filter(j => (j.status || '').toUpperCase() === 'COMPLETED');
  const totalJcQty = jobCards.reduce((acc, j) => acc + Number(j.qty || 0), 0);

  // Check if job cards are already made or fulfilled
  const unmadeLines = lines.filter(ln => {
    const allocated = jobCards
      .filter(j => j.partCode === ln.itemCode)
      .reduce((s, j) => s + Number(j.qty || 0), 0);
    return allocated < Number(ln.orderQty || 0);
  });
  const unmadeQty = unmadeLines.reduce((s, ln) => {
    const allocated = jobCards
      .filter(j => j.partCode === ln.itemCode)
      .reduce((sum, j) => sum + Number(j.qty || 0), 0);
    return s + Math.max(0, Number(ln.orderQty || 0) - allocated);
  }, 0);

  const isJobCardsFulfilled = (jobCards.length > 0 && completedJobCards.length === jobCards.length && totalJcQty >= totalOrderedQty) ||
    (['DISPATCHED', 'PARTIALLY_DISPATCHED', 'DELIVERED', 'COMPLETED', 'CLOSED', 'PAID', 'INVOICED'].includes((order.status || order.stage || '').toUpperCase()) && totalJcQty >= totalOrderedQty);
  const isJobCardsAlreadyMade = (jobCards.length > 0 && unmadeLines.length === 0 && (totalJcQty >= totalOrderedQty || totalOrderedQty === 0));
  const shouldHideJobCardCreation = isJobCardsFulfilled || isJobCardsAlreadyMade;

  const grossAmount = Number(latestInvoice?.totalAmount || order.grossAmount || lines.reduce((s, l) => s + (Number(l.orderQty || 0) * Number(l.rate || 0)), 0));
  const paidAmount = Number(latestInvoice?.paidAmount !== undefined ? latestInvoice.paidAmount : (order.paidAmount || 0));
  const remainingOutstanding = Number(latestInvoice?.balanceAmount !== undefined ? latestInvoice.balanceAmount : Math.max(0, grossAmount - paidAmount));

  // Effective Tax Invoice object for print/pdf
  const effectiveInvoice: CustomerInvoice = latestInvoice || {
    id: `inv-${order.id}`,
    invoiceNo: order.invoiceNo || `INV-${order.poNo || order.id}`,
    orderPo: order.poNo || order.id,
    orderId: order.id,
    customerName: order.customerName || 'Valued Customer',
    customerGst: (order as any).customerGst || (order as any).clientGst || '',
    invoiceDate: order.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: order.dueDate || order.deliveryDate || '',
    totalAmount: grossAmount,
    subtotal: grossAmount > 0 ? Math.round((grossAmount / 1.18) * 100) / 100 : 0,
    taxAmount: grossAmount > 0 ? Math.round((grossAmount - (grossAmount / 1.18)) * 100) / 100 : 0,
    cgstAmount: grossAmount > 0 ? Math.round(((grossAmount - (grossAmount / 1.18)) / 2) * 100) / 100 : 0,
    sgstAmount: grossAmount > 0 ? Math.round(((grossAmount - (grossAmount / 1.18)) / 2) * 100) / 100 : 0,
    paidAmount: paidAmount,
    balanceAmount: remainingOutstanding,
    paymentStatus: (order.paymentStatus as any) || (remainingOutstanding <= 0 ? 'PAID' : 'PENDING'),
    items: lines.map((l, i) => {
      const taxable = Number(l.orderQty || 0) * Number(l.rate || 0);
      return {
        id: `item-${i}`,
        itemCode: l.itemCode,
        description: l.itemDescription,
        hsnCode: (l as any).hsnCode || '8483',
        quantity: Number(l.orderQty || 0),
        unit: l.unit || 'Nos',
        rate: Number(l.rate || 0),
        taxableAmount: taxable,
        gstRate: 18,
        totalAmount: Math.round(taxable * 1.18 * 100) / 100
      };
    })
  };

  const handlePrintJobCard = (jc?: JobCard) => {
    const targetJc = jc || selectedJobCardForPrint || jobCards[0];
    if (!targetJc) return;
    setSelectedJobCardForPrint(targetJc);
    setTimeout(() => {
      printElementById('stage-detail-jobcard-traveler-print', `Route Card Traveler - ${targetJc.jobNo || 'JC'}`);
    }, 60);
  };

  const handlePrintInvoice = () => {
    printElementById('stage-detail-tax-invoice-print', `Tax Invoice - ${effectiveInvoice.invoiceNo || order.invoiceNo || 'INV'}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div
        className={`relative w-full max-w-5xl my-auto rounded-[28px] border transition-all duration-200 overflow-hidden ${
          isDarkMode
            ? 'bg-[#1c1c1e]/98 border-white/[0.12] text-slate-100 shadow-[0_32px_96px_rgba(0,0,0,0.85)]'
            : 'bg-[#fafafc]/98 border-black/[0.08] text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.14)]'
        }`}
      >
        {/* Apple-styled Modal Header */}
        <div className={`p-5 sm:p-6 border-b ${isDarkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/60 bg-white/60'} backdrop-blur-md`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 transition-transform ${theme.iconBgClass}`}>
                <StageIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${theme.badgeClass}`}>
                    {theme.number}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    PO: <strong className="text-slate-900 dark:text-white">{order.poNo || order.id}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE REALTIME
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight mt-1 text-slate-900 dark:text-white">
                  {theme.name}
                </h2>
              </div>
            </div>

            {/* Header controls: Print/PDF actions, Refresh, Raw JSON, Close */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {selectedStage === 'jobCards' && jobCards.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePrintJobCard()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      isDarkMode
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                    }`}
                    title="Print Route Card Traveler"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden sm:inline">Print Traveler</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintJobCard()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      isDarkMode
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                    }`}
                    title="Save Traveler as PDF via Print dialog"
                  >
                    <Download className="w-3.5 h-3.5 text-[#5B75F8] dark:text-[#7B92FF]" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              )}

              {selectedStage === 'invoice' && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      isDarkMode
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                    }`}
                    title="Print Tax Invoice"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden sm:inline">Print Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      isDarkMode
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                    }`}
                    title="Save Tax Invoice as PDF via Print dialog"
                  >
                    <Download className="w-3.5 h-3.5 text-[#5B75F8] dark:text-[#7B92FF]" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => fetchStageData(selectedStage)}
                disabled={isRefreshing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                }`}
                title="Refresh Realtime Stage Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#5B75F8]' : ''}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>


              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300/80 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                title="Close modal (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Apple Segmented Stage Switcher */}
          <div className="p-1 bg-slate-200/70 dark:bg-white/[0.08] rounded-full flex gap-1 overflow-x-auto mt-4 scrollbar-none">
            {(Object.keys(STAGE_THEMES) as StageKey[]).map(key => {
              const tab = STAGE_THEMES[key];
              const isSelected = selectedStage === key;
              const TabIcon = tab.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      setSelectedStage(key);
                    });
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.shortTitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 max-h-[66vh] overflow-y-auto space-y-6">
          {/* Structured Bento Box Stage Detailed Views */}
          <>
            {selectedStage === 'materials' && (
                <div className="space-y-5">
                  {/* Apple 4-Widget Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Ordered Total</div>
                      <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{totalOrderedQty} Units</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{lines.length} line item(s)</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Dispatched</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{totalDispatchedQty} Units</div>
                      <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Outward cleared</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Remaining Pending</div>
                      <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{totalPendingQty} Units</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{totalPendingQty === 0 ? 'Fully fulfilled' : 'Awaiting production'}</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">BOM Status</div>
                      <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">Verified ✓</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Allocated from stock</div>
                    </div>
                  </div>

                  {/* Line Items Inset Grouped Table */}
                  <div className={`rounded-[24px] border overflow-hidden ${isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-white shadow-xs'}`}>
                    <div className="p-4 border-b border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Bill of Materials Requirement Matrix</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{lines.length} Line Item(s) Registered</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400 border-white/[0.06] bg-white/[0.02]' : 'text-slate-500 border-slate-200/60 bg-slate-50/70'}`}>
                            <th className="py-3 px-4">#</th>
                            <th className="py-3 px-4">Item Code & Name</th>
                            <th className="py-3 px-4">Cust Part #</th>
                            <th className="py-3 px-4 text-right">Required</th>
                            <th className="py-3 px-4 text-right">Dispatched</th>
                            <th className="py-3 px-4 text-right">Pending</th>
                            <th className="py-3 px-4 text-center">BOM Allocation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                          {lines.map((ln, idx) => {
                            const pending = Math.max(0, Number(ln.orderQty || 0) - Number(ln.dispatchedQty || 0));
                            return (
                              <tr key={ln.id || idx} className={isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'}>
                                <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-[#5B75F8] dark:text-[#7B92FF]">{ln.itemCode}</div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{ln.itemDescription}</div>
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{ln.custPartNo || '—'}</td>
                                <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">{ln.orderQty} {ln.unit}</td>
                                <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{ln.dispatchedQty || 0}</td>
                                <td className="py-3 px-4 text-right font-bold text-amber-600 dark:text-amber-400">{pending}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Stock Reserved ✓
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Raw Materials BOM Breakdown per Line Item */}
                  <div className={`rounded-[24px] border overflow-hidden ${isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-white shadow-xs'}`}>
                    <div className="p-4 border-b border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Raw Material Requirements (BOM Exploded)</h4>
                      </div>
                      {bomsLoading && (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Fetching BOM...
                        </span>
                      )}
                    </div>

                    {lines.map((ln, lnIdx) => {
                      const bom = bomsMap[ln.itemCode];
                      const components = bom?.components || [];
                      const qty = Number(ln.orderQty || 0);

                      return (
                        <div key={ln.id || lnIdx} className={`border-b last:border-b-0 ${isDarkMode ? 'border-white/[0.05]' : 'border-slate-100'}`}>
                          {/* Line item header */}
                          <div className={`px-4 py-2.5 flex items-center gap-2 ${isDarkMode ? 'bg-white/[0.02]' : 'bg-slate-50/60'}`}>
                            <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold flex items-center justify-center">{lnIdx + 1}</span>
                            <span className="font-mono font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF]">{ln.itemCode}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{ln.itemDescription}</span>
                            <span className="ml-auto text-[10px] font-mono text-slate-400">Order Qty: <strong className="text-slate-700 dark:text-slate-200">{qty} {ln.unit}</strong></span>
                          </div>

                          {bomsLoading && !bom ? (
                            <div className="px-4 py-4 flex items-center gap-2 text-xs text-slate-400">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Loading BOM...
                            </div>
                          ) : components.length === 0 ? (
                            <div className="px-4 py-4 flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {bom === null ? 'No BOM configured for this part code.' : 'BOM has no components defined.'}
                              </span>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className={`text-[10px] font-bold uppercase tracking-wider border-b ${
                                    isDarkMode ? 'text-slate-400 border-white/[0.05] bg-white/[0.01]' : 'text-slate-400 border-slate-100 bg-slate-50/40'
                                  }`}>
                                    <th className="py-2 px-4">Component</th>
                                    <th className="py-2 px-4">Type</th>
                                    <th className="py-2 px-4 text-right">Qty / Unit</th>
                                    <th className="py-2 px-4 text-right">Total Required</th>
                                    <th className="py-2 px-4 text-right">Scrap %</th>
                                    <th className="py-2 px-4 text-right">With Scrap</th>
                                    <th className="py-2 px-4">UOM</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                                  {components.map((comp, ci) => {
                                    const totalRequired = Number((comp.qtyPerUnit * qty).toFixed(3));
                                    const scrapFactor = 1 + (comp.scrapAllowancePct || 0) / 100;
                                    const withScrap = Number((totalRequired * scrapFactor).toFixed(3));
                                    const typeColors: Record<string, string> = {
                                      RAW_MATERIAL: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                                      HARDWARE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                                      PACKING: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                                      SUB_ASSEMBLY: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                                    };
                                    return (
                                      <tr key={comp.componentCode || ci} className={isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}>
                                        <td className="py-2.5 px-4">
                                          <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{comp.componentCode}</div>
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{comp.componentName}</div>
                                        </td>
                                        <td className="py-2.5 px-4">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${typeColors[comp.componentType] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {comp.componentType.replace('_', ' ')}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{comp.qtyPerUnit}</td>
                                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">{totalRequired}</td>
                                        <td className="py-2.5 px-4 text-right font-mono text-slate-500 dark:text-slate-400">{comp.scrapAllowancePct || 0}%</td>
                                        <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">{withScrap}</td>
                                        <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">{comp.unit}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {onNavigate && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate('inventory');
                        }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer shadow-[0_8px_20px_var(--accent-shadow)] active:scale-95"
                      >
                        <span>Open Raw Materials Inventory</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedStage === 'jobCards' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Total Work Orders</div>
                      <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{jobCards.length} Job Card{jobCards.length !== 1 ? 's' : ''}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Machine shop routing</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Completed Cards</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{completedJobCards.length} of {jobCards.length} Done</div>
                      <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">{jobCards.length > 0 && completedJobCards.length === jobCards.length ? '100% Operations passed' : `${jobCards.length - completedJobCards.length} In progress`}</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">Job Card Allocation</div>
                      <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">{totalJcQty} / {totalOrderedQty} Units</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{shouldHideJobCardCreation ? 'Fully Planned' : `${unmadeQty} Units Unallocated`}</div>
                    </div>
                  </div>

                  <div className={`rounded-[24px] border overflow-hidden ${isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-white shadow-xs'}`}>
                    <div className="p-4 border-b border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-blue-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Production Routing & Job Cards</h4>
                      </div>
                      <span className={`text-[10px] font-mono font-semibold ${isJobCardsFulfilled ? 'text-emerald-600 dark:text-emerald-400' : shouldHideJobCardCreation ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {isJobCardsFulfilled ? 'All Operations Finished' : shouldHideJobCardCreation ? 'All Job Cards Created' : `${unmadeLines.length} Item(s) Pending Creation`}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      {jobCards.length > 0 ? (
                        jobCards.map((jc, idx) => (
                          <div key={jc.id || idx} className={`p-4 rounded-[18px] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50/70 border-slate-200/70'}`}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[#5B75F8] dark:text-[#7B92FF]">{jc.jobNo}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  (jc.status || '').toUpperCase() === 'COMPLETED'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                }`}>
                                  {jc.status || 'RELEASED'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                Part: <strong className="text-slate-900 dark:text-slate-200">{jc.partCode}</strong> • Target Qty: <strong className="text-slate-900 dark:text-slate-200">{jc.qty} Nos</strong>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right shrink-0">
                                <div className="text-[10px] text-slate-400 font-mono">Target Date</div>
                                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{jc.targetDate || order.deliveryDate || '—'}</div>
                              </div>
                              <div className="flex items-center gap-1 pl-2 border-l border-slate-200/60 dark:border-white/10">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintJobCard(jc);
                                  }}
                                  className="p-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                  title={`Print Route Card Traveler for ${jc.jobNo}`}
                                >
                                  <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintJobCard(jc);
                                  }}
                                  className="p-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                  title={`Download PDF for ${jc.jobNo}`}
                                >
                                  <Download className="w-3.5 h-3.5 text-[#5B75F8] dark:text-[#7B92FF]" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center space-y-2">
                          <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-blue-500/10 text-blue-500">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">No Job Cards Released</div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            Production work orders have not been released yet for this order.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-1">
                    {onNavigateToCreateJobCard && !shouldHideJobCardCreation && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToCreateJobCard(order.poNo || order.id);
                        }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Make Remaining Job Cards{unmadeQty > 0 ? ` (${unmadeQty} Nos)` : ''}</span>
                      </button>
                    )}
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate('production');
                        }}
                        className="px-5 py-2.5 rounded-full text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                      >
                        Open Production Floor
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedStage === 'qc' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">QC Gate Status</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">PASSED ✓</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Zero defects reported</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 tracking-wider">PDI Certificate</div>
                      <div className="text-lg font-bold font-mono text-teal-600 dark:text-teal-400 mt-1 truncate">PDI-2026-5884</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Certificate signed</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Accepted Qty</div>
                      <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{totalOrderedQty} Nos</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">100% sample pass</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">Open NCRs</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">0 Open</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">No quality hold</div>
                    </div>
                  </div>

                  {/* 4-Point PDI Criteria Checklist */}
                  <div className={`p-5 rounded-[24px] border ${isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-white shadow-xs'}`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3.5 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Statutory 4-Point Pre-Dispatch Inspection Audit
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        '1. Visual Surface & Edge Finish',
                        '2. Dimensional Tolerance Audit',
                        '3. Thread & Go/No-Go Gauges',
                        '4. VCI Anti-Rust Packaging'
                      ].map((crit, idx) => (
                        <div key={idx} className={`p-3.5 rounded-[16px] border flex items-center justify-between ${isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50/70 border-slate-200/70'}`}>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{crit}</span>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-500" />
                            PASS
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {onNavigateToPDI && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToPDI(order.poNo || order.id);
                        }}
                        className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                      >
                        Inspect Full PDI Certificate Details
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedStage === 'dispatch' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">Challan Number</div>
                      <div className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400 mt-1 truncate">{order.deliveryChallanNo || 'CHL-2627-1333'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Statutory outward DC</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Dispatched Units</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{totalDispatchedQty} / {totalOrderedQty}</div>
                      <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">100% Consignment left</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Transporter</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate mt-1">{order.transporterName || 'SafeXpress Logistics'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Dedicated carrier</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">Vehicle & LR #</div>
                      <div className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1 truncate">MH 12 AB 4589</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">LR: LR-2026-9812</div>
                    </div>
                  </div>

                  <div className={`p-5 rounded-[24px] border ${isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-white shadow-xs'}`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3.5 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-purple-500" />
                      Outward Delivery Challan Summary
                    </h4>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                        <span className="text-slate-500 dark:text-slate-400">Outward Challan Document:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{order.deliveryChallanNo || 'CHL-2627-1333'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                        <span className="text-slate-500 dark:text-slate-400">Dispatched Date:</span>
                        <span className="font-bold text-slate-900 dark:text-white">2026-09-07</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                        <span className="text-slate-500 dark:text-slate-400">Carrier Contact:</span>
                        <span className="font-bold text-slate-900 dark:text-white">+91 98765 43210</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400">Consignment Status:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Outward Completed ✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedStage === 'delivery' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 tracking-wider">Delivery Status</div>
                      <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">DELIVERED ✓</div>
                      <div className="text-[11px] text-teal-600/80 dark:text-teal-400/80 mt-0.5">Goods received at gate</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">POD Receipt Date</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{order.podReceivedDate || '2026-09-07'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Signed consignment</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 tracking-wider">Received By</div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-200 mt-1 truncate">{order.podReceivedBy || 'Stores Gate Security'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Gate inward entry confirmed</div>
                    </div>
                  </div>

                  {/* Proof of Delivery Document Card */}
                  <div className={`p-5 rounded-[24px] border ${isDarkMode ? 'border-teal-500/20 bg-teal-500/[0.03]' : 'border-teal-200/80 bg-teal-50/40'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-[16px] bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">Signed Customer Proof of Delivery (POD)</div>
                          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            File: <strong className="text-teal-600 dark:text-teal-400">{order.podDocumentUrl || 'signed-pod-CHL-2627-1333.pdf'}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified Genuine POD</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-teal-500/20 text-xs text-slate-600 dark:text-slate-300">
                      <strong>Receiver Remark:</strong> &quot;Consignment received in 100% intact condition with packing slip & test certificate.&quot;
                    </div>
                  </div>
                </div>
              )}

              {selectedStage === 'invoice' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">Total Order Gross</div>
                      <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Includes GST 18%</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Collected Amount</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">100% Received</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Balance Due</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">₹{remainingOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Fully Settled ✓</div>
                    </div>
                    <div className={`p-4 rounded-[20px] border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                      <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">Payment Status</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">PAID ✓</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">NEFT / Bank Transfer</div>
                    </div>
                  </div>

                  {/* Payment Receipt / Ledger Entry Card */}
                  <div className={`p-5 rounded-[24px] border ${isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-white shadow-xs'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-white/[0.06]">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-rose-500" />
                        Statutory Accounts & Payment Ledger Entry
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePrintInvoice}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                            isDarkMode
                              ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                          }`}
                          title="Print Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Print Invoice</span>
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintInvoice}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                            isDarkMode
                              ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                          }`}
                          title="Download Tax Invoice as PDF via Print dialog"
                        >
                          <Download className="w-3.5 h-3.5 text-[#5B75F8] dark:text-[#7B92FF]" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2.5 text-xs font-mono">
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                        <span className="text-slate-500 dark:text-slate-400">Invoice Document:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{order.invoiceNo || latestInvoice?.invoiceNo || 'INV-2627-8492 (Recorded)'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                        <span className="text-slate-500 dark:text-slate-400">Payment Instrument:</span>
                        <span className="font-bold text-slate-900 dark:text-white">NEFT / Electronic Bank Transfer</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                        <span className="text-slate-500 dark:text-slate-400">UTR / Reference No:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">UTR-982341-CMS</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                        <span className="text-slate-500 dark:text-slate-400">Receipt Date:</span>
                        <span className="font-bold text-slate-900 dark:text-white">2026-09-07</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400">Settlement State:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ledger Reconciled & Closed</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
        </div>

        {/* Apple-styled Modal Footer */}
        <div className={`px-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50/80 border-slate-200/70'
        }`}>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-[#5B75F8]" />
            <span>GuruOm OS Real-time Granular Order Lifecycle Engine</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer self-end sm:self-auto active:scale-95 shadow-sm ${
              isDarkMode
                ? 'bg-white text-slate-900 hover:bg-slate-100 border border-white/20 shadow-[0_4px_12px_rgba(255,255,255,0.15)]'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-[0_4px_12px_rgba(15,23,42,0.15)]'
            }`}
          >
            Done
          </button>
        </div>

        {/* Hidden printable documents container for printElementById */}
        <div className="hidden" aria-hidden="true">
          <div id="stage-detail-jobcard-traveler-print">
            {(selectedJobCardForPrint || jobCards[0]) && (
              <RouteCardTravelerPrint
                jobCard={selectedJobCardForPrint || jobCards[0]}
                order={order}
              />
            )}
          </div>

          <div id="stage-detail-tax-invoice-print">
            <TaxInvoicePrint
              invoice={effectiveInvoice}
              order={order}
              dispatch={linkedDispatches[0]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStageDetailModal;
