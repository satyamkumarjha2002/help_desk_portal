import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Ticket } from '../../entities/ticket.entity';
import { FirebaseConfig } from '../../config/firebase.config';

/**
 * Notifications Service
 * 
 * Handles notification creation, delivery, and management.
 * Uses PostgreSQL for persistence and Firebase Realtime Database for real-time delivery.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create and send a notification
   * 
   * @param userId - Target user ID
   * @param type - Notification type
   * @param title - Notification title
   * @param message - Notification message
   * @param data - Additional data payload
   * @returns Created notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {}
  ): Promise<Notification> {
    try {
      // Create notification in PostgreSQL
      const notification = this.notificationRepository.create({
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Send real-time notification via Firebase
      const firebasePath = await this.sendRealtimeNotification(savedNotification);

      // Update notification with Firebase path
      savedNotification.firebasePath = firebasePath;
      await this.notificationRepository.save(savedNotification);

      this.logger.log(`Notification created and sent to user ${userId}: ${type}`);
      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send real-time notification via Firebase Realtime Database
   * 
   * @param notification - Notification to send
   * @returns Firebase path where notification was stored
   */
  private async sendRealtimeNotification(notification: Notification): Promise<string> {
    try {
      const database = FirebaseConfig.getDatabase();
      const notificationPath = `notifications/${notification.userId}/${notification.id}`;

      const notificationData = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        actionUrl: notification.getActionUrl(),
        icon: notification.getIcon(),
        color: notification.getColor(),
        isHighPriority: notification.isHighPriority(),
      };

      await database.ref(notificationPath).set(notificationData);

      // Also update user's notification count
      await this.updateUserNotificationCount(notification.userId);

      return notificationPath;
    } catch (error) {
      this.logger.error('Failed to send real-time notification:', error);
      throw error;
    }
  }

  /**
   * Update user's unread notification count in Firebase
   * 
   * @param userId - User ID
   */
  private async updateUserNotificationCount(userId: string): Promise<void> {
    try {
      const unreadCount = await this.notificationRepository.count({
        where: { userId, isRead: false },
      });

      const database = FirebaseConfig.getDatabase();
      await database.ref(`userPresence/${userId}/unreadNotifications`).set(unreadCount);
    } catch (error) {
      this.logger.error(`Failed to update notification count for user ${userId}:`, error);
    }
  }

  /**
   * Mark notification as read
   * 
   * @param notificationId - Notification ID
   * @param userId - User ID (for authorization)
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        return; // Notification not found or not owned by user
      }

      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        await this.notificationRepository.save(notification);

        // Update Firebase
        if (notification.firebasePath) {
          const database = FirebaseConfig.getDatabase();
          await database.ref(`${notification.firebasePath}/isRead`).set(true);
        }

        // Update notification count
        await this.updateUserNotificationCount(userId);
      }
    } catch (error) {
      this.logger.error(`Failed to mark notification as read:`, error);
    }
  }

  /**
   * Mark all notifications as read for a user
   * 
   * @param userId - User ID
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.notificationRepository.update(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      // Update Firebase - mark all as read
      const database = FirebaseConfig.getDatabase();
      const notificationsRef = database.ref(`notifications/${userId}`);
      
      const snapshot = await notificationsRef.once('value');
      if (snapshot.exists()) {
        const updates: Record<string, any> = {};
        snapshot.forEach((child) => {
          updates[`${child.key}/isRead`] = true;
        });
        await notificationsRef.update(updates);
      }

      // Update notification count
      await this.updateUserNotificationCount(userId);
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read for user ${userId}:`, error);
    }
  }

  /**
   * Get user notifications with pagination
   * 
   * @param userId - User ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated notifications
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  /**
   * Delete old notifications (cleanup job)
   * 
   * @param olderThanDays - Delete notifications older than this many days
   */
  async deleteOldNotifications(olderThanDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const oldNotifications = await this.notificationRepository.find({
        where: {
          createdAt: cutoffDate,
        },
        select: ['id', 'firebasePath', 'userId'],
      });

      // Delete from Firebase first
      const database = FirebaseConfig.getDatabase();
      for (const notification of oldNotifications) {
        if (notification.firebasePath) {
          await database.ref(notification.firebasePath).remove();
        }
      }

      // Delete from PostgreSQL
      await this.notificationRepository.delete({
        createdAt: cutoffDate,
      });

      this.logger.log(`Deleted ${oldNotifications.length} old notifications`);
    } catch (error) {
      this.logger.error('Failed to delete old notifications:', error);
    }
  }

  // Convenience methods for common notification types

  /**
   * Send ticket assigned notification
   */
  async notifyTicketAssigned(ticket: Ticket, assignee: User, assignedBy: User): Promise<void> {
    await this.createNotification(
      assignee.id,
      NotificationType.TICKET_ASSIGNED,
      'New Ticket Assigned',
      `You have been assigned ticket ${ticket.ticketNumber}: ${ticket.title}`,
      {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        assignedBy: assignedBy.displayName,
      }
    );
  }

  /**
   * Send ticket updated notification
   */
  async notifyTicketUpdated(ticket: Ticket, targetUsers: User[], updatedBy: User): Promise<void> {
    const promises = targetUsers.map(user =>
      this.createNotification(
        user.id,
        NotificationType.TICKET_UPDATED,
        'Ticket Updated',
        `Ticket ${ticket.ticketNumber} has been updated by ${updatedBy.displayName}`,
        {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          updatedBy: updatedBy.displayName,
        }
      )
    );

    await Promise.all(promises);
  }

  /**
   * Send ticket commented notification
   */
  async notifyTicketCommented(
    ticket: Ticket, 
    targetUsers: User[], 
    commentedBy: User,
    commentPreview: string
  ): Promise<void> {
    const promises = targetUsers.map(user =>
      this.createNotification(
        user.id,
        NotificationType.TICKET_COMMENTED,
        'New Comment',
        `${commentedBy.displayName} commented on ticket ${ticket.ticketNumber}: ${commentPreview}`,
        {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          commentedBy: commentedBy.displayName,
        }
      )
    );

    await Promise.all(promises);
  }

  /**
   * Send SLA warning notification
   */
  async notifySLAWarning(ticket: Ticket, targetUsers: User[], timeRemaining: string): Promise<void> {
    const promises = targetUsers.map(user =>
      this.createNotification(
        user.id,
        NotificationType.SLA_WARNING,
        'SLA Warning',
        `Ticket ${ticket.ticketNumber} SLA will be breached in ${timeRemaining}`,
        {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          timeRemaining,
        }
      )
    );

    await Promise.all(promises);
  }

  /**
   * Send SLA breach notification
   */
  async notifySLABreach(ticket: Ticket, targetUsers: User[]): Promise<void> {
    const promises = targetUsers.map(user =>
      this.createNotification(
        user.id,
        NotificationType.SLA_BREACH,
        'SLA Breach Alert',
        `Ticket ${ticket.ticketNumber} has breached its SLA`,
        {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
        }
      )
    );

    await Promise.all(promises);
  }
} 