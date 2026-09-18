import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '../context/ToastContext';
import { getRoleModulePermission, hasMinimumAccess } from '../utils/rbacMatrix';
import {
  LeaveRequest,
  LeaveType,
  fetchLeaveRequests,
  createLeaveRequest as createLeaveRequestApi,
  decideLeaveRequest as decideLeaveRequestApi,
  cancelLeaveRequest as cancelLeaveRequestApi
} from '../services/consoleApiServices';

export function useLeaveRequests(
  canView: boolean, 
  currentUserRole?: string | null,
  effectivePermissions?: string[]
) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoadingLeave, setIsLoadingLeave] = useState(false);

  const canViewAllLeave = useMemo(() => {
    if (!currentUserRole) return false;
    if (effectivePermissions?.includes('*') || effectivePermissions?.includes('leave:view_all')) return true;
    const perm = getRoleModulePermission(currentUserRole, 'leave_requests');
    return perm.scopeRule === 'ALL';
  }, [currentUserRole, effectivePermissions]);

  const canApproveLeave = useMemo(() => {
    if (!currentUserRole) return false;
    if (effectivePermissions?.includes('*') || effectivePermissions?.includes('leave:approve')) return true;
    const perm = getRoleModulePermission(currentUserRole, 'leave_requests');
    return hasMinimumAccess(perm.accessLevel, 'FULL_APPROVE');
  }, [currentUserRole, effectivePermissions]);

  const loadLeaveRequests = useCallback(async (params?: { scope?: 'mine' | 'all'; status?: string; requester?: string }) => {
    if (!canView) return;
    setIsLoadingLeave(true);
    try {
      const scope = params?.scope || (canViewAllLeave ? 'all' : 'mine');
      const data = await fetchLeaveRequests({ ...params, scope });
      setLeaveRequests(data);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load leave requests.', 'Leave Requests');
    } finally {
      setIsLoadingLeave(false);
    }
  }, [canView, canViewAllLeave]);

  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  const handleCreateLeaveRequest = useCallback(
    async (payload: { leaveType: LeaveType; startDate: string; endDate: string; reason?: string }) => {
      try {
        const created = await createLeaveRequestApi(payload);
        setLeaveRequests((prev) => [created, ...prev]);
        toast.success('Leave request submitted successfully.', 'Leave Requested');
        return created;
      } catch (err: any) {
        toast.error(err?.message || 'Could not submit leave request.', 'Request Failed');
        throw err;
      }
    },
    []
  );

  const handleDecideLeaveRequest = useCallback(
    async (id: string, decision: { status: 'APPROVED' | 'REJECTED'; decision_note?: string }) => {
      try {
        const updated = await decideLeaveRequestApi(id, decision);
        setLeaveRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
        toast.success(`Leave request ${decision.status.toLowerCase()}.`, 'Leave Decision');
        return updated;
      } catch (err: any) {
        toast.error(err?.message || 'Could not decide leave request.', 'Decision Failed');
        throw err;
      }
    },
    []
  );

  const handleCancelLeaveRequest = useCallback(async (id: string) => {
    try {
      const cancelled = await cancelLeaveRequestApi(id);
      setLeaveRequests((prev) => prev.map((r) => (r.id === id ? cancelled : r)));
      toast.success('Leave request cancelled.', 'Cancelled');
      return cancelled;
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel leave request.', 'Cancellation Failed');
      throw err;
    }
  }, []);

  return {
    leaveRequests,
    isLoadingLeave,
    canViewAllLeave,
    canApproveLeave,
    loadLeaveRequests,
    handleCreateLeaveRequest,
    handleDecideLeaveRequest,
    handleCancelLeaveRequest
  };
}
