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
  Sparkles,
  Globe,
  Laptop,
  Smartphone,
  Monitor,
  Hash,
  Copy,
  Check
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { useAccentTheme } from '../../../context/AccentThemeContext';
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
  users?: any[];
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
  onUpdateAttendance,
  users = []
}) => {
  const { accent, isGreen, isBlue, isCrystal } = useAccentTheme();
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: '',
    workDate: new Date().toISOString().slice(0, 10),
    status: 'PRESENT' as AttendanceStatus,
    notes: ''
  });

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 1500);
  };

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
    ? isCrystal
      ? 'border-white/10 bg-gradient-to-b from-[#181C24] via-[#10131A] to-[#0A0C10] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
      : isGreen
        ? 'border-emerald-500/20 bg-gradient-to-b from-[#0D241B] via-[#081711] to-[#030B07] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
        : 'border-white/10 bg-[#09090B] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : isCrystal
      ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] text-slate-900 shadow-sm'
      : 'border-slate-200/80 bg-white text-slate-900 shadow-sm';

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
        const matchedUser = users?.find(
          (u: any) =>
            u.id === log.userId ||
            u.userId === log.userId ||
            u.id === log.employeeId ||
            u.userId === log.employeeId ||
            (log.user?.email && u.email?.toLowerCase() === log.user.email.toLowerCase())
        );
        const resolvedName = (log.employeeName || log.user?.name || matchedUser?.name || matchedUser?.fullName || '').toLowerCase();
        const resolvedUserId = (log.userId || log.employeeId || log.user?.id || matchedUser?.id || '').toLowerCase();
        const matchesDate = (log.workDate || log.logDate || '').toLowerCase().includes(query);
        const matchesShift = (log.shift || '').toLowerCase().includes(query);
        const matchesEmail = (log.user?.email || matchedUser?.email || '').toLowerCase().includes(query);
        const matchesIp = (log.ipAddress || log.ip || '').toLowerCase().includes(query);
        const matchesDevice = (log.device || log.deviceName || '').toLowerCase().includes(query);
        const matchesNotes = (log.notes || '').toLowerCase().includes(query);

        if (
          !resolvedName.includes(query) &&
          !resolvedUserId.includes(query) &&
          !matchesDate &&
          !matchesShift &&
          !matchesEmail &&
          !matchesIp &&
          !matchesDevice &&
          !matchesNotes
        ) {
          return false;
        }
      }
      return true;
    });
  }, [currentList, statusFilter, activeTab, localSearch, users]);

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
              Attendance ({filteredLogs.length})
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {canCheckIn && (
              <button
                type="button"
                onClick={() => handleAction('in')}
                disabled={isProcessing}
                className="flex h-9 items-center gap-1.5 px-3 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-sm active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Punch In</span>
              </button>
            )}
            {canCheckOut && (
              <button
                type="button"
                onClick={() => handleAction('out')}
                disabled={isProcessing}
                className="flex h-9 items-center gap-1.5 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Punch Out</span>
              </button>
            )}
          </div>
        </div>

        {/* 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Present</span>
            </div>
            <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {presentCount}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Late Arrivals</span>
            </div>
            <p className="text-xl font-black font-mono text-amber-500 tabular-nums">
              {lateCount}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Half Day</span>
            </div>
            <p className="text-xl font-black font-mono text-purple-500 tabular-nums">
              {halfDayCount}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-white shadow-xs">
                <Fingerprint className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Shift Logs</span>
            </div>
            <p className="text-xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {currentList.length}
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
                  {todayLog?.checkIn || todayLog?.checkInAt ? (
                    `Checked In: ${formatTime(todayLog.checkIn || todayLog.checkInAt)}`
                  ) : (
                    'Not Checked In Today • Shift Open'
                  )}
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
                  <Fingerprint className="h-5 w-5" />
                </div>
                Attendance &amp; Shift Punch
              </h1>
              <p className={`text-xs sm:text-sm max-w-2xl font-normal leading-relaxed ${
                !isDarkMode && isCrystal ? 'text-slate-600' : isDarkMode ? 'text-white/60' : 'text-white/80'
              }`}>
                Digital biometric punch station for work hours and roster logs. Record shift check-ins and verify employee punctuality.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
              {canManageAttendance && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer backdrop-blur-md ${
                    !isDarkMode && isCrystal
                      ? 'border-slate-300/80 bg-white/80 hover:bg-white text-slate-700'
                      : 'border-white/20 bg-white/10 hover:bg-white/15 text-white'
                  }`}
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
                  !isDarkMode && isCrystal
                    ? 'bg-slate-950 hover:bg-slate-800 text-white shadow-slate-900/20'
                    : isDarkMode
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
                className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none backdrop-blur-md ${
                  !isDarkMode && isCrystal
                    ? 'border-slate-300/80 bg-white/80 hover:bg-white text-slate-700'
                    : 'border-white/20 bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Check Out</span>
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
          {/* Present Logs */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
              !isDarkMode && isCrystal
                ? 'bg-slate-100 text-emerald-600 border border-slate-200'
                : 'bg-white text-emerald-600'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Present Logs
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-emerald-700' : 'text-emerald-400'
              }`}>
                {presentCount}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Punctual check-ins
              </span>
            </div>
          </div>

          {/* Late Arrivals */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Late Arrivals
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-amber-600' : 'text-amber-400'
              }`}>
                {lateCount}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Past grace period
              </span>
            </div>
          </div>

          {/* Half Day Logs */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-sm shadow-purple-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Half Day Logs
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-purple-600' : 'text-purple-400'
              }`}>
                {halfDayCount}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Partial shifts logged
              </span>
            </div>
          </div>

          {/* Total Shift Logs */}
          <div className="p-4 sm:p-5 flex items-center gap-4 transition-colors">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
              !isDarkMode && isCrystal
                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                : 'bg-blue-600 text-white'
            }`}>
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Total Shift Logs
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'
              }`}>
                {currentList.length}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Historical records
              </span>
            </div>
          </div>
        </div>
      </section>

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
                  ? isCrystal
                    ? 'bg-slate-950 text-white shadow-xs'
                    : isGreen
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[#155dfc] text-white shadow-xs'
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
                    ? isCrystal
                      ? 'bg-slate-950 text-white shadow-xs'
                      : isGreen
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#155dfc] text-white shadow-xs'
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
                placeholder="Search by name, ID, email, IP, device…"
                className={`w-full pl-9.5 pr-4 py-2 rounded-xl text-xs font-sans border transition-ui focus:outline-none focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/15 ${
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
            className={`inline-flex items-center p-1 rounded-xl border text-xs overflow-x-auto max-w-full ${
              isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white/15 text-white shadow-xs border border-white/10'
                        : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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

            // User Resolution
            const matchedUser = users?.find(
              (u: any) =>
                u.id === log.userId ||
                u.userId === log.userId ||
                u.id === log.employeeId ||
                u.userId === log.employeeId ||
                (log.user?.email && u.email?.toLowerCase() === log.user.email.toLowerCase())
            );

            const userName =
              log.user?.name ||
              log.employeeName ||
              matchedUser?.name ||
              matchedUser?.fullName ||
              (matchedUser?.email ? matchedUser.email.split('@')[0] : null) ||
              'Staff Member';

            const resolvedUserId =
              log.userId ||
              log.employeeId ||
              log.user?.id ||
              matchedUser?.id ||
              matchedUser?.userId ||
              '—';

            const userDept = log.user?.department || matchedUser?.department;

            // IP Resolution
            let ip = log.ipAddress || log.ip;
            if (!ip && log.notes) {
              const ipMatch = log.notes.match(/\[(?:IP|IP_Address):\s*([^\]]+)\]/i);
              if (ipMatch) ip = ipMatch[1].trim();
            }
            const displayIp = ip || '127.0.0.1 (Local)';

            // Device Resolution
            let device = log.device || log.deviceName;
            if (!device && log.notes) {
              const devMatch = log.notes.match(/\[(?:Device|Device_Name):\s*([^\]]+)\]/i);
              if (devMatch) device = devMatch[1].trim();
            }
            const displayDevice = device || 'Web Workstation';
            const isMobile =
              log.deviceType === 'mobile' ||
              /mobile|iphone|android/i.test(displayDevice);
            const isTablet =
              log.deviceType === 'tablet' ||
              /tablet|ipad/i.test(displayDevice);

            // Clean notes from internal meta tags for user display
            const cleanNotes = log.notes
              ? log.notes
                  .replace(/\[(?:IP|IP_Address):\s*[^\]]+\]/gi, '')
                  .replace(/\[(?:Device|Device_Name):\s*[^\]]+\]/gi, '')
                  .trim()
              : null;

            const isCopied = copiedId === resolvedUserId;

            return (
              <div
                key={log.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all hover:border-[var(--accent-primary)]/40 ${cardBase}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: User identity, date, badges, telemetry */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]" />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Row 1: User Name + User ID Badge + Work Date + Shift */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* User Name */}
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                          <User className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                          <span className="truncate">{userName}</span>
                          {userDept && (
                            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              ({userDept})
                            </span>
                          )}
                        </div>

                        {/* User ID pill with copy button */}
                        {resolvedUserId && resolvedUserId !== '—' && (
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(resolvedUserId, e)}
                            title={`Click to copy User ID: ${resolvedUserId}`}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition-all border cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : isDarkMode
                                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
                            }`}
                          >
                            <Hash className="w-2.5 h-2.5 opacity-60" />
                            <span>ID: {resolvedUserId.length > 14 ? `${resolvedUserId.slice(0, 8)}…` : resolvedUserId}</span>
                            {isCopied ? (
                              <Check className="w-2.5 h-2.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-50 hover:opacity-100" />
                            )}
                          </button>
                        )}

                        {/* Work Date */}
                        <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                          • {log.workDate || log.logDate}
                        </span>

                        {/* Shift badge */}
                        {log.shift && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold ${
                              isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.shift}
                          </span>
                        )}
                      </div>

                      {/* Row 2: IP Address & Device Telemetry */}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                        {/* IP Address */}
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                          <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span className="font-semibold text-slate-500 dark:text-slate-400">IP:</span>
                          <span className="text-slate-700 dark:text-slate-300">{displayIp}</span>
                        </div>

                        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

                        {/* Device */}
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                          {isMobile ? (
                            <Smartphone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : isTablet ? (
                            <Monitor className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-500 dark:text-slate-400">Device:</span>
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[240px] sm:max-w-none">
                            {displayDevice}
                          </span>
                        </div>
                      </div>

                      {/* Notes (if any) */}
                      {cleanNotes && (
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {cleanNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Punch times, Duration, Status badge */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs font-mono shrink-0 pl-10 lg:pl-0">
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
