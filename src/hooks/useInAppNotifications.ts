import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, getAccessToken } from '../lib/apiClient';
import { InAppNotification } from '../services/notificationService';

export function useInAppNotifications() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial notifications via REST API
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<{ data: InAppNotification[] }>('/notifications');
      if (res?.data) {
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n: InAppNotification) => !n.is_read).length);
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

    const token = getAccessToken();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const streamUrl = `${apiBaseUrl}/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(streamUrl, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('notification', (event: MessageEvent) => {
        try {
          const newNotif = JSON.parse(event.data) as InAppNotification;
          setNotifications((prev) => [newNotif, ...prev]);
          if (!newNotif.is_read) {
            setUnreadCount((count) => count + 1);
          }
        } catch (parseErr) {
          console.warn('Error parsing incoming SSE notification:', parseErr);
        }
      });

      eventSource.onerror = (err) => {
        console.warn('Notifications SSE connection state changed:', err);
      };
    } catch (sseErr) {
      console.warn('Could not establish SSE connection for notifications:', sseErr);
    }

    return () => {
      if (eventSource) {
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

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications
  };
}
