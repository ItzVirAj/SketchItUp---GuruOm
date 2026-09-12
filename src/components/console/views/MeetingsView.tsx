import React, { useMemo, useState } from 'react';
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
  XCircle
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

// datetime-local <input> expects 'YYYY-MM-DDTHH:mm' in local time (no seconds/offset).
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateStr = start.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const startTime = start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} • ${startTime} – ${endTime}`;
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

  const editingMeeting = useMemo(
    () => (meetingModal.params.id ? meetings.find((m) => m.id === meetingModal.params.id) || null : null),
    [meetingModal.params.id, meetings]
  );
  const meetingPendingCancel = useMemo(
    () => (cancelModal.params.id ? meetings.find((m) => m.id === cancelModal.params.id) || null : null),
    [cancelModal.params.id, meetings]
  );

  // Meetings are fetched with scope='all' (see useMeetings) so every tab is
  // backed by real data; filters narrow client-side. "Upcoming" means still
  // scheduled AND not over yet — a stale SCHEDULED meeting whose time has
  // passed only shows under "All Meetings".
  const nowMs = Date.now();
  const isUpcoming = (m: Meeting) => m.status === 'SCHEDULED' && new Date(m.endTime).getTime() > nowMs;
  const visibleMeetings = useMemo(() => {
    const sorted = [...meetings].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (statusFilter === 'CANCELLED') return sorted.filter((m) => m.status === 'CANCELLED');
    if (statusFilter === 'ALL') return sorted;
    return sorted.filter(isUpcoming);
  }, [meetings, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcomingCount = meetings.filter(isUpcoming).length;

  const handleCopyLink = async (meeting: Meeting) => {
    if (!meeting.meetingLink) {
      toast.warning('This meeting has no link attached yet.', 'Nothing to Copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(meeting.meetingLink);
      toast.success('Meeting link copied to clipboard.', 'Link Copied');
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
        // Send empty strings as-is: '' tells the API "clear this optional
        // field" (the backend stores NULL). Mapping '' → undefined would make
        // a previously-set agenda/link/section/location impossible to remove.
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
      // toast already shown by the hook
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
      // toast already shown by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardBase = isDarkMode
    ? 'bg-slate-900/85 border-slate-800/80 text-white backdrop-blur-xl'
    : 'bg-white border-slate-200 shadow-sm text-slate-900';

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* Top Banner Header */}
      <div className={`p-4 sm:p-6 md:p-8 rounded-3xl border transition-ui shadow-xl ${cardBase}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-50 text-purple-800 border border-purple-200'
              }`}>
                HR Module
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>• Meeting Scheduler & Reminders</span>
            </div>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <CalendarClock className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" />
              Meetings
            </h1>
            <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Team meeting schedule with automatic reminders. This isn't a call platform — attach a link from whatever tool you already use (Meet, Zoom, Teams) and copy it from here.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-3 sm:p-4 rounded-2xl border text-right font-mono w-full sm:w-auto ${
              isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <div className="flex sm:flex-col justify-between items-center sm:items-end">
                <span className={`text-[10px] uppercase font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Upcoming</span>
                <span className="text-xl sm:text-2xl font-bold text-purple-500">{upcomingCount}</span>
              </div>
            </div>

            {canManageMeetings && (
              <button
                onClick={() => meetingModal.open()}
                className="min-h-[42px] px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-500/25 cursor-pointer transition-ui hover:scale-[1.02] active:scale-[0.96] flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Schedule Meeting
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-3 sm:p-4 rounded-3xl border transition-ui flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none shadow-sm ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {[
          { id: 'UPCOMING', label: 'Upcoming', count: upcomingCount },
          { id: 'ALL', label: 'All Meetings', count: meetings.length },
          { id: 'CANCELLED', label: 'Cancelled', count: meetings.filter((m) => m.status === 'CANCELLED').length }
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap border ${
                isActive
                  ? isDarkMode
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs'
                    : 'bg-purple-600 text-white border-purple-600 shadow-md'
                  : isDarkMode
                    ? 'bg-slate-950/40 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-800/60'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isActive ? 'bg-white/20 text-white' : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Meetings List */}
      <div className="space-y-3 sm:space-y-4">
        {isLoadingMeetings ? (
          <div className={`p-8 rounded-3xl border text-center font-mono ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            Loading meetings…
          </div>
        ) : visibleMeetings.length === 0 ? (
          <div className={`p-6 sm:p-8 rounded-3xl border text-center font-mono ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <CalendarClock className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold">No meetings here</h3>
            <p className="text-xs mt-0.5">
              {statusFilter === 'UPCOMING' ? 'Nothing scheduled right now.' : 'Nothing matches this filter yet.'}
            </p>
          </div>
        ) : (
          visibleMeetings.map((meeting) => {
            const organizer = users.find((u) => u.id === meeting.organizerId);
            const isCancelled = meeting.status === 'CANCELLED';
            const isCompleted = meeting.status === 'COMPLETED';
            return (
              <div
                key={meeting.id}
                className={`p-4 sm:p-6 rounded-3xl border transition-ui space-y-3 shadow-md ${cardBase} ${
                  isCancelled ? 'opacity-60' : isDarkMode ? 'hover:border-purple-500/40' : 'hover:border-purple-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold truncate">{meeting.title}</h3>
                      {isCancelled ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <XCircle className="w-3 h-3" /> Cancelled
                        </span>
                      ) : isCompleted ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          isDarkMode ? 'bg-slate-500/10 text-slate-400 border-slate-500/30' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" /> Scheduled
                        </span>
                      )}
                    </div>
                    {meeting.agenda && (
                      <p className={`text-xs mt-1 line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{meeting.agenda}</p>
                    )}
                    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatWhen(meeting.startTime, meeting.endTime)}</span>
                      {meeting.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {meeting.location}</span>}
                      <span className="flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" /> {meeting.attendees.length} invited{organizer ? ` • Organized by ${organizer.name}` : ''}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyLink(meeting)}
                      disabled={!meeting.meetingLink}
                      title={meeting.meetingLink ? 'Copy meeting link' : 'No link attached'}
                      className={`min-h-[36px] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-ui cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDarkMode ? 'bg-slate-800/60 border-slate-750 text-slate-200 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>

                    {canManageMeetings && meeting.status === 'SCHEDULED' && (
                      <>
                        <button
                          onClick={() => meetingModal.open({ id: meeting.id })}
                          title="Edit meeting"
                          className={`min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border transition-ui cursor-pointer ${
                            isDarkMode ? 'bg-slate-800/60 border-slate-750 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => cancelModal.open({ id: meeting.id })}
                          title="Cancel meeting"
                          className={`min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border transition-ui cursor-pointer ${
                            isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {meeting.meetingLink && !isCancelled && (
                  <div className={`flex items-center gap-1.5 text-[11px] font-mono truncate ${isDarkMode ? 'text-purple-300/80' : 'text-purple-700'}`}>
                    <Link2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{meeting.meetingLink}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============================ CREATE / EDIT MEETING MODAL ============================ */}
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

      {/* ============================ CANCEL CONFIRMATION MODAL ============================ */}
      <Modal
        isOpen={cancelModal.isOpen}
        onClose={() => { cancelModal.close(); setCancelReason(''); }}
        isDarkMode={isDarkMode}
        maxWidth="md"
        icon={<Ban className="w-5 h-5" />}
        title="Cancel Meeting"
        subtitle={meetingPendingCancel ? `"${meetingPendingCancel.title}"` : undefined}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={() => { cancelModal.close(); setCancelReason(''); }}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode ? 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-750' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Keep Meeting
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={isSubmitting}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 cursor-pointer transition-ui disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelling…' : 'Cancel Meeting'}
            </button>
          </div>
        }
      >
        <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          All invited attendees will be notified. Any pending reminders for this meeting will be retracted.
        </p>
        <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Reason (optional)
        </label>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          placeholder="e.g. Rescheduling to next week"
          className={`w-full mt-1.5 p-3 rounded-xl border text-sm font-sans resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
          }`}
        />
      </Modal>
    </div>
  );
};

// ============================================================================
// Create / Edit form modal — split out to keep hook usage (useState per field)
// isolated from the list view's own state.
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

  // Fresh "next half-hour + 30min buffer" slot computed at call time so the
  // proposed slot never goes stale — a mount-time memo would suggest times in
  // the past once the app has been open for a while (and the backend rejects
  // past start times).
  const computeDefaultTimes = () => {
    const start = new Date();
    start.setSeconds(0, 0);
    start.setMinutes(start.getMinutes() + (30 - (start.getMinutes() % 30)) + 30); // next half-hour, +30min buffer
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

  // Seed the form when the modal opens for a given target (a meeting id, or
  // 'create') — and NEVER again while it stays open on the same target. The
  // 60s live-refresh in useMeetings keeps replacing the meetings array (and
  // thus the `editingMeeting` object identity); re-seeding on that would wipe
  // the user's in-progress edits mid-typing.
  const seededForRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!isOpen) {
      seededForRef.current = null;
      return;
    }
    const seedKey = editingMeeting?.id ?? 'create';
    if (seededForRef.current === seedKey) return;
    seededForRef.current = seedKey;
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isDarkMode={isDarkMode}
      maxWidth="2xl"
      icon={<CalendarClock className="w-5 h-5" />}
      title={isEdit ? 'Edit Meeting' : 'Schedule a Meeting'}
      subtitle="Reminders are sent automatically 24h and 15m before start time."
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={onClose}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
              isDarkMode ? 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-750' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ title, agenda, section, meetingLink, location, startTime, endTime, attendeeUserIds })}
            disabled={!isValid || isSubmitting}
            className="min-h-[42px] px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 cursor-pointer transition-ui disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Schedule Meeting'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly Production Sync"
            className={inputClass(isDarkMode)}
          />
        </div>

        <div>
          <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Agenda</label>
          <textarea
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            rows={2}
            placeholder="What's this meeting about?"
            className={`${inputClass(isDarkMode)} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Starts *</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass(isDarkMode)} />
          </div>
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ends *</label>
            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass(isDarkMode)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Meeting Link</label>
            <input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/…"
              className={inputClass(isDarkMode)}
            />
          </div>
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Location (optional)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Factory conference room"
              className={inputClass(isDarkMode)}
            />
          </div>
        </div>

        <div>
          <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Section (optional)</label>
          <input
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. production, purchasing"
            className={inputClass(isDarkMode)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Attendees ({attendeeUserIds.length})
            </label>
          </div>
          <input
            value={attendeeSearch}
            onChange={(e) => setAttendeeSearch(e.target.value)}
            placeholder="Search people…"
            className={`${inputClass(isDarkMode)} mb-2`}
          />
          <div className={`max-h-44 overflow-y-auto rounded-xl border divide-y ${isDarkMode ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-100'}`}>
            {filteredUsers.map((u) => (
              <label
                key={u.id}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
              >
                <input
                  type="checkbox"
                  checked={attendeeUserIds.includes(u.id)}
                  onChange={() => toggleAttendee(u.id)}
                  className="rounded"
                />
                <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{u.name}</span>
                <span className={`text-[11px] font-mono ml-auto ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{u.role}</span>
              </label>
            ))}
            {filteredUsers.length === 0 && (
              <div className={`px-3 py-4 text-xs text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No matching users</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

function inputClass(isDarkMode: boolean): string {
  return `w-full mt-1.5 p-3 rounded-xl border text-sm font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;
}

export default MeetingsView;
