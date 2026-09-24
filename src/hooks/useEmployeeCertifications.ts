import { useState, useCallback, useEffect, useMemo, startTransition } from 'react';
import { toast } from '../context/ToastContext';
import { getRoleModulePermission, hasMinimumAccess, tryNormalizeRole } from '../utils/rbacMatrix';
import { EmployeeCertification } from '../types/console';
import {
  fetchEmployeeCertifications,
  fetchMyEmployeeCertifications,
  createEmployeeCertification,
  deleteEmployeeCertification,
  uploadEmployeeCertificationDocument
} from '../services/consoleApiServices';

export function useEmployeeCertifications(
  canView: boolean,
  currentUserId?: string | null,
  currentUserRole?: string | null,
  effectivePermissions?: string[]
) {
  const [certifications, setCertifications] = useState<EmployeeCertification[]>([]);
  const [myCertifications, setMyCertifications] = useState<EmployeeCertification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ALL');
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  const normRole = useMemo(() => {
    return tryNormalizeRole(currentUserRole);
  }, [currentUserRole]);

  // Can view all employees' certifications (scopeRule === 'ALL')
  // True for: HR/Admin, Owner, ServerAdmin, Admin (System)
  const canViewAllCertifications = useMemo(() => {
    if (!normRole) return false;
    const perm = getRoleModulePermission(normRole, 'employee_certifications');
    if (perm.scopeRule === 'ALL') return true;
    if (effectivePermissions?.includes('employee_certifications:view_all')) return true;
    return false;
  }, [normRole, effectivePermissions]);

  // Can assign certifications: ONLY roles resolving CREATE_EDIT
  // By default, only HR/Admin has CREATE_EDIT in the matrix.
  // Gated by effective permission resolution, NOT a hardcoded 'role === HR/Admin' string.
  const canAssignCertification = useMemo(() => {
    if (!normRole) return false;
    const perm = getRoleModulePermission(normRole, 'employee_certifications');
    let effectiveLevel = perm.accessLevel;
    if (effectivePermissions?.includes('employee_certifications:create') || effectivePermissions?.includes('employee_certifications:assign')) {
      effectiveLevel = 'CREATE_EDIT';
    }
    return hasMinimumAccess(effectiveLevel, 'CREATE_EDIT');
  }, [normRole, effectivePermissions]);

  const loadCertifications = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    try {
      // Always load caller's personal certifications
      const myData = await fetchMyEmployeeCertifications({
        search: searchQuery || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter
      });
      startTransition(() => {
        setMyCertifications(myData);
      });

      // Load all certifications if user has ALL view scope
      if (canViewAllCertifications) {
        const allData = await fetchEmployeeCertifications({
          scope: 'all',
          search: searchQuery || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter
        });
        startTransition(() => {
          setCertifications(allData);
        });
      }
    } catch (err: any) {
      console.error('Failed to load employee certifications:', err);
      toast.error('Failed to load employee certifications', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [canView, canViewAllCertifications, searchQuery, statusFilter]);

  useEffect(() => {
    loadCertifications();
  }, [loadCertifications]);

  const handleAssignCertification = useCallback(async (payload: {
    employee_id: string;
    title: string;
    issuing_body: string;
    issued_date: string;
    expiry_date?: string | null;
    document_url?: string | null;
  }) => {
    try {
      const created = await createEmployeeCertification(payload);
      toast.success('Certificate Assigned', `"${created.title}" assigned successfully.`);
      await loadCertifications();
      return created;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to assign certificate';
      toast.error('Assignment Failed', msg);
      throw err;
    }
  }, [loadCertifications]);

  const handleDeleteCertification = useCallback(async (id: string, certTitle?: string) => {
    try {
      await deleteEmployeeCertification(id);
      toast.success('Certificate Revoked', certTitle ? `"${certTitle}" revoked successfully.` : 'Certificate revoked.');
      await loadCertifications();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to revoke certificate';
      toast.error('Revocation Failed', msg);
      throw err;
    }
  }, [loadCertifications]);

  const handleUploadDocument = useCallback(async (file: File) => {
    try {
      const res = await uploadEmployeeCertificationDocument(file);
      toast.success('Document Uploaded', 'Certificate attachment stored successfully.');
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to upload document';
      toast.error('Upload Failed', msg);
      throw err;
    }
  }, []);

  return {
    certifications,
    myCertifications,
    isLoadingCertifications: isLoading,
    canViewAllCertifications,
    canAssignCertification,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    activeTab,
    setActiveTab,
    handleAssignCertification,
    handleDeleteCertification,
    handleUploadDocument,
    refreshCertifications: loadCertifications
  };
}
