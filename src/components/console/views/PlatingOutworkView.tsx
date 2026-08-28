import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  Clock,
  Truck,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Check
} from 'lucide-react';
import { OutworkSendOut, SubcontractOrder } from '../../../types/console';

interface PlatingOutworkViewProps {
  sendOuts?: (OutworkSendOut | SubcontractOrder | any)[];
  outwork?: (OutworkSendOut | SubcontractOrder | any)[];
  outworks?: (OutworkSendOut | SubcontractOrder | any)[];
  isDarkMode?: boolean;
  onCreateSendOut?: (sendOut: Partial<OutworkSendOut | SubcontractOrder>) => void;
  onSendOut?: (sendOut: Partial<OutworkSendOut | SubcontractOrder>) => void;
  onReceiveReturn?: (id: string, qty: number) => void;
}

export const PlatingOutworkView: React.FC<PlatingOutworkViewProps> = ({
  sendOuts,
  outwork,
  outworks,
  isDarkMode = true,
  onCreateSendOut,
  onSendOut
}) => {
  const activeSendOuts = sendOuts || outwork || outworks || [];
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'WIP' | 'OVERDUE' | 'COMPLETED'>('ALL');
  
  // Form State
  const [jobNo, setJobNo] = useState('JC/0001/26-27');
  const [itemCode, setItemCode] = useState('00000001');
  const [itemDesc, setItemDesc] = useState('MAIN SPINDLE HOUSING 120MM');
  const [vendorName, setVendorName] = useState('Apex Heat Treaters Ltd');
  const [process, setProcess] = useState('HEAT_TREATMENT');
  const [sentQty, setSentQty] = useState(60);
  const [expectedDate, setExpectedDate] = useState('2026-08-25');
  const [transporter, setTransporter] = useState('Shree Logistics');
  const [vehicleNo, setVehicleNo] = useState('MH-12-QW-4011');

  const totalSent = activeSendOuts.reduce((acc, s) => acc + Number(s.sentQty || s.dispatchedQty || 0), 0);
  const totalReceived = activeSendOuts.reduce((acc, s) => acc + Number(s.receivedQty || 0), 0);
  
  const overdueCount = activeSendOuts.filter(s => {
    if (s.status === 'COMPLETED' || s.status === 'RETURNED_INSPECTED') return false;
    const expDate = s.expectedReturnDate || s.expectedDate;
    if (!expDate) return false;
    return new Date().getTime() > new Date(expDate).getTime();
  }).length;

  const wipCount = activeSendOuts.filter(s => s.status !== 'COMPLETED' && s.status !== 'RETURNED_INSPECTED').length;
  const completedCount = activeSendOuts.filter(s => s.status === 'COMPLETED' || s.status === 'RETURNED_INSPECTED').length;

  const filtered = activeSendOuts.filter(o => {
    const idStr = String(o.sendOutId || o.gatePassNo || o.id || '').toLowerCase();
    const vendorStr = String(o.vendorName || o.subcontractorName || '').toLowerCase();
    const processStr = String(o.process || o.processType || '').toLowerCase();
    const jobStr = String(o.jobNo || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = idStr.includes(q) || vendorStr.includes(q) || processStr.includes(q) || jobStr.includes(q);
    if (!matchesSearch) return false;

    const expDate = o.expectedReturnDate || o.expectedDate;
    const isOverdue = expDate && o.status !== 'RETURNED_INSPECTED' && o.status !== 'COMPLETED' && new Date().getTime() > new Date(expDate).getTime();

    if (statusTab === 'WIP') return o.status !== 'COMPLETED' && o.status !== 'RETURNED_INSPECTED' && !isOverdue;
    if (statusTab === 'OVERDUE') return isOverdue || o.status === 'OVERDUE_JOBWORK';
    if (statusTab === 'COMPLETED') return o.status === 'COMPLETED' || o.status === 'RETURNED_INSPECTED';

    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gatePassNo = `GP-OUT-2026-${String(activeSendOuts.length + 80).padStart(4, '0')}`;
    const handleCreate = onCreateSendOut || onSendOut;
    if (handleCreate) {
      handleCreate({
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
    setShowModal(false);
  };

  const getProcessLabel = (proc: string) => {
    switch (proc) {
      case 'HEAT_TREATMENT': return 'Heat Treatment';
      case 'ELECTROPLATING': return 'Electroplating';
      case 'ZINC_PLATING': return 'Zinc Plating';
      case 'NDT_TESTING': return 'NDT Ultrasonic';
      case 'CNC_MACHINING': return 'CNC Outwork';
      case 'BLACK_OXIDE': return 'Black Oxide';
      default: return proc.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      
      {/* Overdue Subcontracting Alert Banner */}
      {overdueCount > 0 && (
        <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md transition-all ${
          isDarkMode 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
            : 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`font-bold text-xs sm:text-sm ${isDarkMode ? 'text-rose-300' : 'text-rose-900'}`}>
                Subcontracting Overdue Alert
              </h4>
              <p className={`text-[11px] font-mono mt-0.5 ${isDarkMode ? 'text-rose-400/90' : 'text-rose-700'}`}>
                {overdueCount} job-work gate-out batch{overdueCount > 1 ? 'es are' : ' is'} past expected return date.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusTab('OVERDUE')}
            className={`self-start sm:self-auto px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30' 
                : 'bg-rose-200/80 text-rose-900 border-rose-300 hover:bg-rose-200'
            }`}
          >
            Filter {overdueCount} Overdue →
          </button>
        </div>
      )}
      
      {/* Top Banner Header */}
      <div className={`p-4 sm:p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
              }`}>
                Outwork & Job-Work
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                • Gate-Out / In Ledger
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Plating & Job-Work Hub
            </h1>
            <p className={`text-xs mt-0.5 sm:mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Track outsourced processes with gate passes, SUBCON WIP movements, and return inspections.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Gate-Out Pass</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-6">
          {/* Card 1: Total Batches */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Outwork
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {activeSendOuts.length}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#7B92FF]">Gate Passes</span>
            </div>
          </div>

          {/* Card 2: Sent Quantity */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                In Subcon WIP
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                {totalSent.toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-purple-400">NOS Sent</span>
            </div>
          </div>

          {/* Card 3: Active Vendors */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Active Vendors
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {Array.from(new Set(activeSendOuts.map(s => s.vendorName || s.subcontractorName))).filter(Boolean).length || 3}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-500">Approved</span>
            </div>
          </div>

          {/* Card 4: Overdue Status */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90' 
              : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Return Status
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${overdueCount > 0 ? (isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700') : (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')}`}>
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between font-mono">
              <span className={`text-lg sm:text-2xl font-bold ${overdueCount > 0 ? 'text-rose-500' : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                {overdueCount > 0 ? `${overdueCount} Overdue` : 'On Schedule'}
              </span>
              <span className={`text-[10px] sm:text-[11px] font-semibold ${overdueCount > 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                {overdueCount > 0 ? 'Action Req' : '100% Tracked'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className={`p-3.5 sm:p-4 rounded-3xl border transition-all space-y-3 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Passes', count: activeSendOuts.length },
            { id: 'WIP', label: 'In Job-Work', count: wipCount },
            { id: 'OVERDUE', label: 'Overdue', count: overdueCount, isAlert: overdueCount > 0 },
            { id: 'COMPLETED', label: 'Returned', count: completedCount },
          ].map(tab => {
            const isActive = statusTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? tab.isAlert
                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                      : 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                    : isDarkMode
                    ? tab.isAlert
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                    : tab.isAlert
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive 
                    ? 'bg-white/25 text-white' 
                    : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className={`relative flex items-center rounded-2xl border px-3.5 py-2 transition-all flex-1 ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search Gate Pass #, Job #, Vendor, Process..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-xs w-full font-mono"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white ml-2">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className={`text-[11px] font-mono shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Showing {filtered.length} of {activeSendOuts.length} Record{activeSendOuts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE OUTWORK CARDS (Viewport < md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border font-mono text-xs ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No outwork gate passes found matching your filters.
          </div>
        ) : (
          filtered.map((s, idx) => {
            const passNo = s.gatePassNo || s.sendOutId || s.id || `GP-OUT-${idx + 1}`;
            const vendor = s.vendorName || s.subcontractorName || 'Subcontractor';
            const proc = s.process || s.processType || 'Outwork Process';
            const sent = Number(s.sentQty || s.dispatchedQty || 0);
            const rec = Number(s.receivedQty || 0);
            const expDate = s.expectedReturnDate || s.expectedDate || '—';
            const isCompleted = s.status === 'RETURNED_INSPECTED' || s.status === 'COMPLETED';
            const isOverdue = expDate !== '—' && !isCompleted && new Date().getTime() > new Date(expDate).getTime();
            const pctReceived = sent > 0 ? Math.min(100, Math.round((rec / sent) * 100)) : 0;

            return (
              <div
                key={passNo}
                className={`p-4 rounded-3xl border transition-all space-y-3.5 shadow-sm ${
                  isOverdue
                    ? isDarkMode ? 'bg-slate-950/80 border-rose-500/40' : 'bg-rose-50/40 border-rose-300'
                    : isCompleted
                    ? isDarkMode ? 'bg-slate-950/70 border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Pass No + Status + Job Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF]">
                        {passNo}
                      </span>
                      {s.jobNo && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {s.jobNo}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-xs font-bold font-sans mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {vendor}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border shrink-0 ${
                    isOverdue || s.status === 'OVERDUE_JOBWORK'
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : isCompleted
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isOverdue ? 'bg-rose-400' : isCompleted ? 'bg-emerald-400' : 'bg-purple-400'
                    }`} />
                    <span>{isOverdue ? 'OVERDUE' : (s.status || 'IN WIP')}</span>
                  </span>
                </div>

                {/* Process Badge & Item Description */}
                <div className={`p-2.5 rounded-2xl border text-xs font-mono space-y-1 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-purple-400 font-bold flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      <span>{getProcessLabel(proc)}</span>
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
                      <strong className="text-emerald-400">{rec}</strong> / {sent} NOS ({pctReceived}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isCompleted ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : 'bg-gradient-to-r from-[#5B75F8] to-purple-500'
                      }`}
                      style={{ width: `${pctReceived}%` }}
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
                    isOverdue ? 'text-rose-400' : isDarkMode ? 'text-amber-400' : 'text-amber-600'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>Exp: {expDate}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP OUTWORK TABLE (Viewport >= md) */}
      {/* ========================================================================= */}
      <div className={`hidden md:block rounded-3xl border overflow-hidden transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-4 px-5">Gate-Out Pass #</th>
                <th className="py-4 px-5">Job Card Reference</th>
                <th className="py-4 px-5">Subcontractor / Vendor</th>
                <th className="py-4 px-5">Outsourced Process</th>
                <th className="py-4 px-5 text-right">Dispatched Qty</th>
                <th className="py-4 px-5 text-right">Received Qty</th>
                <th className="py-4 px-5">Expected Return</th>
                <th className="py-4 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filtered.map((s, idx) => {
                const passNo = s.gatePassNo || s.sendOutId || s.id || `GP-OUT-${idx + 1}`;
                const vendor = s.vendorName || s.subcontractorName || 'Subcontractor';
                const proc = s.process || s.processType || 'Outwork Process';
                const sent = Number(s.sentQty || s.dispatchedQty || 0);
                const rec = Number(s.receivedQty || 0);
                const expDate = s.expectedReturnDate || s.expectedDate || '—';
                const isOverdue = expDate !== '—' && s.status !== 'RETURNED_INSPECTED' && s.status !== 'COMPLETED' && new Date().getTime() > new Date(expDate).getTime();

                return (
                  <tr key={passNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                      {passNo}
                    </td>
                    <td className={`py-4 px-5 font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {s.jobNo || 'JC/0001/26-27'}
                    </td>
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      {vendor}
                    </td>
                    <td className="py-4 px-5 font-mono font-medium text-purple-500 dark:text-purple-400">
                      {getProcessLabel(proc)}
                    </td>
                    <td className={`py-4 px-5 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {sent} NOS
                    </td>
                    <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                      {rec} NOS
                    </td>
                    <td className={`py-4 px-5 font-mono ${isOverdue ? 'text-rose-500 font-bold' : (isDarkMode ? 'text-amber-400' : 'text-amber-600')}`}>
                      {expDate}
                      {isOverdue && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">OVERDUE</span>}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                        isOverdue || s.status === 'OVERDUE_JOBWORK'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : s.status === 'RETURNED_INSPECTED' || s.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOverdue || s.status === 'OVERDUE_JOBWORK'
                            ? 'bg-rose-500'
                            : s.status === 'RETURNED_INSPECTED' || s.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : 'bg-purple-500'
                        }`} />
                        <span>{isOverdue ? 'OVERDUE' : (s.status || 'SENT')}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Outwork Send-Out Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-3xl border shadow-2xl transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between p-4 sm:p-6 border-b shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30 shrink-0">
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
                onClick={() => setShowModal(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
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
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Process Type *</label>
                  <select
                    value={process}
                    onChange={(e) => setProcess(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
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
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-mono uppercase font-bold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Dispatched Quantity *</label>
                  <input
                    type="number"
                    required
                    value={sentQty}
                    onChange={(e) => setSentQty(Number(e.target.value))}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
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
                    className={`w-full rounded-2xl border px-3.5 py-3 text-xs font-mono outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
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
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
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
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className={`pt-4 border-t flex items-center justify-end gap-3 shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
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
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[#5B75F8]/25 transition-all active:scale-[0.98]"
                >
                  Issue Gate-Out Pass
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
