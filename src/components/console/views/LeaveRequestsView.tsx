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
      {/* ── TOP HERO HEADER ── */}
      <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${cardBase}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] shrink-0">
              <CalendarOff className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
                  HR Module
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Leave & Time Off</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Leave Requests
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                File time-off requests, track approval status, and manage team leave balances.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div
              className={`p-3 sm:px-4 sm:py-2.5 rounded-2xl border font-mono text-right w-full sm:w-auto ${
                isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex sm:flex-col justify-between items-center sm:items-end">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Pending
                </span>
                <span className={`text-xl sm:text-2xl font-bold tabular-nums ${pendingCount > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`}>
                  {pendingCount}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => formModal.open()}
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>

        {/* ── METRIC STRIP ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {[
            {
              label: 'Pending Requests',
              value: pendingCount,
              accent: 'text-amber-500 dark:text-amber-400',
              desc: 'Awaiting management review'
            },
            {
              label: 'Approved Leaves',
              value: approvedCount,
              accent: 'text-emerald-500 dark:text-emerald-400',
              desc: 'Confirmed time off'
            },
            {
              label: 'Days Approved',
              value: totalDays,
              accent: 'text-blue-500 dark:text-blue-400',
              desc: 'Total work days granted'
            },
            {
              label: 'Rejected / Withdrawn',
              value: rejectedCount,
              accent: 'text-rose-500 dark:text-rose-400',
              desc: 'Unapproved or cancelled requests'
            }
          ].map((metric) => (
            <div
              key={metric.label}
              className={`p-4 rounded-2xl border transition-all ${
                isDarkMode ? 'bg-black/30 border-white/5' : 'bg-slate-50/70 border-slate-200/70'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-400 mb-1">{metric.label}</div>
              <div className={`text-2xl font-bold font-mono tracking-tight ${metric.accent}`}>
                {metric.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{metric.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'mine'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            My Leave ({myRequests.length})
          </button>

          {/* "All Requests" tab only renders when user has ALL scope permissions (Owner, HR, ServerAdmin) */}
          {canViewAllLeave && (
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>All Requests ({leaveRequests.length})</span>
            </button>
          )}
        </div>

        {activeTab === 'all' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`py-1.5 px-3 rounded-xl text-xs border focus:outline-none ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
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
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecideTarget({ id: req.id, status: 'APPROVED', request: req })}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer flex items-center gap-1"
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
