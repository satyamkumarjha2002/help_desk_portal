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
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';

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
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.getUserNotifications(req.user.id, page, limit);
  }

  /**
   * Mark notification as read
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    await this.notificationsService.markAsRead(id, req.user.id);
  }

  /**
   * Mark all notifications as read
   * PATCH /notifications/mark-all-read
   */
  @Patch('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@Request() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
  }
} 