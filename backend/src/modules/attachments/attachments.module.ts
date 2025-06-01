import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { Attachment } from '../../entities/attachment.entity';
import { Ticket } from '../../entities/ticket.entity';
import { TicketComment } from '../../entities/ticket-comment.entity';

/**
 * Attachments Module
 * 
 * Provides file upload and attachment management functionality
 * with Firebase Cloud Storage integration.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment, Ticket, TicketComment]),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {} 