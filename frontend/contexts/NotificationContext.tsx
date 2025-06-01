'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService, Notification } from '@/services/notificationService';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadNotifications: (page?: number) => Promise<void>;
  requestPermission: () => Promise<boolean>;
  permissionStatus: NotificationPermission | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);

  // Load initial notifications
  const loadNotifications = useCallback(async (page: number = 1) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await notificationService.getUserNotifications(page, 20);
      if (page === 1) {
        setNotifications(response.notifications);
      } else {
        setNotifications(prev => [...prev, ...response.notifications]);
      }
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestNotificationPermission();
    setPermissionStatus(notificationService.getNotificationPermission());
    return granted;
  }, []);

  // Set up real-time listeners when user is available
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Load initial notifications
    loadNotifications();

    // Set up real-time listeners using user.id (backend user ID)
    const cleanup = notificationService.setupRealtimeListener(
      user.id,
      (notification: Notification) => {
        // Add new notification to the list
        setNotifications(prev => {
          // Check if notification already exists
          const exists = prev.some(n => n.id === notification.id);
          if (!exists) {
            // Show browser notification if permission is granted
            if (notificationService.getNotificationPermission() === 'granted') {
              notificationService.showBrowserNotification(notification);
            }

            // Show in-app toast notification
            toast(notification.title, {
              description: notification.message,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = notification.actionUrl;
                },
              },
              duration: notification.isHighPriority ? 10000 : 5000,
            });

            return [notification, ...prev];
          }
          return prev;
        });
      },
      (count: number) => {
        setUnreadCount(count);
      }
    );

    // Update permission status
    setPermissionStatus(notificationService.getNotificationPermission());

    return cleanup;
  }, [user, loadNotifications]);

  // Request permission on first load if supported and not yet requested
  useEffect(() => {
    if (notificationService.isNotificationSupported()) {
      const currentPermission = notificationService.getNotificationPermission();
      setPermissionStatus(currentPermission);
      
      // Automatically request permission if it's the default (not yet asked)
      if (currentPermission === 'default') {
        requestPermission();
      }
    }
  }, [requestPermission]);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    loadNotifications,
    requestPermission,
    permissionStatus,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 