import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  X,
  Printer,
  Download,
  Edit3,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  Lock,
  Building2,
  Calendar,
  Phone,
  Hash,
  FileCheck,
  Copy,
  Check,
  Clock,
  Layers,
  Eye,
  MapPin,
  ExternalLink,
  Barcode,
  RotateCcw
} from 'lucide-react';
import { DispatchChallan, CustomerOrder, DispatchChallanLine } from '../../../types/console';
import { printElementById } from '../../../utils/printDocument';
import { useCtaPermission } from '../../../hooks/useCtaPermission';

const DEFAULT_TRANSPORTERS = [
  'VRL Logistics Ltd',
  'TCI Express Ltd',
  'Safechem Logistics',
  'Gati KWE Ltd',
  'Blue Dart Express',
  'Mahindra Logistics',
  'Self Pick-up (Customer Transport)'
];

interface ChallanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  challan: DispatchChallan | null;
  order?: CustomerOrder | null;
  isDarkMode?: boolean;
  transporters?: string[];
  onUpdateChallan?: (challanNo: string, updates: any) => Promise<any>;
  onCancelChallan?: (challanNo: string, reason?: string) => Promise<void>;
  onDispatchChallan?: (challanNo: string) => Promise<void>;
  onMarkDelivered?: (orderId: string, deliveryData: any) => Promise<any> | void;
  onNavigateToOrder?: (orderPo: string) => void;
}

