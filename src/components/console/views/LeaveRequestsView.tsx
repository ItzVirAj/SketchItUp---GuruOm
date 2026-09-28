import React, { useState, useMemo } from 'react';
import {
  CalendarOff,
  Plus,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Calendar,
  User,
  Check,
  X,
  FileText,
  ShieldCheck,
  Building2,
  MessageSquare
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { useAccentTheme } from '../../../context/AccentThemeContext';
import { LeaveRequest, LeaveType, LeaveStatus } from '../../../services/consoleApiServices';

interface LeaveRequestsViewProps {
  leaveRequests: LeaveRequest[];
  isLoadingLeave: boolean;
  canViewAllLeave: boolean;
  canApproveLeave: boolean;
  currentUserId?: string;
  isDarkMode: boolean;
  onCreateLeaveRequest: (payload: { leaveType: LeaveType; startDate: string; endDate: string; reason?: string }) => Promise<LeaveRequest>;
  onDecideLeaveRequest: (id: string, decision: { status: 'APPROVED' | 'REJECTED'; decision_note?: string }) => Promise<LeaveRequest>;
  onCancelLeaveRequest: (id: string) => Promise<LeaveRequest>;
}

const STATUS_CONFIG: Record<LeaveStatus, { label: string; badgeCls: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: {
    label: 'Pending Approval',
    badgeCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: Clock
  },
  APPROVED: {
    label: 'Approved',
    badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2
  },
  REJECTED: {
    label: 'Rejected',
    badgeCls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    icon: XCircle
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    icon: Ban
  }
};

const LEAVE_TYPE_META: Record<LeaveType, { label: string; colorCls: string }> = {
  CASUAL: { label: 'Casual Leave', colorCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  SICK: { label: 'Sick Leave', colorCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  EARNED: { label: 'Earned / Paid Leave', colorCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  UNPAID: { label: 'Unpaid Leave', colorCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
};

function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 1;
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
}

export const LeaveRequestsView: React.FC<LeaveRequestsViewProps> = ({
  leaveRequests,
  isLoadingLeave,
  canViewAllLeave,
  canApproveLeave,
  currentUserId,
  isDarkMode,
  onCreateLeaveRequest,
  onDecideLeaveRequest,
  onCancelLeaveRequest
}) => {
  const { accent, isGreen, isBlue, isCrystal } = useAccentTheme();

  // Navigation tabs: 'mine' is always available; 'all' is ONLY available if canViewAllLeave
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');

  // Form modal
  const formModal = useUrlModal('leave-request-form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Decision modal state
  const [decideTarget, setDecideTarget] = useState<{ id: string; status: 'APPROVED' | 'REJECTED'; request: LeaveRequest } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);

  // Filters for "All Requests" tab
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeaveStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const cardBase = isDarkMode
    ? isCrystal
      ? 'border-white/10 bg-gradient-to-b from-[#181C24] via-[#10131A] to-[#0A0C10] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
      : isGreen
        ? 'border-emerald-500/20 bg-gradient-to-b from-[#0D241B] via-[#081711] to-[#030B07] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
        : 'border-white/10 bg-[#09090B] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : isCrystal
      ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] text-slate-900 shadow-sm'
      : 'border-slate-200/80 bg-white text-slate-900 shadow-sm';

  const inputCls = `w-full mt-1.5 p-3 rounded-xl border text-sm font-sans transition-ui focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
    isDarkMode
      ? 'bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;

  // Segregate My Leave vs All Leave
  const myRequests = useMemo(() => {
    return leaveRequests.filter((r) => {
      const reqId = r.requesterId || r.employeeId;
      return currentUserId ? reqId === currentUserId : true;
    });
  }, [leaveRequests, currentUserId]);

  const allRequests = useMemo(() => {
    return leaveRequests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (r.requester?.name || r.employeeName || '').toLowerCase().includes(query);
        const matchesEmail = (r.requester?.email || '').toLowerCase().includes(query);
        const matchesReason = (r.reason || '').toLowerCase().includes(query);
        const matchesType = r.leaveType.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesReason && !matchesType) return false;
      }
      return true;
    });
  }, [leaveRequests, statusFilter, searchQuery]);

  // Metrics for active tab view
  const currentList = activeTab === 'mine' ? myRequests : allRequests;
  const pendingCount = useMemo(() => currentList.filter((r) => r.status === 'PENDING').length, [currentList]);
  const approvedCount = useMemo(() => currentList.filter((r) => r.status === 'APPROVED').length, [currentList]);
  const rejectedCount = useMemo(() => currentList.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED').length, [currentList]);
  const totalDays = useMemo(() => {
    return currentList
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0);
  }, [currentList]);

  const handleSubmit = async () => {
    if (!startDate || !endDate) return;
    setIsSubmitting(true);
    try {
      await onCreateLeaveRequest({ leaveType, startDate, endDate, reason: reason.trim() || undefined });
      formModal.close();
      setLeaveType('CASUAL');
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch {
      // toast is handled in parent hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDecision = async () => {
    if (!decideTarget) return;
    setIsDeciding(true);
    try {
      await onDecideLeaveRequest(decideTarget.id, {
        status: decideTarget.status,
        decision_note: decisionNote.trim() || undefined
      });
      setDecideTarget(null);
      setDecisionNote('');
    } catch {
      // handled in parent hook
    } finally {
      setIsDeciding(false);
    }
  };

  const isValid = startDate && endDate && new Date(endDate) >= new Date(startDate);
  const requestedDays = calculateDays(startDate, endDate);

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* ── MOBILE VIEW (< md): Header + 2x2 Matrix ──                            */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                HR Operations
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Leave Requests ({currentList.length})
            </h1>
          </div>
          <button
            type="button"
            onClick={() => formModal.open()}
            className="flex h-9 items-center gap-1.5 px-3 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply</span>
          </button>
        </div>

        {/* 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</span>
            </div>
            <p className="text-xl font-black font-mono text-amber-500 tabular-nums">
              {pendingCount}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved</span>
            </div>
            <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {approvedCount}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-white shadow-xs">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Granted</span>
            </div>
            <p className="text-xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {totalDays}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs">
                <XCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected</span>
            </div>
            <p className="text-xl font-black font-mono text-rose-500 tabular-nums">
              {rejectedCount}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP VIEW (hidden md:block): Executive Hero Banner ──               */}
      {/* ========================================================================= */}
      <section className={`hidden md:block relative overflow-hidden rounded-2xl border transition-all duration-300 ${
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
        {/* Subtle Drafting Grid Pattern */}
        {!isDarkMode && isCrystal && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_72%)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent_72%)]"
          />
        )}

        <div className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide backdrop-blur-md border shadow-xs transition-colors">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className={
                  !isDarkMode && isCrystal ? 'text-slate-600' : 'text-white/90'
                }>
                  HR Module • Leave Administration &amp; Time-Off Approvals
                </span>
              </div>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-3 ${
                !isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'
              }`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-inner ${
                  !isDarkMode && isCrystal
                    ? 'bg-slate-100 border border-slate-200 text-slate-800'
                    : 'bg-white/15 backdrop-blur-md border border-white/20 text-white'
                }`}>
                  <CalendarOff className="h-5 w-5" />
                </div>
                Leave Requests &amp; Approvals
              </h1>
              <p className={`text-xs sm:text-sm max-w-2xl font-normal leading-relaxed ${
                !isDarkMode && isCrystal ? 'text-slate-600' : isDarkMode ? 'text-white/60' : 'text-white/80'
              }`}>
                File time-off applications, review team calendar availability, and process management approvals with automated balance tracking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={() => formModal.open()}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-bold transition-all active:scale-[0.96] cursor-pointer shadow-lg ${
                  !isDarkMode && isCrystal
                    ? 'bg-slate-950 hover:bg-slate-800 text-white shadow-slate-900/20'
                    : isDarkMode
                      ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                      : 'bg-white hover:bg-blue-50 text-blue-700 shadow-blue-900/30'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Apply for Leave</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Column Metric Strip */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
            : isCrystal
              ? 'border-slate-200/80 bg-slate-50/70'
              : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
        }`}>
          {/* Pending Review */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Pending Review
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-amber-600' : 'text-amber-400'
              }`}>
                {pendingCount}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Awaiting approval
              </span>
            </div>
          </div>

          {/* Approved Leaves */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Approved Leaves
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-emerald-700' : 'text-emerald-400'
              }`}>
                {approvedCount}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Confirmed time-off
              </span>
            </div>
          </div>

          {/* Days Granted */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
              !isDarkMode && isCrystal
                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                : 'bg-white text-blue-600'
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Days Granted
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'
              }`}>
                {totalDays}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Work days approved
              </span>
            </div>
          </div>

          {/* Rejected / Withdrawn */}
          <div className="p-4 sm:p-5 flex items-center gap-4 transition-colors">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm shadow-rose-500/30">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Rejected / Cancelled
              </span>
              <span className="text-2xl font-bold font-mono text-rose-500 block tabular-nums">
                {rejectedCount}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Unapproved requests
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TAB BAR (Apple HIG Command Deck Rail) ── */}
      <div className={`p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardBase}`}>
        <div className={`inline-flex items-center p-1 rounded-xl border text-xs overflow-x-auto max-w-full ${
          isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'mine'
                ? isDarkMode
                  ? 'bg-white/15 text-white shadow-xs border border-white/10'
                  : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>My Leave</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === 'mine'
                ? isDarkMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
            }`}>
              {myRequests.length}
            </span>
          </button>

          {/* "All Requests" tab only renders when user has ALL scope permissions (Owner, HR, ServerAdmin) */}
          {canViewAllLeave && (
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'all'
                  ? isDarkMode
                    ? 'bg-white/15 text-white shadow-xs border border-white/10'
                    : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>All Requests</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'all'
                  ? isDarkMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                  : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
              }`}>
                {leaveRequests.length}
              </span>
            </button>
          )}
        </div>

        {activeTab === 'all' && (
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-full text-xs border focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`py-1.5 px-3 rounded-full text-xs border focus:outline-none cursor-pointer ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* ── LEAVE LIST ── */}
      {isLoadingLeave ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          Loading leave requests...
        </div>
      ) : currentList.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${cardBase}`}>
          <CalendarOff className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <h3 className="text-sm font-bold">No Leave Requests Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'mine'
              ? "You haven't filed any leave requests yet. Click 'Apply for Leave' to submit your first request."
              : 'No leave requests match your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentList.map((req) => {
            const statusMeta = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            const typeMeta = LEAVE_TYPE_META[req.leaveType] || LEAVE_TYPE_META.CASUAL;
            const StatusIcon = statusMeta.icon;
            const daysCount = calculateDays(req.startDate, req.endDate);
            const isOwn = currentUserId ? (req.requesterId || req.employeeId) === currentUserId : false;

            return (
              <div
                key={req.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${cardBase}`}
              >
                <div className="space-y-3">
                  {/* Card Header: Type badge & Status badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.colorCls}`}>
                      {typeMeta.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.badgeCls}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>

                  {/* Requester Profile (shown on All tab or when available) */}
                  {(activeTab === 'all' || req.requester) && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-[10px] font-bold">
                        {(req.requester?.name || req.employeeName || 'U')[0].toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">
                          {req.requester?.name || req.employeeName || 'Team Member'}
                        </div>
                        {req.requester?.department && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {req.requester.department}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates & Duration */}
                  <div className="pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.startDate}</span>
                      <span className="text-slate-400">→</span>
                      <span>{req.endDate}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                      {daysCount} {daysCount === 1 ? 'working day' : 'working days'}
                    </div>
                  </div>

                  {/* Reason */}
                  {req.reason && (
                    <p className={`text-xs italic line-clamp-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      "{req.reason}"
                    </p>
                  )}

                  {/* Decision Note (if decided) */}
                  {(req.decisionNote || req.decisionNotes) && (
                    <div className={`p-2.5 rounded-xl text-[11px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-1 font-semibold text-slate-400 mb-0.5">
                        <MessageSquare className="w-3 h-3" />
                        <span>Decision Note ({req.decider?.name || 'Manager'}):</span>
                      </div>
                      <div className="text-slate-300">{req.decisionNote || req.decisionNotes}</div>
                    </div>
                  )}
                </div>

                {/* Card Footer / Action Buttons */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Filed {new Date(req.createdAt).toLocaleDateString()}
                  </span>

                  {/* If user is owner/HR and request is PENDING, show Approve & Reject buttons */}
                  {req.status === 'PENDING' && canApproveLeave && activeTab === 'all' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDecideTarget({ id: req.id, status: 'REJECTED', request: req })}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecideTarget({ id: req.id, status: 'APPROVED', request: req })}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    </div>
                  )}

                  {/* Self-service Cancel for pending request */}
                  {req.status === 'PENDING' && isOwn && (
                    <button
                      type="button"
                      onClick={() => onCancelLeaveRequest(req.id)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Withdraw Request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE LEAVE MODAL ── */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={() => formModal.close()}
        title="Apply for Leave / Time Off"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Leave Type
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(Object.keys(LEAVE_TYPE_META) as LeaveType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLeaveType(type)}
                  className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                    leaveType === type
                      ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-sm'
                      : isDarkMode
                      ? 'bg-black/30 border-white/10 text-slate-300 hover:border-white/30'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {LEAVE_TYPE_META[type].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          {startDate && endDate && (
            <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
              isValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <span>Requested Duration:</span>
              <span className="font-bold">{isValid ? `${requestedDays} working days` : 'Invalid Date Range'}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Reason / Justification (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Attending family function, medical appointment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => formModal.close()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── DECISION MODAL (Approve / Reject) ── */}
      <Modal
        isOpen={Boolean(decideTarget)}
        onClose={() => setDecideTarget(null)}
        title={decideTarget?.status === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${
            decideTarget?.status === 'APPROVED' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <p className="text-xs leading-relaxed">
              You are about to <span className="font-bold uppercase">{decideTarget?.status}</span> the leave request for{' '}
              <span className="font-bold">{decideTarget?.request.requester?.name || decideTarget?.request.employeeName || 'this staff member'}</span> ({decideTarget?.request.startDate} to {decideTarget?.request.endDate}).
            </p>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Decision Note (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add feedback or remarks for the requester..."
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setDecideTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeciding}
              onClick={handleConfirmDecision}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                decideTarget?.status === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isDeciding ? 'Saving...' : `Confirm ${decideTarget?.status}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveRequestsView;
