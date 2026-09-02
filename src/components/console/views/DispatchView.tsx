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
  ChevronRight
} from 'lucide-react';
import { DispatchChallan, CustomerOrder, VendorMaster } from '../../../types/console';
import { getCurrentFinancialYear, formatDocumentNumber } from '../../../utils/statutoryAccountingEngine';
import { ChallanDetailModal } from '../modals/ChallanDetailModal';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';

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
  // URL-driven modal hooks
  const createChallanModal = useUrlModal('issue-delivery-challan');
  const challanDetailModal = useUrlModal('challan-detail');
  const deliveryModal = useUrlModal('record-delivery');

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

  // Sync modal states from URL
  useEffect(() => {
    if (challanDetailModal.isOpen && challanDetailModal.params.challanNo) {
      const found = dispatches.find(d => d.challanNo === challanDetailModal.params.challanNo || d.id === challanDetailModal.params.challanNo);
      if (found && (!selectedChallan || selectedChallan.challanNo !== found.challanNo)) {
        setSelectedChallan(found);
      }
    }
  }, [challanDetailModal.isOpen, challanDetailModal.params.challanNo, dispatches, selectedChallan]);

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
    challanDetailModal.open({ challanNo: challan.challanNo });
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
      {/* ── TOP HEADER & TELEMETRY WIDGETS (Apple Executive Window) ──             */}
      {/* ========================================================================= */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isDarkMode 
          ? 'bg-[#09090B] border-white/10 text-white shadow-xs' 
          : 'bg-white/90 border-slate-200/80 shadow-xs text-slate-900 backdrop-blur-xl'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] shrink-0">
              <Truck className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
                  Outward Logistics
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  • Delivery Challans & Statutory Manifests
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                Dispatch & Delivery Hub
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                Generate delivery challans for PDI-approved finished goods, manage freight transporters, and track outbound shipments to customer plants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className={`px-4 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10' 
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="Export Delivery Challans to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Delivery Challan</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid - Apple Desktop Widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
          {/* Total Consignments */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Consignments</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF]">
                <Truck className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{dispatches.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF]">Challans</span>
            </div>
          </div>

          {/* Draft / Staging */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Draft / Staging</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <FileText className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{draftCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Pending</span>
            </div>
          </div>

          {/* In Transit */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">In Transit</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <MapPin className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">{inTransitCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">On Road</span>
            </div>
          </div>

          {/* Delivered (POD) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Delivered (POD)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <PackageCheck className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{deliveredCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Verified</span>
            </div>
          </div>
        </div>

        {/* ── Apple Outward Logistics Distribution Bar ── */}
        <div className={`p-4 rounded-2xl border transition-all mt-4 ${
          isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-slate-50 border-slate-200/70'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#007AFF] dark:text-[#0A84FF]" />
              <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                Outward Freight Fulfillment & Delivery Clearance
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {deliveryRate}% Fulfillment
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {deliveredCount} of {totalCount} consignments delivered
            </span>
          </div>

          {/* Multi-Segmented Pro Bar */}
          <div className="h-2.5 w-full rounded-full bg-slate-200/60 dark:bg-black/60 overflow-hidden flex p-0.5 gap-0.5 border border-slate-200/40 dark:border-white/5">
            {deliveredCount > 0 && (
              <div 
                style={{ width: `${(deliveredCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                title={`Delivered (POD): ${deliveredCount} (${deliveredPct}%)`}
              />
            )}
            {inTransitCount > 0 && (
              <div 
                style={{ width: `${(inTransitCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                title={`In Transit: ${inTransitCount} (${inTransitPct}%)`}
              />
            )}
            {draftCount > 0 && (
              <div 
                style={{ width: `${(draftCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                title={`Staging / Draft: ${draftCount} (${draftPct}%)`}
              />
            )}
          </div>

          {/* Legend Pills */}
          <div className="flex items-center flex-wrap gap-3 sm:gap-5 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Delivered (POD):</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{deliveredCount} ({deliveredPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">In Transit:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{inTransitCount} ({inTransitPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Staging / Draft:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{draftCount} ({draftPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── FILTER & SEARCH TOOLBAR (Apple Segmented Control & Finder Search) ──   */}
      {/* ========================================================================= */}
      <div className={`p-3 sm:p-4 rounded-2xl border transition-all space-y-3 ${
        isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white/90 border-slate-200/80 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Apple Segmented Control */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border overflow-x-auto no-scrollbar shrink-0 ${
            isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-100/80 border-slate-200/80'
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? isDarkMode ? 'bg-white/10 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive 
                      ? isDarkMode ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700' 
                      : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Field & View Mode Switcher */}
          <div className="flex items-center gap-2.5">
            {/* macOS Finder Capsule */}
            <div className={`relative flex items-center rounded-full border px-3.5 py-1.5 transition-all w-full sm:w-80 ${
              isDarkMode ? 'bg-black/60 border-white/10 text-white focus-within:border-[#007AFF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#007AFF]'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Search Challan #, PO, Vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-xs w-full placeholder:text-slate-400"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Apple View Mode Switcher (Table vs Grid) */}
            <div className={`hidden sm:flex items-center p-0.5 rounded-xl border shrink-0 ${
              isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-100/80 border-slate-200/80'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? isDarkMode ? 'bg-white/10 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Table Register View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? isDarkMode ? 'bg-white/10 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Consignment Inspector Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
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
                      <span className="font-bold text-xs text-[#007AFF] dark:text-[#0A84FF]">
                        {disp.challanNo}
                      </span>
                      {disp.orderPo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
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
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 border transition-all ${
                      isDarkMode ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#007AFF] dark:text-[#0A84FF]" />
                    <span>View Challan</span>
                  </button>

                  {isDelivered ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>POD Confirmed</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleOpenDeliveryModal(disp, e)}
                      className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-[0.98]"
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
        <div className={`hidden md:block rounded-2xl border overflow-hidden transition-all shadow-xs ${
          isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200/80'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold ${
                  isDarkMode ? 'bg-black/60 border-white/10 text-slate-400' : 'bg-slate-50/80 border-slate-200/80 text-slate-500'
                }`}>
                  <th className="py-3.5 px-5">Challan #</th>
                  <th className="py-3.5 px-5">Customer Order PO</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5">Dispatch Date</th>
                  <th className="py-3.5 px-5">Transporter Partner</th>
                  <th className="py-3.5 px-5">Vehicle #</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                {filteredDispatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No delivery challans found. Click "Issue Delivery Challan" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredDispatches.map((disp) => (
                    <tr 
                      key={disp.challanNo} 
                      onClick={() => handleRowClick(disp)}
                      className={`group transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] shrink-0">
                            <Truck className="w-3.5 h-3.5 stroke-[2]" />
                          </div>
                          <span className="font-bold text-[#007AFF] dark:text-[#0A84FF]">
                            {disp.challanNo}
                          </span>
                          <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className={`py-3.5 px-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
                          {disp.orderPo}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(disp.status)
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : disp.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : disp.status === 'CANCELLED'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
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
                      <td className={`py-3.5 px-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {disp.date}
                      </td>
                      <td className={`py-3.5 px-5 font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        {disp.transporter || 'Self Pick-up'}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-purple-600 dark:text-purple-400">
                        {disp.vehicleNo || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {disp.status === 'DELIVERED' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>POD</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleOpenDeliveryModal(disp, e)}
                              className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Delivered</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRowClick(disp)}
                            className={`px-3 py-1 rounded-full border transition-all inline-flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                              isDarkMode 
                                ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10' 
                                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5 text-[#007AFF] dark:text-[#0A84FF]" />
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
                      <span className="font-bold text-xs text-[#007AFF] dark:text-[#0A84FF]">
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
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleOpenDeliveryModal(disp, e)}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-[0.98]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Delivered</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRowClick(disp)}
                        className={`p-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1 ${
                          isDarkMode 
                            ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10' 
                            : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="View Delivery Challan"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#007AFF] dark:text-[#0A84FF]" />
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
              Challan: <strong className="text-[#007AFF] dark:text-[#0A84FF]">{deliveryTargetChallan.challanNo}</strong> • PO: <strong>{deliveryTargetChallan.orderPo}</strong>
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
        icon={<Truck className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF]" />}
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
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
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
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
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
                      <Building2 className="w-4 h-4 text-[#007AFF] dark:text-[#0A84FF]" />
                      <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selOrder.customerName || 'Customer'}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
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
            <div className="text-xs font-semibold flex items-center gap-2 text-[#007AFF] dark:text-[#0A84FF]">
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
                    ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
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
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
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
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
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
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
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
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
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
                    ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
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
            <button 
              type="submit" 
              disabled={isSubmitting || !vehicleNo.trim()}
              className="px-6 py-2 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white font-semibold text-xs cursor-pointer shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
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
          </div>
        </form>
      </Modal>

      {/* Challan Detail View Modal (View, Edit while Draft, Print, PDF) */}
      <ChallanDetailModal
        isOpen={challanDetailModal.isOpen && selectedChallan !== null}
        onClose={() => {
          setSelectedChallan(null);
          challanDetailModal.close();
        }}
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
