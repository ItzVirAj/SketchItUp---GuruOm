import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart3,
  Hash,
  LayoutDashboard,
  AlertTriangle,
  Check,
  Clock,
  DollarSign,
  ShoppingCart,
  Factory,
  ShieldCheck,
  Truck,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowRight,
  Search,
  TrendingUp,
  TrendingDown,
  Package,
  Download,
  CheckSquare,
  Sparkles,
  Zap,
  Gauge,
  Plus,
  Radio,
  Layers,
  ArrowUpRight,
  ClipboardList,
  Boxes,
  Wallet,
  Target,
  Play,
  ShoppingBag,
  CreditCard,
  Building2,
  Receipt,
  Megaphone,
  Pin,
  Calendar,
  Sun,
  Moon,
  Sunset,
  UserCheck,
  ListTodo,
  Video,
  ExternalLink,
  Activity,
  CheckCircle2,
  CircleDot,
  Info,
  Paperclip,
  MessageSquare,
  MoreHorizontal,
  Mic,
  ChevronDown,
  Scissors,
  MapPin,
  BarChart2,
  Users,
  Cog,
  Rocket
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from '../../../context/ToastContext';
import {
  Announcement,
  Task,
  AttendanceLog,
  Meeting
} from '../../../services/consoleApiServices';
import {
  CustomerOrder,
  StockItem,
  QCInspection,
  JobCard,
  DispatchChallan,
  CustomerInvoice,
  VendorBill,
  ProductionLogReport,
  AuditLogEntry,
  PendingApproval,
  SystemUser
} from '../../../types/console';
import { AgentBentoGrid } from '../AgentBentoGrid';
import { AccentColorSelector } from '../AccentColorSelector';
import { OrderBookRevenueChart } from '../charts/OrderBookRevenueChart';
import {
  StatSparklineCard,
  CashflowTrendCard,
  MonthlyProgressCard,
  HistoryCard,
  GateConsolidationCard
} from '../widgets/ExecutiveCommandWidgets';
import {
  ExecutiveDashboardLayout,
  OperationsDashboardLayout,
  QualityGateDashboardLayout,
  FinancialDashboardLayout
} from '../widgets/CommandCentreLayouts';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { useUrlModal } from '../../../hooks/useUrlModal';

interface CommandCentreViewProps {
  orders?: CustomerOrder[];
  stock?: StockItem[];
  qcItems?: QCInspection[];
  jobCards?: JobCard[];
  shortages?: any[];
  dispatches?: DispatchChallan[];
  invoices?: CustomerInvoice[];
  payables?: VendorBill[];
  productionLogs?: ProductionLogReport[];
  pdiQueue?: any[];
  machines?: any[];
  users?: any[];
  auditLogs?: AuditLogEntry[];
  approvals?: PendingApproval[];
  announcements?: Announcement[];
  containerScrollRef?: React.RefObject<HTMLElement | null>;
  isDarkMode?: boolean;
  isRealtimeStreaming?: boolean;
  onToggleRealtimeStreaming?: () => void;
  onResetAllData?: () => void;
  onNavigateView?: (view: any) => void;
  onNavigate?: (view: any) => void;
  onSelectOrder?: (orderId: string) => void;
  showCustomizeModal?: boolean;
  setShowCustomizeModal?: (show: boolean) => void;
  scope?: string;
  setScope?: (scope: string) => void;

