import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/apiClient';
import { InAppNotification } from '../services/notificationService';
import { playAlertSound, isNotificationSoundEnabled, setNotificationSoundEnabled } from '../lib/notificationSound';

const DISMISSED_BEFORE_KEY = 'notif_dismissed_before';

function getDismissedBefore(): number {
  const raw = localStorage.getItem(DISMISSED_BEFORE_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

function setDismissedBefore(ts: number) {
  localStorage.setItem(DISMISSED_BEFORE_KEY, String(ts));
}

function filterDismissed(notifications: InAppNotification[]): InAppNotification[] {
  const cutoff = getDismissedBefore();
  if (!cutoff) return notifications;
  return notifications.filter((n) => new Date(n.created_at).getTime() > cutoff);
}

export function useInAppNotifications() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => isNotificationSoundEnabled());
  const eventSourceRef = useRef<EventSource | null>(null);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      setNotificationSoundEnabled(next);
      return next;
    });
  }, []);

  // Fetch initial notifications via REST API (No audio trigger here)
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<{ data: InAppNotification[] }>('/notifications');
      if (res?.data) {
        const filtered = filterDismissed(res.data);
        setNotifications(filtered);
        setUnreadCount(filtered.filter((n: InAppNotification) => !n.is_read).length);
      }
    } catch (e) {
      console.warn('Error fetching notifications via REST:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect to Server-Sent Events (SSE) stream for live in-app notifications
  useEffect(() => {
    loadNotifications();

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const streamUrl = `${apiBaseUrl}/notifications/stream`;

    let eventSource: EventSource | null = null;

    const handleNotification = (event: MessageEvent) => {
      try {
        const newNotif = JSON.parse(event.data) as InAppNotification;
        // Only add if created after the last clearAll timestamp
        const cutoff = getDismissedBefore();
        if (cutoff && new Date(newNotif.created_at).getTime() <= cutoff) return;

        setNotifications((prev) => {
          // Check for duplicate ID
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        if (!newNotif.is_read) {
          setUnreadCount((count) => count + 1);
        }

        // Trigger audio alert only on newly delivered live push events
        playAlertSound(newNotif.severity);
      } catch (parseErr) {
        console.warn('Error parsing incoming SSE notification:', parseErr);
      }
    };

    const handleSecuritySync = (event: MessageEvent) => {
      try {
        const secEvent = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('guruom:security_sync', { detail: secEvent }));
      } catch (err) {
        console.warn('Error processing security sync event:', err);
      }
    };

    const handleNotificationsCleared = () => {
      setDismissedBefore(Date.now());
      setNotifications([]);
      setUnreadCount(0);
    };

    try {
      eventSource = new EventSource(streamUrl, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('notification', handleNotification);
      eventSource.addEventListener('notifications_cleared', handleNotificationsCleared);
      eventSource.addEventListener('user_security_sync', handleSecuritySync);

      eventSource.onerror = (err) => {
        console.warn('Notifications SSE connection state changed:', err);
      };
    } catch (sseErr) {
      console.warn('Could not establish SSE connection for notifications:', sseErr);
    }

    return () => {
      if (eventSource) {
        eventSource.removeEventListener('notification', handleNotification);
        eventSource.removeEventListener('notifications_cleared', handleNotificationsCleared);
        eventSource.removeEventListener('user_security_sync', handleSecuritySync);
        eventSource.close();
      }
    };
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.warn(`Error marking notification #${id} as read:`, err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await apiClient.post('/notifications/read-all');
    } catch (err) {
      console.warn('Error marking all notifications as read:', err);
    }
  };

  const clearAll = async () => {
    // Stamp the current time in localStorage so dismissed notifications
    // are filtered out on every future load, even after a server restart.
    const now = Date.now();
    setDismissedBefore(now);

    setNotifications([]);
    setUnreadCount(0);

    try {
      await apiClient.delete('/notifications/clear-all');
    } catch (err) {
      console.warn('Error clearing all notifications:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    isSoundEnabled,
    toggleSound,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh: loadNotifications
  };
}

export default useInAppNotifications;
