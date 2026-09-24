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
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

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
      {/* 1. Luminous Dual-Mode Hero & Integrated Mini Dashboard */}
      <div className={`relative overflow-hidden rounded-[28px] border transition-all duration-300 p-6 sm:p-8 ${
        isDarkMode
          ? 'bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.7)] text-white'
          : 'bg-gradient-to-r from-[#1b64ff] via-[#155dfc] to-[#0f52dc] border-blue-400/30 shadow-[0_16px_36px_rgba(21,93,252,0.28)] text-white'
      }`}>
        {/* Ambient Top Glow */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-24 -right-10 w-96 h-96 rounded-full blur-3xl transition-opacity duration-500 ${
            isDarkMode ? 'bg-blue-500/10' : 'bg-white/20'
          }`}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide backdrop-blur-md border bg-white/15 text-white border-white/20 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>HR Module • Leave Administration &amp; Time-Off Approvals</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
                <CalendarOff className="h-5 w-5" />
              </div>
              Leave Requests &amp; Approvals
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl font-normal leading-relaxed ${
              isDarkMode ? 'text-white/60' : 'text-blue-100'
            }`}>
              File time-off applications, review team calendar availability, and process management approvals with automated balance tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={() => formModal.open()}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-bold transition-all active:scale-[0.96] cursor-pointer shadow-lg ${
                isDarkMode
                  ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                  : 'bg-white hover:bg-blue-50 text-blue-700 shadow-blue-900/30'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>

        {/* Mini Metric Dashboard Strip with SOLID VIBRANT ICON SQUIRCLES */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Pending Requests */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-md shadow-black/10">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Pending Review
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {pendingCount}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Awaiting approval
              </span>
            </div>
          </div>

          {/* Card 2: Approved Leaves */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Approved Leaves
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {approvedCount}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Confirmed time-off
              </span>
            </div>
          </div>

          {/* Card 3: Days Approved */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Days Granted
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {totalDays}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Work days approved
              </span>
            </div>
          </div>

          {/* Card 4: Rejected / Withdrawn */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-500/30">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Rejected / Cancelled
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {rejectedCount}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Unapproved requests
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB BAR (Apple HIG Command Deck Rail) ── */}
      <div className={`p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDarkMode ? 'border-white/10 bg-[#09090B]' : 'border-slate-200/80 bg-white shadow-sm'
      }`}>
        <div className={`p-1 rounded-full border flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto ${
          isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100/80 border-slate-200/80'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'mine'
                ? isDarkMode ? 'bg-white text-slate-950 shadow-sm' : 'bg-[#155dfc] text-white shadow-sm'
                : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>My Leave</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
              activeTab === 'mine'
                ? isDarkMode ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'
                : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
            }`}>
              {myRequests.length}
            </span>
          </button>

          {/* "All Requests" tab only renders when user has ALL scope permissions (Owner, HR, ServerAdmin) */}
          {canViewAllLeave && (
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'all'
                  ? isDarkMode ? 'bg-white text-slate-950 shadow-sm' : 'bg-[#155dfc] text-white shadow-sm'
                  : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>All Requests</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                activeTab === 'all'
                  ? isDarkMode ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'
                  : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
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
