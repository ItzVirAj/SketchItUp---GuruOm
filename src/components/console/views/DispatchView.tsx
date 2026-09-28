import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  Plus, 
  CheckCircle2, 
  Search, 
  X, 
  MapPin, 
  PackageCheck, 
  Eye, 
  Loader2,
  FileText,
  AlertCircle,
  Package,
  Calendar,
  Phone,
  Hash,
  ShieldCheck,
  Building2,
  ArrowRight,
  ClipboardList,
  Download,
  List,
  LayoutGrid,
  Activity,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { DispatchChallan, CustomerOrder, VendorMaster } from '../../../types/console';
import { getCurrentFinancialYear, formatDocumentNumber } from '../../../utils/statutoryAccountingEngine';
import { ChallanDetailModal } from '../modals/ChallanDetailModal';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { useCanPerformCta } from '../../../hooks/useCtaPermission';
import { useAccentTheme } from '../../../context/AccentThemeContext';

interface DispatchViewProps {
  dispatches?: DispatchChallan[];
  orders?: CustomerOrder[];
  vendors?: VendorMaster[];
  isDarkMode?: boolean;
  onCreateChallan?: (newChallan: Partial<DispatchChallan>) => void;
  onIssueDispatch?: (newChallan: any) => Promise<any> | void;
  onUpdateChallan?: (challanNo: string, updates: any) => Promise<any>;
  onCancelChallan?: (challanNo: string, reason?: string) => Promise<void>;
  onDispatchChallan?: (challanNo: string) => Promise<void>;
  onMarkDelivered?: (orderId: string, deliveryData: any) => Promise<any> | void;
  onNavigateToOrder?: (orderPo: string) => void;
  preselectedOrderPo?: string | null;
  onDispatchModalOpened?: () => void;
}

