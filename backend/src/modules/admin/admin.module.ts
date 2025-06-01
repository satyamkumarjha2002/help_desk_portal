import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Ticket } from '../../entities/ticket.entity';
import { User } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { TicketComment } from '../../entities/ticket-comment.entity';
import { Priority } from '../../entities/priority.entity';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Admin Module
 * 
 * Provides comprehensive administrative functionality for department
 * management, ticket operations, analytics, and team coordination.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      User,
      Department,
      TicketComment,
      Priority,
    ]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {} 