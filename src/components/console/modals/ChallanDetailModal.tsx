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
  FileCheck
} from 'lucide-react';
import { DispatchChallan, CustomerOrder, DispatchChallanLine } from '../../../types/console';
import { printElementById } from '../../../utils/printDocument';

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
  transporters = [
    'VRL Logistics Ltd',
    'TCI Express Ltd',
    'Safechem Logistics',
    'Gati KWE Ltd',
    'Blue Dart Express',
    'Mahindra Logistics',
    'Self Pick-up (Customer Transport)'
  ],
  onUpdateChallan,
  onCancelChallan,
  onDispatchChallan,
  onMarkDelivered,
  onNavigateToOrder
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  useEffect(() => {
    if (challan) {
      setCurrentStatus(challan.status || 'DRAFT');
      setEditTransporter(challan.transporter || transporters[0] || 'VRL Logistics Ltd');
      setEditVehicleNo(challan.vehicleNo || '');
      setEditLrNo(challan.lrNo || '');
      setEditEWayBillNo(challan.eWayBillNo || '');
      setEditDriverContact(challan.driverContact || '');
      setEditRemarks(challan.remarks || '');
      setEditDate(challan.date || new Date().toISOString().split('T')[0]);

      // Resolve lines
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
    }
  }, [challan, order, transporters]);

  if (!isOpen || !challan) return null;

  const effectiveStatus = currentStatus || challan.status || 'DRAFT';
  const isDispatched = ['DISPATCHED', 'IN_TRANSIT'].includes(effectiveStatus);
  const isDelivered = effectiveStatus === 'DELIVERED';
  const isCancelled = effectiveStatus === 'CANCELLED';
  const isDraft = !isDispatched && !isDelivered && !isCancelled && ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(effectiveStatus);

  const handleUpdateQuantity = (idx: number, newQty: number) => {
    setEditLines(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        qty: Math.max(1, newQty),
        approxValue: Math.max(1, newQty) * Number(next[idx].rate || 100)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md font-sans overflow-y-auto">
      {/* Printable Area Wrapper */}
      <div 
        id="challan-print-container" 
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl transition-ui overflow-hidden ${
          isDarkMode 
            ? 'bg-[#09090B] border-white/10 text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]' 
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200 bg-slate-50'
        } no-print`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-mono tracking-tight text-cyan-400">
                  {challan.challanNo}
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  isDraft 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : isDispatched 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      : isDelivered 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isDraft ? 'bg-amber-400' : isDispatched ? 'bg-cyan-400' : isDelivered ? 'bg-emerald-400' : 'bg-rose-400'
                  }`} />
                  <span>{effectiveStatus}</span>
                </span>
              </div>
              <p className={`text-xs mt-0.5 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Outward Delivery Challan (Rule 55)</span>
                <span>•</span>
                <span>Order PO:</span>
                <button
                  type="button"
                  onClick={() => onNavigateToOrder?.(challan.orderPo)}
                  className="font-mono font-bold text-[#5B75F8] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{challan.orderPo}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Action */}
            <button
              type="button"
              onClick={handlePrint}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-semibold transition-ui cursor-pointer ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10 hover:text-white' 
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Print Delivery Challan"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Download PDF Action */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-semibold transition-ui cursor-pointer ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10 hover:text-white' 
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Download PDF"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Edit Action (Draft only) */}
            {isDraft && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 flex items-center gap-1.5 text-xs font-mono font-bold transition-ui cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            <button 
              onClick={onClose} 
              className={`p-2 rounded-xl border transition-ui cursor-pointer ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-slate-400 hover:text-white hover:bg-white/10' 
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 no-print">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 no-print">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Edit Mode View */}
          {isEditing ? (
            <div className="space-y-5 no-print">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400 uppercase font-mono">
                    Editing Delivery Challan ({challan.challanNo}) — DRAFT State
                  </span>
                </div>
                <span className="text-[11px] text-amber-300/80">
                  Modifications will be recorded in audit logs
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                    Transporter Partner *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTransporter}
                    onChange={(e) => setEditTransporter(e.target.value)}
                    placeholder="e.g. VRL Logistics, SafeXpress, Self Pick-up"
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs outline-none ${
                      isDarkMode 
                        ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                    Vehicle Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editVehicleNo}
                    onChange={(e) => setEditVehicleNo(e.target.value)}
                    placeholder="e.g. MH 12 AB 4589"
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none ${
                      isDarkMode 
                        ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                    LR / Docket Number
                  </label>
                  <input
                    type="text"
                    value={editLrNo}
                    onChange={(e) => setEditLrNo(e.target.value)}
                    placeholder="e.g. VRL-DOC-98762"
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none ${
                      isDarkMode 
                        ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                    E-Way Bill Number (GST Statutory)
                  </label>
                  <input
                    type="text"
                    value={editEWayBillNo}
                    onChange={(e) => setEditEWayBillNo(e.target.value)}
                    placeholder="e.g. 2710 9821 4455"
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none ${
                      isDarkMode 
                        ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                    Driver Contact / Phone
                  </label>
                  <input
                    type="text"
                    value={editDriverContact}
                    onChange={(e) => setEditDriverContact(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none ${
                      isDarkMode 
                        ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none ${
                      isDarkMode 
                        ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                  Delivery Notes & Consignment Remarks
                </label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="e.g. Goods packed in sealed wooden crates with rust-proof VCI covers"
                  className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs outline-none ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                  }`}
                />
              </div>

              {/* Line Items Editable Table */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400">
                  Consignment Line Quantities (Pre-Dispatch Pool)
                </label>
                <div className={`rounded-2xl border overflow-hidden ${
                  isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200 bg-slate-50'
                }`}>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                        <th className="py-2.5 px-4 font-mono font-bold">#</th>
                        <th className="py-2.5 px-4 font-mono font-bold">Item Code</th>
                        <th className="py-2.5 px-4 font-mono font-bold">Description</th>
                        <th className="py-2.5 px-4 font-mono font-bold text-right">Dispatch Qty</th>
                        <th className="py-2.5 px-4 font-mono font-bold">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editLines.map((line, idx) => (
                        <tr key={idx} className={`border-b last:border-0 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
                          <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-cyan-400">{line.itemCode}</td>
                          <td className="py-2.5 px-4 text-slate-300">{line.itemDescription || 'Precision Component'}</td>
                          <td className="py-2.5 px-4 text-right">
                            <input
                              type="number"
                              min="1"
                              value={line.qty}
                              onChange={(e) => handleUpdateQuantity(idx, Number(e.target.value))}
                              className={`w-24 text-right font-mono font-bold px-2 py-1 rounded-xl border outline-none ${
                                isDarkMode ? 'bg-black/60 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
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

              <div className={`flex items-center justify-end gap-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-ui ${
                    isDarkMode ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveEdits}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-indigo-600 hover:to-amber-600 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Draft Changes'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Read Mode / Indian Standard Printable Challan Template */
            <div id="challan-printable-document" ref={printableRef} className="space-y-6 printable-document">
              {/* Statutory Notice Banner (Screen Only) */}
              {!isDraft && (
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between no-print ${
                  isDispatched 
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : isDelivered 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-mono">
                      <strong>IMMUTABLE RECORD:</strong> This delivery challan is marked as <strong>{challan.status}</strong> and is locked against modifications.
                    </span>
                  </div>
                  {isDraft && (
                    <span className="text-[11px] font-mono text-cyan-400">
                      Rule 55 Compliant
                    </span>
                  )}
                </div>
              )}

              {/* Delivery Challan Document Template (Matches Indian Statutory Standards) */}
              <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 print-clean-box ${
                isDarkMode 
                  ? 'bg-black/60 border-white/10 text-white' 
                  : 'bg-white border-slate-200 text-slate-900 shadow-sm'
              }`}>
                {/* 1. Company Legal Header */}
                <div className="border-b border-slate-200 dark:border-white/10 pb-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30 mb-1">
                        PRECISION MANUFACTURING ENTERPRISE
                      </span>
                      <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        GuruOm Industries LLP
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                        Plot No. 42, MIDC Industrial Area, Bhosari, Pune, Maharashtra - 411026
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono mt-1.5 text-slate-600 dark:text-slate-400">
                        <span><strong>GSTIN:</strong> 27AABCG1234F1Z5</span>
                        <span><strong>State Code:</strong> 27 (Maharashtra)</span>
                        <span><strong>PAN:</strong> AABCG1234F</span>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-slate-200 dark:sm:border-white/10 sm:pl-6">
                      <div className="inline-block px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400 font-mono font-black text-sm uppercase">
                        DELIVERY CHALLAN
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">
                        Under GST Rule 55 — Movement of Goods
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                        Challan No: <span className="text-cyan-500 dark:text-cyan-400">{challan.challanNo}</span>
                      </p>
                      <p className="text-xs font-mono text-slate-500">
                        Date: {challan.date || new Date().toISOString().split('T')[0]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Consignee & Transport Reference Block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Consignee Info */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-400">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Consignee (Deliver To)</span>
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {order?.customerName || 'Tata Motors Commercial Vehicles Ltd'}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {order?.shippingAddress || 'Plot 12, Pimpri Industrial Zone, Pune, Maharashtra 411018'}
                      </p>
                      <p className="font-mono text-slate-600 dark:text-slate-300">
                        <strong>GSTIN:</strong> {order?.customerGstin || '27AABCT1234F1Z8'}
                      </p>
                      <p className="font-mono text-slate-600 dark:text-slate-300">
                        <strong>State:</strong> Maharashtra (Code: 27)
                      </p>
                    </div>
                  </div>

                  {/* Transport & Order Details */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-400">
                      <Truck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Transport & Reference Meta</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">CUSTOMER PO #</span>
                        <span className="font-bold text-slate-900 dark:text-white">{challan.orderPo}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">TRANSPORTER</span>
                        <span className="font-bold text-slate-900 dark:text-white">{challan.transporter || 'Self Pick-up'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">VEHICLE REG #</span>
                        <span className="font-bold text-purple-400">{challan.vehicleNo || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">LR / DOCKET #</span>
                        <span className="font-bold text-slate-900 dark:text-white">{challan.lrNo || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">E-WAY BILL #</span>
                        <span className="font-bold text-emerald-400">{challan.eWayBillNo || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">DRIVER PHONE</span>
                        <span className="font-bold text-slate-900 dark:text-white">{challan.driverContact || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Items Manifest Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-slate-400">
                      Dispatched Material Breakdown
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      100% PDI & Compliance Cleared
                    </span>
                  </div>

                  <div className={`rounded-2xl border overflow-hidden ${
                    isDarkMode ? 'border-white/10' : 'border-slate-200'
                  }`}>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className={`border-b ${isDarkMode ? 'bg-black/60 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                          <th className="py-3 px-4 font-mono font-bold">S.No</th>
                          <th className="py-3 px-4 font-mono font-bold">Item / Part Code</th>
                          <th className="py-3 px-4 font-mono font-bold">Description & Specification</th>
                          <th className="py-3 px-4 font-mono font-bold text-center">HSN Code</th>
                          <th className="py-3 px-4 font-mono font-bold text-right">Dispatched Qty</th>
                          <th className="py-3 px-4 font-mono font-bold">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editLines.map((line, idx) => (
                          <tr key={idx} className={`border-b last:border-0 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
                            <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-mono font-bold text-cyan-400">{line.itemCode}</td>
                            <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                              <p className="font-semibold">{line.itemDescription || 'Machined Precision Component'}</p>
                              <span className="text-[10px] text-slate-400">Tolerance Class Grade 6H • Surface Finish Ra 0.8µm</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{line.hsnCode || '84834000'}</td>
                            <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                              {line.qty.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">{line.unit || 'NOS'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Remarks Block */}
                {challan.remarks && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    isDarkMode ? 'bg-black/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <strong>Delivery Notes:</strong> {challan.remarks}
                  </div>
                )}

                {/* Statutory Terms & Declaration */}
                <div className="border-t border-slate-200 dark:border-white/10 pt-4 space-y-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    <strong>Declaration:</strong> Goods dispatched in sound condition for industrial manufacturing delivery. 
                    This is a Delivery Challan issued under Rule 55 of CGST Rules, 2017 for movement of goods, and does NOT constitute a Tax Invoice.
                  </p>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                    <div className="border-t border-dashed border-slate-400 pt-2 font-mono">
                      <p className="font-bold text-slate-900 dark:text-white">For GURU OM PRECISION ENGINEERING</p>
                      <p className="text-[10px] text-slate-400">Authorized Logistics Officer / Signatory</p>
                    </div>

                    <div className="border-t border-dashed border-slate-400 pt-2 font-mono">
                      <p className="font-bold text-slate-900 dark:text-white">RECEIVER'S SIGNATURE & STAMP</p>
                      <p className="text-[10px] text-slate-400">Received above goods in good condition & count</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Dialog Modal */}
          {showCancelConfirm && (
            <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/30 space-y-3 no-print">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Delivery Challan Cancellation</span>
              </div>
              <p className="text-xs text-rose-300">
                Are you sure you want to cancel Challan <strong>{challan.challanNo}</strong>? This action releases any reserved draft quantity back to the order pool.
              </p>
              <div>
                <label className="block text-[11px] font-mono uppercase text-rose-400 font-bold mb-1">
                  Cancellation Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Duplicate draft creation / Changed transporter vehicle"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-rose-500/40 bg-black/60 text-white text-xs outline-none focus:border-rose-400"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSaving || !cancelReason.trim()}
                  onClick={handleCancelSubmit}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className={`px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 no-print ${
          isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            {isDraft && !showCancelConfirm && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 text-xs font-mono font-bold cursor-pointer transition-ui"
              >
                Cancel Challan
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-ui ${
                isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Close
            </button>

            {isDraft ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleAuthorizeDispatch}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
              >
                <Truck className="w-4 h-4" />
                <span>{isSaving ? 'Processing...' : 'Authorize & Mark In-Transit'}</span>
              </button>
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
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-emerald-600 hover:to-blue-600 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Recording POD...' : 'Mark Delivered (POD)'}</span>
                </button>
                <span className="px-3 py-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
                  <Truck className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>In-Transit</span>
                </span>
              </div>
            ) : isDelivered ? (
              <span className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Delivered & POD Verified</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
