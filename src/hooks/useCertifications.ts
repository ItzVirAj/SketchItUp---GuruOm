import { useState, useCallback, useEffect, useMemo, startTransition } from 'react';
import { toast } from '../context/ToastContext';
import { getRoleModulePermission, hasMinimumAccess } from '../utils/rbacMatrix';
import {
  Certification,
  fetchCertifications,
  createCertification as createCertificationApi,
  deleteCertification as deleteCertificationApi
} from '../services/consoleApiServices';

export function useCertifications(canView: boolean, currentUserRole?: string | null) {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const canManageCertifications = useMemo(() => {
    if (!currentUserRole) return false;
    return hasMinimumAccess(getRoleModulePermission(currentUserRole, 'certifications').accessLevel, 'FULL_APPROVE');
  }, [currentUserRole]);

  const loadCertifications = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    try {
      const data = await fetchCertifications(canManageCertifications ? 'all' : 'mine');
      setCertifications(data);
    } finally {
      setIsLoading(false);
    }
  }, [canView, canManageCertifications]);

  useEffect(() => {
    startTransition(() => {
      loadCertifications();
    });
  }, [loadCertifications]);

  const handleCreateCertification = useCallback(
    async (payload: { employeeId: string; name: string; issuingBody?: string; issuedDate?: string; expiryDate?: string; notes?: string }) => {
      try {
        const created = await createCertificationApi(payload);
        setCertifications((prev) => [created, ...prev]);
        toast.success(`"${created.name}" added.${created.expiryDate ? ' A reminder is set 30 days before it expires.' : ''}`, 'Certification Added');
        return created;
      } catch (err: any) {
        toast.error(err?.message || 'Could not add the certification.', 'Add Failed');
        throw err;
      }
    },
    []
  );

  const handleDeleteCertification = useCallback(async (id: string) => {
    try {
      await deleteCertificationApi(id);
      setCertifications((prev) => prev.filter((c) => c.id !== id));
      toast.success('Certification removed.', 'Removed');
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove the certification.', 'Removal Failed');
      throw err;
    }
  }, []);

  return { certifications, isLoadingCertifications: isLoading, canManageCertifications, loadCertifications, handleCreateCertification, handleDeleteCertification };
}
