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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load initial notifications
  const loadNotifications = useCallback(async (page: number = 1) => {
    if (!user) {
      console.log('No user, skipping notification load'); // Debug log
      return;
    }

    console.log('Loading notifications for user:', user.id, 'page:', page); // Debug log
    setIsLoading(true);
    try {
      const response = await notificationService.getUserNotifications(page, 20);
      console.log('Received notifications response:', response); // Debug log
      
      if (page === 1) {
        setNotifications(response.notifications);
        console.log('Set notifications (page 1):', response.notifications.length); // Debug log
      } else {
        setNotifications(prev => [...prev, ...response.notifications]);
        console.log('Added notifications (page', page, '):', response.notifications.length); // Debug log
      }
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
      // Mark initial load as complete after first successful load
      if (page === 1) {
        setIsInitialLoad(false);
        console.log('Initial load completed'); // Debug log
      }
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
      setIsInitialLoad(true);
      return;
    }

    // Load initial notifications
    loadNotifications();

    // Set up real-time listeners using user.id (backend user ID)
    const cleanup = notificationService.setupRealtimeListener(
      user.id,
      (notification: Notification) => {
        console.log('Received real-time notification:', notification); // Debug log
        
        // Add new notification to the list
        setNotifications(prev => {
          // Check if notification already exists
          const exists = prev.some(n => n.id === notification.id);
          if (!exists) {
            console.log('Adding new notification to list:', notification.title); // Debug log
            
            // Only show push notifications for truly new notifications (not during initial load)
            if (!isInitialLoad) {
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
                    window.location.href = notification.actionUrl || '/dashboard';
                  },
                },
                duration: notification.isHighPriority ? 10000 : 5000,
              });
            }

            // Always add to the notifications list (for dropdown display)
            return [notification, ...prev];
          }
          return prev;
        });
      },
      (count: number) => {
        console.log('Unread count updated:', count); // Debug log
        setUnreadCount(count);
      }
    );

    // Update permission status
    setPermissionStatus(notificationService.getNotificationPermission());

    return cleanup;
  }, [user, loadNotifications, isInitialLoad]);

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
    // Return safe defaults instead of throwing error during development
    return {
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      loadNotifications: async () => {},
      requestPermission: async () => false,
      permissionStatus: null,
    };
  }
  return context;
} 