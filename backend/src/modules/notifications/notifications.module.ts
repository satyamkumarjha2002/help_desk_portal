import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';

/**
 * Notifications Module
 * 
 * Provides real-time notification functionality using PostgreSQL for persistence
 * and Firebase Realtime Database for real-time delivery.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {} 