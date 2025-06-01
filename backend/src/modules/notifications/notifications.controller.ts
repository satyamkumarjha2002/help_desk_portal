import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  Post,
  Body,
  BadRequestException
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { NotificationsService } from './notifications.service';

/**
 * Notifications Controller
 * 
 * Handles all notification-related HTTP endpoints with proper authentication.
 */
@Controller('notifications')
@UseGuards(FirebaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get user notifications with pagination
   * GET /notifications
   */
  @Get()
  async getUserNotifications(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    try {
      const result = await this.notificationsService.getUserNotifications(
        req.user.uid,
        Number(page),
        Number(limit)
      );

      return {
        success: true,
        data: {
          notifications: result.notifications.map(notification => ({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
            actionUrl: notification.getActionUrl(),
            icon: notification.getIcon(),
            color: notification.getColor(),
            isHighPriority: notification.isHighPriority(),
          })),
          total: result.total,
          unreadCount: result.unreadCount,
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(limit)),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get notifications: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Request() req: any, @Param('id') notificationId: string) {
    try {
      await this.notificationsService.markAsRead(notificationId, req.user.uid);
      
      return {
        success: true,
        message: 'Notification marked as read',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /notifications/mark-all-read
   */
  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req: any) {
    try {
      await this.notificationsService.markAllAsRead(req.user.uid);
      
      return {
        success: true,
        message: 'All notifications marked as read',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  @Post('test')
  async testNotification(
    @Request() req: any,
    @Body() body: { title?: string; message?: string; type?: string }
  ) {
    try {
      const testNotification = await this.notificationsService.createNotification(
        req.user.uid,
        body.type as any || 'ticket_commented',
        body.title || 'Test Notification',
        body.message || 'This is a test notification to verify the system is working',
        {
          testData: true,
          timestamp: new Date().toISOString(),
          triggeredBy: req.user.uid,
        }
      );

      return {
        success: true,
        message: 'Test notification sent successfully',
        data: {
          id: testNotification.id,
          title: testNotification.title,
          message: testNotification.message,
          actionUrl: testNotification.getActionUrl(),
          createdAt: testNotification.createdAt,
        }
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send test notification: ${error.message}`);
    }
  }

  @Post('test-status-change')
  async testStatusChangeNotification(
    @Body() body: { ticketId?: string; oldStatus?: string; newStatus?: string },
    @Request() req: any
  ) {
    try {
      const ticketId = body.ticketId || 'test-ticket-id';
      const oldStatus = body.oldStatus || 'open';
      const newStatus = body.newStatus || 'resolved';

      // Create a mock ticket object for testing
      const mockTicket = {
        id: ticketId,
        ticketNumber: 'HD-2024-000001',
        title: 'Test Ticket for Status Change',
        status: newStatus,
        departmentId: req.user.departmentId || 'test-dept',
        requester: { id: req.user.uid, displayName: req.user.displayName },
        assignee: null,
      };

      // Send test notification to the current user
      await this.notificationsService.notifyTicketStatusChanged(
        mockTicket as any,
        oldStatus,
        newStatus,
        [req.user],
        req.user
      );

      return {
        success: true,
        message: `Test status change notification sent: ${oldStatus} -> ${newStatus}`,
        data: {
          ticketId,
          oldStatus,
          newStatus,
          recipient: req.user.email
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send test status change notification',
        error: error.message
      };
    }
  }

  @Get('debug/status')
  async getSystemStatus(@Request() req: any) {
    try {
      const userNotifications = await this.notificationsService.getUserNotifications(req.user.uid, 1, 1);
      
      return {
        success: true,
        data: {
          userId: req.user.uid,
          totalNotifications: userNotifications.total,
          unreadCount: userNotifications.unreadCount,
          systemHealthy: true,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          userId: req.user.uid,
          systemHealthy: false,
          timestamp: new Date().toISOString(),
        }
      };
    }
  }
} 