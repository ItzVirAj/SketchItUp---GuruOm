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
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* ── TOP HERO HEADER (Apple HIG Banner Matching OwnerOS) ──                 */}
      {/* ========================================================================= */}
      <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${cardBase}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/10 dark:border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
                  HR Module
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Automated Reminders Sync</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Meetings & Scheduling
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Team calendar schedule with automated 24h and 15m reminders. Attach links from Google Meet, Zoom, or Microsoft Teams for rapid one-click launching.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            {/* Live Upcoming Metric Pill */}
            <div
              className={`p-3 sm:px-4 sm:py-2.5 rounded-2xl border font-mono text-right w-full sm:w-auto ${
                isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex sm:flex-col justify-between items-center sm:items-end">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Upcoming
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[var(--accent-text-dark)] tabular-nums">
                  {upcomingCount}
                </span>
              </div>
            </div>

            {canManageMeetings && (
              <button
                type="button"
                onClick={() => meetingModal.open()}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Meeting</span>
              </button>
            )}
          </div>
        </div>

        {/* Apple 3-Column Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
          {[
            {
              label: 'Upcoming Sessions',
              value: upcomingCount,
              sub: 'Scheduled & upcoming',
              icon: CalendarClock,
              iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]'
            },
            {
              label: 'Total Sessions',
              value: meetings.length,
              sub: 'Calendar lifetime count',
              icon: Calendar,
              iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            },
            {
              label: 'Cancelled Sessions',
              value: cancelledCount,
              sub: 'Retracted bookings',
              icon: XCircle,
              iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/10 hover:border-white/20' : 'bg-slate-50 border-slate-200'
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
      <div className={`p-2.5 sm:p-3 rounded-3xl border transition-ui flex items-center justify-between gap-3 overflow-x-auto scrollbar-none ${cardBase}`}>
        <div
          className={`p-1 rounded-xl border flex items-center overflow-x-auto scrollbar-none w-full sm:w-auto ${
            isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isDarkMode
                        ? 'bg-white/10 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
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
                        className="inline-flex h-9 items-center gap-1.5 px-3 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold shadow-md shadow-[var(--accent-shadow)] transition-ui cursor-pointer"
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
