import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  Plus, 
  Download, 
  CheckCircle2, 
  Search, 
  X, 
  MapPin, 
  PackageCheck, 
  Eye, 
  Printer, 
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

  const filteredDispatches = dispatches.filter(d => 
    d.challanNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.orderPo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.transporter && d.transporter.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.vehicleNo && d.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
    if (!deliveryTargetChallan || isDelivering) return;
    try {
      setIsDelivering(true);
      setDeliveryError(null);

      const targetPo = deliveryTargetChallan.orderPo;
      const targetOrd = orders.find(o => o.poNo === targetPo || o.id === targetPo || o.deliveryChallanNo === deliveryTargetChallan.challanNo);
      const targetId = targetOrd ? targetOrd.id : targetPo;

      if (onUpdateChallan) {
        await onUpdateChallan(deliveryTargetChallan.challanNo, {
          status: 'DELIVERED',
          podReceivedDate: deliveryDate,
          podReceivedBy: receivedBy.trim(),
          podDocumentUrl: podDocumentUrl.trim(),
          remarks: podRemarks.trim()
        });
      }

      if (onMarkDelivered) {
        await onMarkDelivered(targetId, {
          podReceivedDate: deliveryDate,
          podReceivedBy: receivedBy.trim(),
          podDocumentUrl: podDocumentUrl.trim(),
          remarks: podRemarks.trim(),
          challanNo: deliveryTargetChallan.challanNo
        });
      }

      setShowDeliveryModal(false);
      setDeliveryTargetChallan(null);
    } catch (err: any) {
      setDeliveryError(err?.message || 'Failed to mark order as delivered.');
    } finally {
      setIsDelivering(false);
    }
  };

  const preselectHandled = useRef<string | null>(null);
  useEffect(() => {
    if (!preselectedOrderPo || preselectHandled.current === preselectedOrderPo) return;
    preselectHandled.current = preselectedOrderPo;
    setOrderPo(preselectedOrderPo);
    const matchingOrder = orders.find(o => o.poNo === preselectedOrderPo || o.id === preselectedOrderPo);
    if (matchingOrder && matchingOrder.transporterName) {
      setTransporter(matchingOrder.transporterName);
    }
    setShowCreateModal(true);
    onDispatchModalOpened?.();
  }, [preselectedOrderPo, orders, onDispatchModalOpened]);

  const handleOpenCreateModal = () => {
    setOrderPo(orders[0]?.poNo || '');
    setTransporter(allTransporterOptions[0] || 'VRL Logistics Ltd');
    setVehicleNo('');
    setLrNo('');
    setEWayBillNo('');
    setRemarks('');
    setDriverContact('');
    setSubmitError(null);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!vehicleNo.trim()) {
      setSubmitError('Vehicle Registration Number is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

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

  const deliveredCount = dispatches.filter(d => d.status === 'DELIVERED' || d.status === 'DISPATCHED').length;
  const draftCount = dispatches.filter(d => ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(d.status)).length;
  const inTransitCount = dispatches.filter(d => d.status === 'DISPATCHED' || d.status === 'IN_TRANSIT').length;

  const selectedOrderForModal = orders.find(
    o => o.poNo === selectedChallan?.orderPo || o.id === selectedChallan?.orderPo
  );

  return (
    <div className="space-y-6 font-sans">
      
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
                Outward Logistics
              </span>
              <span className="text-xs text-slate-400 font-mono">• Delivery Challans Telemetry</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Dispatch & Delivery Schedule
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Generate delivery challans for PDI-approved finished goods, manage freight transporters, and track outbound shipments to customer plants.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Delivery Challan</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Total Consignments</span>
              <Truck className="w-4 h-4 text-[#5B75F8]" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2">{dispatches.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Outward Delivery Challans</div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Draft / Staging</span>
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2 text-amber-400">{draftCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Pending Gate Release</div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">In Transit</span>
              <MapPin className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2 text-cyan-400">{inTransitCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Dispatched On Road</div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Delivered (POD)</span>
              <PackageCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2 text-emerald-400">{deliveredCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Completed Consignments</div>
          </div>
        </div>
      </div>

      {/* Dispatches Search & Filter */}
      <div className={`p-6 rounded-3xl border space-y-4 ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search challan number, PO reference, vehicle number, transporter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs outline-none transition-all ${
                isDarkMode 
                  ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-[#5B75F8]' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#5B75F8]'
              }`}
            />
          </div>
          <div className="text-xs font-mono text-slate-400">
            Showing <strong>{filteredDispatches.length}</strong> of <strong>{dispatches.length}</strong> dispatches
          </div>
        </div>

        {/* Challans Interactive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
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
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">
                    No delivery challans found. Click "+ Generate Delivery Challan" to create one.
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((disp) => (
                  <tr 
                    key={disp.challanNo} 
                    className={`cursor-pointer transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF] flex items-center gap-2">
                      <span>{disp.challanNo}</span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400">
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
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(disp.status)
                            ? 'bg-amber-400'
                            : disp.status === 'DELIVERED'
                              ? 'bg-emerald-400'
                              : disp.status === 'CANCELLED'
                                ? 'bg-rose-400'
                                : 'bg-cyan-400'
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
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Delivered</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRowClick(disp)}
                          className={`p-2 rounded-xl border transition-all inline-flex items-center gap-1 text-xs font-mono font-bold ${
                            isDarkMode 
                              ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white' 
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-5 shadow-2xl transition-all ${
            isDarkMode ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Confirm Consignment Delivery (POD)</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Challan: <strong className="text-[#5B75F8] dark:text-[#7B92FF]">{deliveryTargetChallan.challanNo}</strong> • PO: <strong>{deliveryTargetChallan.orderPo}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deliveryError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deliveryError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDeliverySubmit} className="space-y-4">
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
                      ? 'bg-slate-950/60 border-slate-800 text-white focus:border-emerald-500' 
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
                      ? 'bg-slate-950/60 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1.5">
                  Proof of Delivery (POD) URL / Document Reference
                </label>
                <input
                  type="text"
                  value={podDocumentUrl}
                  onChange={(e) => setPodDocumentUrl(e.target.value)}
                  placeholder="https://.../signed-pod.pdf or Physical Copy #POD-1234"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-mono focus:outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/60 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1.5">
                  Receipt Remarks / Physical Verification Notes
                </label>
                <textarea
                  rows={2}
                  value={podRemarks}
                  onChange={(e) => setPodRemarks(e.target.value)}
                  placeholder="Verified quantity and outward seal intact..."
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/60 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-mono font-semibold transition-all ${
                    isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDelivering}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-emerald-600 hover:to-blue-600 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDelivering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying POD...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Delivery & Advance Pipeline</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ultra-Polished Issue Delivery Challan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-7 space-y-5 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Issue Delivery Challan
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Dispatch outward consignment & logistics manifest
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !isSubmitting && setShowCreateModal(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Customer Order PO *</label>
                <select
                  value={orderPo}
                  onChange={(e) => setOrderPo(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                >
                  {orders.map(o => (
                    <option key={o.id} value={o.poNo}>{o.poNo} — {o.customerName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Transporter Partner (Vendor Master) *</label>
                <select
                  required
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                >
                  {allTransporterOptions.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Vehicle Registration # *</label>
                  <input
                    type="text"
                    required
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. MH 12 AB 4589"
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
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
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">E-Way Bill Number</label>
                  <input
                    type="text"
                    value={eWayBillNo}
                    onChange={(e) => setEWayBillNo(e.target.value)}
                    placeholder="e.g. 2710 9821 4455"
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
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
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
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
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => setShowCreateModal(false)} 
                  className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800' 
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !vehicleNo.trim()}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[#5B75F8]/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Issuing Delivery Challan...</span>
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
