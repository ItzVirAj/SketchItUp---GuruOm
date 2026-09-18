import React, { useState, useMemo, useEffect } from 'react';
import {
  Fingerprint,
  LogIn,
  LogOut,
  Clock,
  Search,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  CalendarOff,
  Plus,
  Palmtree,
  ShieldCheck,
  Building2,
  Sparkles
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { AttendanceLog, AttendanceStatus } from '../../../services/consoleApiServices';

interface AttendanceViewProps {
  attendanceLogs: AttendanceLog[];
  myAttendanceLogs?: AttendanceLog[];
  isLoadingAttendance: boolean;
  canManageAttendance: boolean;
  canViewAllAttendance: boolean;
  todayLog: AttendanceLog | null;
  currentUserId?: string;
  isDarkMode: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  statusFilter?: AttendanceStatus | 'ALL';
  onStatusFilterChange?: (status: AttendanceStatus | 'ALL') => void;
  onCheckIn: () => Promise<AttendanceLog>;
  onCheckOut: () => Promise<AttendanceLog>;
  onCreateAttendance?: (payload: {
    userId: string;
    workDate: string;
    status: AttendanceStatus;
    checkIn?: string | null;
    checkOut?: string | null;
    source?: string;
    notes?: string | null;
  }) => Promise<AttendanceLog>;
  onUpdateAttendance?: (
    id: string,
    payload: {
      status?: AttendanceStatus;
      checkIn?: string | null;
      checkOut?: string | null;
      source?: string;
      notes?: string | null;
    }
  ) => Promise<AttendanceLog>;
}

const STATUS_STYLE: Record<
  AttendanceStatus,
  { label: string; badgeCls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PRESENT: {
    label: 'Present',
    badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2
  },
  LATE: {
    label: 'Late Arrival',
    badgeCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: AlertCircle
  },
  HALF_DAY: {
    label: 'Half Day',
    badgeCls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    icon: Clock
  },
  ON_LEAVE: {
    label: 'On Leave',
    badgeCls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    icon: CalendarOff
  },
  ABSENT: {
    label: 'Absent',
    badgeCls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    icon: AlertCircle
  },
  HOLIDAY: {
    label: 'Holiday',
    badgeCls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    icon: Palmtree
  }
};

function formatTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}

