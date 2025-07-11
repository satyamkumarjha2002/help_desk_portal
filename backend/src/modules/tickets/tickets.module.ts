import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from '../../entities/ticket.entity';
import { TicketComment } from '../../entities/ticket-comment.entity';
import { User } from '../../entities/user.entity';
import { Priority } from '../../entities/priority.entity';
import { Category } from '../../entities/category.entity';
import { Department } from '../../entities/department.entity';
import { Attachment } from '../../entities/attachment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { FaqModule } from '../faq/faq.module';
import { OpenAIService } from '../faq/services/openai.service';

/**
 * Tickets Module
 * 
 * Provides ticket management functionality including CRUD operations,
 * assignment, commenting, and notification integration.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket, 
      TicketComment, 
      User, 
      Priority, 
      Category, 
      Department,
      Attachment,
    ]),
    NotificationsModule,
    forwardRef(() => FaqModule),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, OpenAIService],
  exports: [TicketsService],
})
export class TicketsModule {} 