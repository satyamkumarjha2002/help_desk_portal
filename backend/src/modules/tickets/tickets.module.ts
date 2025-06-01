import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from '../../entities/ticket.entity';
import { TicketComment } from '../../entities/ticket-comment.entity';
import { User } from '../../entities/user.entity';

/**
 * Tickets Module
 * 
 * Provides ticket management functionality including CRUD operations,
 * assignment, comments, and status management.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketComment, User]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {} 