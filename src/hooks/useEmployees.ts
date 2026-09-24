import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '../context/ToastContext';
import { EmployeeMasterRecord } from '../types/console';
import { tryNormalizeRole } from '../utils/rbacMatrix';
import { fetchEmployees, updateEmployee } from '../services/consoleApiServices';

const EMPLOYEE_MASTER_MANAGERS = new Set(['ServerAdmin', 'Owner', 'Admin (System)', 'HR/Admin']);

export function useEmployees(canView: boolean, currentUserRole?: string | null) {
  const [employees, setEmployees] = useState<EmployeeMasterRecord[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  const canManageEmployees = useMemo(
    // Fail closed: an unrecognized role can never manage the employee master.
    () => EMPLOYEE_MASTER_MANAGERS.has(tryNormalizeRole(currentUserRole || '') ?? ''),
    [currentUserRole]
  );

  const loadEmployees = useCallback(async (params?: { search?: string; department?: string; status?: string }) => {
    if (!canView) return;
    setIsLoadingEmployees(true);
    try {
      const data = await fetchEmployees(params);
      const visible = data.filter((employee) => {
        // Unrecognized roles stay visible with their raw label (honest display);
        // only the three privileged roles are filtered out.
        const role = tryNormalizeRole(employee.role);
        return role !== 'ServerAdmin' && role !== 'Owner' && role !== 'Client';
      });
      setEmployees(visible);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load Employee Master.', 'Employee Master');
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [canView]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleUpdateEmployee = useCallback(async (
    id: string,
    updates: Partial<{
      name: string;
      email: string;
      department: string;
      phone: string;
      reportingManager: string;
      shift: string;
    }>
  ) => {
    try {
      const updated = await updateEmployee(id, updates);
      setEmployees((prev) => prev.map((employee) => employee.id === id ? updated : employee));
      toast.success(`${updated.name}'s profile was updated.`, 'Employee Updated');
      return updated;
    } catch (err: any) {
      toast.error(err?.message || 'Could not update employee.', 'Employee Master');
      throw err;
    }
  }, []);

  return {
    employees,
    isLoadingEmployees,
    canManageEmployees,
    loadEmployees,
    handleUpdateEmployee
  };
}
