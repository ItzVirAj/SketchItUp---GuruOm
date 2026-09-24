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
              {todayLog?.checkIn || todayLog?.checkInAt ? (
                <span>Checked In: {formatTime(todayLog.checkIn || todayLog.checkInAt)}</span>
              ) : (
                <span>Not Checked In Today • Shift Open</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
                <Fingerprint className="h-5 w-5" />
              </div>
              Attendance &amp; Shift Punch
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl font-normal leading-relaxed ${
              isDarkMode ? 'text-white/60' : 'text-blue-100'
            }`}>
              Digital biometric punch station for work hours and roster logs. Record shift check-ins and verify employee punctuality.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            {canManageAttendance && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 px-4 text-xs font-semibold text-white transition-all active:scale-[0.98] cursor-pointer shadow-sm backdrop-blur-md"
              >
                <Plus className="w-4 h-4" />
                <span>Mark Attendance</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAction('in')}
              disabled={!canCheckIn || isProcessing}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-bold transition-all active:scale-[0.96] cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none ${
                isDarkMode
                  ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                  : 'bg-white hover:bg-blue-50 text-blue-700 shadow-blue-900/30'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>{isProcessing ? 'Punching…' : 'Check In'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction('out')}
              disabled={!canCheckOut || isProcessing}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 text-white px-4 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none backdrop-blur-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Check Out</span>
            </button>
          </div>
        </div>

        {/* Mini Metric Dashboard Strip with SOLID VIBRANT ICON SQUIRCLES */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Present Logs */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-md shadow-black/10">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Present Logs
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {presentCount}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Punctual check-ins
              </span>
            </div>
          </div>

          {/* Card 2: Late Arrivals */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Late Arrivals
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {lateCount}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Past grace period
              </span>
            </div>
          </div>

          {/* Card 3: Half Day Logs */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Half Day Logs
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {halfDayCount}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Partial shifts logged
              </span>
            </div>
          </div>

          {/* Card 4: Total Shift Logs */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Total Shift Logs
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {currentList.length}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Historical records
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── TABS AND FILTERS BAR ──                                               */}
      {/* ========================================================================= */}
      <div className={`p-3 sm:p-4 rounded-3xl border transition-ui flex flex-col gap-4 ${cardBase}`}>
        {/* Navigation Tabs between My Logs & All Requests */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className={`p-1 rounded-full border flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100/80 border-slate-200/80'
          }`}>
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'my'
                  ? isDarkMode ? 'bg-white text-slate-950 shadow-sm' : 'bg-[#155dfc] text-white shadow-sm'
                  : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'all'
                    ? isDarkMode ? 'bg-white text-slate-950 shadow-sm' : 'bg-[#155dfc] text-white shadow-sm'
                    : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
            className={`p-1 rounded-full border flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto ${
              isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100/80 border-slate-200/80'
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? isDarkMode ? 'bg-white text-slate-950 shadow-sm' : 'bg-[#155dfc] text-white shadow-sm'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
