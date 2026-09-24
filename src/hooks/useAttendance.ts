import { useState, useCallback, useEffect, useMemo, startTransition } from 'react';
import { toast } from '../context/ToastContext';
import { getRoleModulePermission, hasMinimumAccess, tryNormalizeRole } from '../utils/rbacMatrix';
import {
  AttendanceLog,
  AttendanceStatus,
  fetchAttendance,
  fetchMyAttendance,
  checkInAttendance,
  checkOutAttendance,
  createAttendanceRecord,
  updateAttendanceRecord
} from '../services/consoleApiServices';

export function useAttendance(
  canView: boolean,
  currentUserId?: string | null,
  currentUserRole?: string | null,
  effectivePermissions?: string[]
) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [myLogs, setMyLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const normRole = useMemo(() => {
    return tryNormalizeRole(currentUserRole);
  }, [currentUserRole]);

  // Can view all attendance across employees (scope ALL)
  const canViewAllAttendance = useMemo(() => {
    if (!normRole) return false;
    const perm = getRoleModulePermission(normRole, 'attendance');
    if (perm.scopeRule === 'ALL') return true;
    if (effectivePermissions?.includes('attendance:view_all')) return true;
    return false;
  }, [normRole, effectivePermissions]);

  // Can manage (create/edit/correct) any user's attendance
  const canManageAttendance = useMemo(() => {
    if (!normRole) return false;
    const perm = getRoleModulePermission(normRole, 'attendance');
    let effectiveLevel = perm.accessLevel;
    let effectiveScope = perm.scopeRule;
    if (
      effectivePermissions?.includes('attendance:manage') ||
      effectivePermissions?.includes('attendance:write') ||
      effectivePermissions?.includes('attendance:create')
    ) {
      effectiveLevel = 'CREATE_EDIT';
      effectiveScope = 'ALL';
    }
    const hasTier = hasMinimumAccess(effectiveLevel, 'CREATE_EDIT');
    const hasAll = effectiveScope === 'ALL';
    return hasTier && hasAll;
  }, [normRole, effectivePermissions]);

  const loadAttendance = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    try {
      if (canViewAllAttendance) {
        const data = await fetchAttendance({
          scope: 'all',
          search: searchQuery || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          from: dateRange.from,
          to: dateRange.to
        });
        setLogs(data);
      } else {
        const data = await fetchMyAttendance({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          from: dateRange.from,
          to: dateRange.to
        });
        setLogs(data);
      }

      // Also fetch personal logs for self view / status
      const myData = await fetchMyAttendance();
      setMyLogs(myData);
    } catch (err: any) {
      console.warn('loadAttendance error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [canView, canViewAllAttendance, searchQuery, statusFilter, dateRange]);

  useEffect(() => {
    startTransition(() => {
      loadAttendance();
    });
  }, [loadAttendance]);

  const todayLog = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const sourceList = myLogs.length > 0 ? myLogs : logs;
    return (
      sourceList.find((l) => (l.userId === currentUserId || l.employeeId === currentUserId) && (l.workDate === today || l.logDate === today)) || null
    );
  }, [myLogs, logs, currentUserId]);

  const handleCheckIn = useCallback(async (shift?: string) => {
    try {
      const log = await checkInAttendance(shift);
      setLogs((prev) => [log, ...prev.filter((l) => l.id !== log.id)]);
      setMyLogs((prev) => [log, ...prev.filter((l) => l.id !== log.id)]);
      toast.success('Checked in successfully.', 'Attendance');
      return log;
    } catch (err: any) {
      toast.error(err?.message || 'Could not check in.', 'Check-In Failed');
      throw err;
    }
  }, []);

  const handleCheckOut = useCallback(async () => {
    try {
      const log = await checkOutAttendance();
      setLogs((prev) => prev.map((l) => (l.id === log.id ? log : l)));
      setMyLogs((prev) => prev.map((l) => (l.id === log.id ? log : l)));
      toast.success('Checked out successfully.', 'Attendance');
      return log;
    } catch (err: any) {
      toast.error(err?.message || 'Could not check out.', 'Check-Out Failed');
      throw err;
    }
  }, []);

  const handleCreateAttendance = useCallback(
    async (payload: {
      userId: string;
      workDate: string;
      status: AttendanceStatus;
      checkIn?: string | null;
      checkOut?: string | null;
      source?: string;
      notes?: string | null;
    }) => {
      try {
        const log = await createAttendanceRecord(payload);
        setLogs((prev) => [log, ...prev.filter((l) => l.id !== log.id)]);
        toast.success('Attendance record logged.', 'Attendance');
        return log;
      } catch (err: any) {
        toast.error(err?.message || 'Failed to save record.', 'Error');
        throw err;
      }
    },
    []
  );

  const handleUpdateAttendance = useCallback(
    async (
      id: string,
      payload: {
        status?: AttendanceStatus;
        checkIn?: string | null;
        checkOut?: string | null;
        source?: string;
        notes?: string | null;
      }
    ) => {
      try {
        const log = await updateAttendanceRecord(id, payload);
        setLogs((prev) => prev.map((l) => (l.id === id ? log : l)));
        setMyLogs((prev) => prev.map((l) => (l.id === id ? log : l)));
        toast.success('Attendance record updated.', 'Attendance');
        return log;
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update record.', 'Error');
        throw err;
      }
    },
    []
  );

  return {
    attendanceLogs: logs,
    myAttendanceLogs: myLogs,
    isLoadingAttendance: isLoading,
    canManageAttendance,
    canViewAllAttendance,
    todayLog,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    loadAttendance,
    handleCheckIn,
    handleCheckOut,
    handleCreateAttendance,
    handleUpdateAttendance
  };
}
