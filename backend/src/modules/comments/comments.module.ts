import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { TicketComment } from '../../entities/ticket-comment.entity';
import { Ticket } from '../../entities/ticket.entity';
import { User } from '../../entities/user.entity';
import { Attachment } from '../../entities/attachment.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketComment, Ticket, User, Attachment]),
    NotificationsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {} 