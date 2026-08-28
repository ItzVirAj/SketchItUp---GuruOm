import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { DispatchChallan, CustomerOrder, VendorMaster } from '../../../types/console';
import { getCurrentFinancialYear, formatDocumentNumber } from '../../../utils/statutoryAccountingEngine';
import { ChallanDetailModal } from '../modals/ChallanDetailModal';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<DispatchChallan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'DRAFT' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');
  const [orderPo, setOrderPo] = useState(orders[0]?.poNo || '');
  
  const [deliveryTargetChallan, setDeliveryTargetChallan] = useState<DispatchChallan | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedBy, setReceivedBy] = useState('Customer Receiving Incharge / Plant Stores');
  const [podRemarks, setPodRemarks] = useState('Material verified and received in good condition with signed delivery stamp');
  const [podDocumentUrl, setPodDocumentUrl] = useState('https://storage.oracle.com/pod-signed-copy.pdf');
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const allTransporterOptions = [
    'VRL Logistics Ltd', 
    'SafeXpress Courier', 
    'GATI KWE', 
    'BlueDart Express', 
    'TCI Freight', 
    'Delhivery Surface',
    'Self Pick-up (Customer Transport)'
  ];
  const [transporter, setTransporter] = useState(allTransporterOptions[0] || 'VRL Logistics Ltd');
  const [vehicleNo, setVehicleNo] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [eWayBillNo, setEWayBillNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const deliveredCount = dispatches.filter(d => d.status === 'DELIVERED').length;
  const draftCount = dispatches.filter(d => ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(d.status)).length;
  const inTransitCount = dispatches.filter(d => d.status === 'DISPATCHED' || d.status === 'IN_TRANSIT').length;

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
    setShowDetailModal(true);
  };

  const handleOpenDeliveryModal = (disp: DispatchChallan, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeliveryTargetChallan(disp);
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setDeliveryError(null);
    setShowDeliveryModal(true);
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
      setShowDeliveryModal(false);
    } catch (err: any) {
      setDeliveryError(err?.message || 'Failed to mark consignment delivered.');
    } finally {
      setIsDelivering(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSubmitError(null);
    setOrderPo(orders[0]?.poNo || '');
    setVehicleNo('');
    setLrNo('');
    setEWayBillNo('');
    setRemarks('');
    setDriverContact('');
    setShowCreateModal(true);
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

      setShowCreateModal(false);
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
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Outward Logistics
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Dispatch Hub ({filteredDispatches.length})
            </h1>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue Challan</span>
          </button>
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total Consignments</div>
            <div className="text-base font-black text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight mt-0.5">
              {dispatches.length} <span className="text-xs font-normal text-slate-400">Challans</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Draft / Staging</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5">
              {draftCount} <span className="text-xs font-normal text-slate-400">Pending</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">In Transit</div>
            <div className="text-base font-black text-purple-500 tracking-tight mt-0.5">
              {inTransitCount} <span className="text-xs font-normal text-slate-400">On Road</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Delivered (POD)</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {deliveredCount} <span className="text-xs font-normal text-slate-400">Verified</span>
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
                Outward Logistics & Delivery Challans
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{filteredDispatches.length} Consignments</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                  Dispatch & Delivery Hub
                </h1>
                <span className="hidden font-mono text-[10px] font-semibold text-slate-400 xl:inline">
                  DELIVERY CHALLANS • TRANSPORTER DISPATCH • POD RECONCILIATION
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Generate delivery challans for PDI-approved finished goods, manage freight transporters, and track outbound shipments to customer plants.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 text-xs font-bold text-white shadow-lg shadow-[var(--accent-shadow)] transition hover:brightness-110 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Issue Delivery Challan</span>
            </button>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            {[
              { label: 'Total Consignments', value: `${dispatches.length}`, detail: 'Recorded delivery challans', icon: Truck, tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]' },
              { label: 'Draft / Staging', value: `${draftCount}`, detail: 'Awaiting transport pickup', icon: FileText, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
              { label: 'In Transit Logistics', value: `${inTransitCount}`, detail: 'En route to consignee', icon: MapPin, tone: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-500/10' },
              { label: 'Delivered (POD)', value: `${deliveredCount}`, detail: 'Signed receipt verified', icon: PackageCheck, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10' },
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
              <Truck className="h-4 w-4" />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
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
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                      isActive
                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-white/30 text-white'
                        : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className={`flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 ml-auto ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]' : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search challan number, PO reference, vehicle number, transporter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 font-mono"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Showing {filteredDispatches.length} of {dispatches.length} dispatch records</span>
            <span>Outward Consignment & Proof-of-Delivery Registry</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE DISPATCH CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredDispatches.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
            isDarkMode ? 'bg-[#171b24] border-white/[0.08] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No delivery challans found matching your filters.
          </div>
        ) : (
          filteredDispatches.map((disp) => {
            const isDelivered = disp.status === 'DELIVERED';
            const isStaging = ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(disp.status);

            return (
              <div
                key={disp.challanNo}
                onClick={() => handleRowClick(disp)}
                className={`p-4 rounded-2xl border transition-all space-y-3.5 shadow-sm cursor-pointer ${
                  isDelivered
                    ? isDarkMode ? 'bg-[#171b24] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isStaging
                    ? isDarkMode ? 'bg-[#171b24] border-amber-500/30' : 'bg-amber-50/40 border-amber-200'
                    : isDarkMode ? 'bg-[#171b24] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Challan # + Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                        {disp.challanNo}
                      </span>
                      {disp.orderPo && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {disp.orderPo}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-xs font-bold font-sans mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {disp.transporter || 'Self Pick-up (Customer Transport)'}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border shrink-0 ${
                    isDelivered
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isStaging
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isDelivered ? 'bg-emerald-400' : isStaging ? 'bg-amber-400' : 'bg-cyan-400'
                    }`} />
                    <span>{disp.status}</span>
                  </span>
                </div>

                {/* Vehicle & Date Detail */}
                <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs font-mono text-center ${
                  isDarkMode ? 'bg-black/20 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Vehicle #</span>
                    <span className="font-bold text-purple-400">{disp.vehicleNo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Dispatch Date</span>
                    <span className="font-bold text-slate-200">{disp.date || '—'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleRowClick(disp)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1 border transition-all ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-slate-200 hover:text-white' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View Challan</span>
                  </button>

                  {isDelivered ? (
                    <span className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>POD Confirmed</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleOpenDeliveryModal(disp, e)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-[0.98]"
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
      {/* DESKTOP DISPATCH TABLE (Viewport >= md) */}
      {/* ========================================================================= */}
      <div className={`hidden md:block overflow-hidden rounded-[22px] border transition-all ${
        isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
      }`}>
        <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Delivery Challan Register</div>
            <div className="mt-0.5 text-[10px] text-slate-400">Outbound manifests, freight carriers, vehicle numbers, and verified PODs</div>
          </div>
          <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{filteredDispatches.length} challans</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
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
                    No delivery challans found. Click "+ Issue Delivery Challan" to create one.
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((disp) => (
                  <tr 
                    key={disp.challanNo} 
                    className={`group transition-colors ${
                      isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 shrink-0 ${
                          isDarkMode 
                            ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30' 
                            : 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)] border border-[var(--accent-primary)]/20'
                        }`}>
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                            {disp.challanNo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-slate-400">
                      {disp.orderPo}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                        ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(disp.status)
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : disp.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : disp.status === 'CANCELLED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(disp.status)
                            ? 'bg-amber-400'
                            : disp.status === 'DELIVERED'
                              ? 'bg-emerald-400'
                              : disp.status === 'CANCELLED'
                                ? 'bg-rose-400'
                                : 'bg-purple-400'
                        }`} />
                        <span>{disp.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400">
                      {disp.date}
                    </td>
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      {disp.transporter || 'Self Pick-up'}
                    </td>
                    <td className="py-4 px-5 font-mono text-purple-400 font-medium">
                      {disp.vehicleNo || '—'}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {disp.status === 'DELIVERED' ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>POD</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenDeliveryModal(disp, e)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Delivered</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRowClick(disp)}
                          className={`p-2 rounded-xl border transition-all inline-flex items-center gap-1 text-xs font-mono font-bold cursor-pointer ${
                            isDarkMode 
                              ? 'border-white/[0.08] bg-black/20 text-slate-200 hover:bg-white/[0.05] hover:text-white' 
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
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

      {/* Delivery Confirmation (POD) Modal */}
      {showDeliveryModal && deliveryTargetChallan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-[24px] border shadow-2xl transition-all overflow-hidden ${
            isDarkMode ? 'border-white/[0.08] bg-[#171b24] text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            {/* Mobile Grab Handle */}
            <div className="pt-2.5 pb-0 block sm:hidden">
              <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto" />
            </div>

            <div className={`flex items-center justify-between p-4 sm:p-6 border-b shrink-0 ${isDarkMode ? 'border-white/[0.07] bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Confirm Delivery (POD)</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Challan: <strong className="text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{deliveryTargetChallan.challanNo}</strong> • PO: <strong>{deliveryTargetChallan.orderPo}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-white/[0.08] bg-black/20 text-slate-400 hover:text-white hover:bg-white/[0.05]' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deliveryError && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deliveryError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDeliverySubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1.5">
                  Delivery Receipt Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-mono focus:outline-none transition-all ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1.5">
                  Received By / Consignee Incharge
                </label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="e.g. Customer Plant Inward / Store Manager"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-all ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1.5">
                  Proof of Delivery (POD) Document
                </label>
                <input
                  type="text"
                  value={podDocumentUrl}
                  onChange={(e) => setPodDocumentUrl(e.target.value)}
                  placeholder="https://.../signed-pod.pdf or Physical Copy"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-mono focus:outline-none transition-all ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1.5">
                  Receipt Remarks
                </label>
                <textarea
                  rows={2}
                  value={podRemarks}
                  onChange={(e) => setPodRemarks(e.target.value)}
                  placeholder="Verified quantity and outward seal intact..."
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className={`flex items-center justify-end gap-2.5 pt-3 border-t shrink-0 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border text-xs font-mono font-semibold transition-all ${
                    isDarkMode ? 'border-white/[0.08] bg-black/20 text-slate-400 hover:text-white hover:bg-white/[0.05]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDelivering}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {isDelivering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying POD...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Delivery</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Delivery Challan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-[24px] border shadow-2xl transition-all overflow-hidden ${
            isDarkMode ? 'border-white/[0.08] bg-[#171b24] text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            {/* Mobile Grab Handle */}
            <div className="pt-2.5 pb-0 block sm:hidden">
              <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto" />
            </div>

            <div className={`flex items-center justify-between p-4 sm:p-6 border-b shrink-0 ${isDarkMode ? 'border-white/[0.07] bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Issue Delivery Challan
                  </h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Dispatch outward consignment & logistics manifest
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !isSubmitting && setShowCreateModal(false)} 
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-white/[0.08] bg-black/20 text-slate-400 hover:text-white hover:bg-white/[0.05]' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Customer Order PO *</label>
                <select
                  value={orderPo}
                  onChange={(e) => setOrderPo(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono font-bold outline-none cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                >
                  {orders.map(o => (
                    <option key={o.id} value={o.poNo}>{o.poNo} — {o.customerName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Transporter Partner *</label>
                <select
                  required
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-[#171b24] text-white focus:border-[var(--accent-border-dark)]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                >
                  {allTransporterOptions.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Vehicle Registration # *</label>
                  <input
                    type="text"
                    required
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. MH 12 AB 4589"
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">LR / Docket Number</label>
                  <input
                    type="text"
                    value={lrNo}
                    onChange={(e) => setLrNo(e.target.value)}
                    placeholder="e.g. VRL-98762"
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">E-Way Bill Number</label>
                  <input
                    type="text"
                    value={eWayBillNo}
                    onChange={(e) => setEWayBillNo(e.target.value)}
                    placeholder="e.g. 2710 9821 4455"
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Driver Contact Phone</label>
                  <input
                    type="text"
                    value={driverContact}
                    onChange={(e) => setDriverContact(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Delivery Notes & Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Goods packed in sealed crates with rust-proof coating"
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex items-center justify-end gap-3 shrink-0 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => setShowCreateModal(false)} 
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-slate-300 hover:bg-white/[0.05]' 
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !vehicleNo.trim()}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[var(--accent-shadow)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Issuing Challan...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Issue Challan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Challan Detail View Modal (View, Edit while Draft, Print, PDF) */}
      <ChallanDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        challan={selectedChallan}
        order={selectedOrderForModal}
        isDarkMode={isDarkMode}
        transporters={allTransporterOptions}
        onUpdateChallan={onUpdateChallan}
        onDispatchChallan={async (challanNo) => {
          if (onDispatchChallan) {
            await onDispatchChallan(challanNo);
          }
          setSelectedChallan(prev => prev ? { ...prev, status: 'DISPATCHED' } : null);
        }}
        onMarkDelivered={onMarkDelivered}
        onNavigateToOrder={onNavigateToOrder}
      />

    </div>
  );
};

export default DispatchView;
