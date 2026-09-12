import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from '../context/ToastContext';
import { getRoleModulePermission, hasMinimumAccess } from '../utils/rbacMatrix';
import {
  Meeting,
  fetchMeetings,
  createMeeting as createMeetingApi,
  updateMeeting as updateMeetingApi,
  cancelMeeting as cancelMeetingApi
} from '../services/consoleApiServices';

/**
 * Meetings (HR module) state + actions.
 *
 * Deliberately NOT folded into `useOwnerOSData` — that hook is already ~1700
 * lines covering a dozen unrelated modules, and Meetings has no data
 * dependency on any of it (it doesn't read/write orders, inventory, etc.).
 * Keeping it separate keeps this module addable/removable without touching
 * the god-hook, at the cost of one extra hook call in ConsoleContainer.
 */
export function useMeetings(canView: boolean, currentUserRole?: string | null) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Owner / Admin (System) / ServerAdmin only, per rbacMatrix.ts ('meetings'
  // module). Computed via the real permission tier (CREATE_EDIT+), not a
  // hardcoded role-name list, so it stays correct if the matrix changes.
  const canManageMeetings = useMemo(() => {
    if (!currentUserRole) return false;
    const perm = getRoleModulePermission(currentUserRole, 'meetings');
    return hasMinimumAccess(perm.accessLevel, 'CREATE_EDIT');
  }, [currentUserRole]);

  const loadMeetings = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    try {
      // scope='all' (not 'upcoming'): the view's Upcoming / All / Cancelled
      // tabs filter client-side, and the backend 'upcoming' scope excludes
      // CANCELLED and past-ended meetings server-side — fetching it would
      // leave the Cancelled tab empty forever and make "All" misleading.
      const data = await fetchMeetings('all');
      setMeetings(data);
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  // Lightweight live-refresh: poll every 60s while this view is in use.
  // NOTE: this app's real SSE stream (EventSource) is opened once, centrally,
  // inside useOwnerOSData.ts — there's no existing pub/sub bus a standalone
  // hook can safely tap into without opening a second EventSource connection.
  // Polling is the pragmatic v1 choice; wiring true push for meeting_* events
  // would mean adding a shared event emitter to useOwnerOSData's EventSource
  // handler, which is worth doing but is a larger, shared-file change.
  useEffect(() => {
    if (!canView) return;
    const interval = setInterval(loadMeetings, 60_000);
    return () => clearInterval(interval);
  }, [canView, loadMeetings]);

  const handleCreateMeeting = useCallback(
    async (payload: {
      title: string;
      agenda?: string;
      section?: string;
      meetingLink?: string;
      location?: string;
      startTime: string;
      endTime: string;
      attendeeUserIds: string[];
    }) => {
      try {
        const created = await createMeetingApi(payload);
        setMeetings((prev) => [...prev, created].sort((a, b) => a.startTime.localeCompare(b.startTime)));
        toast.success(`"${created.title}" scheduled for ${new Date(created.startTime).toLocaleString('en-IN')}`, 'Meeting Scheduled');
        return created;
      } catch (err: any) {
        toast.error(err?.message || 'Could not schedule the meeting.', 'Scheduling Failed');
        throw err;
      }
    },
    []
  );

  const handleUpdateMeeting = useCallback(
    async (id: string, payload: Partial<{
      title: string;
      agenda: string;
      section: string;
      meetingLink: string;
      location: string;
      startTime: string;
      endTime: string;
      attendeeUserIds: string[];
    }>) => {
      try {
        const updated = await updateMeetingApi(id, payload);
        setMeetings((prev) => prev.map((m) => (m.id === id ? updated : m)));
        toast.success(`"${updated.title}" was updated.`, 'Meeting Updated');
        return updated;
      } catch (err: any) {
        toast.error(err?.message || 'Could not update the meeting.', 'Update Failed');
        throw err;
      }
    },
    []
  );

  const handleCancelMeeting = useCallback(async (id: string, reason?: string) => {
    try {
      const cancelled = await cancelMeetingApi(id, reason);
      setMeetings((prev) => prev.map((m) => (m.id === id ? cancelled : m)));
      toast.success(`"${cancelled.title}" was cancelled.`, 'Meeting Cancelled');
      return cancelled;
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel the meeting.', 'Cancellation Failed');
      throw err;
    }
  }, []);

  return {
    meetings,
    isLoadingMeetings: isLoading,
    canManageMeetings,
    loadMeetings,
    handleCreateMeeting,
    handleUpdateMeeting,
    handleCancelMeeting
  };
}
