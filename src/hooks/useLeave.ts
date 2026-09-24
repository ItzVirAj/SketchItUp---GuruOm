import { useState, useCallback, useEffect, useMemo, startTransition } from 'react';
import { toast } from '../context/ToastContext';
import { getRoleModulePermission, hasMinimumAccess } from '../utils/rbacMatrix';
import {
  LeaveRequest,
  LeaveType,
  fetchLeaveRequests,
  createLeaveRequest as createLeaveRequestApi,
  cancelLeaveRequest as cancelLeaveRequestApi
} from '../services/consoleApiServices';

export function useLeave(canView: boolean, currentUserRole?: string | null) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const canViewAllLeave = useMemo(() => {
    if (!currentUserRole) return false;
    return hasMinimumAccess(getRoleModulePermission(currentUserRole, 'leave').accessLevel, 'FULL_APPROVE');
  }, [currentUserRole]);

  const loadLeaveRequests = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    try {
      const data = await fetchLeaveRequests(canViewAllLeave ? 'all' : 'mine');
      setLeaveRequests(data);
    } finally {
      setIsLoading(false);
    }
  }, [canView, canViewAllLeave]);

  useEffect(() => {
    startTransition(() => {
      loadLeaveRequests();
    });
  }, [loadLeaveRequests]);

  useEffect(() => {
    if (!canView) return;
    const interval = setInterval(loadLeaveRequests, 60_000);
    return () => clearInterval(interval);
  }, [canView, loadLeaveRequests]);

  const handleCreateLeaveRequest = useCallback(
    async (payload: { leaveType: LeaveType; startDate: string; endDate: string; reason?: string }) => {
      try {
        const created = await createLeaveRequestApi(payload);
        setLeaveRequests((prev) => [created, ...prev]);
        toast.success('Sent for approval — you\'ll be notified once it\'s decided.', 'Leave Requested');
        return created;
      } catch (err: any) {
        toast.error(err?.message || 'Could not submit the leave request.', 'Request Failed');
        throw err;
      }
    },
    []
  );

  const handleCancelLeaveRequest = useCallback(async (id: string) => {
    try {
      const cancelled = await cancelLeaveRequestApi(id);
      setLeaveRequests((prev) => prev.map((r) => (r.id === id ? cancelled : r)));
      toast.success('Leave request withdrawn.', 'Cancelled');
      return cancelled;
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel the request.', 'Cancellation Failed');
      throw err;
    }
  }, []);

  return { leaveRequests, isLoadingLeave: isLoading, canViewAllLeave, loadLeaveRequests, handleCreateLeaveRequest, handleCancelLeaveRequest };
}