  // New HR Module Integration
  tasks?: Task[];
  isLoadingTasks?: boolean;
  onUpdateTaskStatus?: (taskId: string, status: any) => Promise<any> | void;
  onCreateTask?: (task: any) => Promise<any> | void;
  todayLog?: AttendanceLog | null;
  onCheckIn?: (shift?: string) => Promise<any> | void;
  onCheckOut?: () => Promise<any> | void;
  meetings?: Meeting[];
  currentUser?: SystemUser | null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUBCOMPONENT: Quick Attendance Station (Live Punch In / Out)
───────────────────────────────────────────────────────────────────────────── */
const QuickAttendanceStation: React.FC<{
  todayLog?: AttendanceLog | null;
  onCheckIn?: (shift?: string) => Promise<any> | void;
  onCheckOut?: () => Promise<any> | void;
  isDarkMode?: boolean;
}> = ({ todayLog, onCheckIn, onCheckOut, isDarkMode }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [localCheckedIn, setLocalCheckedIn] = useState<boolean | null>(null);

  const isCheckedIn = localCheckedIn !== null
    ? localCheckedIn
    : Boolean(todayLog?.checkIn && !todayLog?.checkOut);

  const isCheckedOut = Boolean(todayLog?.checkOut && !localCheckedIn);

  const handlePunch = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (isCheckedIn) {
        if (onCheckOut) {
          await onCheckOut();
        }
        setLocalCheckedIn(false);
      } else {
        if (onCheckIn) {
          await onCheckIn('General');
        }
        setLocalCheckedIn(true);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Attendance action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const punchTimeFormatted = useMemo(() => {
    if (todayLog?.checkIn) {
      try {
        const d = new Date(todayLog.checkIn);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return todayLog.checkIn;
      }
    }
    return null;
  }, [todayLog?.checkIn]);

  return (
    <div
      className={`inline-flex items-center gap-3 p-1 pl-3.5 pr-1 rounded-full border backdrop-blur-xl transition-all ${
        isDarkMode
          ? 'bg-white/[0.05] border-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
          : 'bg-slate-100/90 border-slate-200/80 text-slate-800 shadow-2xs'
      }`}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {isCheckedIn && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isCheckedIn ? 'bg-emerald-500' : isCheckedOut ? 'bg-slate-400' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          />
        </span>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            {isCheckedIn ? 'Shift Active' : isCheckedOut ? 'Shift Done' : 'Shift Ready'}
          </span>
          {isCheckedIn && punchTimeFormatted && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                {punchTimeFormatted}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        disabled={isProcessing}
        onClick={handlePunch}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
          isCheckedIn
            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            : isDarkMode
              ? 'bg-white text-slate-950 hover:bg-slate-100 shadow-xs'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
        }`}
      >
        {isProcessing ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : isCheckedIn ? (
          <Clock className="w-3 h-3" />
        ) : (
          <UserCheck className="w-3 h-3" />
        )}
        <span>{isProcessing ? 'Syncing...' : isCheckedIn ? 'Check Out' : 'Check In'}</span>
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUBCOMPONENT: Interactive Mini Calendar Widget (Wide 8-Column Responsive Split)
───────────────────────────────────────────────────────────────────────────── */
const MiniCalendarWidget: React.FC<{
  isDarkMode?: boolean;
  tasks?: Task[];
  meetings?: Meeting[];
  onNavigateToMeetings?: () => void;
}> = ({ isDarkMode, tasks = [], meetings = [], onNavigateToMeetings }) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthName = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  // Monday-first weekday header
  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const calendarDays = useMemo(() => {
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; dayNum: number; isCurrentMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      days.push({
        date: new Date(year, month - 1, d),
        dayNum: d,
        isCurrentMonth: false
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: new Date(year, month, d),
        dayNum: d,
        isCurrentMonth: true
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: new Date(year, month + 1, d),
        dayNum: d,
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month]);

  const today = new Date();

  const dayHasEvent = (d: Date) => {
    const y = d.getFullYear();
    const m = d.getMonth();
    const dt = d.getDate();

    const hasM = meetings.some(meet => {
      if (!meet.startTime) return false;
      const md = new Date(meet.startTime);
      return md.getFullYear() === y && md.getMonth() === m && md.getDate() === dt;
    });

    const hasT = tasks.some(t => {
      const taskDate = t.dueAt || t.dueDate;
      if (!taskDate) return false;
      const td = new Date(taskDate);
      return td.getFullYear() === y && td.getMonth() === m && td.getDate() === dt;
    });

    return hasM || hasT;
  };

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const selectedDay = selectedDate.getDate();

  const selectedMeetings = meetings.filter(m => {
    if (!m.startTime) return false;
    const md = new Date(m.startTime);
    return md.getFullYear() === selectedYear && md.getMonth() === selectedMonth && md.getDate() === selectedDay;
  });

  const selectedTasks = tasks.filter(t => {
    const taskDate = t.dueAt || t.dueDate;
    if (!taskDate) return false;
    const td = new Date(taskDate);
    return td.getFullYear() === selectedYear && td.getMonth() === selectedMonth && td.getDate() === selectedDay;
  });

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all backdrop-blur-2xl overflow-hidden ${
        isDarkMode
          ? 'bg-[#151722]/90 border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.4)]'
          : 'bg-white border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 items-start">
        {/* Left Column: Interactive Month Calendar Grid */}
        <div>
          {/* Header: < Month Year > */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2]" />
            </button>

            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {monthName}
              </h3>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {/* Weekdays Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekdays.map(w => (
              <div key={w} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 py-0.5">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 place-items-center">
            {calendarDays.map(({ date, dayNum, isCurrentMonth }, idx) => {
              const isToday = date.toDateString() === today.toDateString();
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const hasEvent = dayHasEvent(date);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    if (!isCurrentMonth) {
                      setCurrentMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
                    }
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex flex-col items-center justify-center text-[11px] font-semibold transition-colors cursor-pointer relative ${
                    isToday
                      ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold shadow-xs'
                      : isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                      : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <span className="leading-none">{dayNum}</span>
                  <span
                    className={`w-1 h-1 rounded-full mt-0.5 ${
                      hasEvent
                        ? isToday || isSelected
                          ? 'bg-white dark:bg-slate-950'
                          : 'bg-blue-500 dark:bg-blue-400'
                        : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Date Schedule & Direct Meeting Action */}
        <div className="md:border-l md:border-slate-100 md:dark:border-white/[0.08] md:pl-5 lg:pl-6 pt-3 md:pt-0 flex flex-col justify-between h-full min-h-[220px]">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedDate.toDateString() === today.toDateString()
                    ? 'Today\'s Schedule'
                    : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {selectedMeetings.length + selectedTasks.length} Item{selectedMeetings.length + selectedTasks.length === 1 ? '' : 's'}
              </span>
            </div>

            {selectedMeetings.length === 0 && selectedTasks.length === 0 ? (
              <div className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center flex flex-col items-center justify-center">
                <Calendar className="w-6 h-6 stroke-[1.5] text-slate-300 dark:text-slate-600 mb-1.5" />
                <span>No scheduled sessions or task deadlines on this date.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {selectedMeetings.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <Video className="w-3 h-3" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{m.title}</span>
                    </div>
                    <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono font-semibold shrink-0">
                      {m.startTime ? new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All day'}
                    </span>
                  </div>
                ))}
                {selectedTasks.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckSquare className="w-3 h-3" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.title}</span>
                    </div>
                    <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {t.priority || 'Task'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Team Calendar Synchronized</span>
            {onNavigateToMeetings && (
              <button
                type="button"
                onClick={onNavigateToMeetings}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Calendar View</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUBCOMPONENT: Meeting Notes Card (Matching Reference UI)
───────────────────────────────────────────────────────────────────────────── */
interface MeetingNotesWidgetProps {
  meetings?: Meeting[];
  isDarkMode?: boolean;
  onNavigateToMeetings?: () => void;
}

const MeetingNotesWidget: React.FC<MeetingNotesWidgetProps> = ({
  meetings = [],
  isDarkMode,
  onNavigateToMeetings
}) => {
  const upcomingMeeting = useMemo(() => {
    const now = new Date();
    const scheduled = meetings
      .filter(m => m.status === 'SCHEDULED' && m.startTime && new Date(m.startTime).getTime() >= now.getTime() - 1000 * 60 * 60)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return scheduled[0] || null;
  }, [meetings]);

  const formatMeetingTime = (startStr?: string, endStr?: string) => {
    if (!startStr) return '02.00 pm - 04.00 pm';
    try {
      const s = new Date(startStr);
      const startFormatted = s.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      if (!endStr) return startFormatted;
      const e = new Date(endStr);
      const endFormatted = e.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      return `${startFormatted} - ${endFormatted}`;
    } catch {
      return '02.00 pm - 04.00 pm';
    }
  };

  const handleStartMeeting = () => {
    if (upcomingMeeting?.meetingLink) {
      toast.success(`Launching virtual meeting: ${upcomingMeeting.title}`);
      window.open(upcomingMeeting.meetingLink, '_blank', 'noopener,noreferrer');
    } else {
      toast.info('Opening Meetings & Scheduling Suite...');
      onNavigateToMeetings?.();
    }
  };

  const displayTitle = upcomingMeeting?.title || 'Meeting with Arc Company';
  const displayTime = formatMeetingTime(upcomingMeeting?.startTime, upcomingMeeting?.endTime);

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border transition-all backdrop-blur-2xl ${
      isDarkMode
        ? 'bg-[#11131a] border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.4)]'
        : 'bg-white border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
    }`}>
      {/* Top Header: "Meeting Notes" + Circular Plus Button */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Meeting Notes
        </h3>
        <button
          type="button"
          onClick={onNavigateToMeetings}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
            isDarkMode
              ? 'bg-white/10 hover:bg-white/15 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-2xs'
          }`}
          title="Schedule New Meeting"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Stacked Cards Deck Visual Effect (Matching Blue Gradient Spec) */}
      <div className="relative pt-2">
        {/* Layer 2 (Backmost) */}
        <div className={`absolute inset-x-8 -top-1 h-full rounded-[24px] pointer-events-none transition-all ${
          isDarkMode ? 'bg-blue-500/10 border border-blue-400/20' : 'bg-blue-400/15 border border-blue-300/30'
        }`} />
        {/* Layer 1 (Middle) */}
        <div className={`absolute inset-x-4 top-0.5 h-full rounded-[24px] pointer-events-none transition-all ${
          isDarkMode ? 'bg-blue-500/20 border border-blue-400/30' : 'bg-blue-400/25 border border-blue-300/40'
        }`} />

        {/* Front Blue Gradient Card */}
        <div className="relative z-10 p-4 sm:p-5 rounded-[22px] bg-gradient-to-br from-[#1b64ff] via-[#155dfc] to-[#0d47a1] border border-blue-400/30 text-white shadow-xl shadow-blue-500/20 flex flex-col justify-between min-h-[165px]">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-snug line-clamp-2 max-w-[210px]">
                {displayTitle}
              </h4>
              <button
                type="button"
                onClick={onNavigateToMeetings}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 border border-white/25 shadow-xs shrink-0"
                title="Meeting Options"
              >
                <MoreHorizontal className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="text-xs text-white/80 font-medium tracking-wide mt-1.5">
              Time: {displayTime}
            </div>
          </div>

          {/* Full-width white gradient "Start Meeting" button */}
          <button
            type="button"
            onClick={handleStartMeeting}
            className="w-full mt-4 py-2.5 rounded-full bg-gradient-to-b from-white via-slate-50 to-slate-100 hover:from-white hover:to-blue-50 text-blue-700 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-950/20 border border-white/80 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Video className="w-4 h-4 fill-blue-700 text-blue-700 stroke-[1.5]" />
            <span>Start Meeting</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUBCOMPONENT: AI PlanIQ Card (Matching Reference UI)
───────────────────────────────────────────────────────────────────────────── */
interface AiPlanIqWidgetProps {
  userName?: string;
  isDarkMode?: boolean;
  onNavigate?: (view: any) => void;
}

const AiPlanIqWidget: React.FC<AiPlanIqWidgetProps> = ({
  userName = 'Masud A.',
  isDarkMode,
  onNavigate
}) => {
  const [prompt, setPrompt] = useState('');
  const [modelMode, setModelMode] = useState<'plan' | 'deep' | 'ops'>('plan');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const handleSendPrompt = (text?: string) => {
    const query = (text || prompt).trim();
    if (!query) {
      toast.info('Ask AI anything about tasks, factory efficiency, or schedules.');
      return;
    }
    toast.success(`AI Query received: "${query}". Analyzing factory telemetry...`);
    setPrompt('');
  };

  return (
    <div className={`p-5 sm:p-5.5 rounded-3xl border transition-all backdrop-blur-2xl relative overflow-hidden flex flex-col justify-between min-h-[290px] sm:min-h-[315px] ${
      isDarkMode
        ? 'bg-gradient-to-br from-[#101c3d] via-[#0d1428] to-[#070b17] border-blue-500/30 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)] text-white'
        : 'bg-gradient-to-br from-[#eff6ff] via-[#f7faff] to-[#e4edff] border-blue-200 shadow-[0_10px_32px_rgba(59,130,246,0.12),inset_0_1px_0_0_rgba(255,255,255,0.9)] text-slate-900'
    }`}>
      {/* Rich ambient radial backlights for gradient depth */}
      <div className="pointer-events-none absolute -top-14 -right-14 w-40 h-40 rounded-full bg-blue-500/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-14 -left-14 w-40 h-40 rounded-full bg-indigo-500/15 blur-2xl" />

      {/* Top Left Dropdown Pill: [ 🚀 AI PlanIQ ˅ ] */}
      <div className="relative mb-2">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-xs ${
            isDarkMode
              ? 'bg-white/[0.08] hover:bg-white/15 border-white/15 text-white'
              : 'bg-white hover:bg-slate-50 border-blue-200 text-slate-800'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px]">
            <Rocket className="w-2.5 h-2.5" />
          </div>
          <span>{modelMode === 'plan' ? 'AI PlanIQ' : modelMode === 'deep' ? 'Deep Reason' : 'Factory Copilot'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className={`absolute top-full left-0 mt-1.5 w-44 rounded-2xl border p-1 z-30 shadow-xl backdrop-blur-xl ${
            isDarkMode ? 'bg-[#181a24] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {[
              { id: 'plan', label: 'AI PlanIQ', desc: 'Predictive & Roster' },
              { id: 'deep', label: 'Deep Reason', desc: 'Financial & Root Cause' },
              { id: 'ops', label: 'Factory Copilot', desc: 'Shopfloor Realtime' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setModelMode(item.id as any);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer flex flex-col ${
                  modelMode === item.id
                    ? isDarkMode ? 'bg-white/10 text-white font-bold' : 'bg-slate-100 text-slate-900 font-bold'
                    : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] text-slate-400 font-normal">{item.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Central 3D Metallic Fluid Ribbon Orb Graphic (Blue Accents) */}
      <div className="flex flex-col items-center justify-center my-1 sm:my-2">
        <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center">
          {/* Ambient Blue Backlight Glow */}
          <div className="absolute inset-0 rounded-full bg-blue-500/25 blur-xl animate-pulse" />
          
          {/* 3D Fluid Metallic Ribbon Orb SVG in Electric Blue */}
          <svg
            viewBox="0 0 100 100"
            className="w-14 h-14 sm:w-16 sm:h-16 relative z-10 drop-shadow-[0_6px_16px_rgba(37,99,235,0.45)] transition-transform hover:scale-105 duration-300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="orbGrad1" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="40%" stopColor="#3b82f6" />
                <stop offset="80%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#172554" />
              </linearGradient>
              <linearGradient id="orbGrad2" x1="90" y1="20" x2="20" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e40af" />
              </linearGradient>
              <linearGradient id="orbGrad3" x1="30" y1="90" x2="70" y2="10" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#bfdbfe" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <radialGradient id="highlight" cx="35%" cy="30%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path
              d="M50 10 C 25 10, 10 32, 16 55 C 22 76, 42 90, 65 88 C 88 86, 92 62, 84 42 C 76 22, 65 10, 50 10 Z"
              fill="url(#orbGrad1)"
            />
            <path
              d="M32 30 C 45 18, 72 24, 78 45 C 84 66, 62 82, 45 80 C 28 78, 22 55, 32 30 Z"
              fill="url(#orbGrad2)"
            />
            <path
              d="M40 35 C 55 28, 68 38, 65 52 C 62 66, 48 70, 38 62 C 28 54, 30 40, 40 35 Z"
              fill="url(#orbGrad3)"
            />
            <ellipse cx="42" cy="32" rx="14" ry="8" transform="rotate(-25 42 32)" fill="url(#highlight)" />
          </svg>
        </div>

        {/* Greeting Text */}
        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight text-center mt-2">
          {greeting}, {userName}.
        </h4>
        <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-center mt-0.5">
          <span className="text-slate-900 dark:text-white">HOW Can I </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300">
            Assist You Today?
          </span>
        </h3>
      </div>

      {/* Floating Prompt Input Capsule with Dedicated Enter/Send Button */}
      <div className={`mt-2.5 p-1.5 pl-4 rounded-full border transition-all flex items-center gap-2 ${
        isDarkMode
          ? 'bg-white/[0.06] border-white/15 shadow-inner'
          : 'bg-white/95 border-blue-200/90 shadow-2xs'
      }`}>
        <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
          placeholder="Ask AI anything about factory ops..."
          className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none pr-1"
        />
        <button
          type="button"
          onClick={() => handleSendPrompt()}
          className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-500/25"
          title="Send Query (Enter)"
        >
          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUBCOMPONENT: Priority Tasks Widget (HR Module)
───────────────────────────────────────────────────────────────────────────── */
const PriorityTasksWidget: React.FC<{
  tasks?: Task[];
  isLoading?: boolean;
  onUpdateStatus?: (taskId: string, status: any) => Promise<any> | void;
  onNavigateToTasks?: () => void;
  isDarkMode?: boolean;
}> = ({ tasks = [], isLoading, onUpdateStatus, onNavigateToTasks, isDarkMode }) => {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [currentIndex, setCurrentIndex] = useState(0);

  const pendingTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED');
  }, [tasks]);

  const displayedTasks = filter === 'pending' ? pendingTasks : tasks;

  // Safe index within range
  const safeIndex = displayedTasks.length > 0 && currentIndex < displayedTasks.length ? currentIndex : 0;
  const activeTask = displayedTasks[safeIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayedTasks.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % displayedTasks.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayedTasks.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + displayedTasks.length) % displayedTasks.length);
  };

  const isDone = activeTask?.status === 'DONE';
  const progressPercent = isDone ? 100 : activeTask?.status === 'IN_PROGRESS' ? 50 : 0;

  // Real task code (e.g. TSK-101 or section prefix)
  const taskCode = useMemo(() => {
    if (!activeTask) return '';
    if (activeTask.id && activeTask.id.includes('-') && activeTask.id.length <= 12) return activeTask.id;
    const prefix = (activeTask.section || 'TSK').slice(0, 3).toUpperCase();
    const suffix = activeTask.id ? activeTask.id.slice(-3).toUpperCase() : '101';
    return `${prefix}-${suffix}`;
  }, [activeTask]);

  // Real priority styling
  const priorityConfig = useMemo(() => {
    const p = (activeTask?.priority || 'MEDIUM').toUpperCase();
    if (p === 'URGENT') {
      return {
        label: 'Urgent',
        pill: 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20',
        bar: 'bg-rose-500',
        track: 'bg-rose-100/70 dark:bg-rose-950/40'
      };
    }
    if (p === 'HIGH') {
      return {
        label: 'High',
        pill: 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20',
        bar: 'bg-rose-500',
        track: 'bg-rose-100/70 dark:bg-rose-950/40'
      };
    }
    if (p === 'MEDIUM') {
      return {
        label: 'Medium',
        pill: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20',
        bar: 'bg-amber-500',
        track: 'bg-amber-100/70 dark:bg-amber-950/40'
      };
    }
    return {
      label: 'Low',
      pill: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20',
      bar: 'bg-blue-500',
      track: 'bg-blue-100/70 dark:bg-blue-950/40'
    };
  }, [activeTask?.priority]);

  const categoryLabel = activeTask?.section || 'Operations';
  const commentsCount = activeTask?.comments?.length || 0;
  const attachmentsCount = activeTask?.linkedEntityId ? 1 : 0;
  const assignees = activeTask?.assignees || [];

  return (
    <div className="space-y-2">
      {/* Header with Title, Count, and Filter Toggle */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-200">Priority Tasks</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
            {pendingTasks.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {displayedTasks.length > 1 && (
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-[11px] font-bold tabular-nums">
                {safeIndex + 1}/{displayedTasks.length}
              </span>
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Previous Task"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Next Task"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 p-0.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                filter === 'pending'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* ── CARD DISPLAY: REAL TASKS OR EMPTY STATE ── */}
      {isLoading ? (
        <div className={`p-8 rounded-3xl border flex items-center justify-center text-xs text-slate-400 ${
          isDarkMode ? 'bg-[#151722]/90 border-white/[0.08]' : 'bg-white border-slate-200/90'
        }`}>
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading tasks...
        </div>
      ) : displayedTasks.length === 0 ? (
        /* Empty State: "No Tasks at the moment" */
        <div
          onClick={onNavigateToTasks}
          className={`group relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-2xl overflow-hidden flex flex-col items-center justify-center text-center ${
            isDarkMode
              ? 'bg-[#151722]/90 border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.4)] hover:border-white/20'
              : 'bg-white border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-slate-300'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4.5 h-4.5 stroke-[2]" />
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No Tasks at the moment
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2.5 max-w-[240px] leading-relaxed">
            All priority tasks have been completed.
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToTasks?.();
            }}
            className="px-3 py-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <span>Open Tasks</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        /* Real Task Card matching the Reference UI */
        <div
          onClick={onNavigateToTasks}
          className={`group relative p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-2xl overflow-hidden hover:scale-[1.005] active:scale-[0.99] ${
            isDarkMode
              ? 'bg-[#151722]/90 border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.4)] hover:border-white/20'
              : 'bg-white border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-slate-300'
          }`}
        >
          {/* Top Row: [Priority] [Category]             Code */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${priorityConfig.pill}`}>
                {priorityConfig.label}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20">
                {categoryLabel}
              </span>
            </div>

            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              {taskCode}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-2.5 tracking-tight leading-snug truncate">
            {activeTask.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-1">
            {activeTask.description || (activeTask.dueDate ? `Due date: ${new Date(activeTask.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Priority operational task assignment')}
          </p>

          {/* Progress Section */}
          <div className="mt-3 mb-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">Progress</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums text-xs">
                {progressPercent}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className={`h-2 w-full rounded-full ${priorityConfig.track} overflow-hidden`}>
              <div
                className={`h-full rounded-full ${priorityConfig.bar} transition-all duration-500`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Bottom Row / Footer: Avatars Stack on Left, Paperclip and Message on Right */}
          <div className="flex items-center justify-between pt-1">
            {/* Real Assignees Avatar Stack */}
            <div className="flex items-center -space-x-1.5">
              {assignees.length > 0 ? (
                assignees.slice(0, 4).map((assignee, idx) => (
                  assignee.avatarUrl ? (
                    <img
                      key={assignee.userId || idx}
                      src={assignee.avatarUrl}
                      alt={assignee.userName || 'Assignee'}
                      className="w-7 h-7 rounded-full border-2 border-white dark:border-[#151722] object-cover shrink-0"
                    />
                  ) : (
                    <div
                      key={assignee.userId || idx}
                      className="w-7 h-7 rounded-full border-2 border-white dark:border-[#151722] bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                    >
                      {(assignee.userName || assignee.userEmail || 'U').slice(0, 2).toUpperCase()}
                    </div>
                  )
                ))
              ) : (
                <div className="w-7 h-7 rounded-full border-2 border-white dark:border-[#151722] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                  GO
                </div>
              )}
            </div>

            {/* Links & Comments */}
            <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-slate-700 dark:text-slate-300 stroke-[2.2]" />
                <span className="tabular-nums">{attachmentsCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-slate-700 dark:text-slate-300 stroke-[2.2]" />
                <span className="tabular-nums">{commentsCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: CommandCentreView (Revamped Cockpit)
───────────────────────────────────────────────────────────────────────────── */
export const CommandCentreView: React.FC<CommandCentreViewProps> = ({
  orders = [],
  stock = [],
  qcItems = [],
  pdiQueue = [],
  jobCards = [],
  shortages = [],
  dispatches = [],
  invoices = [],
  payables = [],
  productionLogs = [],
  auditLogs = [],
  approvals = [],
  announcements = [],
  users = [],
  containerScrollRef,
  isDarkMode = false,
  isRealtimeStreaming = true,
  onToggleRealtimeStreaming,
  onResetAllData,
  onNavigateView,
  onNavigate,
  onSelectOrder,
  showCustomizeModal: externalShowCustomizeModal,
  setShowCustomizeModal: externalSetShowCustomizeModal,
  scope: externalScope,
  setScope: externalSetScope,
  tasks = [],
  isLoadingTasks = false,
  onUpdateTaskStatus,
  todayLog,
  onCheckIn,
  onCheckOut,
  meetings = [],
  currentUser
}) => {
  type CommandCentreLayoutMode = 'executive' | 'operations' | 'quality' | 'financial' | 'numbers' | 'charts';
  const [mode, setMode] = useState<CommandCentreLayoutMode>(() => {
    try {
      const saved = localStorage.getItem('stratum_cmd_layout') as CommandCentreLayoutMode;
      if (['executive', 'operations', 'quality', 'financial', 'numbers'].includes(saved)) {
        return saved;
      }
      return 'executive';
    } catch {
      return 'executive';
    }
  });

  const handleSetMode = (newMode: CommandCentreLayoutMode) => {
    setMode(newMode);
    try {
      localStorage.setItem('stratum_cmd_layout', newMode);
    } catch { /* ignore */ }
  };

  const { user, profile } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Safely extract first name
  const firstName = useMemo(() => {
    const metaFirstName = (user as any)?.user_metadata?.first_name || (user as any)?.user_metadata?.firstName;
    if (metaFirstName && typeof metaFirstName === 'string' && metaFirstName.trim()) {
      const name = metaFirstName.trim().split(/\s+/)[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }

    const profileName = profile?.fullName || profile?.name;
    if (profileName && typeof profileName === 'string' && profileName.trim()) {
      const name = profileName.trim().split(/\s+/)[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }

    const metaFullName = (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || (user as any)?.name;
    if (metaFullName && typeof metaFullName === 'string' && metaFullName.trim()) {
      const name = metaFullName.trim().split(/\s+/)[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }

    if (users && users.length > 0) {
      const matched = users.find(u =>
        (user?.id && u.id === user.id) ||
        (user?.email && u.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
        (profile?.email && u.email && u.email.toLowerCase() === profile.email.toLowerCase())
      );
      const matchedName = matched?.fullName || matched?.name;
      if (matchedName && typeof matchedName === 'string' && matchedName.trim()) {
        const name = matchedName.trim().split(/\s+/)[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }

    return '';
  }, [user, profile, users]);

  // Determine local time context
  const { greeting, supportingContext, timePeriod } = useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return {
        greeting: 'Good Morning',
        supportingContext: "Here's your command center for today. Let's get things moving.",
        timePeriod: 'morning'
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: 'Good Afternoon',
        supportingContext: "Here's what's happening across your operations this afternoon.",
        timePeriod: 'afternoon'
      };
    } else if (hour >= 17 && hour < 22) {
      return {
        greeting: 'Good Evening',
        supportingContext: "Here's your latest operational snapshot before the day wraps up.",
        timePeriod: 'evening'
      };
    } else {
      return {
        greeting: 'Good Night',
        supportingContext: "Operations are running in overnight mode. Here's your system status.",
        timePeriod: 'night'
      };
    }
  }, []);

  const formattedDate = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const day = now.toLocaleDateString('en-US', { day: 'numeric' });
    const month = now.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday} · ${day} ${month}`;
  }, []);

  // Filter scopes
  const [internalScope, setInternalScope] = useState('FY 26-27');
  const scope = externalScope !== undefined ? externalScope : internalScope;
  const setScope = externalSetScope || setInternalScope;

  const [internalShowCustomize, setInternalShowCustomize] = useState(false);
  const showCustomizeModal = externalShowCustomizeModal !== undefined ? externalShowCustomizeModal : internalShowCustomize;
  const setShowCustomizeModal = externalSetShowCustomizeModal || setInternalShowCustomize;

  const [tabularSearchQuery, setTabularSearchQuery] = useState('');
  const [tabularCategoryFilter, setTabularCategoryFilter] = useState('ALL');

  const localContainerRef = useRef<HTMLDivElement>(null);
  const effectiveScrollRef = containerScrollRef || localContainerRef;

  const { pullDistance, isRefreshing, isTriggered } = usePullToRefresh(
    effectiveScrollRef,
    {
      onRefresh: async () => {
        onResetAllData?.();
      }
    }
  );

  const currencySymbol = '₹';

  const handleNavigate = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else if (onNavigateView) {
      onNavigateView(view);
    }
  };

  const pinnedAnnouncement = useMemo(() => {
    return (announcements || []).find(a => a.isPinned);
  }, [announcements]);

  const getScopeFilter = (dateString?: string) => {
    if (!dateString || scope === 'All-Time') return true;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return true;
    if (scope === 'FY 26-27') return date >= new Date('2026-04-01') && date <= new Date('2027-03-31T23:59:59');
    if (scope === 'FY 25-26') return date >= new Date('2025-04-01') && date <= new Date('2026-03-31T23:59:59');
    if (scope === 'Q3 2026') return date >= new Date('2026-10-01') && date <= new Date('2026-12-31T23:59:59');
    return true;
  };

  const metrics = useMemo(() => {
    const scopedOrders = orders.filter(o => getScopeFilter(o.poDate || o.orderDate || o.createdAt));
    const scopedInvoices = invoices.filter(i => getScopeFilter(i.invoiceDate || i.createdAt));
    const scopedDispatches = dispatches.filter(d => getScopeFilter(d.dispatchDate || d.createdAt));

    const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length;
    const qcHoldCount = qcItems.filter(q => q.qcStatus === 'QC_HOLD' || q.jobStatus === 'QC_HOLD').length;
    const itemsShortCount = stock.filter(s => s.status === 'SHORTAGE' || s.status === 'CRITICAL' || s.available < 0).length;
    const overdueDeliveriesCount = scopedOrders.filter(o => {
      if (o.status === 'CLOSED' || o.status === 'CANCELLED') return false;
      if (o.status === 'OVERDUE') return true;
      return o.dueDate ? new Date(o.dueDate) < new Date() : false;
    }).length;
    const overdueInvoicesList = scopedInvoices.filter(i => i.status === 'OVERDUE');
    const overdueReceivablesSum = overdueInvoicesList.reduce((acc, i) => acc + (i.amount || 0), 0);
    const pendingDispatchesCount = scopedDispatches.filter(d => d.status === 'PENDING' || d.status === 'IN_TRANSIT').length;
    const openOrders = scopedOrders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED');
    const openOrderBookValue = openOrders.reduce((acc, o) => acc + (o.grossAmount || 0), 0);
    const totalRevenue = scopedOrders.reduce((acc, o) => acc + (o.grossAmount || 0), 0);
    const activeJobCards = jobCards.filter(j => j.status === 'IN_PROGRESS' || j.status === 'IN_PRODUCTION');
    const passQcCount = qcItems.filter(q => q.qcStatus === 'PASS').length;
    const qcPassRate = qcItems.length > 0 ? ((passQcCount / qcItems.length) * 100).toFixed(1) : '98.5';
    const outstandingPayablesSum = payables.filter(p => p.status === 'UNPAID' || p.status === 'OVERDUE').reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalOutput = productionLogs.reduce((acc, p) => acc + (p.qtyDone || 0), 0);

    const pipeline = {
      draft: scopedOrders.filter(o => ['DRAFT', 'SUBMITTED', 'PO_RECEIVED'].includes((o.status || '').toUpperCase())).length,
      confirmed: scopedOrders.filter(o => ['CONFIRMED', 'APPROVED', 'RELEASED'].includes((o.status || '').toUpperCase())).length,
      production: scopedOrders.filter(o => ['IN_PRODUCTION', 'JOB_RELEASED', 'MATERIAL_CHECK', 'MATERIAL_READY'].includes((o.status || o.stage || '').toUpperCase())).length,
      qc: scopedOrders.filter(o => ['QC', 'QC_INSPECTION', 'QC_HOLD', 'READY_FOR_QC'].includes((o.status || o.stage || '').toUpperCase())).length,
      dispatch: scopedOrders.filter(o => ['READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT'].includes((o.status || o.stage || '').toUpperCase())).length,
      closed: scopedOrders.filter(o => ['CLOSED', 'COMPLETED', 'DELIVERED', 'PAID'].includes((o.status || '').toUpperCase())).length
    };

    const criticalCount = pendingApprovalsCount + qcHoldCount + itemsShortCount + overdueDeliveriesCount;

    return {
      scopedOrders,
      pendingApprovalsCount,
      qcHoldCount,
      itemsShortCount,
      overdueDeliveriesCount,
      overdueInvoicesList,
      overdueReceivablesSum,
      pendingDispatchesCount,
      openOrders,
      openOrderBookValue,
      totalRevenue,
      activeJobCards,
      qcPassRate,
      passQcCount,
      outstandingPayablesSum,
      totalOutput,
      pipeline,
      criticalCount
    };
  }, [orders, invoices, dispatches, stock, qcItems, jobCards, payables, productionLogs, approvals, scope]);

  const fmt = (num: number) =>
    `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Realtime customer distribution from actual orders
  const customerBreakdown = useMemo(() => {
    const activeOrders = (metrics.scopedOrders && metrics.scopedOrders.length > 0) ? metrics.scopedOrders : orders;

    const palette = [
      { dot: 'bg-blue-600', bar: 'bg-blue-600' },
      { dot: 'bg-slate-900 dark:bg-white', bar: 'bg-[#181920] dark:bg-slate-700' },
      { dot: 'bg-slate-500', bar: 'bg-slate-500' },
      { dot: 'bg-slate-300 dark:bg-slate-500', bar: 'bg-slate-300 dark:bg-slate-600' }
    ];

    if (!activeOrders || activeOrders.length === 0) {
      return [
        { name: 'Tata Motors Ltd', count: 0, pct: '0%', pctNum: 25, dot: palette[0].dot, bar: palette[0].bar },
        { name: 'Bharat Forge Ltd', count: 0, pct: '0%', pctNum: 25, dot: palette[1].dot, bar: palette[1].bar },
        { name: 'Mahindra & Mahindra', count: 0, pct: '0%', pctNum: 25, dot: palette[2].dot, bar: palette[2].bar },
        { name: 'Bosch Automotive', count: 0, pct: '0%', pctNum: 25, dot: palette[3].dot, bar: palette[3].bar }
      ];
    }

    const groupMap: Record<string, { count: number; totalAmount: number }> = {};
    activeOrders.forEach(o => {
      const rawName = o.customerName || (o as any).customer || 'Direct Client';
      const name = rawName.trim() || 'Direct Client';
      if (!groupMap[name]) {
        groupMap[name] = { count: 0, totalAmount: 0 };
      }
      groupMap[name].count += 1;
      groupMap[name].totalAmount += (o.grossAmount || 0);
    });

    const totalCount = activeOrders.length;
    const sorted = Object.entries(groupMap)
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        totalAmount: stat.totalAmount,
        pctNum: totalCount > 0 ? Math.round((stat.count / totalCount) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount);

    let items: Array<{ name: string; count: number; totalAmount: number; pctNum: number }>;
    if (sorted.length <= 4) {
      items = sorted;
    } else {
      const top3 = sorted.slice(0, 3);
      const rest = sorted.slice(3);
      const othersCount = rest.reduce((acc, r) => acc + r.count, 0);
      const othersAmount = rest.reduce((acc, r) => acc + r.totalAmount, 0);
      const othersPct = totalCount > 0 ? Math.round((othersCount / totalCount) * 100) : 0;
      items = [
        ...top3,
        { name: 'Other Customers', count: othersCount, totalAmount: othersAmount, pctNum: othersPct }
      ];
    }

    return items.map((item, idx) => ({
      ...item,
      pct: `${item.pctNum}%`,
      dot: palette[idx % palette.length].dot,
      bar: palette[idx % palette.length].bar
    }));
  }, [metrics.scopedOrders, orders]);

  // Contextual date range label for Total Sales card
  const salesDateRange = useMemo(() => {
    if (scope === 'FY 26-27') return '01 Apr 2026 - 31 Mar 2027';
    if (scope === 'FY 25-26') return '01 Apr 2025 - 31 Mar 2026';
    if (scope === 'Q3 2026') return '01 Oct 2026 - 31 Dec 2026';
    if (scope === 'All-Time') return 'All-Time Financial Inception';

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmtD = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${fmtD(start)} - ${fmtD(end)}`;
  }, [scope]);

  const allTabularMetrics = [
    { code: 'MTR-FIN-01', name: 'Open Order Book Value', category: 'FINANCIAL', valueStr: fmt(metrics.openOrderBookValue), status: 'HEALTHY', viewKey: 'orders' },
    { code: 'MTR-ORD-02', name: 'Active Customer POs', category: 'PRODUCTION', valueStr: `${metrics.openOrders.length} POs`, status: 'ACTIVE', viewKey: 'orders' },
    { code: 'MTR-INV-06', name: 'Inventory Shortages', category: 'INVENTORY', valueStr: `${metrics.itemsShortCount} SKUs`, status: metrics.itemsShortCount > 0 ? 'CRITICAL' : 'OPTIMAL', viewKey: 'inventory' },
    { code: 'MTR-FIN-12', name: 'Overdue Receivables', category: 'FINANCIAL', valueStr: fmt(metrics.overdueReceivablesSum), status: 'DUE', viewKey: 'invoices' },
    { code: 'MTR-FIN-13', name: 'Vendor Payables', category: 'FINANCIAL', valueStr: fmt(metrics.outstandingPayablesSum), status: 'OK', viewKey: 'payables' },
    { code: 'MTR-QLT-04', name: 'QC Pass Rate', category: 'QUALITY', valueStr: `${metrics.qcPassRate}%`, status: 'OPTIMAL', viewKey: 'qc' },
    { code: 'MTR-PRD-03', name: 'Active Job Cards', category: 'PRODUCTION', valueStr: `${metrics.activeJobCards.length} Active`, status: 'RUNNING', viewKey: 'production' }
  ];

  const filteredTabularMetrics = allTabularMetrics.filter(m => {
    const q = tabularSearchQuery.toLowerCase();
    const matchesQuery = m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    const matchesCat = tabularCategoryFilter === 'ALL' || m.category === tabularCategoryFilter;
    return matchesQuery && matchesCat;
  });

  const handleExportTabularCSV = () => {
    const headers = ['Metric Code', 'Metric Name', 'Category', 'Value', 'Status'];
    const rows = filteredTabularMetrics.map(m => [m.code, `"${m.name}"`, m.category, `"${m.valueStr}"`, m.status]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Command_Centre_Metrics_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ─────────────────────────────  RENDER  ───────────────────────────── */

  return (
    <div ref={localContainerRef} className="relative space-y-2.5 font-sans overflow-hidden">

      {/* Atmospheric Ambient Gradient Glow Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/3 h-[500px] w-full max-w-5xl -translate-x-1/2 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(37,99,235,0.18),transparent_70%)] blur-3xl" />
        <div className="absolute top-10 right-0 h-[450px] w-[450px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute top-[40%] -left-20 h-[450px] w-[450px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_65%)] blur-3xl" />
      </div>

      {/* Pull-to-refresh */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{ height: `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` }}
          className="flex items-center justify-center overflow-hidden transition-ui md:hidden"
        >
          <div className="flex items-center gap-2 rounded-full border border-[var(--accent-border-light)] bg-[var(--accent-soft-light)] px-3.5 py-1.5 text-xs font-semibold dark:bg-[var(--accent-soft-dark)]">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing' : isTriggered ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 1. APPLE COCKPIT HEADER: EDITORIAL TYPOGRAPHY & CAPSULE DECK ──  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-3.5 rounded-2xl border transition-all backdrop-blur-2xl ${
          isDarkMode
            ? 'bg-gradient-to-b from-[#1c1f2a] via-[#161822] to-[#11131a] border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.4)]'
            : 'bg-gradient-to-b from-white via-[#fbfcfd] to-[#f4f6fa] border-slate-200/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,1),inset_0_-1px_0_0_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.03)]'
        }`}
      >
        <div className="space-y-1">
          {/* Apple Sub-eyebrow Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Command Centre
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Factory Operating System
            </span>
          </div>

          {/* Apple Large Title */}
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
            {supportingContext}
          </p>
        </div>

        {/* Apple Capsule Toolbar Deck */}
        <div className="flex flex-wrap items-center gap-2 sm:self-auto shrink-0">
          {/* Quick Attendance Capsule */}
          <QuickAttendanceStation
            todayLog={todayLog}
            onCheckIn={onCheckIn}
            onCheckOut={onCheckOut}
            isDarkMode={isDarkMode}
          />

          {/* Apple Date & Daylight Capsule */}
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium backdrop-blur-xl transition-all ${
              isDarkMode
                ? 'bg-white/[0.05] border-white/10 text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                : 'bg-slate-100/90 border-slate-200/80 text-slate-700 shadow-2xs'
            }`}
          >
            {timePeriod === 'night' ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : timePeriod === 'evening' ? (
              <Sunset className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="tracking-tight font-medium">{formattedDate}</span>
          </div>

          {/* New Order Capsule Button (Beside Date) */}
          <button
            type="button"
            onClick={() => handleNavigate('orders')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Order</span>
          </button>
        </div>
      </motion.div>

      {mode === 'executive' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* ───────────────── LEFT 8 COLUMNS: OPERATIONS, CALENDAR & PRIORITY TASKS ────────── */}
          <div className="lg:col-span-8 space-y-2.5">
            {/* Luminous Telemetry KPI Cards - 4 Vibrant Gradients (Bigger & More Spacious) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. CARD: Total Orders (Our Blue Gradient) */}
              <div
                className={`group relative p-4 sm:p-4.5 rounded-2xl border transition-all backdrop-blur-2xl overflow-hidden flex flex-col justify-between text-white shadow-xl min-h-[160px] ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#12389a] via-[#155dfc] to-[#0a2674] border-blue-400/30 shadow-blue-900/30'
                    : 'bg-gradient-to-br from-[#1b64ff] via-[#155dfc] to-[#0d47a1] border-blue-400/40 shadow-blue-500/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/25 shadow-2xs">
                        <Receipt className="w-4 h-4 stroke-[2.2] text-white" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        Total Orders
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/25 shrink-0 shadow-2xs">
                      <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>
                        {orders.length > 0
                          ? `${Math.round(((metrics.pipeline.confirmed + metrics.pipeline.production + metrics.pipeline.qc + metrics.pipeline.dispatch) / Math.max(orders.length, 1)) * 100)}%`
                          : '+12%'}
                      </span>
                    </span>
                  </div>

                  <div className="text-2xl sm:text-[28px] font-black tracking-tight text-white my-1.5 leading-tight">
                    {((metrics.scopedOrders && metrics.scopedOrders.length > 0) ? metrics.scopedOrders.length : orders.length).toLocaleString('en-IN')}
                  </div>

                  <div className="flex items-center gap-1 h-2 rounded-full overflow-hidden w-full my-2 bg-white/20">
                    {customerBreakdown.map((item, idx) => (
                      <div
                        key={item.name + idx}
                        className={`h-full ${idx === 0 ? 'bg-white' : idx === 1 ? 'bg-white/75' : idx === 2 ? 'bg-white/50' : 'bg-white/30'} transition-all`}
                        style={{ width: `${Math.max(item.pctNum, item.count > 0 ? 8 : 4)}%` }}
                        title={`${item.name}: ${item.count} orders (${item.pct})`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 my-1 text-[11px]">
                    {customerBreakdown.slice(0, 2).map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${idx === 0 ? 'bg-white' : 'bg-white/75'}`} />
                          <span className="font-medium text-white/85 truncate" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="font-bold text-white shrink-0 ml-1">
                          {item.pct}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-white/20">
                  <span className="text-[11px] font-medium text-white/80 truncate">
                    Distribution
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNavigate('orders')}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-[11px] font-semibold text-white transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                  >
                    Details
                  </button>
                </div>
              </div>

              {/* 2. CARD: Total Sales (Clean Flat Surface) */}
              <div
                className={`group relative p-4 sm:p-4.5 rounded-2xl border transition-all backdrop-blur-2xl overflow-hidden flex flex-col justify-between min-h-[160px] ${
                  isDarkMode
                    ? 'bg-[#151722]/90 border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.35)] text-white'
                    : 'bg-white border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.04)] text-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isDarkMode
                          ? 'bg-white/10 text-white border-white/10'
                          : 'bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs'
                      }`}>
                        <RefreshCw className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        Total Sales
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 shrink-0">
                      <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+14.8%</span>
                    </span>
                  </div>

                  <div className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 dark:text-white my-1.5 leading-tight truncate">
                    {fmt(
                      metrics.totalRevenue > 0
                        ? metrics.totalRevenue
                        : orders.reduce((acc, o) => acc + (o.grossAmount || 0), 0)
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug my-1 line-clamp-2">
                    Invoiced billing against active customer POs.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-100 dark:border-white/[0.08]">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[95px]">
                    {salesDateRange}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNavigate('invoices')}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                  >
                    Details
                  </button>
                </div>
              </div>

              {/* 3. CARD: Shopfloor In-Flight (Darker Green Gradient BG & White Icon) */}
              <div
                className={`group relative p-4 sm:p-4.5 rounded-2xl border transition-all backdrop-blur-2xl overflow-hidden flex flex-col justify-between text-white shadow-xl min-h-[160px] ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#011a14] border-emerald-500/30 shadow-emerald-950/50'
                    : 'bg-gradient-to-br from-[#047857] via-[#065f46] to-[#022c22] border-emerald-500/40 shadow-emerald-950/25'
                }`}
              >
                <div className="pointer-events-none absolute -top-12 -right-12 h-24 w-24 rounded-full bg-white/15 blur-xl" />
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/25 shadow-2xs">
                        <Factory className="w-4 h-4 stroke-[2.2] text-white" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        Shopfloor
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/25 shrink-0 shadow-2xs">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      <span>Live</span>
                    </span>
                  </div>

                  <div className="text-2xl sm:text-[28px] font-black tracking-tight text-white my-1.5 leading-tight truncate">
                    {metrics.activeJobCards.length} JCs
                  </div>

                  <p className="text-[11px] text-white/85 line-clamp-2 my-1 leading-snug">
                    {metrics.totalOutput.toLocaleString('en-IN')} units produced across CNC centers.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-white/20">
                  <span className="text-[11px] font-medium text-white/80 truncate">
                    Machining
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNavigate('production')}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-[11px] font-semibold text-white transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                  >
                    Details
                  </button>
                </div>
              </div>

              {/* 4. CARD: Immediate Action Required (Darker Red Gradient) */}
              <div
                className={`group relative p-4 sm:p-4.5 rounded-2xl border transition-all backdrop-blur-2xl overflow-hidden flex flex-col justify-between text-white shadow-xl min-h-[160px] ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#881337] via-[#4c0519] to-[#2e020d] border-rose-500/30 shadow-rose-950/50'
                    : 'bg-gradient-to-br from-[#be123c] via-[#9f1239] to-[#4c0519] border-rose-500/40 shadow-rose-950/25'
                }`}
              >
                <div className="pointer-events-none absolute -top-12 -right-12 h-24 w-24 rounded-full bg-white/15 blur-xl" />
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/25 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 stroke-[2.2] text-white" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        Critical
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/25 shrink-0 shadow-2xs animate-pulse">
                      {metrics.criticalCount > 0 ? `${metrics.criticalCount}` : 'Clear'}
                    </span>
                  </div>

                  <div className="text-2xl sm:text-[28px] font-black tracking-tight text-white my-1.5 leading-tight truncate">
                    {metrics.criticalCount} Alerts
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 my-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white border border-white/25 shadow-2xs">
                      Short: {metrics.itemsShortCount}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white border border-white/25 shadow-2xs">
                      Sign: {metrics.pendingApprovalsCount}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white border border-white/25 shadow-2xs">
                      QC: {metrics.qcHoldCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-white/20">
                  <span className="text-[11px] font-medium text-white/80 truncate">
                    Bottlenecks
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (metrics.pendingApprovalsCount > 0) handleNavigate('approvals');
                      else if (metrics.itemsShortCount > 0) handleNavigate('inventory');
                      else handleNavigate('orders');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-[11px] font-semibold text-white transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>

            {/* ── Interactive Mini Calendar (Left Middle) ── */}
            <MiniCalendarWidget
              isDarkMode={isDarkMode}
              tasks={tasks}
              meetings={meetings}
              onNavigateToMeetings={() => handleNavigate('meetings')}
            />

            {/* ── Priority Tasks (Shifted to Bottom of Calendar) ── */}
            <PriorityTasksWidget
              tasks={tasks}
              isLoading={isLoadingTasks}
              onUpdateStatus={onUpdateTaskStatus}
              onNavigateToTasks={() => handleNavigate('tasks')}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* ───────────────── RIGHT 4 COLUMNS: MEETING NOTES & AI PLANIQ ────────── */}
          <div className="lg:col-span-4 space-y-2.5">
            {/* 1. Meeting Notes Card (Reference UI) */}
            <MeetingNotesWidget
              meetings={meetings}
              isDarkMode={isDarkMode}
              onNavigateToMeetings={() => handleNavigate('meetings')}
            />

            {/* 2. AI PlanIQ Card (Reference UI) */}
            <AiPlanIqWidget
              userName={firstName || 'Masud A.'}
              isDarkMode={isDarkMode}
              onNavigate={handleNavigate}
            />

            {/* 3. Urgent Approvals Quick Access if any */}
            {metrics.pendingApprovalsCount > 0 && (
              <div
                onClick={() => handleNavigate('approvals')}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-2xl hover:scale-[1.01] ${
                  isDarkMode
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-rose-50/90 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">{metrics.pendingApprovalsCount} Awaiting Signatures</div>
                      <div className="text-[10px] text-slate-400">High-value POs & credit lines</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 4. SHOPFLOOR / OPERATIONS MODE ──                               */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {mode === 'operations' && (
        <OperationsDashboardLayout
          orders={orders}
          stock={stock}
          qcItems={qcItems}
          pdiQueue={pdiQueue}
          jobCards={jobCards}
          shortages={shortages}
          dispatches={dispatches}
          invoices={invoices}
          payables={payables}
          productionLogs={productionLogs}
          auditLogs={auditLogs}
          approvals={approvals}
          scope={scope}
          currencySymbol={currencySymbol}
          isDarkMode={isDarkMode}
          onNavigate={handleNavigate}
          onSelectOrder={onSelectOrder}
        />
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 5. QUALITY GATEWAYS MODE ──                                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {mode === 'quality' && (
        <QualityGateDashboardLayout
          orders={orders}
          stock={stock}
          qcItems={qcItems}
          pdiQueue={pdiQueue}
          jobCards={jobCards}
          shortages={shortages}
          dispatches={dispatches}
          invoices={invoices}
          payables={payables}
          productionLogs={productionLogs}
          auditLogs={auditLogs}
          approvals={approvals}
          scope={scope}
          currencySymbol={currencySymbol}
          isDarkMode={isDarkMode}
          onNavigate={handleNavigate}
          onSelectOrder={onSelectOrder}
        />
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 6. FINANCIAL RADAR MODE ──                                       */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {mode === 'financial' && (
        <FinancialDashboardLayout
          orders={orders}
          stock={stock}
          qcItems={qcItems}
          pdiQueue={pdiQueue}
          jobCards={jobCards}
          shortages={shortages}
          dispatches={dispatches}
          invoices={invoices}
          payables={payables}
          productionLogs={productionLogs}
          auditLogs={auditLogs}
          approvals={approvals}
          scope={scope}
          currencySymbol={currencySymbol}
          isDarkMode={isDarkMode}
          onNavigate={handleNavigate}
          onSelectOrder={onSelectOrder}
        />
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 7. TABULAR METRICS LEDGER ──                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {mode === 'numbers' && (
        <section className={`space-y-4 rounded-3xl border p-5 backdrop-blur-2xl ${
          isDarkMode ? 'bg-[#15161f]/90 border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Telemetry & Operational KPI Registry</h2>
              <p className="text-xs text-slate-400 mt-0.5">Comprehensive tabular registry across all operational metrics</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${
                isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  value={tabularSearchQuery}
                  onChange={e => setTabularSearchQuery(e.target.value)}
                  placeholder="Search metrics"
                  className="w-40 bg-transparent outline-none text-xs"
                />
              </div>
              <select
                value={tabularCategoryFilter}
                onChange={e => setTabularCategoryFilter(e.target.value)}
                className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none ${
                  isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Categories</option>
                <option value="FINANCIAL">Financial</option>
                <option value="PRODUCTION">Production</option>
                <option value="INVENTORY">Inventory</option>
                <option value="QUALITY">Quality</option>
              </select>
              <button
                type="button"
                onClick={handleExportTabularCSV}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 active:scale-[0.98] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[var(--accent-primary)]/20 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          <div className={`overflow-x-auto rounded-2xl border ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                  isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                {filteredTabularMetrics.map(m => (
                  <tr key={m.code} className={`transition-all ${isDarkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-slate-50/70'}`}>
                    <td className="px-4 py-3 font-mono font-bold text-xs text-[var(--accent-primary)]">{m.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{m.name}</td>
                    <td className="px-4 py-3 text-slate-400">{m.category}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{m.valueStr}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleNavigate(m.viewKey)}
                        className="inline-flex items-center gap-1 font-bold text-[var(--accent-primary)] transition hover:underline cursor-pointer"
                      >
                        <span>Open</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 8. DEEP CHARTS MODE ──                                           */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {mode === 'charts' && (
        <div className="space-y-5">
          <div className={`p-5 rounded-3xl border backdrop-blur-2xl ${
            isDarkMode ? 'bg-[#15161f]/90 border-white/[0.08]' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Order Book Fulfillment Trajectory</h3>
            <OrderBookRevenueChart orders={metrics.scopedOrders} isDarkMode={isDarkMode} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CashflowTrendCard
              invoices={invoices}
              payables={payables}
              currencySymbol={currencySymbol}
              isDarkMode={isDarkMode}
            />
            <MonthlyProgressCard
              orders={orders}
              productionLogs={productionLogs}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default CommandCentreView;
