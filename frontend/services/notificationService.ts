import api from '@/lib/api';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, Database } from 'firebase/database';

// Firebase configuration (you'll need to update these values)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  actionUrl: string;
  icon: string;
  color: string;
  isHighPriority: boolean;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export const notificationService = {
  // Get user notifications with pagination
  async getUserNotifications(page: number = 1, limit: number = 20): Promise<NotificationResponse> {
    const response = await api.get('/notifications', {
      params: { page, limit }
    });
    
    // Handle the new backend response format
    if (response.data.success && response.data.data) {
      return {
        notifications: response.data.data.notifications || [],
        total: response.data.data.total || 0,
        unreadCount: response.data.data.unreadCount || 0,
      };
    }
    
    // Fallback for older format
    return response.data;
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/mark-all-read');
  },

  // Set up real-time notification listener
  setupRealtimeListener(
    userId: string,
    onNotification: (notification: Notification) => void,
    onUnreadCountChange: (count: number) => void
  ): () => void {
    // Listen for new notifications
    const notificationsRef = ref(database, `notifications/${userId}`);
    const unreadCountRef = ref(database, `userPresence/${userId}/unreadNotifications`);

    // Track the timestamp when listener was established to avoid showing old notifications
    const listenerStartTime = Date.now();
    let isInitialLoad = true;
    let processedNotificationIds = new Set<string>();

    const handleNotifications = (snapshot: any) => {
      if (snapshot.exists()) {
        const notifications = snapshot.val();
        const notificationIds = Object.keys(notifications);
        
        if (notificationIds.length > 0) {
          // Sort by creation time to get the newest notifications first
          const sortedNotifications = notificationIds
            .map(id => ({ id, ...notifications[id] }))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

          // On initial load, just record existing notification IDs without showing them
          if (isInitialLoad) {
            sortedNotifications.forEach(notification => {
              processedNotificationIds.add(notification.id);
            });
            isInitialLoad = false;
            return;
          }

          // Process new notifications (not seen before and created after listener start)
          for (const notification of sortedNotifications) {
            // Skip if we've already processed this notification
            if (processedNotificationIds.has(notification.id)) {
              continue;
            }

            // Check if this notification was created after the listener was established
            const notificationTime = new Date(notification.createdAt || 0).getTime();
            if (notificationTime >= listenerStartTime) {
              // Mark as processed
              processedNotificationIds.add(notification.id);

              // Ensure notification has required fields with fallbacks
              const safeNotification: Notification = {
                id: notification.id,
                type: notification.type || 'unknown',
                title: notification.title || 'Notification',
                message: notification.message || 'You have a new notification',
                data: notification.data || {},
                isRead: notification.isRead || false,
                createdAt: notification.createdAt || new Date().toISOString(),
                actionUrl: notification.actionUrl || '/dashboard',
                icon: notification.icon || 'bell',
                color: notification.color || 'gray',
                isHighPriority: notification.isHighPriority || false,
              };
              
              // Only trigger the callback for truly new notifications
              onNotification(safeNotification);
            } else {
              // Mark older notifications as processed to avoid future processing
              processedNotificationIds.add(notification.id);
            }
          }
        }
      } else if (!isInitialLoad) {
        // If no notifications exist and it's not initial load, it means notifications were cleared
        processedNotificationIds.clear();
      }
      
      // Always mark initial load as complete if we've processed the snapshot
      if (isInitialLoad) {
        isInitialLoad = false;
      }
    };

    const handleUnreadCount = (snapshot: any) => {
      const count = snapshot.exists() ? snapshot.val() : 0;
      onUnreadCountChange(count);
    };

    onValue(notificationsRef, handleNotifications);
    onValue(unreadCountRef, handleUnreadCount);

    // Return cleanup function
    return () => {
      off(notificationsRef, 'value', handleNotifications);
      off(unreadCountRef, 'value', handleUnreadCount);
    };
  },

  // Get real-time database instance (for advanced usage)
  getDatabase(): Database {
    return database;
  },

  // Helper to show browser notification
  async showBrowserNotification(notification: Notification): Promise<void> {
    // Check if notifications are supported and permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        data: {
          actionUrl: notification.actionUrl || '/dashboard',
          notificationId: notification.id,
        },
        requireInteraction: notification.isHighPriority,
      });

      browserNotification.onclick = () => {
        window.focus();
        window.location.href = notification.actionUrl || '/dashboard';
        browserNotification.close();
      };

      // Auto close after 5 seconds for non-high priority notifications
      if (!notification.isHighPriority) {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }
    }
  },

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },

  // Check if notifications are supported
  isNotificationSupported(): boolean {
    return 'Notification' in window;
  },

  // Get current notification permission status
  getNotificationPermission(): NotificationPermission | null {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return null;
  },
}; 