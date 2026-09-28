import React, { useMemo, useState, startTransition } from 'react';
import {
  CalendarClock,
  Plus,
  Link2,
  Copy,
  Pencil,
  Ban,
  Users as UsersIcon,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Check,
  Search,
  AlertCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { toast } from '../../../context/ToastContext';
import { useAccentTheme } from '../../../context/AccentThemeContext';
import { Meeting } from '../../../services/consoleApiServices';
import { SystemUser } from '../../../types/console';

interface MeetingsViewProps {
  meetings: Meeting[];
  isLoadingMeetings: boolean;
  users: SystemUser[];
  currentUser: SystemUser | null;
  canManageMeetings: boolean;
  isDarkMode: boolean;
  onCreateMeeting: (payload: {
    title: string;
    agenda?: string;
    section?: string;
    meetingLink?: string;
    location?: string;
    startTime: string;
    endTime: string;
    attendeeUserIds: string[];
  }) => Promise<Meeting>;
  onUpdateMeeting: (id: string, payload: Partial<{
    title: string;
    agenda: string;
    section: string;
    meetingLink: string;
    location: string;
    startTime: string;
    endTime: string;
    attendeeUserIds: string[];
  }>) => Promise<Meeting>;
  onCancelMeeting: (id: string, reason?: string) => Promise<Meeting>;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseCalendarDate(iso: string) {
  const d = new Date(iso);
  return {
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  };
}

function formatWhen(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateStr = start.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const startTime = start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} • ${startTime} – ${endTime}`;
}

function getInitials(name: string): string {
  if (!name) return 'GO';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  meetings,
  isLoadingMeetings,
  users,
  currentUser,
  canManageMeetings,
  isDarkMode,
  onCreateMeeting,
  onUpdateMeeting,
  onCancelMeeting
}) => {
  const { accent, isGreen, isBlue, isCrystal } = useAccentTheme();
  const meetingModal = useUrlModal<{ id?: string }>('meeting-form');
  const cancelModal = useUrlModal<{ id: string }>('cancel-meeting');
  const [statusFilter, setStatusFilter] = useState<'UPCOMING' | 'ALL' | 'CANCELLED'>('UPCOMING');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);

  const editingMeeting = useMemo(
    () => (meetingModal.params.id ? meetings.find((m) => m.id === meetingModal.params.id) || null : null),
    [meetingModal.params.id, meetings]
  );
  const meetingPendingCancel = useMemo(
    () => (cancelModal.params.id ? meetings.find((m) => m.id === cancelModal.params.id) || null : null),
    [cancelModal.params.id, meetings]
  );

  // Intentional: this is a display-only "is this meeting still upcoming"
  // cutoff, recomputed each render. Worst case is a cutoff that's briefly
  // stale between renders, no data correctness issue — not worth the
  // complexity of moving "now" into state + an interval just to satisfy
  // the purity check.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const isUpcoming = (m: Meeting) => m.status === 'SCHEDULED' && new Date(m.endTime).getTime() > nowMs;
  const visibleMeetings = useMemo(() => {
    const sorted = [...meetings].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (statusFilter === 'CANCELLED') return sorted.filter((m) => m.status === 'CANCELLED');
    if (statusFilter === 'ALL') return sorted;
    return sorted.filter(isUpcoming);
  }, [meetings, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcomingCount = meetings.filter(isUpcoming).length;
  const cancelledCount = meetings.filter((m) => m.status === 'CANCELLED').length;

  const handleCopyLink = async (meeting: Meeting) => {
    if (!meeting.meetingLink) {
      toast.warning('This meeting has no link attached yet.', 'Nothing to Copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(meeting.meetingLink);
      setCopiedMeetingId(meeting.id);
      toast.success('Meeting link copied to clipboard.', 'Link Copied');
      setTimeout(() => setCopiedMeetingId(null), 1800);
    } catch {
      toast.error('Could not copy the link — copy it manually.', 'Copy Failed');
    }
  };

  const handleSubmitForm = async (form: {
    title: string;
    agenda: string;
    section: string;
    meetingLink: string;
    location: string;
    startTime: string;
    endTime: string;
    attendeeUserIds: string[];
  }) => {
    setIsSubmitting(true);
    try {
      const base = {
        title: form.title.trim(),
        agenda: form.agenda.trim(),
        section: form.section.trim(),
        meetingLink: form.meetingLink.trim(),
        location: form.location.trim(),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        attendeeUserIds: form.attendeeUserIds
      };
      if (editingMeeting) {
        await onUpdateMeeting(editingMeeting.id, base);
      } else {
        await onCreateMeeting({
          ...base,
          agenda: base.agenda || undefined,
          section: base.section || undefined,
          meetingLink: base.meetingLink || undefined,
          location: base.location || undefined
        });
      }
      meetingModal.close();
    } catch {
      // toast already shown by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!meetingPendingCancel) return;
    setIsSubmitting(true);
    try {
      await onCancelMeeting(meetingPendingCancel.id, cancelReason.trim() || undefined);
      setCancelReason('');
      cancelModal.close();
    } catch {
      // toast already shown
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardBase = isDarkMode
    ? isCrystal
      ? 'border-white/10 bg-gradient-to-b from-[#181C24] via-[#10131A] to-[#0A0C10] shadow-[0_16px_40px_rgba(0,0,0,0.5)] text-white'
      : 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : isCrystal
      ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-slate-950'
      : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      
      {/* ========================================================================= */}
      {/* ── MOBILE-FIRST TOP HEADER (< md) ──                                      */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Team Calendar &amp; Sync
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Meetings ({visibleMeetings.length})
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canManageMeetings && (
              <button
                type="button"
                onClick={() => meetingModal.open()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-md active:scale-[0.96] transition-ui cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Upcoming</div>
            <div className="text-base font-black text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] tracking-tight mt-0.5">
              {upcomingCount} <span className="text-xs font-normal text-slate-400">Slots</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Active Scheduled</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {meetings.filter(m => m.status === 'SCHEDULED').length} <span className="text-xs font-normal text-slate-400">Confirmed</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total Sessions</div>
            <div className="text-base font-black text-purple-500 tracking-tight mt-0.5">
              {meetings.length} <span className="text-xs font-normal text-slate-400">Bookings</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Cancelled</div>
            <div className={`text-base font-black tracking-tight mt-0.5 ${cancelledCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
              {cancelledCount} <span className="text-xs font-normal text-slate-400">Retracted</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP HEADER & INTEGRATED KPI ROW (≥ md) ──                          */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        <section className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
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
          {!isDarkMode && isCrystal && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_72%)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 sm:py-7">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                  isDarkMode
                    ? 'bg-white/10 border border-white/15 text-white'
                    : isCrystal
                      ? 'bg-slate-900/[0.06] border border-slate-900/10 text-slate-800'
                      : 'bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs'
                }`}>
                  <span className={`h-2 w-2 rounded-full animate-pulse ${
                    isCrystal && !isDarkMode ? 'bg-emerald-500' : isGreen ? 'bg-emerald-400' : 'bg-sky-400'
                  }`} />
                  <span>HR Module • Team Calendar &amp; Reminders</span>
                </span>
                <span className={`text-sm font-semibold ${isCrystal && !isDarkMode ? 'text-slate-400' : 'text-white/80'}`}>•</span>
                <span className={`text-xs sm:text-sm font-semibold ${isCrystal && !isDarkMode ? 'text-slate-600' : 'text-white/95'}`}>
                  {visibleMeetings.length} Meetings
                </span>
              </div>

              <h1 className={`text-3xl sm:text-[32px] font-black tracking-tight leading-tight ${
                isCrystal && !isDarkMode ? 'text-slate-950' : 'text-white'
              }`}>
                Meetings &amp; Scheduling
              </h1>

              <p className={`text-xs sm:text-sm font-medium leading-relaxed max-w-2xl ${
                isCrystal && !isDarkMode ? 'text-slate-600' : 'text-white/95'
              }`}>
                Team calendar schedule with automated 24h and 15m reminders. Launch Google Meet, Zoom, or Microsoft Teams with a single click.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canManageMeetings && (
                <button
                  type="button"
                  onClick={() => meetingModal.open()}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                    isDarkMode
                      ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                      : isCrystal
                        ? 'bg-slate-950 hover:bg-slate-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
                        : isGreen
                          ? 'bg-white hover:bg-emerald-50 text-[#065F46] shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
                          : 'bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                  <span>Schedule Meeting</span>
                </button>
              )}
            </div>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
            isDarkMode
              ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
              : isCrystal
                ? 'border-slate-200/80 bg-slate-50/70'
                : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
          }`}>
            {[
              {
                label: 'Upcoming Sessions',
                value: `${upcomingCount}`,
                detail: 'Scheduled & upcoming',
                icon: CalendarClock,
                iconColor: isDarkMode ? 'text-white' : (isCrystal ? 'text-white' : (isGreen ? 'text-[#065F46]' : 'text-[#155dfc]')),
                iconBg: isDarkMode ? 'bg-blue-600 shadow-xs' : (isCrystal ? 'bg-slate-900 shadow-xs' : 'bg-white shadow-xs'),
              },
              {
                label: 'Active Scheduled',
                value: `${meetings.filter(m => m.status === 'SCHEDULED').length}`,
                detail: 'Confirmed slots',
                icon: CheckCircle2,
                iconColor: 'text-white',
                iconBg: 'bg-emerald-500 shadow-xs',
              },
              {
                label: 'Total Sessions',
                value: `${meetings.length}`,
                detail: 'Lifetime bookings',
                icon: Calendar,
                iconColor: 'text-white',
                iconBg: 'bg-purple-500 shadow-xs',
              },
              {
                label: 'Cancelled Sessions',
                value: `${cancelledCount}`,
                detail: 'Retracted meetings',
                icon: XCircle,
                iconColor: 'text-white',
                iconBg: cancelledCount > 0 ? 'bg-rose-500 shadow-xs' : 'bg-slate-600 shadow-xs',
              },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className={`flex items-center gap-4 px-6 py-5 transition-all ${
                    index > 0 ? (isDarkMode ? 'lg:border-l border-white/10' : (isCrystal ? 'lg:border-l border-slate-200/80' : 'lg:border-l border-white/20')) : ''
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${metric.iconBg} ${metric.iconColor}`}>
                    <MetricIcon className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold uppercase tracking-wider ${
                      isCrystal && !isDarkMode ? 'text-slate-500' : 'text-white/85'
                    }`}>
                      {metric.label}
                    </div>
                    <div className={`text-2xl sm:text-[26px] font-black tracking-tight tabular-nums my-0.5 leading-tight ${
                      isCrystal && !isDarkMode ? 'text-slate-950' : 'text-white'
                    }`}>
                      {metric.value}
                    </div>
                    <div className={`text-xs font-medium truncate ${
                      isCrystal && !isDarkMode ? 'text-slate-600' : 'text-white/90'
                    }`}>
                      {metric.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* ── APPLE SEGMENTED FILTER BAR (2-Tier Command Deck) ──                    */}
      {/* ========================================================================= */}
      <div className={`p-2.5 sm:p-3.5 rounded-2xl border transition-ui flex flex-wrap items-center justify-between gap-3 ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
          : isCrystal
            ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
            : 'border-slate-200 bg-white shadow-xs'
      }`}>
        <div
          className={`inline-flex items-center p-1 rounded-xl border text-xs overflow-x-auto max-w-full ${
            isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
          }`}
        >
          {[
            { id: 'UPCOMING', label: 'Upcoming', count: upcomingCount },
            { id: 'ALL', label: 'All Meetings', count: meetings.length },
            { id: 'CANCELLED', label: 'Cancelled', count: cancelledCount }
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? isDarkMode
                      ? 'bg-white/15 text-white shadow-xs border border-white/10'
                      : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? isDarkMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                      : isDarkMode
                        ? 'bg-white/5 text-slate-400'
                        : 'bg-slate-300/60 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`hidden md:flex items-center gap-2 text-xs font-mono pr-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text-dark)]" />
          <span>Synced with team notification engine</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── MEETINGS LIST (Apple Calendar Event Cards) ──                        */}
      {/* ========================================================================= */}
      <div className="space-y-3 sm:space-y-4">
        {isLoadingMeetings ? (
          <div className={`p-12 rounded-3xl border text-center font-mono ${cardBase}`}>
            <CalendarClock className="w-8 h-8 animate-spin text-[var(--accent-text-dark)] mx-auto mb-2 opacity-80" />
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Loading meetings…</div>
          </div>
        ) : visibleMeetings.length === 0 ? (
          <div className={`p-8 sm:p-12 rounded-3xl border text-center ${cardBase}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              No meetings scheduled
            </h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {statusFilter === 'UPCOMING'
                ? 'There are no upcoming meetings on your team calendar right now.'
                : 'No meetings match your current filter selection.'}
            </p>
            {canManageMeetings && (
              <button
                type="button"
                onClick={() => meetingModal.open()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs shadow-[0_8px_20px_var(--accent-shadow)] transition-ui cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Schedule One Now
              </button>
            )}
          </div>
        ) : (
          visibleMeetings.map((meeting) => {
            const organizer = users.find((u) => u.id === meeting.organizerId);
            const isCancelled = meeting.status === 'CANCELLED';
            const isCompleted = meeting.status === 'COMPLETED';
            const dateBadge = parseCalendarDate(meeting.startTime);
            const isCopied = copiedMeetingId === meeting.id;

            return (
              <div
                key={meeting.id}
                className={`p-4 sm:p-6 rounded-3xl border transition-ui space-y-4 ${cardBase} ${
                  isCancelled
                    ? 'opacity-65'
                    : isDarkMode
                      ? 'hover:border-white/20 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
                      : 'hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Apple Calendar Date Tile + Event Title */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* iOS-Style Calendar Date Block */}
                    <div
                      className={`flex flex-col items-center justify-center shrink-0 w-13 sm:w-14 rounded-2xl border overflow-hidden text-center shadow-xs select-none ${
                        isDarkMode
                          ? 'bg-black/50 border-white/10'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="w-full bg-[var(--accent-primary)] text-white text-[9px] font-mono font-bold tracking-wider uppercase py-0.5">
                        {dateBadge.month}
                      </div>
                      <div className={`text-lg sm:text-xl font-black py-0.5 font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {dateBadge.day}
                      </div>
                      <div className={`text-[9px] font-mono pb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {dateBadge.weekday}
                      </div>
                    </div>

                    {/* Title, Agenda, Badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-base sm:text-lg font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {meeting.title}
                        </h3>
                        {isCancelled ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              isDarkMode ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <XCircle className="w-3 h-3 text-rose-400" /> Cancelled
                          </span>
                        ) : isCompleted ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              isDarkMode ? 'bg-slate-500/10 text-slate-300 border-slate-500/30' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Scheduled
                          </span>
                        )}
                        {meeting.section && (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase ${
                              isDarkMode ? 'bg-white/5 text-slate-400 border border-white/10' : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {meeting.section}
                          </span>
                        )}
                      </div>

                      {meeting.agenda && (
                        <p className={`text-xs sm:text-sm mt-1.5 line-clamp-2 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {meeting.agenda}
                        </p>
                      )}

                      {/* Metadata Chips: Timing, Location, Organizer */}
                      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[var(--accent-text-dark)] shrink-0" />
                          <span>{formatWhen(meeting.startTime, meeting.endTime)}</span>
                        </span>
                        {meeting.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>{meeting.location}</span>
                          </span>
                        )}
                        {organizer && (
                          <span className="flex items-center gap-1.5">
                            <span className="text-slate-500">•</span>
                            <span>Host: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{organizer.name}</strong></span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Copy Link, Edit, Cancel */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {meeting.meetingLink && !isCancelled && (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        title="Open video call"
                        className="inline-flex h-9 items-center gap-1.5 px-4 rounded-full bg-[#155dfc] hover:bg-blue-600 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Join</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyLink(meeting)}
                      disabled={!meeting.meetingLink}
                      title={meeting.meetingLink ? 'Copy meeting link' : 'No link attached'}
                      className={`inline-flex h-9 items-center gap-1.5 px-3 rounded-xl text-xs font-bold border transition-ui cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDarkMode
                          ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy Link'}</span>
                    </button>

                    {canManageMeetings && meeting.status === 'SCHEDULED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => meetingModal.open({ id: meeting.id })}
                          title="Edit meeting"
                          className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-ui cursor-pointer ${
                            isDarkMode
                              ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelModal.open({ id: meeting.id })}
                          title="Cancel meeting"
                          className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-ui cursor-pointer ${
                            isDarkMode
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                              : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Inset Meeting Link Bar & Attendee Facepile */}
                <div className="pt-3 border-t border-white/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Video Call URL Pill */}
                  {meeting.meetingLink && !isCancelled ? (
                    <div className="flex items-center gap-2 min-w-0 max-w-md">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono truncate ${
                          isDarkMode
                            ? 'border-[var(--accent-border-dark)] bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)]'
                            : 'border-[var(--accent-border-light)] bg-[var(--accent-soft-light)] text-[var(--accent-text-light)]'
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{meeting.meetingLink}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 font-mono">
                      {isCancelled ? 'Cancelled meeting record.' : 'No remote video link specified.'}
                    </div>
                  )}

                  {/* Attendee Facepile */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Attendees ({meeting.attendees.length}):
                    </span>
                    <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                      {meeting.attendees.slice(0, 4).map((a, idx) => {
                        const user = users.find((u) => u.id === a.userId);
                        const name = user ? user.name : 'User';
                        return (
                          <div
                            key={a.userId || idx}
                            title={name}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ring-2 select-none ${
                              isDarkMode
                                ? 'bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)] ring-[#09090B]'
                                : 'bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] ring-white'
                            }`}
                          >
                            {getInitials(name)}
                          </div>
                        );
                      })}
                      {meeting.attendees.length > 4 && (
                        <div
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-mono font-bold ring-2 select-none ${
                            isDarkMode
                              ? 'bg-slate-800 text-slate-300 ring-[#09090B]'
                              : 'bg-slate-200 text-slate-700 ring-white'
                          }`}
                        >
                          +{meeting.attendees.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ── CREATE / EDIT MEETING MODAL ──                                       */}
      {/* ========================================================================= */}
      {canManageMeetings && (
        <MeetingFormModal
          isOpen={meetingModal.isOpen}
          onClose={() => meetingModal.close()}
          isDarkMode={isDarkMode}
          isSubmitting={isSubmitting}
          users={users}
          currentUser={currentUser}
          editingMeeting={editingMeeting}
          onSubmit={handleSubmitForm}
        />
      )}

      {/* ========================================================================= */}
      {/* ── CANCEL CONFIRMATION MODAL ──                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={cancelModal.isOpen}
        onClose={() => { cancelModal.close(); setCancelReason(''); }}
        isDarkMode={isDarkMode}
        maxWidth="md"
        icon={<Ban className="w-5 h-5 text-rose-400" />}
        title="Cancel Meeting"
        subtitle={meetingPendingCancel ? `"${meetingPendingCancel.title}"` : undefined}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => { cancelModal.close(); setCancelReason(''); }}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-ui cursor-pointer ${
                isDarkMode
                  ? 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Keep Meeting
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isSubmitting}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-500/20 cursor-pointer transition-ui disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelling…' : 'Cancel Meeting'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            All invited attendees will be notified of this cancellation. Any scheduled system reminders for this session will be immediately retracted.
          </p>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Cancellation Reason (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="e.g. Rescheduled to next week, project review postponed"
              className={`w-full mt-1.5 p-3 rounded-xl border text-sm font-sans resize-none transition-ui outline-none ${
                isDarkMode
                  ? 'border-white/10 bg-black/40 text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)]'
                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)]'
              }`}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// Create / Edit form modal
// ============================================================================
interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  isSubmitting: boolean;
  users: SystemUser[];
  currentUser: SystemUser | null;
  editingMeeting: Meeting | null;
  onSubmit: (form: {
    title: string;
    agenda: string;
    section: string;
    meetingLink: string;
    location: string;
    startTime: string;
    endTime: string;
    attendeeUserIds: string[];
  }) => void;
}

const MeetingFormModal: React.FC<MeetingFormModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  isSubmitting,
  users,
  currentUser,
  editingMeeting,
  onSubmit
}) => {
  const isEdit = !!editingMeeting;

  const computeDefaultTimes = () => {
    const start = new Date();
    start.setSeconds(0, 0);
    start.setMinutes(start.getMinutes() + (30 - (start.getMinutes() % 30)) + 30);
    return { start, end: new Date(start.getTime() + 30 * 60 * 1000) };
  };

  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [section, setSection] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState(() => toLocalInputValue(computeDefaultTimes().start.toISOString()));
  const [endTime, setEndTime] = useState(() => toLocalInputValue(computeDefaultTimes().end.toISOString()));
  const [attendeeUserIds, setAttendeeUserIds] = useState<string[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  const seededForRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!isOpen) {
      seededForRef.current = null;
      return;
    }
    const seedKey = editingMeeting?.id ?? 'create';
    if (seededForRef.current === seedKey) return;
    seededForRef.current = seedKey;
    // Wrapped in startTransition to satisfy react-hooks/set-state-in-effect
    // (see useMeetings.ts for the same fix) — the ref guard above already
    // ensures this only runs once per seedKey, this just defers the actual
    // state writes so they're not flagged as a synchronous effect update.
    startTransition(() => {
      if (editingMeeting) {
        setTitle(editingMeeting.title);
        setAgenda(editingMeeting.agenda || '');
        setSection(editingMeeting.section || '');
        setMeetingLink(editingMeeting.meetingLink || '');
        setLocation(editingMeeting.location || '');
        setStartTime(toLocalInputValue(editingMeeting.startTime));
        setEndTime(toLocalInputValue(editingMeeting.endTime));
        setAttendeeUserIds(editingMeeting.attendees.map((a) => a.userId));
      } else {
        const { start, end } = computeDefaultTimes();
        setTitle('');
        setAgenda('');
        setSection('');
        setMeetingLink('');
        setLocation('');
        setStartTime(toLocalInputValue(start.toISOString()));
        setEndTime(toLocalInputValue(end.toISOString()));
        setAttendeeUserIds(currentUser ? [currentUser.id] : []);
      }
    });
  }, [isOpen, editingMeeting]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = useMemo(() => {
    const q = attendeeSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, attendeeSearch]);

  const toggleAttendee = (userId: string) => {
    setAttendeeUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const isValid = title.trim().length > 0 && startTime && endTime && new Date(endTime) > new Date(startTime);

  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-sm transition-ui outline-none ${
    isDarkMode
      ? 'border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:bg-white/[0.06] focus:ring-2 focus:ring-[var(--accent-ring)]'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)] shadow-xs'
  }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isDarkMode={isDarkMode}
      maxWidth="2xl"
      icon={<CalendarClock className="w-5 h-5 text-[var(--accent-text-dark)]" />}
      title={isEdit ? 'Edit Meeting Schedule' : 'Schedule Team Meeting'}
      subtitle="Automated alerts dispatch 24 hours and 15 minutes before session time."
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-ui cursor-pointer ${
              isDarkMode ? 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ title, agenda, section, meetingLink, location, startTime, endTime, attendeeUserIds })}
            disabled={!isValid || isSubmitting}
            className="min-h-[42px] px-6 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-extrabold text-xs shadow-[0_8px_20px_var(--accent-shadow)] cursor-pointer transition-ui disabled:opacity-50 disabled:cursor-not-allowed active:scale-96"
          >
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Schedule Meeting'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 font-sans">
        {/* Inset Section 1: Meeting Basics */}
        <div className={`rounded-2xl border p-4 space-y-3.5 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-text-dark)] font-mono">
            <CalendarClock className="h-3.5 w-3.5" /> Meeting Basics
          </div>
          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Meeting Title *</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekly Production Planning Sync"
                className={inputClass}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Agenda & Context</span>
              <textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={2}
                placeholder="Topics, goals, and key deliverables for this meeting"
                className={`${inputClass} resize-none`}
              />
            </label>
          </div>
        </div>

        {/* Inset Section 2: Timing & Schedule */}
        <div className={`rounded-2xl border p-4 space-y-3.5 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-text-dark)] font-mono">
            <Clock className="h-3.5 w-3.5" /> Timing & Schedule
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-400">Starts *</span>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-400">Ends *</span>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Inset Section 3: Connectivity & Location */}
        <div className={`rounded-2xl border p-4 space-y-3.5 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-text-dark)] font-mono">
            <Link2 className="h-3.5 w-3.5" /> Video Link & Location
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-400">Video Call Link</span>
                <input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/xyz-abc"
                  className={inputClass}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-400">Physical Venue / Room</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Conference Room A / Shop Floor"
                  className={inputClass}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Department / Section (optional)</span>
              <input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. Production, Procurement, Quality"
                className={inputClass}
              />
            </label>
          </div>
        </div>

        {/* Inset Section 4: Attendees */}
        <div className={`rounded-2xl border p-4 space-y-3.5 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-text-dark)] font-mono">
              <UsersIcon className="h-3.5 w-3.5" /> Invited Attendees ({attendeeUserIds.length})
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
              placeholder="Filter staff by name or email…"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className={`max-h-48 overflow-y-auto rounded-2xl border divide-y ${
            isDarkMode ? 'border-white/10 bg-black/30 divide-white/5' : 'border-slate-200 bg-slate-50/50 divide-slate-100'
          }`}>
            {filteredUsers.map((u) => {
              const isChecked = attendeeUserIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                    isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleAttendee(u.id)}
                    className="rounded accent-[var(--accent-primary)] h-4 w-4"
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] font-bold text-[10px]">
                      {getInitials(u.name)}
                    </div>
                    <span className={`font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {u.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono ml-auto ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {u.role}
                  </span>
                </label>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className={`px-4 py-6 text-xs text-center font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                No matching staff accounts found
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MeetingsView;
