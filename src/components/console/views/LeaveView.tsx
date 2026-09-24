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
  User
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { LeaveRequest, LeaveType, LeaveStatus } from '../../../services/consoleApiServices';

interface LeaveViewProps {
  leaveRequests: LeaveRequest[];
  isLoadingLeave: boolean;
  canViewAllLeave: boolean;
  currentUserId?: string;
  isDarkMode: boolean;
  onCreateLeaveRequest: (payload: { leaveType: LeaveType; startDate: string; endDate: string; reason?: string }) => Promise<LeaveRequest>;
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
    label: 'Withdrawn',
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

export const LeaveView: React.FC<LeaveViewProps> = ({
  leaveRequests,
  isLoadingLeave,
  canViewAllLeave,
  currentUserId,
  isDarkMode,
  onCreateLeaveRequest,
  onCancelLeaveRequest
}) => {
  const formModal = useUrlModal('leave-form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeaveStatus>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  const inputCls = `w-full mt-1.5 p-3 rounded-xl border text-sm font-sans transition-ui focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
    isDarkMode
      ? 'bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;

  // Metrics
  const pendingCount = useMemo(() => leaveRequests.filter((r) => r.status === 'PENDING').length, [leaveRequests]);
  const approvedCount = useMemo(() => leaveRequests.filter((r) => r.status === 'APPROVED').length, [leaveRequests]);
  const rejectedCount = useMemo(() => leaveRequests.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED').length, [leaveRequests]);

  // Filtered list
  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (scopeFilter === 'MINE' && currentUserId && r.employeeId !== currentUserId) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (r.employeeName || '').toLowerCase().includes(query);
        const matchesReason = (r.reason || '').toLowerCase().includes(query);
        const matchesType = r.leaveType.toLowerCase().includes(query);
        if (!matchesName && !matchesReason && !matchesType) return false;
      }
      return true;
    });
  }, [leaveRequests, statusFilter, scopeFilter, currentUserId, searchQuery]);

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
      // toast handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = startDate && endDate && new Date(endDate) >= new Date(startDate);
  const requestedDays = calculateDays(startDate, endDate);

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* ── TOP HERO HEADER (Apple HIG Banner) ──                                */}
      {/* ========================================================================= */}
      <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${cardBase}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/10 dark:border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] shrink-0">
              <CalendarOff className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
                  HR Module
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Approval Routing Synced</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Leave & Time Off
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Apply for time off, view approval workflow status, and monitor team availability. Decisions synchronize directly with the central Approvals dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            {/* Live Pending Pill */}
            <div
              className={`p-3 sm:px-4 sm:py-2.5 rounded-2xl border font-mono text-right w-full sm:w-auto ${
                isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex sm:flex-col justify-between items-center sm:items-end">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Pending
                </span>
                <span className={`text-xl sm:text-2xl font-bold tabular-nums ${pendingCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
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
              <span>Request Leave</span>
            </button>
          </div>
        </div>

        {/* Apple 4-Column Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {[
            {
              label: 'Pending Requests',
              value: pendingCount,
              sub: 'Awaiting manager approval',
              icon: Clock,
              iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            },
            {
              label: 'Approved Leaves',
              value: approvedCount,
              sub: 'Authorized time off',
              icon: CheckCircle2,
              iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            },
            {
              label: 'Rejected / Retracted',
              value: rejectedCount,
              sub: 'Declined or cancelled',
              icon: XCircle,
              iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            },
            {
              label: 'Total Requests',
              value: leaveRequests.length,
              sub: 'Lifetime leave applications',
              icon: CalendarOff,
              iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]'
            }
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/10 hover:border-white/20' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${m.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
                    {m.label}
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {m.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  {m.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── APPLE SEGMENTED FILTER BAR ──                                        */}
      {/* ========================================================================= */}
      <div className={`p-2.5 sm:p-3 rounded-3xl border transition-ui flex flex-col md:flex-row md:items-center justify-between gap-3 ${cardBase}`}>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full md:w-auto">
          {/* Status Tabs */}
          <div
            className={`p-1 rounded-2xl border flex items-center shrink-0 ${
              isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PENDING', label: `Pending (${pendingCount})` },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'REJECTED', label: 'Declined' }
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scope filter if manager */}
          {canViewAllLeave && (
            <div
              className={`p-1 rounded-2xl border flex items-center shrink-0 ${
                isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}
            >
              {[
                { id: 'ALL', label: 'All Staff' },
                { id: 'MINE', label: 'My Leaves' }
              ].map((tab) => {
                const isActive = scopeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setScopeFilter(tab.id as typeof scopeFilter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-ui cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee or reason…"
            className={`w-full pl-9.5 pr-4 py-2 rounded-xl text-xs font-sans border transition-ui focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
              isDarkMode
                ? 'bg-black/40 border-white/10 text-white placeholder:text-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── LEAVE CARDS LIST ──                                                   */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {isLoadingLeave ? (
          <div className={`p-12 rounded-3xl border text-center font-mono ${isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
            <div className="inline-block animate-spin mb-3">
              <CalendarOff className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <p className="text-xs">Synchronizing leave requests…</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className={`p-12 rounded-3xl border text-center ${cardBase}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] flex items-center justify-center border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
              <CalendarOff className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold tracking-tight">No leave requests found</h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your filters or search keywords.'
                : 'Need some time off? Submit your leave request to get approval.'}
            </p>
            {(!searchQuery && statusFilter === 'ALL') && (
              <button
                type="button"
                onClick={() => formModal.open()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-[0_8px_20px_var(--accent-shadow)] hover:bg-[var(--accent-hover)] transition-ui active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Apply for Leave</span>
              </button>
            )}
          </div>
        ) : (
          filteredRequests.map((r) => {
            const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusCfg.icon;
            const typeMeta = LEAVE_TYPE_META[r.leaveType] || { label: r.leaveType, colorCls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
            const days = calculateDays(r.startDate, r.endDate);

            return (
              <div
                key={r.id}
                className={`p-5 rounded-2xl border transition-all hover:border-[var(--accent-primary)]/40 ${cardBase}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Leave Type Badge */}
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${typeMeta.colorCls}`}>
                        {typeMeta.label}
                      </span>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${statusCfg.badgeCls}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusCfg.label}</span>
                      </span>

                      {/* Duration Pill */}
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold ${isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                        {days} {days === 1 ? 'day' : 'days'}
                      </span>

                      {/* Employee name tag if manager */}
                      {canViewAllLeave && r.employeeName && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.employeeName}</span>
                        </span>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]" />
                      <span>{r.startDate}</span>
                      <span className="text-slate-500">→</span>
                      <span>{r.endDate}</span>
                    </div>

                    {/* Reason */}
                    {r.reason && (
                      <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {r.reason}
                      </p>
                    )}

                    {/* Decision notes if any */}
                    {r.decisionNotes && (
                      <div className={`p-2.5 rounded-xl text-xs border ${isDarkMode ? 'bg-black/30 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <span className="font-semibold text-slate-400">Review note: </span>
                        {r.decisionNotes}
                      </div>
                    )}
                  </div>

                  {/* Right side actions */}
                  <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                    {r.status === 'PENDING' && r.employeeId === currentUserId && (
                      <button
                        type="button"
                        onClick={() => onCancelLeaveRequest(r.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-ui cursor-pointer active:scale-95 ${
                          isDarkMode
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                            : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Withdraw</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ── APPLY LEAVE MODAL (Apple Style) ──                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={() => formModal.close()}
        isDarkMode={isDarkMode}
        maxWidth="md"
        icon={<CalendarOff className="w-5 h-5 text-[var(--accent-primary)]" />}
        title="Apply for Leave"
        subtitle="Submit your time off request for managerial review."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => formModal.close()}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode
                  ? 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="min-h-[42px] px-6 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-extrabold text-xs shadow-[0_8px_20px_var(--accent-shadow)] cursor-pointer transition-ui active:scale-[0.96] disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Leave Type
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className={inputCls}
            >
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="EARNED">Earned / Paid Leave</option>
              <option value="UNPAID">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {startDate && endDate && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${isDarkMode ? 'bg-black/30 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <span>Estimated Duration:</span>
              <span className="font-bold text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]">{requestedDays} {requestedDays === 1 ? 'Day' : 'Days'}</span>
            </div>
          )}

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide context or instructions for handoff…"
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveView;
