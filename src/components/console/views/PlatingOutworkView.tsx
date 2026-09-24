import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Truck,
  Building2,
  ArrowDownLeft,
  ShieldCheck
} from 'lucide-react';
import { OutworkSendOut, SubcontractOrder } from '../../../types/console';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { receiveOutworkReturn } from '../../../services/supabaseServices';

interface PlatingOutworkViewProps {
  sendOuts?: (OutworkSendOut | SubcontractOrder | any)[];
  outwork?: (OutworkSendOut | SubcontractOrder | any)[];
  outworks?: (OutworkSendOut | SubcontractOrder | any)[];
  isDarkMode?: boolean;
  onCreateSendOut?: (sendOut: Partial<OutworkSendOut | SubcontractOrder>) => Promise<void> | void;
  onSendOut?: (sendOut: Partial<OutworkSendOut | SubcontractOrder>) => Promise<void> | void;
  onReceiveReturn?: (payload: { gatePassNo: string; receivedQty: number; rejectedQty?: number; qcStatus?: 'INSPECTED_ACCEPTED' | 'INSPECTED_REJECTED'; notes?: string } | string, qty?: number, rej?: number) => Promise<void> | void;
}

export const PlatingOutworkView: React.FC<PlatingOutworkViewProps> = ({
  sendOuts,
  outwork,
  outworks,
  isDarkMode = true,
  onCreateSendOut,
  onSendOut,
  onReceiveReturn
}) => {
  const activeSendOuts = sendOuts || outwork || outworks || [];
  const gatePassModal = useUrlModal('issue-gate-out-pass');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'WIP' | 'OVERDUE' | 'COMPLETED'>('ALL');
  
  // Gate-Out Form State
  const [jobNo, setJobNo] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [process, setProcess] = useState('HEAT_TREATMENT');
  const [sentQty, setSentQty] = useState(0);
  const [expectedDate, setExpectedDate] = useState('');
  const [transporter, setTransporter] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');

  // Gate-In Receive Form State
  const [receiveModalItem, setReceiveModalItem] = useState<any | null>(null);
  const [receivedQtyInput, setReceivedQtyInput] = useState<number>(0);
  const [rejectedQtyInput, setRejectedQtyInput] = useState<number>(0);
  const [qcStatusInput, setQcStatusInput] = useState<'INSPECTED_ACCEPTED' | 'INSPECTED_REJECTED'>('INSPECTED_ACCEPTED');
  const [inspectionNotesInput, setInspectionNotesInput] = useState('');
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // URL Param sync
  useEffect(() => {
    if (gatePassModal.isOpen && (gatePassModal.params.jobNo || gatePassModal.params.outworkId)) {
      if (gatePassModal.params.jobNo) setJobNo(gatePassModal.params.jobNo);
    }
  }, [gatePassModal.isOpen, gatePassModal.params.jobNo, gatePassModal.params.outworkId]);

  const getItemMeta = (s: any, idx?: number) => {
    const passNo = s.gatePassNo || s.sendOutId || s.id || `GP-OUT-${(idx !== undefined ? idx + 1 : 1)}`;
    const vendor = s.vendorName || s.subcontractorName || 'Subcontractor';
    const proc = s.process || s.processType || 'HEAT_TREATMENT';
    const sent = Number(s.sentQty || s.dispatchedQty || 0);
    const rec = Number(s.receivedQty || 0);
    const rej = Number(s.rejectedQty || 0);
    const expDate = s.expectedReturnDate || s.expectedDate || '—';
    const isCompleted = s.status === 'RETURNED_INSPECTED' || s.status === 'COMPLETED' || s.status === 'CLOSED' || (rec > 0 && rec >= sent);
    
    // Trust backend evaluation if provided; otherwise fallback to date math
    const isOverdue = s.isOverdue !== undefined
      ? Boolean(s.isOverdue)
      : (expDate !== '—' && !isCompleted && new Date().getTime() > new Date(expDate).getTime());
    
    const overdueDays = s.overdueDays !== undefined ? Number(s.overdueDays) : 0;
    const status = s.status || (isCompleted ? 'RETURNED_INSPECTED' : isOverdue ? 'OVERDUE_JOBWORK' : 'OUT_FOR_JOBWORK');
    const pctReceived = sent > 0 ? Math.min(100, Math.round((rec / sent) * 100)) : 0;

    return {
      passNo,
      vendor,
      proc,
      sent,
      rec,
      rej,
      expDate,
      isCompleted,
      isOverdue,
      overdueDays,
      status,
      pctReceived
    };
  };

  const totalSent = activeSendOuts.reduce((acc, s) => acc + Number(s.sentQty || s.dispatchedQty || 0), 0);
  const totalReceived = activeSendOuts.reduce((acc, s) => acc + Number(s.receivedQty || 0), 0);
  
  const overdueCount = activeSendOuts.filter(s => {
    const meta = getItemMeta(s);
    return meta.isOverdue && !meta.isCompleted;
  }).length;

  const wipCount = activeSendOuts.filter(s => {
    const meta = getItemMeta(s);
    return !meta.isCompleted && !meta.isOverdue;
  }).length;

  const completedCount = activeSendOuts.filter(s => {
    const meta = getItemMeta(s);
    return meta.isCompleted;
  }).length;

  const filtered = activeSendOuts.filter((o, idx) => {
    const meta = getItemMeta(o, idx);
    const idStr = String(meta.passNo).toLowerCase();
    const vendorStr = String(meta.vendor).toLowerCase();
    const processStr = String(meta.proc).toLowerCase();
    const jobStr = String(o.jobNo || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = idStr.includes(q) || vendorStr.includes(q) || processStr.includes(q) || jobStr.includes(q);
    if (!matchesSearch) return false;

    if (statusTab === 'WIP') return !meta.isCompleted && !meta.isOverdue;
    if (statusTab === 'OVERDUE') return meta.isOverdue || meta.status === 'OVERDUE_JOBWORK';
    if (statusTab === 'COMPLETED') return meta.isCompleted;

    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobNo.trim() || !itemCode.trim() || !vendorName.trim() || sentQty <= 0) {
      alert('Please provide a valid Job No, Item Code, Vendor, and Quantity (> 0).');
      return;
    }
    const gatePassNo = `GP-OUT-2026-${String(activeSendOuts.length + 80).padStart(4, '0')}`;
    const handleCreate = onCreateSendOut || onSendOut;
    if (handleCreate) {
      await handleCreate({
        sendOutId: gatePassNo,
        gatePassNo,
        jobNo,
        itemCode,
        itemDescription: itemDesc,
        vendorName,
        subcontractorName: vendorName,
        process,
        processType: process,
        sentQty,
        dispatchedQty: sentQty,
        receivedQty: 0,
        rejectedQty: 0,
        status: 'OUT_FOR_JOBWORK',
        dispatchDate: new Date().toISOString().split('T')[0],
        sentDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: expectedDate,
        expectedDate,
        transporter,
        vehicleDetails: vehicleNo
      });
    }
    gatePassModal.close();
  };

  const handleOpenReceive = (item: any, idx?: number) => {
    const meta = getItemMeta(item, idx);
    setReceiveModalItem(item);
    const remaining = Math.max(0, meta.sent - meta.rec);
    setReceivedQtyInput(remaining > 0 ? remaining : meta.sent);
    setRejectedQtyInput(0);
    setQcStatusInput('INSPECTED_ACCEPTED');
    setInspectionNotesInput('');
    setReceiveError(null);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalItem) return;
    const meta = getItemMeta(receiveModalItem);
    setIsSubmittingReceive(true);
    setReceiveError(null);

    try {
      const payload = {
        gatePassNo: meta.passNo,
        receivedQty: Number(receivedQtyInput),
        rejectedQty: Number(rejectedQtyInput || 0),
        qcStatus: qcStatusInput,
        inspectionNotes: inspectionNotesInput,
        notes: inspectionNotesInput
      };

      if (onReceiveReturn) {
        await onReceiveReturn(payload);
      } else {
        await receiveOutworkReturn(payload);
      }

      setReceiveModalItem(null);
    } catch (err: any) {
      setReceiveError(err?.message || 'Failed to record gate-in return');
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  const getProcessLabel = (proc: string) => {
    switch (proc) {
      case 'HEAT_TREATMENT': return 'Heat Treatment';
      case 'ELECTROPLATING': return 'Electroplating';
      case 'ZINC_PLATING': return 'Zinc Plating';
      case 'NDT_TESTING': return 'NDT Ultrasonic';
      case 'CNC_MACHINING': return 'CNC Outwork';
      case 'BLACK_OXIDE': return 'Black Oxide';
      default: return proc ? proc.replace(/_/g, ' ') : 'Outwork Process';
    }
  };

  const renderStatusBadge = (meta: { isOverdue: boolean; isCompleted: boolean; status: string; overdueDays: number }) => {
    if (meta.isOverdue || meta.status === 'OVERDUE_JOBWORK') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
          isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
          <span>OVERDUE{meta.overdueDays > 0 ? ` (+${meta.overdueDays}d)` : ''}</span>
        </span>
      );
    }
    if (meta.isCompleted || meta.status === 'RETURNED_INSPECTED' || meta.status === 'COMPLETED') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
          isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>RETURNED</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
        isDarkMode ? 'border-purple-500/30 bg-purple-500/10 text-purple-300' : 'border-purple-200 bg-purple-50 text-purple-700'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
        <span>IN SUBCON WIP</span>
      </span>
    );
  };

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
                Outwork & Job-Work
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Plating & Outwork ({filtered.length})
            </h1>
          </div>

          <button
            type="button"
            onClick={() => gatePassModal.open()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#181920] hover:bg-[#252730] text-white text-xs font-bold shadow-md active:scale-[0.96] transition-ui cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue Pass</span>
          </button>
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total Outwork</div>
            <div className="text-base font-black text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight mt-0.5">
              {activeSendOuts.length} <span className="text-xs font-normal text-slate-400">Passes</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">In Subcon WIP</div>
            <div className="text-base font-black text-purple-500 tracking-tight mt-0.5">
              {totalSent.toLocaleString()} <span className="text-xs font-normal text-slate-400">NOS</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Active Vendors</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {Array.from(new Set(activeSendOuts.map(s => s.vendorName || s.subcontractorName))).filter(Boolean).length || 3} <span className="text-xs font-normal text-slate-400">Vendors</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Return Status</div>
            <div className={`text-base font-black tracking-tight mt-0.5 ${overdueCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {overdueCount > 0 ? `${overdueCount} Overdue` : 'On Time'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP HEADER & INTEGRATED KPI ROW (≥ md) ──                          */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        <section className={`overflow-hidden rounded-2xl border transition-all ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 sm:py-7">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                  isDarkMode
                    ? 'bg-white/10 border border-white/15 text-white'
                    : 'bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Subcontracting &amp; Outwork Operations</span>
                </span>
                <span className="text-sm font-semibold text-white/80">•</span>
                <span className="text-xs sm:text-sm font-semibold text-white/95">
                  {filtered.length} Gate Passes
                </span>
              </div>

              <h1 className="text-3xl sm:text-[32px] font-black tracking-tight text-white leading-tight">
                Plating &amp; Job-Work Hub
              </h1>

              <p className="text-xs sm:text-sm text-white/95 font-medium leading-relaxed max-w-2xl">
                Track outsourced processes with gate passes, SUBCON WIP movements, and return inspections.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => gatePassModal.open()}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isDarkMode
                    ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                    : 'bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
                }`}
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Issue Gate-Out Pass</span>
              </button>
            </div>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
            isDarkMode
              ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
              : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
          }`}>
            {[
              {
                label: 'Total Outwork Passes',
                value: `${activeSendOuts.length}`,
                detail: 'Active & archived passes',
                icon: Wrench,
                iconColor: isDarkMode ? 'text-white' : 'text-[#155dfc]',
                iconBg: isDarkMode ? 'bg-blue-600 shadow-xs' : 'bg-white shadow-xs',
              },
              {
                label: 'In Subcon WIP',
                value: `${totalSent.toLocaleString()} NOS`,
                detail: 'Material at jobworkers',
                icon: Layers,
                iconColor: 'text-white',
                iconBg: 'bg-purple-500 shadow-xs',
              },
              {
                label: 'Active Subcontractors',
                value: `${Array.from(new Set(activeSendOuts.map(s => s.vendorName || s.subcontractorName))).filter(Boolean).length || 3}`,
                detail: 'Approved processing partners',
                icon: Building2,
                iconColor: 'text-white',
                iconBg: 'bg-emerald-500 shadow-xs',
              },
              {
                label: 'Return Schedule',
                value: overdueCount > 0 ? `${overdueCount} Overdue` : '100% On Time',
                detail: overdueCount > 0 ? 'Action required on batches' : 'All jobs within SLA',
                icon: Clock,
                iconColor: 'text-white',
                iconBg: overdueCount > 0 ? 'bg-rose-500 shadow-xs' : 'bg-amber-500 shadow-xs',
              },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className={`flex items-center gap-4 px-6 py-5 transition-all ${
                    index > 0 ? (isDarkMode ? 'lg:border-l border-white/10' : 'lg:border-l border-white/20') : ''
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${metric.iconBg} ${metric.iconColor}`}>
                    <MetricIcon className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-white/85">
                      {metric.label}
                    </div>
                    <div className="text-2xl sm:text-[26px] font-black tracking-tight text-white tabular-nums my-0.5 leading-tight">
                      {metric.value}
                    </div>
                    <div className="text-xs font-medium text-white/90 truncate">
                      {metric.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── APPLE 2-TIER COMMAND DECK & FILTERS ── */}
        <div className={`rounded-2xl border p-3.5 transition-all ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
            : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
        }`}>
          <div className="space-y-3">
            {/* Tier 1: Segmented tab buttons with counts + Live telemetry chip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`inline-flex items-center gap-1 rounded-xl p-1 border transition-all ${
                isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/80 bg-slate-100/80'
              }`}>
                {[
                  { id: 'ALL', label: 'All Passes', count: activeSendOuts.length, isAlert: false },
                  { id: 'WIP', label: 'In Job-Work', count: wipCount, isAlert: false },
                  { id: 'OVERDUE', label: 'Overdue', count: overdueCount, isAlert: overdueCount > 0 },
                  { id: 'COMPLETED', label: 'Returned', count: completedCount, isAlert: false },
                ].map(tab => {
                  const isActive = statusTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusTab(tab.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? isDarkMode
                            ? tab.isAlert
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'bg-white text-slate-950 shadow-xs'
                            : tab.isAlert
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-900 text-white shadow-xs'
                          : isDarkMode
                          ? tab.isAlert
                            ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                          : tab.isAlert
                          ? 'text-rose-700 hover:text-rose-800 hover:bg-rose-100/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? isDarkMode
                            ? tab.isAlert ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-900'
                            : 'bg-white/30 text-white'
                          : isDarkMode
                          ? tab.isAlert ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-slate-400'
                          : tab.isAlert ? 'bg-rose-200 text-rose-800' : 'bg-slate-200/80 text-slate-600'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Telemetry pill */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                  isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-white text-slate-600 shadow-2xs'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Showing {filtered.length} of {activeSendOuts.length} outwork records
                </span>
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
                placeholder="Search gate pass #, job card #, vendor partner, process..."
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
      </div>

      {/* ========================================================================= */}
      {/* MOBILE OUTWORK CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
            isDarkMode ? 'bg-[#121215] border-white/[0.08] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No outwork gate passes found matching your filters.
          </div>
        ) : (
          filtered.map((s, idx) => {
            const meta = getItemMeta(s, idx);

            return (
              <div
                key={meta.passNo}
                className={`p-4 rounded-2xl border transition-ui space-y-3.5 shadow-sm ${
                  meta.isOverdue
                    ? isDarkMode ? 'bg-[#121215] border-rose-500/40' : 'bg-rose-50/40 border-rose-300'
                    : meta.isCompleted
                    ? isDarkMode ? 'bg-[#121215] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isDarkMode ? 'bg-[#121215] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Pass No + Status + Job Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                        {meta.passNo}
                      </span>
                      {s.jobNo && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {s.jobNo}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-xs font-bold font-sans mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {meta.vendor}
                    </h3>
                  </div>

                  {renderStatusBadge(meta)}
                </div>

                {/* Process Badge & Item Description */}
                <div className={`p-2.5 rounded-xl border text-xs font-mono space-y-1 ${
                  isDarkMode ? 'bg-black/20 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-purple-400 font-bold flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      <span>{getProcessLabel(meta.proc)}</span>
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {s.itemCode || 'PART-001'}
                    </span>
                  </div>
                  {s.itemDescription && (
                    <div className="text-[11px] text-slate-300 font-sans truncate">
                      {s.itemDescription}
                    </div>
                  )}
                </div>

                {/* Quantity Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Received / Sent:</span>
                    <span className="font-bold text-slate-200">
                      <strong className="text-emerald-400">{meta.rec}</strong> / {meta.sent} NOS ({meta.pctReceived}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-ui ${
                        meta.isCompleted ? 'bg-emerald-500' : meta.isOverdue ? 'bg-rose-500' : 'bg-[var(--accent-primary)]'
                      }`}
                      style={{ width: `${meta.pctReceived}%` }}
                    />
                  </div>
                </div>

                {/* Footer Logistics & Expected Return Date */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate max-w-[120px]">{s.transporter || s.vehicleDetails || 'Standard Logistics'}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-bold ${
                    meta.isOverdue ? 'text-rose-400' : isDarkMode ? 'text-amber-400' : 'text-amber-600'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>Exp: {meta.expDate}</span>
                  </div>
                </div>

                {/* Action button: Receive */}
                {!meta.isCompleted && (
                  <button
                    type="button"
                    onClick={() => handleOpenReceive(s, idx)}
                    className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-ui cursor-pointer ${
                      isDarkMode 
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40' 
                        : 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Receive Gate-In Material</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP OUTWORK TABLE (Viewport >= md) */}
      {/* ========================================================================= */}
      <div className={`hidden md:block overflow-hidden rounded-3xl border transition-all duration-300 ${
        isDarkMode 
          ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_24px_50px_rgba(0,0,0,0.6)]' 
          : 'border-slate-200/80 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.06)]'
      }`}>
        {/* Specular top edge highlight line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />

        <div className={`flex items-center justify-between border-b px-6 py-4 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">Subcontracting Outwork Register</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Gate pass movements, outside processing batches, and return tracking</div>
          </div>
          <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            {filtered.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`border-b ${isDarkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/60'}`}>
              <tr className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
                <th className="py-4 px-6">Gate-Out Pass #</th>
                <th className="py-4 px-6">Job Card Reference</th>
                <th className="py-4 px-6">Subcontractor / Vendor</th>
                <th className="py-4 px-6">Outsourced Process</th>
                <th className="py-4 px-6 text-right">Dispatched Qty</th>
                <th className="py-4 px-6 text-right">Received Qty</th>
                <th className="py-4 px-6">Expected Return</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200/80'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 font-mono text-xs">
                    No outwork gate passes found matching current filters.
                  </td>
                </tr>
              ) : null}
              {filtered.map((s, idx) => {
                const meta = getItemMeta(s, idx);

                return (
                  <tr key={meta.passNo} className={`group transition-all duration-200 ${
                    isDarkMode 
                      ? 'hover:bg-white/[0.03] border-b border-white/[0.04]' 
                      : 'hover:bg-slate-50/90 border-b border-slate-100'
                  }`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${
                          isDarkMode
                            ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10 text-white'
                            : 'bg-gradient-to-br from-slate-50 to-slate-100/80 border-slate-200/80 text-slate-800 shadow-xs'
                        }`}>
                          <Wrench className="w-5 h-5 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]" />
                        </div>
                        <div>
                          <div className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black">
                            {meta.passNo}
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                            <span>{meta.vendor}</span>
                            {s.jobNo && (
                              <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                • {s.jobNo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                        {s.jobNo || 'JC/0001/26-27'}
                      </span>
                    </td>
                    <td className={`py-4 px-6 font-bold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {meta.vendor}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {getProcessLabel(meta.proc)}
                    </td>
                    <td className={`py-4 px-6 text-right font-black font-mono text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {meta.sent} NOS
                    </td>
                    <td className="py-4 px-6 text-right font-black font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {meta.rec} NOS
                    </td>
                    <td className={`py-4 px-6 font-mono text-xs ${meta.isOverdue ? 'text-rose-500 font-bold' : (isDarkMode ? 'text-amber-400 font-medium' : 'text-amber-600 font-medium')}`}>
                      {meta.expDate}
                      {meta.isOverdue && (
                        <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">
                          +{meta.overdueDays}d
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {renderStatusBadge(meta)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {!meta.isCompleted ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReceive(s, idx)}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isDarkMode 
                              ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30' 
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-xs'
                          }`}
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Receive Gate-In</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Returned</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── CREATE OUTWORK SEND-OUT MODAL (GATE-OUT) ──                           */}
      {/* ========================================================================= */}
      {gatePassModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-[24px] border shadow-2xl transition-ui overflow-hidden ${
            isDarkMode 
              ? 'border-white/[0.08] bg-[#121215] text-white' 
              : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between p-4 sm:p-6 border-b shrink-0 ${isDarkMode ? 'border-white/[0.07] bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Issue Gate-Out Pass
                  </h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Dispatch material to subcontractor & deduct from factory on-hand
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => gatePassModal.close()} 
                className={`p-2 rounded-xl border transition-ui cursor-pointer ${
                  isDarkMode 
                    ? 'border-white/[0.08] bg-black/20 text-slate-400 hover:text-white hover:bg-white/[0.05]' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Job Card Reference *</label>
                  <input
                    type="text"
                    required
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    placeholder="e.g. JC/0001/26-27"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-ui ${
                      isDarkMode 
                        ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Process Type *</label>
                  <select
                    value={process}
                    onChange={(e) => setProcess(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-ui ${
                      isDarkMode 
                        ? 'border-white/[0.08] bg-[#121215] text-white focus:border-[var(--accent-border-dark)]' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[var(--accent-primary)]'
                    }`}
                  >
                    <option value="HEAT_TREATMENT">Heat Treatment</option>
                    <option value="ELECTROPLATING">Electroplating</option>
                    <option value="ZINC_PLATING">Zinc Plating (Trivalent)</option>
                    <option value="NDT_TESTING">NDT Ultrasonic Testing</option>
                    <option value="CNC_MACHINING">CNC Machining (Outsourced)</option>
                    <option value="BLACK_OXIDE">Black Oxide Coating</option>
                    <option value="OTHER">Other Process</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Subcontractor / Vendor *</label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Apex Heat Treaters Ltd"
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-ui ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Dispatched Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={sentQty}
                    onChange={(e) => setSentQty(Number(e.target.value))}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono font-bold outline-none transition-ui ${
                      isDarkMode 
                        ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Expected Return Date *</label>
                  <input
                    type="date"
                    required
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-ui ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Transporter</label>
                  <input
                    type="text"
                    value={transporter}
                    onChange={(e) => setTransporter(e.target.value)}
                    placeholder="e.g. Shree Logistics"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-ui ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Vehicle No</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. MH-12-QW-4011"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-ui ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className={`pt-4 border-t flex items-center justify-end gap-3 shrink-0 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
                <button 
                  type="button" 
                  onClick={() => gatePassModal.close()} 
                  className={`px-5 py-2.5 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-ui ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-slate-300 hover:bg-white/[0.05]' 
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[var(--accent-shadow)] transition-ui active:scale-[0.96]"
                >
                  Issue Gate-Out Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── RECEIVE OUTWORK RETURN MODAL (GATE-IN) ──                             */}
      {/* ========================================================================= */}
      {receiveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-[24px] border shadow-2xl transition-ui overflow-hidden ${
            isDarkMode 
              ? 'border-white/[0.08] bg-[#121215] text-white' 
              : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between p-4 sm:p-6 border-b shrink-0 ${isDarkMode ? 'border-white/[0.07] bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Receive Subcontract Gate-In
                  </h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Inward material receipt, QC inspection & factory stock replenishment
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setReceiveModalItem(null)} 
                className={`p-2 rounded-xl border transition-ui cursor-pointer ${
                  isDarkMode 
                    ? 'border-white/[0.08] bg-black/20 text-slate-400 hover:text-white hover:bg-white/[0.05]' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {receiveError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {receiveError}
                </div>
              )}

              {/* Linked Gate-Out Details Summary */}
              <div className={`p-3.5 rounded-2xl border text-xs font-mono space-y-1.5 ${
                isDarkMode ? 'bg-black/25 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                    Pass: {getItemMeta(receiveModalItem).passNo}
                  </span>
                  <span className="text-purple-400 font-bold">
                    {getProcessLabel(getItemMeta(receiveModalItem).proc)}
                  </span>
                </div>
                <div className="text-slate-300 font-sans font-semibold text-xs truncate">
                  Vendor: {getItemMeta(receiveModalItem).vendor}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.06]">
                  <span>Dispatched: {getItemMeta(receiveModalItem).sent} NOS</span>
                  <span>Already Received: {getItemMeta(receiveModalItem).rec} NOS</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Received / Accepted Qty (NOS) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={receivedQtyInput}
                    onChange={(e) => setReceivedQtyInput(Number(e.target.value))}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono font-bold outline-none transition-ui ${
                      isDarkMode 
                        ? 'border-white/[0.08] bg-black/20 text-emerald-400 focus:border-emerald-500' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Rejected Qty (NOS)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rejectedQtyInput}
                    onChange={(e) => setRejectedQtyInput(Number(e.target.value))}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono font-bold outline-none transition-ui ${
                      isDarkMode 
                        ? 'border-white/[0.08] bg-black/20 text-rose-400 focus:border-rose-500' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Incoming Quality Inspection Result *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQcStatusInput('INSPECTED_ACCEPTED')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-ui cursor-pointer ${
                      qcStatusInput === 'INSPECTED_ACCEPTED'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-xs'
                        : isDarkMode ? 'border-white/[0.08] bg-black/20 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>QC Accepted</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcStatusInput('INSPECTED_REJECTED')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-ui cursor-pointer ${
                      qcStatusInput === 'INSPECTED_REJECTED'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-xs'
                        : isDarkMode ? 'border-white/[0.08] bg-black/20 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>QC Rejected</span>
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Inspection Notes & Remarks
                </label>
                <textarea
                  rows={3}
                  value={inspectionNotesInput}
                  onChange={(e) => setInspectionNotesInput(e.target.value)}
                  placeholder="e.g. Inward plating thickness verified as per drawing spec (12-15 microns). No visual pitting or burn marks."
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-ui ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-white focus:border-[var(--accent-border-dark)]' 
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex items-center justify-end gap-3 shrink-0 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
                <button 
                  type="button" 
                  onClick={() => setReceiveModalItem(null)} 
                  className={`px-5 py-2.5 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-ui ${
                    isDarkMode 
                      ? 'border-white/[0.08] bg-black/20 text-slate-300 hover:bg-white/[0.05]' 
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingReceive}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-emerald-900/30 transition-ui active:scale-[0.96] disabled:opacity-50"
                >
                  {isSubmittingReceive ? 'Receiving...' : 'Record Inward Gate-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlatingOutworkView;