function calculateDuration(checkIn?: string, checkOut?: string): string {
  if (!checkIn) return '—';
  const start = new Date(checkIn).getTime();
  const end = checkOut ? new Date(checkOut).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return '—';
  const totalMins = Math.floor((end - start) / (1000 * 60));
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${mins}m`;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendanceLogs,
  myAttendanceLogs = [],
  isLoadingAttendance,
  canManageAttendance,
  canViewAllAttendance,
  todayLog,
  currentUserId,
  isDarkMode,
  searchQuery = '',
  onSearchChange,
  statusFilter = 'ALL',
  onStatusFilterChange,
  onCheckIn,
  onCheckOut,
  onCreateAttendance,
  onUpdateAttendance
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: '',
    workDate: new Date().toISOString().slice(0, 10),
    status: 'PRESENT' as AttendanceStatus,
    notes: ''
  });

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange && localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange, searchQuery]);

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  const canCheckIn = !todayLog?.checkIn && !todayLog?.checkInAt;
  const canCheckOut = (Boolean(todayLog?.checkIn) || Boolean(todayLog?.checkInAt)) && !todayLog?.checkOut && !todayLog?.checkOutAt;

  const handleAction = async (action: 'in' | 'out') => {
    setIsProcessing(true);
    try {
      if (action === 'in') {
        await onCheckIn();
      } else {
        await onCheckOut();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine current active list
  const currentList = useMemo(() => {
    if (activeTab === 'my') {
      return myAttendanceLogs.length > 0 ? myAttendanceLogs : attendanceLogs;
    }
    return attendanceLogs;
  }, [activeTab, myAttendanceLogs, attendanceLogs]);

  // Metrics
  const presentCount = useMemo(() => currentList.filter((l) => l.status === 'PRESENT').length, [currentList]);
  const lateCount = useMemo(() => currentList.filter((l) => l.status === 'LATE').length, [currentList]);
  const halfDayCount = useMemo(() => currentList.filter((l) => l.status === 'HALF_DAY').length, [currentList]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return currentList.filter((log) => {
      if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
      if (activeTab === 'all' && localSearch.trim()) {
        const query = localSearch.toLowerCase();
        const matchesName = (log.employeeName || log.user?.name || '').toLowerCase().includes(query);
        const matchesDate = (log.workDate || log.logDate || '').toLowerCase().includes(query);
        const matchesShift = (log.shift || '').toLowerCase().includes(query);
        const matchesEmail = (log.user?.email || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDate && !matchesShift && !matchesEmail) return false;
      }
      return true;
    });
  }, [currentList, statusFilter, activeTab, localSearch]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateAttendance || !manualForm.userId || !manualForm.workDate) return;
    setIsProcessing(true);
    try {
      await onCreateAttendance({
        userId: manualForm.userId,
        workDate: manualForm.workDate,
        status: manualForm.status,
        notes: manualForm.notes || null,
        source: 'MANUAL'
      });
      setIsModalOpen(false);
      setManualForm({
        userId: '',
        workDate: new Date().toISOString().slice(0, 10),
        status: 'PRESENT',
        notes: ''
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* ── TOP HERO HEADER (Apple HIG Banner) ──                                */}
      {/* ========================================================================= */}
      <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${cardBase}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/10 dark:border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] shrink-0">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
                  HR Module
                </span>
                {todayLog?.checkIn || todayLog?.checkInAt ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Checked In: {formatTime(todayLog.checkIn || todayLog.checkInAt)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Not Checked In Today</span>
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Attendance & Shift Punch
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Digital punch-in system for work hours and shift logs. Record daily check-in/out timestamps and review attendance punctuality.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            {canManageAttendance && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-4 text-xs font-bold transition-ui active:scale-[0.96] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Mark Attendance</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAction('in')}
              disabled={!canCheckIn || isProcessing}
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              <LogIn className="w-4 h-4" />
              <span>{isProcessing ? 'Punching…' : 'Check In'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction('out')}
              disabled={!canCheckOut || isProcessing}
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 px-4 text-xs font-extrabold text-[var(--accent-primary)] shadow-sm transition-ui active:scale-[0.96] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              <LogOut className="w-4 h-4" />
              <span>Check Out</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {[
            {
              label: 'Present Logs',
              value: presentCount,
              sub: 'Punctual check-ins',
              icon: CheckCircle2,
              iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            },
            {
              label: 'Late Arrivals',
              value: lateCount,
              sub: 'Marked after grace threshold',
              icon: AlertCircle,
              iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            },
            {
              label: 'Half Day Logs',
              value: halfDayCount,
              sub: 'Partial shifts logged',
              icon: Clock,
              iconBg: 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
            },
            {
              label: 'Total Shift Logs',
              value: currentList.length,
              sub: 'Historical roster records',
              icon: Fingerprint,
              iconBg:
                'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]'
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
      {/* ── TABS AND FILTERS BAR ──                                               */}
      {/* ========================================================================= */}
      <div className={`p-3 sm:p-4 rounded-3xl border transition-ui flex flex-col gap-4 ${cardBase}`}>
        {/* Navigation Tabs between My Logs & All Requests */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer flex items-center gap-2 ${
                activeTab === 'my'
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Attendance Logs</span>
            </button>

            {/* Render 'All Staff Logs' ONLY when user has ALL scope (Owner/HR/ServerAdmin/Admin) */}
            {canViewAllAttendance && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer flex items-center gap-2 ${
                  activeTab === 'all'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white bg-white/5'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>All Staff Logs</span>
              </button>
            )}
          </div>

          {/* Search box: Render ONLY when user has ALL scope on attendance */}
          {canViewAllAttendance && (
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search employee by name or email…"
                className={`w-full pl-9.5 pr-4 py-2 rounded-xl text-xs font-sans border transition-ui focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
                  isDarkMode
                    ? 'bg-black/40 border-white/10 text-white placeholder:text-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div
            className={`p-1 rounded-2xl border flex items-center overflow-x-auto scrollbar-none w-full sm:w-auto ${
              isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {[
              { id: 'ALL', label: 'All Statuses' },
              { id: 'PRESENT', label: 'Present' },
              { id: 'LATE', label: 'Late' },
              { id: 'HALF_DAY', label: 'Half Day' },
              { id: 'ON_LEAVE', label: 'On Leave' },
              { id: 'ABSENT', label: 'Absent' },
              { id: 'HOLIDAY', label: 'Holiday' }
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusFilterChange?.(tab.id as typeof statusFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap ${
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

          <div className="text-[11px] font-mono text-slate-400">
            Showing {filteredLogs.length} record{filteredLogs.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── ATTENDANCE LOG LIST ──                                               */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        {isLoadingAttendance ? (
          <div
            className={`p-12 rounded-3xl border text-center font-mono ${
              isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <div className="inline-block animate-spin mb-3">
              <Fingerprint className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <p className="text-xs">Fetching attendance punch records…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className={`p-12 rounded-3xl border text-center ${cardBase}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] flex items-center justify-center border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
              <Fingerprint className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold tracking-tight">No attendance records found</h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {localSearch || statusFilter !== 'ALL'
                ? 'No matching logs for current search or filters.'
                : 'Punch in your attendance above to create your first shift log today.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const statusCfg = STATUS_STYLE[log.status] || STATUS_STYLE.PRESENT;
            const StatusIcon = statusCfg.icon;
            const checkInVal = log.checkIn || log.checkInAt;
            const checkOutVal = log.checkOut || log.checkOutAt;
            const duration = calculateDuration(checkInVal, checkOutVal);
            const employeeDisplay = log.user?.name || log.employeeName;

            return (
              <div
                key={log.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all hover:border-[var(--accent-primary)]/40 ${cardBase}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shrink-0">
                      <Calendar className="w-4 h-4 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold font-mono">
                          {log.workDate || log.logDate}
                        </span>
                        {log.shift && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold ${
                              isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.shift}
                          </span>
                        )}
                        {employeeDisplay && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}
                          >
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{employeeDisplay}</span>
                            {log.user?.department && (
                              <span className="text-[10px] text-slate-500">
                                ({log.user.department})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      {log.notes && (
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs font-mono">
                    {/* Punch in */}
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{checkInVal ? formatTime(checkInVal) : '—'}</span>
                    </div>

                    <span className="text-slate-400">→</span>

                    {/* Punch out */}
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{checkOutVal ? formatTime(checkOutVal) : checkInVal ? 'Active' : '—'}</span>
                    </div>

                    {/* Duration badge */}
                    {checkInVal && (
                      <span
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold ${
                          isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {duration}
                      </span>
                    )}

                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${statusCfg.badgeCls}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Manual Attendance Entry (HR / Admin only) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Mark Attendance Record"
        isDarkMode={isDarkMode}
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              User / Employee ID
            </label>
            <input
              type="text"
              required
              value={manualForm.userId}
              onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
              placeholder="e.g. UUID of user"
              className={`w-full p-2.5 rounded-xl text-xs border ${
                isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Work Date
            </label>
            <input
              type="date"
              required
              value={manualForm.workDate}
              onChange={(e) => setManualForm({ ...manualForm, workDate: e.target.value })}
              className={`w-full p-2.5 rounded-xl text-xs border ${
                isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Status
            </label>
            <select
              value={manualForm.status}
              onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as AttendanceStatus })}
              className={`w-full p-2.5 rounded-xl text-xs border ${
                isDarkMode ? 'bg-[#18181B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="PRESENT">PRESENT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="HALF_DAY">HALF_DAY</option>
              <option value="ON_LEAVE">ON_LEAVE</option>
              <option value="HOLIDAY">HOLIDAY</option>
              <option value="LATE">LATE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={manualForm.notes}
              onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
              placeholder="Optional notes..."
              className={`w-full p-2.5 rounded-xl text-xs border ${
                isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? 'Saving…' : 'Save Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendanceView;
