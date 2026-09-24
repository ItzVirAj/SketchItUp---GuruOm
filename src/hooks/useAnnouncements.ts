import { useState, useCallback, useEffect, useMemo, startTransition } from 'react';
import { toast } from '../context/ToastContext';
import { getRoleModulePermission, hasMinimumAccess } from '../utils/rbacMatrix';
import {
  Announcement,
  fetchAnnouncements,
  createAnnouncement as createAnnouncementApi,
  deleteAnnouncement as deleteAnnouncementApi
} from '../services/consoleApiServices';

export function useAnnouncements(canView: boolean, currentUserRole?: string | null) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const canPostAnnouncements = useMemo(() => {
    if (!currentUserRole) return false;
    return hasMinimumAccess(getRoleModulePermission(currentUserRole, 'announcements').accessLevel, 'CREATE_EDIT');
  }, [currentUserRole]);

  const loadAnnouncements = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    startTransition(() => {
      loadAnnouncements();
    });
  }, [loadAnnouncements]);

  const handleCreateAnnouncement = useCallback(async (payload: {
    title: string;
    body: string;
    pinned?: boolean;
    expiresAt?: string;
  }) => {
    try {
      const created = await createAnnouncementApi(payload);
      setAnnouncements((prev) => [created, ...prev]);
      toast.success('Everyone has been notified.', 'Announcement Posted');
      return created;
    } catch (err: any) {
      toast.error(err?.message || 'Could not post the announcement.', 'Post Failed');
      throw err;
    }
  }, []);

  const handleDeleteAnnouncement = useCallback(async (id: string) => {
    try {
      await deleteAnnouncementApi(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success('Announcement removed.', 'Removed');
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove the announcement.', 'Removal Failed');
      throw err;
    }
  }, []);

  return {
    announcements,
    isLoadingAnnouncements: isLoading,
    canPostAnnouncements,
    loadAnnouncements,
    handleCreateAnnouncement,
    handleDeleteAnnouncement
  };
}
