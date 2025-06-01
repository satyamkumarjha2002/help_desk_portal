import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, In } from 'typeorm';
import { Ticket, TicketStatus } from '../../entities/ticket.entity';
import { TicketComment } from '../../entities/ticket-comment.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateTicketDto, UpdateTicketDto, AddCommentDto, AssignTicketDto } from './dto';

/**
 * Tickets Service
 * 
 * Handles all ticket-related operations including CRUD, assignment,
 * comments, and status management with proper authorization.
 */
@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private readonly commentRepository: Repository<TicketComment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create a new ticket
   * 
   * @param createTicketDto - Ticket creation data
   * @param currentUser - User creating the ticket
   * @returns Created ticket
   */
  async createTicket(createTicketDto: CreateTicketDto, currentUser: User): Promise<Ticket> {
    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      requesterId: currentUser.id,
      createdById: currentUser.id,
      status: TicketStatus.OPEN,
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    
    // Load relations for response
    return this.getTicketById(savedTicket.id, currentUser);
  }

  /**
   * Get tickets with filtering and pagination
   * 
   * @param currentUser - Current user
   * @param options - Query options
   * @returns Paginated tickets
   */
  async getTickets(
    currentUser: User,
    options: {
      page?: number;
      limit?: number;
      status?: TicketStatus;
      assigneeId?: string;
      departmentId?: string;
      search?: string;
      tags?: string[];
    } = {}
  ): Promise<{ tickets: Ticket[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, status, assigneeId, departmentId, search, tags } = options;
    
    const queryBuilder = this.ticketRepository.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.priority', 'priority')
      .leftJoinAndSelect('ticket.category', 'category')
      .leftJoinAndSelect('ticket.department', 'department')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy');

    // Apply role-based filtering
    if (currentUser.role === UserRole.END_USER) {
      queryBuilder.where('ticket.requesterId = :userId', { userId: currentUser.id });
    } else if (currentUser.role === UserRole.AGENT) {
      queryBuilder.where(
        '(ticket.assigneeId = :userId OR ticket.assigneeId IS NULL)',
        { userId: currentUser.id }
      );
    }
    // Team leads, managers, admins can see all tickets

    // Apply filters
    if (status) {
      queryBuilder.andWhere('ticket.status = :status', { status });
    }

    if (assigneeId) {
      queryBuilder.andWhere('ticket.assigneeId = :assigneeId', { assigneeId });
    }

    if (departmentId) {
      queryBuilder.andWhere('ticket.departmentId = :departmentId', { departmentId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(ticket.title ILIKE :search OR ticket.description ILIKE :search OR ticket.ticketNumber ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('ticket.tags && :tags', { tags });
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Order by creation date (newest first)
    queryBuilder.orderBy('ticket.createdAt', 'DESC');

    const [tickets, total] = await queryBuilder.getManyAndCount();

    return {
      tickets,
      total,
      page,
      limit,
    };
  }

  /**
   * Get ticket by ID with authorization check
   * 
   * @param id - Ticket ID
   * @param currentUser - Current user
   * @returns Ticket with relations
   */
  async getTicketById(id: string, currentUser: User): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: [
        'requester',
        'assignee',
        'priority',
        'category',
        'department',
        'createdBy',
        'comments',
        'comments.user',
        'attachments'
      ],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check authorization
    this.checkTicketAccess(ticket, currentUser);

    return ticket;
  }

  /**
   * Update ticket
   * 
   * @param id - Ticket ID
   * @param updateTicketDto - Update data
   * @param currentUser - Current user
   * @returns Updated ticket
   */
  async updateTicket(id: string, updateTicketDto: UpdateTicketDto, currentUser: User): Promise<Ticket> {
    const ticket = await this.getTicketById(id, currentUser);

    // Check if user can update this ticket
    this.checkTicketUpdatePermission(ticket, currentUser);

    // Update ticket
    Object.assign(ticket, updateTicketDto);

    // Handle status changes
    if (updateTicketDto.status) {
      if (updateTicketDto.status === TicketStatus.CLOSED) {
        ticket.closedAt = new Date();
      } else if (ticket.closedAt) {
        // Clear closed date if reopening ticket
        ticket.closedAt = null;
      }
    }

    const updatedTicket = await this.ticketRepository.save(ticket);

    // Add audit comment for significant changes
    if (updateTicketDto.status || updateTicketDto.assigneeId) {
      await this.addSystemComment(ticket.id, currentUser, updateTicketDto);
    }

    return this.getTicketById(updatedTicket.id, currentUser);
  }

  /**
   * Assign ticket to user
   * 
   * @param id - Ticket ID
   * @param assignTicketDto - Assignment data
   * @param currentUser - Current user
   * @returns Updated ticket
   */
  async assignTicket(id: string, assignTicketDto: AssignTicketDto, currentUser: User): Promise<Ticket> {
    const ticket = await this.getTicketById(id, currentUser);

    // Check if user can assign tickets
    if (![UserRole.TEAM_LEAD, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You do not have permission to assign tickets');
    }

    // Verify assignee exists and is active
    const assignee = await this.userRepository.findOne({
      where: { id: assignTicketDto.assigneeId, isActive: true }
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found or inactive');
    }

    // Update assignment
    ticket.assigneeId = assignTicketDto.assigneeId;
    ticket.status = TicketStatus.IN_PROGRESS;

    await this.ticketRepository.save(ticket);

    // Add assignment comment
    if (assignTicketDto.comment) {
      await this.addComment(id, {
        content: assignTicketDto.comment,
        isInternal: false,
        metadata: { type: 'assignment', assigneeId: assignTicketDto.assigneeId }
      }, currentUser);
    }

    return this.getTicketById(id, currentUser);
  }

  /**
   * Add comment to ticket
   * 
   * @param ticketId - Ticket ID
   * @param addCommentDto - Comment data
   * @param currentUser - Current user
   * @returns Created comment
   */
  async addComment(ticketId: string, addCommentDto: AddCommentDto, currentUser: User): Promise<TicketComment> {
    const ticket = await this.getTicketById(ticketId, currentUser);

    const comment = this.commentRepository.create({
      ...addCommentDto,
      ticketId: ticket.id,
      userId: currentUser.id,
    });

    return await this.commentRepository.save(comment);
  }

  /**
   * Delete ticket (soft delete)
   * 
   * @param id - Ticket ID
   * @param currentUser - Current user
   */
  async deleteTicket(id: string, currentUser: User): Promise<void> {
    const ticket = await this.getTicketById(id, currentUser);

    // Only managers and above can delete tickets
    if (![UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You do not have permission to delete tickets');
    }

    await this.ticketRepository.softDelete(id);
  }

  /**
   * Get ticket statistics for dashboard
   * 
   * @param currentUser - Current user
   * @returns Ticket statistics
   */
  async getTicketStats(currentUser: User): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    overdue: number;
  }> {
    const queryBuilder = this.ticketRepository.createQueryBuilder('ticket');

    // Apply role-based filtering
    if (currentUser.role === UserRole.END_USER) {
      queryBuilder.where('ticket.requesterId = :userId', { userId: currentUser.id });
    } else if (currentUser.role === UserRole.AGENT) {
      queryBuilder.where('ticket.assigneeId = :userId', { userId: currentUser.id });
    }

    const [total, open, inProgress, resolved] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('ticket.status = :status', { status: TicketStatus.OPEN }).getCount(),
      queryBuilder.clone().andWhere('ticket.status = :status', { status: TicketStatus.IN_PROGRESS }).getCount(),
      queryBuilder.clone().andWhere('ticket.status = :status', { status: TicketStatus.RESOLVED }).getCount(),
    ]);

    // Count overdue tickets
    const overdue = await queryBuilder
      .clone()
      .andWhere('ticket.dueDate < :now', { now: new Date() })
      .andWhere('ticket.status NOT IN (:...closedStatuses)', { 
        closedStatuses: [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED] 
      })
      .getCount();

    return { total, open, inProgress, resolved, overdue };
  }

  /**
   * Check if user has access to ticket
   * 
   * @param ticket - Ticket entity
   * @param user - Current user
   */
  private checkTicketAccess(ticket: Ticket, user: User): void {
    if (user.role === UserRole.END_USER && ticket.requesterId !== user.id) {
      throw new ForbiddenException('You can only access your own tickets');
    }

    if (user.role === UserRole.AGENT && 
        ticket.assigneeId !== user.id && 
        ticket.requesterId !== user.id) {
      throw new ForbiddenException('You can only access tickets assigned to you or created by you');
    }
  }

  /**
   * Check if user can update ticket
   * 
   * @param ticket - Ticket entity
   * @param user - Current user
   */
  private checkTicketUpdatePermission(ticket: Ticket, user: User): void {
    if (user.role === UserRole.END_USER && ticket.requesterId !== user.id) {
      throw new ForbiddenException('You can only update your own tickets');
    }

    if (user.role === UserRole.AGENT && ticket.assigneeId !== user.id) {
      throw new ForbiddenException('You can only update tickets assigned to you');
    }
  }

  /**
   * Add system comment for audit trail
   * 
   * @param ticketId - Ticket ID
   * @param user - User making the change
   * @param changes - Changes made
   */
  private async addSystemComment(ticketId: string, user: User, changes: UpdateTicketDto): Promise<void> {
    let content = '';
    const metadata: Record<string, any> = { type: 'system_change' };

    if (changes.status) {
      content += `Status changed to ${changes.status}. `;
      metadata.statusChange = changes.status;
    }

    if (changes.assigneeId) {
      content += `Ticket assigned. `;
      metadata.assigneeChange = changes.assigneeId;
    }

    if (content) {
      await this.commentRepository.save({
        ticketId,
        userId: user.id,
        content: content.trim(),
        isInternal: true,
        metadata,
      });
    }
  }
} 