export const DispatchView: React.FC<DispatchViewProps> = ({
  dispatches = [],
  orders = [],
  vendors = [],
  isDarkMode = true,
  onCreateChallan,
  onIssueDispatch,
  onUpdateChallan,
  onCancelChallan,
  onDispatchChallan,
  onMarkDelivered,
  onNavigateToOrder,
  preselectedOrderPo,
  onDispatchModalOpened
}) => {
  const { accent, isGreen, isBlue, isCrystal } = useAccentTheme();
  const canPerformCta = useCanPerformCta();
  // URL-driven modal hooks
  const createChallanModal = useUrlModal('issue-delivery-challan');
  const deliveryModal = useUrlModal('record-delivery');
  const viewChallanModal = useUrlModal<{ challanNo?: string }>('view-challan');
  const challanDetailModal = useUrlModal<{ challanNo?: string }>('challan-detail');

  const isViewChallanOpen = viewChallanModal.isOpen || challanDetailModal.isOpen;
  const activeChallanNo = viewChallanModal.params.challanNo || challanDetailModal.params.challanNo;

  // Local open state preserved for smooth modal transitions
  const [isChallanDetailOpen, setIsChallanDetailOpen] = useState(false);

  const [selectedChallan, setSelectedChallan] = useState<DispatchChallan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'DRAFT' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [orderPo, setOrderPo] = useState(orders[0]?.poNo || '');
  
  const [deliveryTargetChallan, setDeliveryTargetChallan] = useState<DispatchChallan | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedBy, setReceivedBy] = useState('Customer Receiving Incharge / Plant Stores');
  const [podRemarks, setPodRemarks] = useState('Material verified and received in good condition with signed delivery stamp');
  const [podDocumentUrl, setPodDocumentUrl] = useState('https://storage.oracle.com/pod-signed-copy.pdf');
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);


  useEffect(() => {
    if (deliveryModal.isOpen && deliveryModal.params.challanNo) {
      const found = dispatches.find(d => d.challanNo === deliveryModal.params.challanNo || d.id === deliveryModal.params.challanNo);
      if (found && (!deliveryTargetChallan || deliveryTargetChallan.challanNo !== found.challanNo)) {
        setDeliveryTargetChallan(found);
        setDeliveryDate(new Date().toISOString().split('T')[0]);
        setDeliveryError(null);
      }
    }
  }, [deliveryModal.isOpen, deliveryModal.params.challanNo, dispatches, deliveryTargetChallan]);

  // Sync Challan Detail modal from URL (?modal=view-challan&challanNo=... or ?modal=challan-detail&challanNo=...)
  useEffect(() => {
    if (isViewChallanOpen) {
      if (activeChallanNo) {
        const found = dispatches.find(d => d.challanNo === activeChallanNo || d.id === activeChallanNo);
        if (found && (!selectedChallan || selectedChallan.challanNo !== found.challanNo)) {
          setSelectedChallan(found);
          setIsChallanDetailOpen(true);
        }
      } else if (dispatches.length > 0 && !selectedChallan) {
        setSelectedChallan(dispatches[0]);
        setIsChallanDetailOpen(true);
      }
    }
  }, [isViewChallanOpen, activeChallanNo, dispatches, selectedChallan]);

  useEffect(() => {
    if (createChallanModal.isOpen && (createChallanModal.params.orderPo || createChallanModal.params.orderId)) {
      const po = (createChallanModal.params.orderPo || createChallanModal.params.orderId) as string;
      if (po) {
        setOrderPo(po);
        const matched = orders.find(o => o.poNo === po || o.id === po);
        if (matched?.transporterName) {
          setTransporter(matched.transporterName);
        }
      }
    }
  }, [createChallanModal.isOpen, createChallanModal.params.orderPo, createChallanModal.params.orderId, orders]);

  const preselectHandled = useRef<string | null>(null);
  useEffect(() => {
    if (!preselectedOrderPo || preselectHandled.current === preselectedOrderPo) return;
    preselectHandled.current = preselectedOrderPo;
    setOrderPo(preselectedOrderPo);
    const matched = orders.find(o => o.poNo === preselectedOrderPo || o.id === preselectedOrderPo);
    if (matched?.transporterName) {
      setTransporter(matched.transporterName);
    }
    createChallanModal.open({ orderPo: preselectedOrderPo });
    onDispatchModalOpened?.();
  }, [preselectedOrderPo, orders]);

  const [transporter, setTransporter] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [eWayBillNo, setEWayBillNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalCount = dispatches.length;
  const deliveredCount = dispatches.filter(d => d.status === 'DELIVERED').length;
  const draftCount = dispatches.filter(d => ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(d.status)).length;
  const inTransitCount = dispatches.filter(d => d.status === 'DISPATCHED' || d.status === 'IN_TRANSIT').length;

  const deliveryRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 100;
  const deliveredPct = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;
  const inTransitPct = totalCount > 0 ? Math.round((inTransitCount / totalCount) * 100) : 0;
  const draftPct = totalCount > 0 ? Math.round((draftCount / totalCount) * 100) : 0;

  const handleExportCSV = () => {
    if (dispatches.length === 0) return;
    const headers = ['Challan No', 'Order PO', 'Status', 'Date', 'Transporter', 'Vehicle No', 'LR No', 'EWay Bill'];
    const rows = filteredDispatches.map(d => [
      d.challanNo,
      d.orderPo,
      d.status,
      d.date,
      d.transporter || '',
      d.vehicleNo || '',
      d.lrNo || '',
      d.eWayBillNo || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dispatch_manifests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Orders whose challan is still pending to be made:
  // - Order not in a terminal / already-dispatched status
  // - No existing active challan (DRAFT/GENERATED/DISPATCH_READY/DISPATCHED/IN_TRANSIT) for that PO
  const TERMINAL_ORDER_STATUSES = new Set(['DELIVERED', 'PAID', 'CLOSED', 'CANCELLED']);
  const activeChallanPos = new Set(
    dispatches
      .filter(d => !['CANCELLED', 'DELIVERED'].includes(d.status))
      .map(d => d.orderPo)
  );
  const pendingChallanOrders = orders.filter(o =>
    !TERMINAL_ORDER_STATUSES.has(o.status as string) &&
    !activeChallanPos.has(o.poNo)
  );

  const filteredDispatches = dispatches.filter(d => {
    const matchesSearch = 
      d.challanNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.orderPo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.transporter && d.transporter.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.vehicleNo && d.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusTab === 'DRAFT') return ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(d.status);
    if (statusTab === 'IN_TRANSIT') return d.status === 'DISPATCHED' || d.status === 'IN_TRANSIT';
    if (statusTab === 'DELIVERED') return d.status === 'DELIVERED';

    return true;
  });

  const handleRowClick = (challan: DispatchChallan) => {
    setSelectedChallan(challan);
    setIsChallanDetailOpen(true);
    viewChallanModal.open({ challanNo: challan.challanNo });
  };

  const handleCloseDetailModal = () => {
    setIsChallanDetailOpen(false);
    setSelectedChallan(null);
    if (viewChallanModal.isOpen) {
      viewChallanModal.close();
    }
    if (challanDetailModal.isOpen) {
      challanDetailModal.close();
    }
  };

  const handleOpenDeliveryModal = (disp: DispatchChallan, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeliveryTargetChallan(disp);
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setDeliveryError(null);
    deliveryModal.open({ challanNo: disp.challanNo });
  };

  const handleConfirmDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryTargetChallan) return;
    setIsDelivering(true);
    setDeliveryError(null);

    try {
      if (onMarkDelivered) {
        await onMarkDelivered(deliveryTargetChallan.orderPo, {
          challanNo: deliveryTargetChallan.challanNo,
          deliveryDate,
          receivedBy,
          podRemarks,
          podDocumentUrl
        });
      }
      deliveryModal.close();
    } catch (err: any) {
      setDeliveryError(err?.message || 'Failed to mark consignment delivered.');
    } finally {
      setIsDelivering(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSubmitError(null);
    const targetPo = pendingChallanOrders[0]?.poNo || orders[0]?.poNo || '';
    setOrderPo(targetPo);
    setVehicleNo('');
    setLrNo('');
    setEWayBillNo('');
    setRemarks('');
    setDriverContact('');
    createChallanModal.open(targetPo ? { orderPo: targetPo } : {});
    onDispatchModalOpened?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!vehicleNo.trim()) {
        throw new Error('Vehicle Registration Number is mandatory for GST dispatch');
      }

      const fy = getCurrentFinancialYear();
      const runningNum = Math.floor(1000 + (dispatches.length + 1) * 31 + Math.random() * 899) % 9000;
      const challanNo = formatDocumentNumber('CHL', fy, runningNum);
      const idempotencyKey = `idmp-chl-${orderPo}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const matchingOrder = orders.find(o => o.poNo === orderPo || o.id === orderPo);

      const payload: any = {
        challanNo,
        orderPo,
        status: 'DISPATCH_READY' as const,
        date: new Date().toISOString().split('T')[0],
        transporter,
        vehicleNo: vehicleNo.trim().toUpperCase(),
        lrNo: lrNo.trim(),
        eWayBillNo: eWayBillNo.trim(),
        remarks: remarks.trim(),
        driverContact: driverContact.trim() || '+91 98765 43210',
        linesCount: matchingOrder?.lines?.length || 1,
        lines: matchingOrder?.lines?.map(l => ({
          itemCode: l.itemCode,
          itemDescription: l.itemDescription,
          qty: Number(l.pendingQty ?? l.orderQty),
          unit: l.unit || 'NOS',
          rate: Number(l.rate || 0)
        })),
        idempotencyKey
      };

      if (onIssueDispatch) {
        await onIssueDispatch(payload);
      } else if (onCreateChallan) {
        await onCreateChallan(payload);
      }

      createChallanModal.close();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to issue delivery challan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOrderForModal = orders.find(
    o => o.poNo === selectedChallan?.orderPo || o.id === selectedChallan?.orderPo
  );
  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-6">
      
      {/* ========================================================================= */}
      {/* ── MOBILE-FIRST TOP HEADER (< md) ──                                      */}
      {/* ========================================================================= */}
      <div className="md:hidden flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isCrystal ? 'bg-indigo-400' : isGreen ? 'bg-emerald-400' : 'bg-blue-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isCrystal ? 'bg-indigo-500' : isGreen ? 'bg-emerald-500' : 'bg-blue-600'
            }`} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Outward Logistics
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400">
            {dispatches.length} challans
          </span>
        </div>
      </div>

      {/* Mobile 2x2 Telemetry Matrix (< md) */}
      <div className="md:hidden grid grid-cols-2 gap-2">
        <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Dispatches</div>
          <div className="text-lg font-black font-mono text-slate-900 dark:text-white tabular-nums mt-0.5">{totalCount}</div>
          <div className="text-[10px] text-slate-400">Delivery challans</div>
        </div>
        <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Delivered (POD)</div>
          <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">{deliveredCount}</div>
          <div className="text-[10px] text-slate-400">Proof archived</div>
        </div>
        <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-500">In Transit</div>
          <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 tabular-nums mt-0.5">{inTransitCount}</div>
          <div className="text-[10px] text-slate-400">En route</div>
        </div>
        <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Fulfillment</div>
          <div className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5">{deliveryRate}%</div>
          <div className="text-[10px] text-slate-400">Completion rate</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP EXECUTIVE HERO HEADER (Viewport >= md) ──                       */}
      {/* ========================================================================= */}
      <section className={`hidden md:block relative overflow-hidden rounded-3xl border transition-all ${
        isDarkMode
          ? isCrystal
            ? 'border-white/10 bg-gradient-to-b from-[#181C24] via-[#10131A] to-[#0A0C10] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6)]'
            : isGreen
              ? 'border-emerald-500/20 bg-gradient-to-b from-[#0D241B] via-[#081711] to-[#030B07] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(16,185,129,0.12)]'
              : 'border-blue-500/20 bg-gradient-to-b from-[#0a1836] via-[#071126] to-[#030712] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(21,93,252,0.15)]'
          : isCrystal
            ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] text-slate-950 shadow-[0_16px_40px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.95)]'
            : isGreen
              ? 'border-emerald-600/30 bg-gradient-to-b from-[#0A7E58] via-[#086B4A] to-[#044F36] text-white shadow-[0_16px_40px_rgba(10,126,88,0.22)]'
              : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
      }`}>
        {/* Subtle grid pattern background for Crystal Light mode */}
        {!isDarkMode && isCrystal && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_72%)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent_72%)]"
          />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 sm:py-7">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${
                isDarkMode
                  ? isCrystal
                    ? 'border-white/10 bg-white/5 text-slate-300'
                    : isGreen
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                  : isCrystal
                    ? 'border-slate-300 bg-white text-slate-700 shadow-xs'
                    : isGreen
                      ? 'border-white/30 bg-white/20 text-white shadow-xs backdrop-blur-md'
                      : 'border-white/30 bg-white/20 text-white shadow-xs backdrop-blur-md'
              }`}>
                <span className={`h-2 w-2 rounded-full animate-pulse ${
                  isGreen ? 'bg-emerald-400' : isCrystal ? 'bg-indigo-400' : 'bg-cyan-300'
                }`} />
                <span>Outward Logistics &amp; Consignments</span>
              </span>
              <span className={`text-sm font-semibold ${
                !isDarkMode && isCrystal ? 'text-slate-400' : 'text-white/60'
              }`}>•</span>
              <span className={`text-xs sm:text-sm font-semibold font-mono ${
                !isDarkMode && isCrystal ? 'text-slate-600' : 'text-white/90'
              }`}>
                {dispatches.length} Delivery Challans
              </span>
            </div>

            <h1 className={`text-3xl sm:text-[32px] font-black tracking-tight leading-tight ${
              isDarkMode ? 'text-white' : isCrystal ? 'text-slate-950' : 'text-white'
            }`}>
              Dispatch &amp; Delivery Hub
            </h1>

            <p className={`text-xs sm:text-sm font-medium leading-relaxed max-w-2xl ${
              isDarkMode ? 'text-slate-400' : isCrystal ? 'text-slate-600' : 'text-white/90'
            }`}>
              Generate delivery challans for PDI-approved finished goods, manage freight transporters, and track outbound shipments to customer plants.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 border ${
                isDarkMode
                  ? 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                  : isCrystal
                    ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300/80 shadow-xs'
                    : 'bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-md'
              }`}
              title="Export Delivery Challans to CSV"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Export CSV</span>
            </button>

            {canPerformCta('GENERATE_DELIVERY_CHALLAN') && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isDarkMode
                    ? isCrystal
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white hover:from-indigo-600 hover:to-blue-700 shadow-indigo-500/20'
                      : isGreen
                        ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/25'
                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/25'
                    : isCrystal
                      ? 'bg-slate-950 text-white hover:bg-slate-800 shadow-slate-950/20'
                      : isGreen
                        ? 'bg-white text-emerald-800 hover:bg-emerald-50 shadow-black/10'
                        : 'bg-white text-blue-700 hover:bg-blue-50 shadow-black/10'
                }`}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Issue Delivery Challan</span>
              </button>
            )}
          </div>
        </div>

        {/* Integrated 4-Column Metric Strip (border-t) */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
          isDarkMode
            ? isCrystal
              ? 'border-white/10 bg-[#0c0e14]/60'
              : isGreen
                ? 'border-emerald-500/15 bg-black/40'
                : 'border-blue-500/15 bg-black/40'
            : isCrystal
              ? 'border-slate-200/90 bg-white/70 shadow-xs'
              : isGreen
                ? 'border-white/20 bg-black/15'
                : 'border-white/20 bg-black/15'
        }`}>
          {[
            {
              label: 'Total Dispatches',
              value: String(totalCount),
              detail: 'Statutory delivery challans',
              icon: Truck,
              iconColor: isDarkMode
                ? isCrystal ? 'text-indigo-400' : isGreen ? 'text-emerald-400' : 'text-blue-400'
                : isCrystal ? 'text-indigo-600' : isGreen ? 'text-emerald-700' : 'text-blue-600',
              iconBg: isDarkMode
                ? 'bg-white/10 border border-white/10'
                : isCrystal ? 'bg-indigo-50 border border-indigo-200/60' : 'bg-white shadow-xs',
            },
            {
              label: 'Delivered (POD)',
              value: String(deliveredCount),
              detail: 'Proof of Delivery archived',
              icon: CheckCircle2,
              iconColor: isDarkMode ? 'text-emerald-400' : isCrystal ? 'text-emerald-600' : 'text-emerald-700',
              iconBg: isDarkMode
                ? 'bg-emerald-500/15 border border-emerald-500/30'
                : isCrystal ? 'bg-emerald-50 border border-emerald-200/60' : 'bg-white shadow-xs',
            },
            {
              label: 'In Transit',
              value: String(inTransitCount),
              detail: 'Active consignments en route',
              icon: Package,
              iconColor: isDarkMode ? 'text-purple-400' : isCrystal ? 'text-purple-600' : 'text-purple-700',
              iconBg: isDarkMode
                ? 'bg-purple-500/15 border border-purple-500/30'
                : isCrystal ? 'bg-purple-50 border border-purple-200/60' : 'bg-white shadow-xs',
            },
            {
              label: 'Fulfillment Rate',
              value: `${deliveryRate}%`,
              detail: 'Overall logistics completion',
              icon: TrendingUp,
              iconColor: isDarkMode
                ? isCrystal ? 'text-indigo-400' : isGreen ? 'text-emerald-400' : 'text-blue-400'
                : isCrystal ? 'text-indigo-600' : isGreen ? 'text-emerald-700' : 'text-blue-700',
              iconBg: isDarkMode
                ? 'bg-white/10 border border-white/10'
                : isCrystal ? 'bg-slate-100 border border-slate-200' : 'bg-white shadow-xs',
            },
          ].map((metric, index) => {
            const MetricIcon = metric.icon;
            return (
              <div
                key={metric.label}
                className={`flex items-center gap-4 px-6 py-5 transition-all ${
                  index > 0
                    ? isDarkMode
                      ? 'lg:border-l border-white/10'
                      : isCrystal
                        ? 'lg:border-l border-slate-200/90'
                        : 'lg:border-l border-white/20'
                    : ''
                }`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${metric.iconBg} ${metric.iconColor}`}>
                  <MetricIcon className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-bold uppercase tracking-wider ${
                    isDarkMode ? 'text-slate-400' : isCrystal ? 'text-slate-500' : 'text-white/80'
                  }`}>
                    {metric.label}
                  </div>
                  <div className={`text-2xl sm:text-[26px] font-black tracking-tight tabular-nums my-0.5 leading-tight ${
                    isDarkMode ? 'text-white' : isCrystal ? 'text-slate-950' : 'text-white'
                  }`}>
                    {metric.value}
                  </div>
                  <div className={`text-xs font-medium truncate ${
                    isDarkMode ? 'text-slate-400' : isCrystal ? 'text-slate-500' : 'text-white/90'
                  }`}>
                    {metric.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Apple Outward Logistics Distribution Bar ── */}
        <div className={`px-6 py-4 border-t ${
          isDarkMode
            ? isCrystal ? 'border-white/10 bg-[#08090d]/80' : 'border-white/10 bg-black/40'
            : isCrystal ? 'border-slate-200/90 bg-slate-50/90' : 'border-white/20 bg-black/15'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${
                !isDarkMode && isCrystal ? 'text-slate-700' : 'text-white'
              }`} />
              <span className={`text-xs font-bold tracking-tight ${
                !isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'
              }`}>
                Outward Freight Fulfillment &amp; Delivery Clearance
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                !isDarkMode && isCrystal
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {deliveryRate}% Fulfillment
              </span>
            </div>
            <span className={`text-xs font-mono ${
              !isDarkMode && isCrystal ? 'text-slate-500' : 'text-white/70'
            }`}>
              {deliveredCount} of {totalCount} consignments delivered
            </span>
          </div>

          {/* Multi-Segmented Pro Bar */}
          <div className={`h-2.5 w-full rounded-full overflow-hidden flex p-0.5 gap-0.5 border ${
            !isDarkMode && isCrystal ? 'bg-slate-200/80 border-slate-300/80' : 'bg-white/20 border-white/15'
          }`}>
            {deliveredCount > 0 && (
              <div 
                style={{ width: `${(deliveredCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                title={`Delivered (POD): ${deliveredCount} (${deliveredPct}%)`}
              />
            )}
            {inTransitCount > 0 && (
              <div 
                style={{ width: `${(inTransitCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-purple-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]" 
                title={`In Transit: ${inTransitCount} (${inTransitPct}%)`}
              />
            )}
            {draftCount > 0 && (
              <div 
                style={{ width: `${(draftCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-amber-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" 
                title={`Staging / Draft: ${draftCount} (${draftPct}%)`}
              />
            )}
          </div>

          {/* Legend Pills */}
          <div className="flex items-center flex-wrap gap-3 sm:gap-5 mt-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className={`font-medium ${!isDarkMode && isCrystal ? 'text-slate-600' : 'text-white/70'}`}>Delivered (POD):</span>
              <span className={`font-bold tabular-nums font-mono ${!isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'}`}>
                {deliveredCount} ({deliveredPct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className={`font-medium ${!isDarkMode && isCrystal ? 'text-slate-600' : 'text-white/70'}`}>In Transit:</span>
              <span className={`font-bold tabular-nums font-mono ${!isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'}`}>
                {inTransitCount} ({inTransitPct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className={`font-medium ${!isDarkMode && isCrystal ? 'text-slate-600' : 'text-white/70'}`}>Staging / Draft:</span>
              <span className={`font-bold tabular-nums font-mono ${!isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'}`}>
                {draftCount} ({draftPct}%)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ── APPLE 2-TIER COMMAND DECK (Status Deck & Spotlight Search) ──           */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl border transition-all ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
          : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/50 to-[#f6f8fc] shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
      }`}>
        <div className="flex flex-col gap-3">
          {/* Tier 1: Segmented tab controls, Telemetry live pill, View mode switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Segmented Filter Pills */}
            <div className={`inline-flex items-center p-1 rounded-xl border text-xs overflow-x-auto max-w-full ${
              isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
            }`}>
              {[
                { id: 'ALL', label: 'All Dispatches', count: dispatches.length },
                { id: 'DRAFT', label: 'Staging / Ready', count: draftCount },
                { id: 'IN_TRANSIT', label: 'In Transit', count: inTransitCount },
                { id: 'DELIVERED', label: 'Delivered (POD)', count: deliveredCount },
              ].map(tab => {
                const isActive = statusTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? isDarkMode
                          ? 'bg-white/15 text-white shadow-xs border border-white/10'
                          : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? isDarkMode
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-800'
                        : isDarkMode
                          ? 'bg-white/5 text-slate-400'
                          : 'bg-slate-300/60 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Telemetry indicator & View Mode Switcher */}
            <div className="flex items-center gap-2">
              <span className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border ${
                isDarkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-200 bg-white text-slate-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isGreen ? 'bg-emerald-400' : isCrystal ? 'bg-indigo-400' : 'bg-blue-400'
                } animate-pulse`} />
                <span className="font-mono">{filteredDispatches.length}</span> / <span className="font-mono">{dispatches.length}</span> manifests
              </span>

              {/* View Switcher: Table vs Cards Grid */}
              <div className={`flex items-center p-1 rounded-xl border shrink-0 ${
                isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? isDarkMode ? 'bg-white/15 text-white shadow-xs border border-white/10' : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Table Register View"
                  aria-label="Table Register View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? isDarkMode ? 'bg-white/15 text-white shadow-xs border border-white/10' : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Cards Grid View"
                  aria-label="Cards Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tier 2: Spotlight search */}
          <div className={`relative flex items-center rounded-xl border transition-all ${
            isDarkMode
              ? 'border-white/10 bg-black/40 text-white focus-within:border-white/25 focus-within:bg-black/60'
              : 'border-slate-200/90 bg-white text-slate-900 focus-within:border-slate-400 focus-within:shadow-xs'
          }`}>
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Challan #, Customer Order PO, Transporter, Vehicle Registration #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-10 pr-24 py-2.5 text-xs font-medium outline-none placeholder:text-slate-400 font-sans"
            />
            <div className="absolute right-3 flex items-center gap-2">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className={`hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                  isDarkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'
                }`}>
                  ⌘F
                </kbd>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE DISPATCH CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredDispatches.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border text-xs ${
            isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No delivery challans found matching your query.
          </div>
        ) : (
          filteredDispatches.map((disp) => {
            const isDelivered = disp.status === 'DELIVERED';
            const isStaging = ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(disp.status);

            return (
              <div
                key={disp.challanNo}
                onClick={() => handleRowClick(disp)}
                className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs cursor-pointer ${
                  isDelivered
                    ? isDarkMode ? 'bg-[#09090B] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isStaging
                    ? isDarkMode ? 'bg-[#09090B] border-amber-500/30' : 'bg-amber-50/40 border-amber-200'
                    : isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Challan # + Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs font-mono text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                        {disp.challanNo}
                      </span>
                      {disp.orderPo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/20">
                          {disp.orderPo}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-xs font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {disp.transporter || 'Self Pick-up (Customer Transport)'}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${
                    isDelivered
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : isStaging
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isDelivered ? 'bg-emerald-500' : isStaging ? 'bg-amber-500' : 'bg-purple-500'
                    }`} />
                    <span>{disp.status}</span>
                  </span>
                </div>

                {/* Vehicle & Date Detail */}
                <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs text-center ${
                  isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Vehicle #</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{disp.vehicleNo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Dispatch Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{disp.date || '—'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleRowClick(disp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all ${
                      isDarkMode ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]" />
                    <span>View Challan</span>
                  </button>

                  {isDelivered ? (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>POD Confirmed</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleOpenDeliveryModal(disp, e)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Delivered</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP DISPATCH: TABLE OR INSPECTOR CARD GRID (Viewport >= md)            */}
      {/* ========================================================================= */}
      {viewMode === 'table' ? (
        <div className={`hidden md:block overflow-hidden rounded-3xl border transition-all ${
          isDarkMode
            ? isCrystal
              ? 'border-white/10 bg-gradient-to-b from-[#181C24] via-[#10131A] to-[#0A0C10] shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
              : 'border-white/10 bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
            : isCrystal
              ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
              : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
        }`}>
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/70 dark:via-white/10 to-transparent" />
          <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">Delivery Challan &amp; Dispatch Register</div>
              <div className="mt-0.5 text-[10px] text-slate-400">Goods delivery documentation, vehicle logs, and POD delivery receipts</div>
            </div>
            <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              {filteredDispatches.length} challans
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
                  isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
                }`}>
                  <th className="py-4 px-5">Challan #</th>
                  <th className="py-4 px-5">Customer Order PO</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5">Dispatch Date</th>
                  <th className="py-4 px-5">Transporter Partner</th>
                  <th className="py-4 px-5">Vehicle #</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {filteredDispatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-mono text-xs">
                      No delivery challans found. Click "Issue Delivery Challan" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredDispatches.map((disp) => (
                    <tr 
                      key={disp.challanNo} 
                      onClick={() => handleRowClick(disp)}
                      className={`group transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${
                            isDarkMode 
                              ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10 text-white' 
                              : 'bg-gradient-to-br from-slate-50 to-slate-100/80 border-slate-200/80 text-slate-800 shadow-xs'
                          }`}>
                            <Truck className="w-5 h-5 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] stroke-[2]" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono text-sm tracking-tight text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] font-black">
                              {disp.challanNo}
                            </div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                              {disp.orderPo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-4 px-5 font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {disp.orderPo}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                          ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(disp.status)
                            ? isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                            : disp.status === 'DELIVERED'
                              ? isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : disp.status === 'CANCELLED'
                                ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                                : isDarkMode ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(disp.status)
                              ? 'bg-amber-500'
                              : disp.status === 'DELIVERED'
                                ? 'bg-emerald-500'
                                : disp.status === 'CANCELLED'
                                  ? 'bg-rose-500'
                                  : 'bg-purple-500'
                          }`} />
                          <span>{disp.status}</span>
                        </span>
                      </td>
                      <td className={`py-4 px-5 font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {disp.date}
                      </td>
                      <td className={`py-4 px-5 font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        {disp.transporter || 'Self Pick-up'}
                      </td>
                      <td className="py-4 px-5 font-mono font-semibold text-purple-600 dark:text-purple-400">
                        {disp.vehicleNo || '—'}
                      </td>
                      <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {disp.status === 'DELIVERED' ? (
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>POD</span>
                            </span>
                          ) : canPerformCta('MARK_DELIVERED') ? (
                            <button
                              type="button"
                              onClick={(e) => handleOpenDeliveryModal(disp, e)}
                              className="h-8 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.96] cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Delivered</span>
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleRowClick(disp)}
                            className={`h-8 px-3 py-1.5 rounded-xl border transition-all inline-flex items-center gap-1.5 text-xs font-bold active:scale-[0.96] cursor-pointer ${
                              isDarkMode 
                                ? 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]/50 hover:text-[var(--accent-text-dark)]' 
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/60 hover:text-[var(--accent-primary)]'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Inspector Cards View */
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDispatches.length === 0 ? (
            <div className={`col-span-full p-12 text-center rounded-2xl border text-xs ${
              isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              No delivery challans matching your query.
            </div>
          ) : (
            filteredDispatches.map((disp) => {
              const isDelivered = disp.status === 'DELIVERED';
              const isStaging = ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(disp.status);

              return (
                <div
                  key={disp.challanNo}
                  onClick={() => handleRowClick(disp)}
                  className={`p-5 rounded-2xl border transition-all space-y-3.5 shadow-xs cursor-pointer hover:shadow-md ${
                    isDelivered
                      ? isDarkMode ? 'bg-[#09090B] border-emerald-500/30 hover:border-emerald-500/50' : 'bg-white border-emerald-200 hover:border-emerald-300'
                      : isStaging
                      ? isDarkMode ? 'bg-[#09090B] border-amber-500/30 hover:border-amber-500/50' : 'bg-white border-amber-200 hover:border-amber-300'
                      : isDarkMode ? 'bg-[#09090B] border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs font-mono text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                        {disp.challanNo}
                      </span>
                      <h3 className={`text-sm font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {disp.transporter || 'Self Pick-up (Customer Transport)'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        PO: {disp.orderPo} • Vehicle: {disp.vehicleNo || '—'}
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${
                      isDelivered
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : isStaging
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isDelivered ? 'bg-emerald-500' : isStaging ? 'bg-amber-500' : 'bg-purple-500'
                      }`} />
                      <span>{disp.status}</span>
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs text-center ${
                    isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Vehicle #</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{disp.vehicleNo || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Dispatch Date</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{disp.date || '—'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-400 font-medium">Click to view</span>
                    <div className="flex items-center gap-1.5">
                      {isDelivered ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>POD Verified</span>
                        </span>
                      ) : canPerformCta('MARK_DELIVERED') ? (
                        <button
                          type="button"
                          onClick={(e) => handleOpenDeliveryModal(disp, e)}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-[0.98]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Delivered</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRowClick(disp)}
                        className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                          isDarkMode 
                            ? 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]/50 hover:text-[var(--accent-text-dark)]' 
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/60 hover:text-[var(--accent-primary)]'
                        }`}
                        title="View Delivery Challan"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── DELIVERY CONFIRMATION (POD) MODAL (Apple Sheet) ──                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(deliveryModal.isOpen && deliveryTargetChallan)}
        onClose={() => !isDelivering && deliveryModal.close()}
        maxWidth="lg"
        isDarkMode={isDarkMode}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        title="Confirm Delivery (POD)"
        subtitle={
          deliveryTargetChallan ? (
            <span className="text-xs">
              Challan: <strong className="text-[#5B75F8] dark:text-[#7B92FF]">{deliveryTargetChallan.challanNo}</strong> • PO: <strong>{deliveryTargetChallan.orderPo}</strong>
            </span>
          ) : undefined
        }
      >
        {deliveryTargetChallan && (
          <form onSubmit={handleConfirmDeliverySubmit} className="space-y-4 text-xs font-sans">
            {deliveryError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deliveryError}</span>
              </div>
            )}

            {/* Consignment Quick Badge */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200/80'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <PackageCheck className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {deliveryTargetChallan.challanNo}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Carrier: {deliveryTargetChallan.transporter || 'Direct'} {deliveryTargetChallan.vehicleNo && `(${deliveryTargetChallan.vehicleNo})`}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                In Transit
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Delivery Receipt Date *
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className={`h-10 w-full rounded-xl border px-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Received By / Store Incharge *
                </label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="e.g. Customer Plant Inward / Store Manager"
                  className={`h-10 w-full rounded-xl border px-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Proof of Delivery (POD) Document URL
              </label>
              <input
                type="text"
                value={podDocumentUrl}
                onChange={(e) => setPodDocumentUrl(e.target.value)}
                placeholder="https://.../signed-pod.pdf or Physical Copy Serial"
                className={`h-10 w-full rounded-xl border px-3 text-xs outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-black/60 border-white/10 text-white focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Receipt Verification Remarks
              </label>
              <textarea
                rows={2}
                value={podRemarks}
                onChange={(e) => setPodRemarks(e.target.value)}
                placeholder="Verified quantity and outward seal intact with signed stamp..."
                className={`w-full p-3 rounded-xl border text-xs outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-black/60 border-white/10 text-white focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                }`}
              />
            </div>

            <div className={`pt-4 border-t flex items-center justify-end gap-2.5 font-sans ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
              <button
                type="button"
                onClick={() => deliveryModal.close()}
                className={`px-5 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                  isDarkMode ? 'border-white/10 bg-black/60 text-slate-300 hover:bg-white/10' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              {canPerformCta('MARK_DELIVERED') && (
                <button
                  type="submit"
                  disabled={isDelivering}
                  className="px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isDelivering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirming POD...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Delivery</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* ── ISSUE DELIVERY CHALLAN MODAL (Apple Sheet) ──                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createChallanModal.isOpen}
        onClose={() => !isSubmitting && createChallanModal.close()}
        maxWidth="2xl"
        isDarkMode={isDarkMode}
        icon={<Truck className="w-5 h-5 text-[#5B75F8] dark:text-[#7B92FF]" />}
        title="Issue Delivery Challan"
        subtitle="Dispatch outward consignment & statutory logistics manifest"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {submitError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Section 1: Customer Order Selection & Smart Info Card */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Customer Order PO *
                </label>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border border-blue-500/20">
                  {pendingChallanOrders.length} Pending
                </span>
              </div>

              {pendingChallanOrders.length === 0 ? (
                <div className={`p-4 rounded-2xl border text-center space-y-1 ${
                  isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <PackageCheck className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>All Challans Issued</p>
                  <p className="text-xs text-slate-400">No orders are pending a delivery challan right now.</p>
                </div>
              ) : (
                <select
                  value={orderPo}
                  onChange={(e) => setOrderPo(e.target.value)}
                  className={`h-10 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                >
                  {pendingChallanOrders.map(o => (
                    <option key={o.id || o.poNo} value={o.poNo}>
                      {o.poNo} — {o.customerName || 'Customer'} ({o.lines?.length || 0} items)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Order Intelligence Card */}
            {(() => {
              const selOrder = pendingChallanOrders.find(o => o.poNo === orderPo || o.id === orderPo);
              if (!selOrder) return null;
              const totalItems = selOrder.lines?.reduce((sum, l) => sum + Number(l.pendingQty ?? l.orderQty ?? 0), 0) || 0;
              return (
                <div className={`p-4 rounded-2xl border space-y-3 font-sans ${
                  isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50/80 border-slate-200/80'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#5B75F8] dark:text-[#7B92FF]" />
                      <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selOrder.customerName || 'Customer'}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border border-blue-500/20">
                      PO: {selOrder.poNo}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'border-white/5 bg-black/40' : 'border-slate-200/80 bg-white'}`}>
                      <div className="text-[10px] text-slate-400 uppercase">Items to Dispatch</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                        {totalItems} NOS ({selOrder.lines?.length || 0} lines)
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'border-white/5 bg-black/40' : 'border-slate-200/80 bg-white'}`}>
                      <div className="text-[10px] text-slate-400 uppercase">Order Stage</div>
                      <div className="font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                        {selOrder.status || selOrder.stage || 'CONFIRMED'}
                      </div>
                    </div>
                    <div className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl border ${isDarkMode ? 'border-white/5 bg-black/40' : 'border-slate-200/80 bg-white'}`}>
                      <div className="text-[10px] text-slate-400 uppercase">Delivery Location</div>
                      <div className="font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5" title={selOrder.shippingAddress || selOrder.billingAddress || 'Plant Warehouse'}>
                        {selOrder.shippingAddress || selOrder.billingAddress || 'Plant Warehouse'}
                      </div>
                    </div>
                  </div>

                  {selOrder.lines && selOrder.lines.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selOrder.lines.map((l, i) => (
                        <span key={i} className={`text-[11px] px-2.5 py-0.5 rounded-full border ${
                          isDarkMode ? 'bg-black/60 text-slate-300 border-white/10' : 'bg-white text-slate-700 border-slate-200'
                        }`}>
                          {l.itemCode} • {Number(l.pendingQty ?? l.orderQty)} {l.unit || 'NOS'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Section 2: Transporter & Vehicle Logistics Grid */}
          <div className="space-y-3 pt-1">
            <div className="text-xs font-semibold flex items-center gap-2 text-[#5B75F8] dark:text-[#7B92FF]">
              <Truck className="w-3.5 h-3.5" />
              <span>Logistics & Transporter Carrier</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Transporter Partner *
              </label>
              <input
                type="text"
                required
                value={transporter}
                onChange={(e) => setTransporter(e.target.value)}
                placeholder="e.g. VRL Logistics, SafeXpress, Self Pick-up"
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Vehicle Registration # *
                </label>
                <input
                  type="text"
                  required
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="e.g. MH 12 AB 4589"
                  className={`h-10 w-full rounded-xl border px-3.5 text-xs font-bold uppercase outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  LR / Docket Number
                </label>
                <input
                  type="text"
                  value={lrNo}
                  onChange={(e) => setLrNo(e.target.value)}
                  placeholder="e.g. VRL-98762"
                  className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  E-Way Bill Number
                </label>
                <input
                  type="text"
                  value={eWayBillNo}
                  onChange={(e) => setEWayBillNo(e.target.value)}
                  placeholder="e.g. 2710 9821 4455"
                  className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Driver Contact Phone
                </label>
                <input
                  type="text"
                  value={driverContact}
                  onChange={(e) => setDriverContact(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Delivery Notes & Packaging Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Goods packed in sealed wooden crates with anti-corrosion VCI covers"
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                }`}
              />
            </div>
          </div>

          <div className={`pt-4 border-t flex items-center justify-end gap-2.5 font-sans ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
            <button 
              type="button" 
              disabled={isSubmitting}
              onClick={() => createChallanModal.close()} 
              className={`px-5 py-2 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-slate-300 hover:bg-white/10' 
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            {canPerformCta('GENERATE_DELIVERY_CHALLAN') && (
              <button 
                type="submit" 
                disabled={isSubmitting || !vehicleNo.trim()}
                className={`px-6 py-2 rounded-full font-bold text-xs cursor-pointer shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 ${
                  isDarkMode
                    ? 'bg-white hover:bg-slate-100 text-slate-900 shadow-white/10'
                    : 'bg-[#181920] hover:bg-[#252730] text-white shadow-black/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Issuing Challan...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" />
                    <span>Issue Delivery Challan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </Modal>

      {/* Challan Detail View Modal (View, Edit while Draft, Print, PDF) */}
      <ChallanDetailModal
        isOpen={(isViewChallanOpen || isChallanDetailOpen) && selectedChallan !== null}
        onClose={handleCloseDetailModal}
        challan={selectedChallan}
        order={orders.find(o => o.poNo === selectedChallan?.orderPo || o.id === selectedChallan?.orderPo)}
        isDarkMode={isDarkMode}
        onUpdateChallan={onUpdateChallan}
        onCancelChallan={onCancelChallan}
        onDispatchChallan={onDispatchChallan}
        onMarkDelivered={onMarkDelivered}
        onNavigateToOrder={onNavigateToOrder}
      />

    </div>
  );
};

export default DispatchView;
