import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CreateTicketDto, UpdateTicketDto, AddCommentDto, AssignTicketDto } from './dto';
import { TicketStatus } from '../../entities/ticket.entity';

/**
 * Tickets Controller
 * 
 * Handles all ticket-related HTTP endpoints with proper authentication
 * and authorization using Firebase Auth Guard.
 */
@Controller('tickets')
@UseGuards(FirebaseAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Create a new ticket
   * POST /tickets
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTicket(@Body() createTicketDto: CreateTicketDto, @Request() req: any) {
    return this.ticketsService.createTicket(createTicketDto, req.user);
  }

  /**
   * Get tickets with filtering and pagination
   * GET /tickets
   */
  @Get()
  async getTickets(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TicketStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
  ) {
    const options = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      assigneeId,
      departmentId,
      search,
      tags: tags ? tags.split(',') : undefined,
    };

    return this.ticketsService.getTickets(req.user, options);
  }

  /**
   * Get ticket by ID
   * GET /tickets/:id
   */
  @Get(':id')
  async getTicketById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.ticketsService.getTicketById(id, req.user);
  }

  /**
   * Update ticket
   * PATCH /tickets/:id
   */
  @Patch(':id')
  async updateTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Request() req: any,
  ) {
    return this.ticketsService.updateTicket(id, updateTicketDto, req.user);
  }

  /**
   * Delete ticket
   * DELETE /tickets/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTicket(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.ticketsService.deleteTicket(id, req.user);
  }

  /**
   * Assign ticket to user
   * POST /tickets/:id/assign
   */
  @Post(':id/assign')
  async assignTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignTicketDto: AssignTicketDto,
    @Request() req: any,
  ) {
    return this.ticketsService.assignTicket(id, assignTicketDto, req.user);
  }

  /**
   * Add comment to ticket
   * POST /tickets/:id/comments
   */
  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addCommentDto: AddCommentDto,
    @Request() req: any,
  ) {
    return this.ticketsService.addComment(id, addCommentDto, req.user);
  }

  /**
   * Get ticket statistics for dashboard
   * GET /tickets/stats
   */
  @Get('stats/dashboard')
  async getTicketStats(@Request() req: any) {
    return this.ticketsService.getTicketStats(req.user);
  }
} 