export const ChallanDetailModal: React.FC<ChallanDetailModalProps> = ({
  isOpen,
  onClose,
  challan,
  order,
  isDarkMode = true,
  transporters = DEFAULT_TRANSPORTERS,
  onUpdateChallan,
  onCancelChallan,
  onDispatchChallan,
  onMarkDelivered,
  onNavigateToOrder
}) => {
  const canMarkInTransit = useCtaPermission('MARK_IN_TRANSIT');

  // Navigation tab: 'overview' (Modern Apple Cockpit) vs 'document' (Official Rule 55 Sheet)
  const [activeTab, setActiveTab] = useState<'overview' | 'document'>('overview');

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [currentStatus, setCurrentStatus] = useState<string>(challan?.status || 'DRAFT');

  // Edit form state
  const [editTransporter, setEditTransporter] = useState('');
  const [editVehicleNo, setEditVehicleNo] = useState('');
  const [editLrNo, setEditLrNo] = useState('');
  const [editEWayBillNo, setEditEWayBillNo] = useState('');
  const [editDriverContact, setEditDriverContact] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLines, setEditLines] = useState<DispatchChallanLine[]>([]);

  // Cancel dialog state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const printableRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync state ONLY when a different challan is opened
  useEffect(() => {
    if (!challan) return;

    setCurrentStatus(challan.status || 'DRAFT');
    setEditTransporter(challan.transporter || transporters[0] || 'VRL Logistics Ltd');
    setEditVehicleNo(challan.vehicleNo || '');
    setEditLrNo(challan.lrNo || '');
    setEditEWayBillNo(challan.eWayBillNo || '');
    setEditDriverContact(challan.driverContact || '');
    setEditRemarks(challan.remarks || '');
    setEditDate(challan.date || new Date().toISOString().split('T')[0]);

    if (challan.lines && challan.lines.length > 0) {
      setEditLines(challan.lines);
    } else if (challan.items && challan.items.length > 0) {
      setEditLines(challan.items);
    } else if (order?.lines && order.lines.length > 0) {
      setEditLines(
        order.lines.map(l => ({
          itemCode: l.itemCode,
          itemDescription: l.itemDescription,
          hsnCode: '84834000',
          qty: Number(l.dispatchedQty || l.orderQty || 1),
          unit: l.unit || 'NOS',
          rate: Number(l.rate || 0),
          approxValue: Number(l.orderQty || 1) * Number(l.rate || 0)
        }))
      );
    } else {
      setEditLines([
        {
          itemCode: 'PART-001',
          itemDescription: 'Precision Machined Component',
          hsnCode: '84834000',
          qty: 100,
          unit: 'NOS',
          rate: 250,
          approxValue: 25000
        }
      ]);
    }
    setIsEditing(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowCancelConfirm(false);
    setActiveTab('overview');
  }, [challan?.challanNo, challan?.id]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCancelConfirm) {
          setShowCancelConfirm(false);
        } else if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showCancelConfirm, isEditing, onClose]);

  if (!isOpen || !challan) return null;

  const effectiveStatus = currentStatus || challan.status || 'DRAFT';
  const isDispatched = ['DISPATCHED', 'IN_TRANSIT'].includes(effectiveStatus);
  const isDelivered = effectiveStatus === 'DELIVERED';
  const isCancelled = effectiveStatus === 'CANCELLED';
  const isDraft = !isDispatched && !isDelivered && !isCancelled && ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(effectiveStatus);

  // Status stage for Apple stepper (0: Draft, 1: Ready, 2: In-Transit, 3: Delivered)
  const currentStageIndex = isCancelled
    ? -1
    : isDelivered
      ? 3
      : isDispatched
        ? 2
        : effectiveStatus === 'DISPATCH_READY'
          ? 1
          : 0;

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Safe order navigation helper
  const handleOrderNavigation = () => {
    onClose();
    if (challan.orderPo) {
      onNavigateToOrder?.(challan.orderPo);
    }
  };

  const handleUpdateQuantity = (idx: number, newQty: number) => {
    setEditLines(prev => {
      const next = [...prev];
      const validQty = Math.max(1, isNaN(newQty) ? 1 : newQty);
      next[idx] = {
        ...next[idx],
        qty: validQty,
        approxValue: validQty * Number(next[idx].rate || 100)
      };
      return next;
    });
  };

  const handleSaveEdits = async () => {
    if (!editVehicleNo.trim()) {
      setErrorMsg('Vehicle Registration Number is required.');
      return;
    }
    if (!editTransporter.trim()) {
      setErrorMsg('Transporter partner is required.');
      return;
    }
    for (let i = 0; i < editLines.length; i++) {
      if (Number(editLines[i].qty) <= 0) {
        setErrorMsg(`Line #${i + 1}: Dispatch quantity must be greater than 0.`);
        return;
      }
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      if (onUpdateChallan) {
        await onUpdateChallan(challan.challanNo, {
          transporter: editTransporter.trim(),
          vehicleNo: editVehicleNo.trim(),
          lrNo: editLrNo.trim(),
          eWayBillNo: editEWayBillNo.trim(),
          driverContact: editDriverContact.trim(),
          remarks: editRemarks.trim(),
          date: editDate,
          lines: editLines,
          items: editLines,
          linesCount: editLines.length
        });
      }

      setSuccessMsg('Delivery Challan updated successfully.');
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update delivery challan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      setErrorMsg('A cancellation reason is required.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      if (onCancelChallan) {
        await onCancelChallan(challan.challanNo, cancelReason.trim());
      }
      setShowCancelConfirm(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to cancel delivery challan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthorizeDispatch = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      if (onDispatchChallan) {
        await onDispatchChallan(challan.challanNo);
      }
      setCurrentStatus('DISPATCHED');
      setSuccessMsg(`Challan ${challan.challanNo} successfully authorized and marked IN-TRANSIT.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to dispatch challan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    printElementById('challan-printable-document', `Delivery Challan - ${challan.challanNo}`);
  };

  const handleDownloadPdf = () => {
    printElementById('challan-printable-document', `Delivery Challan - ${challan.challanNo}`);
  };

  // Metrics computation
  const totalQty = editLines.reduce((acc, line) => acc + (Number(line.qty) || 0), 0);
  const totalEstValue = editLines.reduce(
    (acc, line) => acc + ((Number(line.qty) || 0) * (Number(line.rate) || 0)),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 font-sans overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isEditing && !showCancelConfirm) {
          onClose();
        }
      }}
    >
      {/* Apple Sheet Window Container */}
      <div
        id="challan-print-container"
        className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden ${
          isDarkMode
            ? 'bg-[#121316]/95 border-white/[0.08] text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.85),0_1px_1px_rgba(255,255,255,0.06)_inset]'
            : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18),0_1px_1px_rgba(255,255,255,0.9)_inset]'
        }`}
      >
        {/* ============================================================ */}
        {/* TOP RIGHT CORNER CLOSE BUTTON                                */}
        {/* ============================================================ */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3.5 right-4 sm:top-4 sm:right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
            isDarkMode
              ? 'bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300'
          }`}
          title="Close (Esc)"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ============================================================ */}
        {/* 1. APPLE TITLE BAR & TOOLBAR (macOS / iOS Navigation Bar)   */}
        {/* ============================================================ */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 pr-16 sm:pr-20 border-b ${
            isDarkMode
              ? 'border-white/[0.07] bg-[#16171c]/80 backdrop-blur-xl'
              : 'border-slate-200/80 bg-slate-50/90 backdrop-blur-xl'
          } no-print`}
        >
          {/* Left Title & Status Area */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs transition-transform duration-200 hover:scale-105 ${
                isDraft
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                  : isDispatched
                    ? 'bg-blue-500/10 border-blue-500/25 text-blue-500'
                    : isDelivered
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-500'
              }`}
            >
              <Truck className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-mono text-base sm:text-lg font-bold tracking-tight">
                  {challan.challanNo}
                </h2>

                {/* Quick Copy Button */}
                <button
                  type="button"
                  onClick={() => handleCopy(challan.challanNo, 'challanNo')}
                  className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    copiedKey === 'challanNo'
                      ? 'text-emerald-500 bg-emerald-500/10'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Copy Challan Number"
                >
                  {copiedKey === 'challanNo' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Apple Status Capsule */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border shadow-2xs ${
                    isDraft
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                      : isDispatched
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                        : isDelivered
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isDraft
                        ? 'bg-amber-500'
                        : isDispatched
                          ? 'bg-blue-500 animate-pulse'
                          : isDelivered
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                    }`}
                  />
                  <span>{effectiveStatus}</span>
                </span>
              </div>

              {/* Subtitle Breadcrumb with Linked PO Navigation */}
              <div
                className={`text-xs mt-0.5 flex flex-wrap items-center gap-2 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <span>Outward Delivery Challan (Rule 55)</span>
                <span className="opacity-40">•</span>
                <span>Linked PO:</span>
                <button
                  type="button"
                  onClick={handleOrderNavigation}
                  className="font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-[#5B75F8] dark:hover:text-[#7B92FF] hover:underline inline-flex items-center gap-0.5 cursor-pointer transition-colors"
                  title={`Open order ${challan.orderPo}`}
                >
                  <span>{challan.orderPo}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            </div>
          </div>

          {/* Center/Right Toolbar & View Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Apple Segmented View Control */}
            {!isEditing && (
              <div
                className={`inline-flex items-center p-1 rounded-xl border shadow-2xs ${
                  isDarkMode
                    ? 'bg-black/60 border-white/15'
                    : 'bg-slate-200/90 border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('overview');
                    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'overview'
                      ? 'bg-[#5B75F8] text-white shadow-md'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('document');
                    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'document'
                      ? 'bg-[#5B75F8] text-white shadow-md'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Rule 55 Sheet</span>
                </button>
              </div>
            )}

            {/* Print Action */}
            <button
              type="button"
              onClick={handlePrint}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80'
              }`}
              title="Print Official Delivery Challan"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden md:inline">Print</span>
            </button>

            {/* PDF Action */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80'
              }`}
              title="Download or Export as PDF"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden md:inline">PDF</span>
            </button>

            {/* Edit Action (Draft only) */}
            {isDraft && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts & Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs flex items-center gap-2.5 no-print animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs flex items-center gap-2.5 no-print animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. SCROLLABLE BODY                                           */}
        {/* ============================================================ */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
        >
          {/* ============================================================ */}
          {/* A. EDIT MODE VIEW                                            */}
          {/* ============================================================ */}
          {isEditing ? (
            <div className="space-y-6 no-print animate-in fade-in">
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isDarkMode
                    ? 'bg-amber-500/10 border-amber-500/25'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Editing Delivery Challan ({challan.challanNo})
                    </h4>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-300/70">
                      Draft mode allows updating logistics carrier, identifiers, and allocation quantities.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                  Audit Logged
                </span>
              </div>

              {/* Grouped Form Card: Carrier & Dispatch Info */}
              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  isDarkMode
                    ? 'bg-white/[0.02] border-white/[0.08]'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Logistics Carrier & Fleet Details</span>
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Transporter */}
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                      Transporter Partner *
                    </label>
                    <input
                      type="text"
                      required
                      list="transporters-list"
                      value={editTransporter}
                      onChange={(e) => setEditTransporter(e.target.value)}
                      placeholder="e.g. VRL Logistics Ltd, Safechem Logistics"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-all ${
                        isDarkMode
                          ? 'bg-black/50 border-white/10 text-white focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/30'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20'
                      }`}
                    />
                    <datalist id="transporters-list">
                      {transporters.map((t, idx) => (
                        <option key={idx} value={t} />
                      ))}
                    </datalist>
                  </div>

                  {/* Vehicle Number */}
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                      Vehicle Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={editVehicleNo}
                      onChange={(e) => setEditVehicleNo(e.target.value)}
                      placeholder="e.g. MH 12 AB 4589"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all uppercase ${
                        isDarkMode
                          ? 'bg-black/50 border-white/10 text-white focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/30'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20'
                      }`}
                    />
                  </div>

                  {/* LR Number */}
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                      LR / Docket Number
                    </label>
                    <input
                      type="text"
                      value={editLrNo}
                      onChange={(e) => setEditLrNo(e.target.value)}
                      placeholder="e.g. VRL-DOC-98762"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                        isDarkMode
                          ? 'bg-black/50 border-white/10 text-white focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/30'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20'
                      }`}
                    />
                  </div>

                  {/* E-Way Bill Number */}
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                      E-Way Bill Number (GST Statutory)
                    </label>
                    <input
                      type="text"
                      value={editEWayBillNo}
                      onChange={(e) => setEditEWayBillNo(e.target.value)}
                      placeholder="e.g. 2710 9821 4455"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                        isDarkMode
                          ? 'bg-black/50 border-white/10 text-white focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/30'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20'
                      }`}
                    />
                  </div>

                  {/* Driver Contact */}
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                      Driver Contact / Phone
                    </label>
                    <input
                      type="text"
                      value={editDriverContact}
                      onChange={(e) => setEditDriverContact(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                        isDarkMode
                          ? 'bg-black/50 border-white/10 text-white focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/30'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20'
                      }`}
                    />
                  </div>

                  {/* Dispatch Date */}
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                      Dispatch Date
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                        isDarkMode
                          ? 'bg-black/50 border-white/10 text-white focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/30'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20'
                      }`}
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Delivery Notes & Consignment Remarks
                  </label>
                  <input
                    type="text"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    placeholder="e.g. Goods packed in sealed wooden crates with rust-proof VCI covers"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-all ${
                      isDarkMode
                        ? 'bg-black/50 border-white/10 text-white focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20'
                    }`}
                  />
                </div>
              </div>

              {/* Grouped Table: Line Item Quantities */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Consignment Line Quantities (Pre-Dispatch Pool)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Total: {totalQty.toLocaleString('en-IN')} units
                  </span>
                </div>

                <div
                  className={`rounded-2xl border overflow-hidden ${
                    isDarkMode
                      ? 'border-white/[0.08] bg-white/[0.02]'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr
                        className={`border-b ${
                          isDarkMode
                            ? 'border-white/[0.08] text-slate-400 bg-white/[0.03]'
                            : 'border-slate-200 text-slate-600 bg-slate-100/70'
                        }`}
                      >
                        <th className="py-2.5 px-4 font-mono font-medium">#</th>
                        <th className="py-2.5 px-4 font-mono font-medium">Item Code</th>
                        <th className="py-2.5 px-4 font-medium">Description</th>
                        <th className="py-2.5 px-4 font-medium text-right">Dispatch Qty</th>
                        <th className="py-2.5 px-4 font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editLines.map((line, idx) => (
                        <tr
                          key={idx}
                          className={`border-b last:border-0 ${
                            isDarkMode ? 'border-white/[0.06]' : 'border-slate-200/70'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-500 dark:text-blue-400">
                            {line.itemCode}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                            {line.itemDescription || 'Precision Component'}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <input
                              type="number"
                              min="1"
                              value={line.qty}
                              onChange={(e) => handleUpdateQuantity(idx, Number(e.target.value))}
                              className={`w-28 text-right font-mono font-bold px-3 py-1.5 rounded-xl border outline-none transition-all ${
                                isDarkMode
                                  ? 'bg-black/60 border-white/15 text-white focus:border-[#5B75F8] focus:ring-1 focus:ring-[#5B75F8]'
                                  : 'bg-white border-slate-300 text-slate-900 focus:border-[#5B75F8] focus:ring-1 focus:ring-[#5B75F8]'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-400">{line.unit || 'NOS'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form Action Controls */}
              <div
                className={`flex items-center justify-end gap-3 pt-3 border-t ${
                  isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    isDarkMode
                      ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveEdits}
                  className="px-5 py-2 rounded-xl bg-[#5B75F8] hover:bg-[#4A63E7] text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-[#5B75F8]/25 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Draft Changes'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* B. READ / PREVIEW MODE                                       */
            /* ============================================================ */
            <div className="space-y-6">
              {/* ============================================================ */}
              {/* TAB 1: OVERVIEW COCKPIT (Apple Bento Card Presentation)      */}
              {/* ============================================================ */}
              {activeTab === 'overview' && (
                <div className="space-y-6 no-print animate-in fade-in duration-200">
                  {/* -------------------------------------------------------- */}
                  {/* APPLE DELIVERY PROCESS STEPPER (Visual Stage Timeline)   */}
                  {/* -------------------------------------------------------- */}
                  {!isCancelled && (
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border shadow-2xs ${
                        isDarkMode
                          ? 'bg-white/[0.02] border-white/[0.08]'
                          : 'bg-slate-50/80 border-slate-200/80'
                      }`}
                    >
                      <div className="grid grid-cols-4 gap-2 text-center relative">
                        {[
                          { step: 0, title: 'Draft Created', desc: 'Rule 55 Generated' },
                          { step: 1, title: 'Dispatch Ready', desc: 'PDI & Pack Cleared' },
                          { step: 2, title: 'In-Transit', desc: 'On Fleet Route' },
                          { step: 3, title: 'Delivered', desc: 'POD Acknowledged' }
                        ].map((stage, idx) => {
                          const isComplete = currentStageIndex > stage.step;
                          const isCurrent = currentStageIndex === stage.step;

                          return (
                            <div key={idx} className="flex flex-col items-center relative z-10">
                              {/* Node Icon */}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                  isComplete
                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                    : isCurrent
                                      ? 'bg-[#5B75F8] text-white ring-4 ring-[#5B75F8]/20 shadow-sm shadow-[#5B75F8]/40 animate-pulse'
                                      : isDarkMode
                                        ? 'bg-white/10 text-slate-500 border border-white/10'
                                        : 'bg-slate-200 text-slate-400 border border-slate-300'
                                }`}
                              >
                                {isComplete ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <span>{idx + 1}</span>
                                )}
                              </div>

                              <div className="mt-2 text-left sm:text-center">
                                <p
                                  className={`text-[11px] sm:text-xs font-semibold ${
                                    isCurrent
                                      ? 'text-[#5B75F8] dark:text-[#7B92FF]'
                                      : isComplete
                                        ? 'text-slate-800 dark:text-slate-200'
                                        : 'text-slate-400'
                                  }`}
                                >
                                  {stage.title}
                                </p>
                                <p className="text-[10px] text-slate-400 hidden sm:block">
                                  {stage.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                        {/* Stepper Progress Bar Track */}
                        <div
                          className={`absolute top-3.5 left-[12%] right-[12%] h-0.5 -z-0 ${
                            isDarkMode ? 'bg-white/10' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-[#5B75F8] to-[#5B75F8] transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(0, (currentStageIndex / 3) * 100))}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Notice Banner if Locked */}
                  {!isDraft && (
                    <div
                      className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        isDispatched
                          ? 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-300'
                          : isDelivered
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-medium">
                          <strong>IMMUTABLE RECORD:</strong> Challan is marked as{' '}
                          <strong>{effectiveStatus}</strong>. Transport and quantities are locked for GST compliance.
                        </span>
                      </div>
                      <span className="text-[11px] font-mono opacity-80 hidden sm:inline">
                        GST Rule 55 Compliant
                      </span>
                    </div>
                  )}

                  {/* Bento Metrics Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Line Items Tile */}
                    <div
                      className={`p-4 rounded-2xl border shadow-2xs ${
                        isDarkMode
                          ? 'bg-white/[0.02] border-white/[0.08]'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">
                        Manifest Items
                      </span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                          {editLines.length}
                        </span>
                        <span className="text-xs text-slate-400">Part Codes</span>
                      </div>
                    </div>

                    {/* Total Dispatched Qty */}
                    <div
                      className={`p-4 rounded-2xl border shadow-2xs ${
                        isDarkMode
                          ? 'bg-white/[0.02] border-white/[0.08]'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">
                        Total Quantity Dispatched
                      </span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {totalQty.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-400">Total Units</span>
                      </div>
                    </div>

                    {/* Consignment Valuation */}
                    <div
                      className={`p-4 rounded-2xl border shadow-2xs ${
                        isDarkMode
                          ? 'bg-white/[0.02] border-white/[0.08]'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">
                        Approximate Value
                      </span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                          ₹{totalEstValue.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">INR</span>
                      </div>
                    </div>
                  </div>

                  {/* 2 Bento Cards: Consignee & Transport */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Consignee Card */}
                    <div
                      className={`p-5 rounded-2xl border shadow-2xs space-y-3.5 ${
                        isDarkMode
                          ? 'bg-white/[0.02] border-white/[0.08]'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Consignee (Ship To)</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-semibold">
                          Registered Party
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {order?.customerName || 'Tata Motors Commercial Vehicles Ltd'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {order?.shippingAddress || 'Plot 12, Pimpri Industrial Zone, Pune, Maharashtra 411018'}
                        </p>
                      </div>

                      <div
                        className={`pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${
                          isDarkMode ? 'border-white/[0.06]' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">GSTIN:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {order?.customerGstin || '27AABCT1234F1Z8'}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">State: 27 (MH)</span>
                      </div>
                    </div>

                    {/* Carrier & Fleet Card */}
                    <div
                      className={`p-5 rounded-2xl border shadow-2xs space-y-3.5 ${
                        isDarkMode
                          ? 'bg-white/[0.02] border-white/[0.08]'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                          <span>Fleet & Movement Data</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-semibold">
                          {challan.transporter || 'Self Logistics'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-sans">
                            Vehicle Number
                          </span>
                          <span className="font-bold text-sm text-purple-600 dark:text-purple-400">
                            {challan.vehicleNo || '—'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-sans">
                            LR / Docket #
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {challan.lrNo || '—'}
                            </span>
                            {challan.lrNo && (
                              <button
                                type="button"
                                onClick={() => handleCopy(challan.lrNo!, 'lrNo')}
                                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                              >
                                {copiedKey === 'lrNo' ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-sans">
                            E-Way Bill #
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {challan.eWayBillNo || '—'}
                            </span>
                            {challan.eWayBillNo && (
                              <button
                                type="button"
                                onClick={() => handleCopy(challan.eWayBillNo!, 'eWay')}
                                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                              >
                                {copiedKey === 'eWay' ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-sans">
                            Driver Phone
                          </span>
                          {challan.driverContact ? (
                            <a
                              href={`tel:${challan.driverContact}`}
                              className="font-bold text-blue-500 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{challan.driverContact}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`pt-2 border-t flex items-center justify-between text-[11px] font-mono ${
                          isDarkMode ? 'border-white/[0.06]' : 'border-slate-200'
                        }`}
                      >
                        <span className="text-slate-400">Dispatch Date:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {challan.date || new Date().toISOString().split('T')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Consignment Items Table */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Dispatched Material Breakdown</span>
                      </h4>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>PDI & Quality Cleared</span>
                      </span>
                    </div>

                    <div
                      className={`rounded-2xl border overflow-hidden shadow-2xs ${
                        isDarkMode
                          ? 'border-white/[0.08] bg-white/[0.02]'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr
                            className={`border-b ${
                              isDarkMode
                                ? 'bg-white/[0.03] border-white/[0.08] text-slate-400'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <th className="py-3 px-4 font-mono font-medium">#</th>
                            <th className="py-3 px-4 font-mono font-medium">Part Code</th>
                            <th className="py-3 px-4 font-medium">Description & Specs</th>
                            <th className="py-3 px-4 font-mono font-medium text-center">HSN</th>
                            <th className="py-3 px-4 font-medium text-right">Qty</th>
                            <th className="py-3 px-4 font-mono font-medium">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editLines.map((line, idx) => (
                            <tr
                              key={idx}
                              className={`border-b last:border-0 ${
                                isDarkMode ? 'border-white/[0.06]' : 'border-slate-200/70'
                              }`}
                            >
                              <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-3 px-4 font-mono font-bold text-blue-500 dark:text-blue-400">
                                {line.itemCode}
                              </td>
                              <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                                <p className="font-semibold">
                                  {line.itemDescription || 'Machined Precision Component'}
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  Tolerance Grade 6H • Surface Finish Ra 0.8µm
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-slate-400">
                                {line.hsnCode || '84834000'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                {Number(line.qty).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-400">
                                {line.unit || 'NOS'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Delivery Notes / Remarks */}
                  {challan.remarks && (
                    <div
                      className={`p-4 rounded-2xl border text-xs shadow-2xs flex items-start gap-2.5 ${
                        isDarkMode
                          ? 'bg-white/[0.02] border-white/[0.08] text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold block mb-0.5">Delivery Notes:</strong>
                        <span>{challan.remarks}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 2 / PRINTABLE STATUTORY DOCUMENT (Rule 55 Compliant)      */}
              {/* Note: Always in DOM for printElementById to capture reliably */}
              {/* ============================================================ */}
              <div
                id="challan-printable-document"
                ref={printableRef}
                className={`space-y-6 printable-document ${
                  activeTab === 'document' ? 'block animate-in fade-in duration-200' : 'hidden print:block'
                }`}
              >
                {/* On-Screen Document Viewer Banner */}
                <div
                  className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2.5 no-print ${
                    isDarkMode
                      ? 'bg-blue-500/10 border-blue-500/25 text-blue-300'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <FileText className="w-4 h-4 text-[#5B75F8]" />
                    <span>Official Statutory Delivery Challan Preview • Prepared under GST Rule 55</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-3 py-1 rounded-lg bg-[#5B75F8] text-white text-xs font-semibold hover:bg-[#4A63E7] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print Document</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                        isDarkMode
                          ? 'border-white/10 bg-white/10 text-white hover:bg-white/15'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                </div>

                {/* Official Rule 55 Authentic Paper Sheet Card */}
                <div className="p-6 sm:p-10 rounded-2xl border border-slate-300 bg-white text-slate-900 shadow-2xl space-y-6 print-clean-box max-w-4xl mx-auto">
                  {/* 1. Legal Company Letterhead */}
                  <div className="border-b-2 border-slate-900 pb-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300 mb-1">
                          PRECISION MANUFACTURING ENTERPRISE
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                          GuruOm Industries LLP
                        </h3>
                        <p className="text-xs text-slate-600 max-w-xl mt-0.5">
                          Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono mt-2 text-slate-700">
                          <span><strong>GSTIN:</strong> 27AABCG1234F1Z5</span>
                          <span><strong>State Code:</strong> 27 (Maharashtra)</span>
                          <span><strong>PAN:</strong> AABCG1234F</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right sm:border-l-2 sm:border-slate-300 sm:pl-6">
                        <div className="inline-block px-3 py-1 rounded-lg bg-slate-900 text-white font-mono font-black text-sm uppercase">
                          DELIVERY CHALLAN
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 mt-1 font-semibold">
                          Under GST Rule 55 — Movement of Goods
                        </p>
                        <p className="text-xs font-mono font-bold text-slate-900 mt-1">
                          Challan No: <span className="text-blue-700">{challan.challanNo}</span>
                        </p>
                        <p className="text-xs font-mono text-slate-600 mt-0.5">
                          Date: {challan.date || new Date().toISOString().split('T')[0]}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Consignee & Transport Meta Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Consignee Info */}
                    <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-600">
                        <Building2 className="w-3.5 h-3.5 text-blue-700" />
                        <span>Consignee (Deliver To)</span>
                      </div>
                      <div className="text-xs space-y-1 text-slate-800">
                        <p className="font-bold text-sm text-slate-900">
                          {order?.customerName || 'Tata Motors Commercial Vehicles Ltd'}
                        </p>
                        <p className="text-slate-600">
                          {order?.shippingAddress || 'Plot 12, Pimpri Industrial Zone, Pune, Maharashtra 411018'}
                        </p>
                        <p className="font-mono">
                          <strong>GSTIN:</strong> {order?.customerGstin || '27AABCT1234F1Z8'}
                        </p>
                        <p className="font-mono">
                          <strong>State:</strong> Maharashtra (Code: 27)
                        </p>
                      </div>
                    </div>

                    {/* Transport & Order Details */}
                    <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-600">
                        <Truck className="w-3.5 h-3.5 text-blue-700" />
                        <span>Transport & Reference Meta</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px]">CUSTOMER PO #</span>
                          <span className="font-bold text-slate-900">{challan.orderPo}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">TRANSPORTER</span>
                          <span className="font-bold text-slate-900">{challan.transporter || 'Self Pick-up'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">VEHICLE REG #</span>
                          <span className="font-bold text-blue-800">{challan.vehicleNo || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">LR / DOCKET #</span>
                          <span className="font-bold text-slate-900">{challan.lrNo || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">E-WAY BILL #</span>
                          <span className="font-bold text-emerald-700">{challan.eWayBillNo || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">DRIVER PHONE</span>
                          <span className="font-bold text-slate-900">{challan.driverContact || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Items Manifest Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold uppercase text-slate-600">
                      <span>Dispatched Material Breakdown</span>
                      <span className="text-[11px] text-slate-500">100% PDI & Compliance Cleared</span>
                    </div>

                    <div className="rounded-xl border border-slate-300 overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                            <th className="py-2.5 px-3 font-mono font-bold border-r border-slate-300">S.No</th>
                            <th className="py-2.5 px-3 font-mono font-bold border-r border-slate-300">Item / Part Code</th>
                            <th className="py-2.5 px-3 font-mono font-bold border-r border-slate-300">Description & Specification</th>
                            <th className="py-2.5 px-3 font-mono font-bold text-center border-r border-slate-300">HSN Code</th>
                            <th className="py-2.5 px-3 font-mono font-bold text-right border-r border-slate-300">Dispatched Qty</th>
                            <th className="py-2.5 px-3 font-mono font-bold">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editLines.map((line, idx) => (
                            <tr key={idx} className="border-b last:border-0 border-slate-300">
                              <td className="py-2.5 px-3 font-mono text-slate-600 border-r border-slate-300">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-900 border-r border-slate-300">
                                {line.itemCode}
                              </td>
                              <td className="py-2.5 px-3 text-slate-800 border-r border-slate-300">
                                <p className="font-semibold">{line.itemDescription || 'Machined Precision Component'}</p>
                                <span className="text-[10px] text-slate-500">
                                  Tolerance Class Grade 6H • Surface Finish Ra 0.8µm
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600 border-r border-slate-300">
                                {line.hsnCode || '84834000'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-emerald-800 border-r border-slate-300">
                                {Number(line.qty).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{line.unit || 'NOS'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-bold border-t border-slate-300">
                            <td colSpan={4} className="py-2.5 px-3 text-right font-mono uppercase text-slate-700 border-r border-slate-300">
                              Total Dispatched Units:
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 border-r border-slate-300">
                              {totalQty.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">UNITS</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Remarks Block */}
                  {challan.remarks && (
                    <div className="p-3 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800">
                      <strong>Delivery Notes:</strong> {challan.remarks}
                    </div>
                  )}

                  {/* Statutory Terms & Declaration */}
                  <div className="border-t border-slate-300 pt-4 space-y-3">
                    <p className="text-[11px] text-slate-600 leading-relaxed italic">
                      <strong>Declaration:</strong> Goods dispatched in sound condition for industrial manufacturing delivery.
                      This is a Delivery Challan issued under Rule 55 of CGST Rules, 2017 for movement of goods, and does NOT constitute a Tax Invoice.
                    </p>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                      <div className="border-t border-dashed border-slate-400 pt-2 font-mono">
                        <p className="font-bold text-slate-900">
                          For GURU OM PRECISION ENGINEERING
                        </p>
                        <p className="text-[10px] text-slate-500">Authorized Logistics Officer / Signatory</p>
                      </div>

                      <div className="border-t border-dashed border-slate-400 pt-2 font-mono">
                        <p className="font-bold text-slate-900">RECEIVER'S SIGNATURE & STAMP</p>
                        <p className="text-[10px] text-slate-500">Received above goods in good condition & count</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* C. APPLE CANCELLATION SHEET (Modal confirmation)            */}
          {/* ============================================================ */}
          {showCancelConfirm && (
            <div
              className={`p-5 rounded-2xl border space-y-3.5 no-print animate-in fade-in duration-200 ${
                isDarkMode
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Delivery Challan Cancellation</span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-300">
                Are you sure you want to cancel Challan <strong>{challan.challanNo}</strong>? This action releases any reserved draft quantity back to the order pool and cannot be undone.
              </p>
              <div>
                <label className="block text-[11px] font-medium uppercase text-rose-600 dark:text-rose-400 mb-1">
                  Cancellation Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Duplicate draft creation / Customer requested postponement"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-all ${
                    isDarkMode
                      ? 'border-rose-500/40 bg-black/60 text-white focus:border-rose-400'
                      : 'border-rose-300 bg-white text-slate-900 focus:border-rose-500'
                  }`}
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    isDarkMode
                      ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Keep Challan
                </button>
                <button
                  type="button"
                  disabled={isSaving || !cancelReason.trim()}
                  onClick={handleCancelSubmit}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer disabled:opacity-50 transition-all shadow-sm shadow-rose-600/30"
                >
                  {isSaving ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 3. APPLE FOOTER DOCK (Toolbar Action Area)                   */}
        {/* ============================================================ */}
        <div
          className={`px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 no-print ${
            isDarkMode
              ? 'border-white/[0.07] bg-[#16171c]/80 backdrop-blur-xl'
              : 'border-slate-200/80 bg-slate-50/90 backdrop-blur-xl'
          }`}
        >
          {/* Left: Destructive or Secondary Action */}
          <div>
            {isDraft && !showCancelConfirm && !isEditing && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="px-3.5 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/25 text-xs font-medium cursor-pointer transition-all"
              >
                Cancel Challan
              </button>
            )}
          </div>

          {/* Right: Primary Call to Action */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                isDarkMode
                  ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Close
            </button>

            {isDraft ? (
              canMarkInTransit && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleAuthorizeDispatch}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5B75F8] to-[#4359D4] hover:from-[#4E67F0] hover:to-[#384DBE] text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-[#5B75F8]/30 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Processing...' : 'Authorize & Mark In-Transit'}</span>
                </button>
              )
            ) : isDispatched ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={async () => {
                    try {
                      setIsSaving(true);
                      setErrorMsg(null);
                      const today = new Date().toISOString().split('T')[0];
                      if (onUpdateChallan) {
                        await onUpdateChallan(challan.challanNo, {
                          status: 'DELIVERED',
                          podReceivedDate: today,
                          podReceivedBy: 'Customer Inward Plant Stores',
                          podDocumentUrl: 'https://storage.oracle.com/pod-signed-copy.pdf'
                        });
                      }
                      if (onMarkDelivered) {
                        await onMarkDelivered(challan.orderPo, {
                          podReceivedDate: today,
                          podReceivedBy: 'Customer Inward Plant Stores',
                          podDocumentUrl: 'https://storage.oracle.com/pod-signed-copy.pdf',
                          challanNo: challan.challanNo
                        });
                      }
                      setCurrentStatus('DELIVERED');
                      setSuccessMsg(`Challan ${challan.challanNo} confirmed Delivered with POD.`);
                    } catch (err: any) {
                      setErrorMsg(err?.message || 'Failed to mark delivery.');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/25 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Recording POD...' : 'Mark Delivered (POD)'}</span>
                </button>
                <span className="px-3 py-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/25 text-xs font-medium flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  <span>In-Transit</span>
                </span>
              </div>
            ) : isDelivered ? (
              <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Delivered & POD Verified</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
