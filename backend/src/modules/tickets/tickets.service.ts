import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, In } from 'typeorm';
import { Ticket, TicketStatus } from '../../entities/ticket.entity';
import { TicketComment, CommentType } from '../../entities/ticket-comment.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Priority } from '../../entities/priority.entity';
import { Category } from '../../entities/category.entity';
import { Department } from '../../entities/department.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { OpenAIService } from '../faq/services/openai.service';
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
    @InjectRepository(Priority)
    private readonly priorityRepository: Repository<Priority>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationsService: NotificationsService,
    private readonly openAIService: OpenAIService,
  ) {}

  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.ticketRepository.count();
    const paddedCount = (count + 1).toString().padStart(6, '0');
    return `HD-${year}-${paddedCount}`;
  }

  /**
   * Create a new ticket
   * 
   * @param createTicketDto - Ticket creation data
   * @param currentUser - User creating the ticket
   * @returns Created ticket
   */
  async createTicket(createTicketDto: CreateTicketDto, currentUser: User): Promise<Ticket> {
    // Check if we need AI classification for missing fields
    const needsClassification = !createTicketDto.departmentId || !createTicketDto.categoryId || !createTicketDto.priorityId;
    
    let departmentId = createTicketDto.departmentId;
    let categoryId = createTicketDto.categoryId;
    let priorityId = createTicketDto.priorityId;

    if (needsClassification && this.openAIService.isConfigured()) {
      try {
        // Get all active departments, categories, and priorities for AI classification
        const [departments, categories, priorities] = await Promise.all([
          this.departmentRepository.find({ 
            where: { isActive: true },
            select: ['id', 'name', 'description']
          }),
          this.categoryRepository.find({ 
            where: { isActive: true },
            relations: ['department'],
            select: ['id', 'name', 'description', 'departmentId']
          }),
          this.priorityRepository.find({
            select: ['id', 'name', 'level']
          })
        ]);

        // Prepare data for AI classification
        const classificationRequest = {
          title: createTicketDto.title,
          description: createTicketDto.description,
          departments: departments.map(d => ({
            id: d.id,
            name: d.name,
            description: d.description
          })),
          categories: categories.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            departmentName: c.department?.name || 'Unknown'
          })),
          priorities: priorities.map(p => ({
            id: p.id,
            name: p.name,
            level: p.level
          }))
        };

        const classification = await this.openAIService.classifyTicketFields(classificationRequest);

        // Use AI classification results only for missing fields
        if (!departmentId && classification.departmentId) {
          departmentId = classification.departmentId;
        }
        if (!categoryId && classification.categoryId) {
          categoryId = classification.categoryId;
        }
        if (!priorityId && classification.priorityId) {
          priorityId = classification.priorityId;
        }

        // Log the AI classification for debugging
        console.log('AI Classification Result:', {
          originalFields: {
            departmentId: createTicketDto.departmentId,
            categoryId: createTicketDto.categoryId,
            priorityId: createTicketDto.priorityId
          },
          aiSuggestions: {
            departmentId: classification.departmentId,
            categoryId: classification.categoryId,
            priorityId: classification.priorityId
          },
          finalFields: { departmentId, categoryId, priorityId },
          confidence: classification.confidence,
          reasoning: classification.reasoning
        });

      } catch (error) {
        console.error('AI classification failed, proceeding without it:', error);
        // Continue with original values if AI classification fails
      }
    }

    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      departmentId,
      categoryId,
      priorityId,
      requesterId: currentUser.id,
      createdById: currentUser.id,
      status: TicketStatus.OPEN,
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    
    // Load relations for response
    const fullTicket = await this.getTicketById(savedTicket.id, currentUser);

    // Send notifications
    await this.sendTicketCreatedNotifications(fullTicket, currentUser);

    return fullTicket;
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
        '(ticket.assigneeId = :userId OR (ticket.assigneeId IS NULL AND ticket.departmentId = :departmentId))', 
        { userId: currentUser.id, departmentId: currentUser.departmentId }
      );
    } else if ([UserRole.TEAM_LEAD, UserRole.MANAGER].includes(currentUser.role)) {
      queryBuilder.where('ticket.departmentId = :departmentId', { departmentId: currentUser.departmentId });
    }
    // Super admins and system admins can see all tickets

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
        'comments.attachments',
        'comments.attachments.uploadedBy',
        'attachments',
        'attachments.uploadedBy'
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

    // Store old values for comparison
    const oldStatus = ticket.status;
    const oldAssigneeId = ticket.assigneeId;

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

    // Send notifications for status changes
    if (updateTicketDto.status && oldStatus !== updateTicketDto.status) {
      await this.sendTicketStatusChangeNotifications(ticket, oldStatus, updateTicketDto.status, currentUser);
    }

    // Send general update notifications for other changes
    if (updateTicketDto.assigneeId && oldAssigneeId !== updateTicketDto.assigneeId) {
      await this.sendTicketUpdatedNotifications(ticket, currentUser, oldStatus, oldAssigneeId);
    }

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
      where: { id: assignTicketDto.assigneeId, isActive: true },
      relations: ['department']
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found or inactive');
    }

    // For non-admin users, ensure assignee is from the same department as the ticket
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      if (assignee.departmentId !== ticket.departmentId) {
        throw new ForbiddenException(`Cannot assign ticket to user from different department. Ticket department: ${ticket.departmentId}, Assignee department: ${assignee.departmentId}`);
      }
    }

    // Store old values for notifications
    const oldStatus = ticket.status;
    const oldAssigneeId = ticket.assigneeId;

    // Update assignment
    ticket.assigneeId = assignTicketDto.assigneeId;
    ticket.status = TicketStatus.IN_PROGRESS;

    await this.ticketRepository.save(ticket);

    // Send assignment notification
    await this.notificationsService.notifyTicketAssigned(ticket, assignee, currentUser);

    // Send status change notification if status changed
    if (oldStatus !== TicketStatus.IN_PROGRESS) {
      await this.sendTicketStatusChangeNotifications(ticket, oldStatus, TicketStatus.IN_PROGRESS, currentUser);
    }

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
      content: addCommentDto.content,
      isInternal: addCommentDto.isInternal || false,
      commentType: addCommentDto.type || CommentType.COMMENT,
      metadata: addCommentDto.metadata || {},
      ticketId: ticket.id,
      userId: currentUser.id,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Load comment with all relations including attachments
    const fullComment = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user', 'attachments', 'attachments.uploadedBy'],
    });

    // Send comment notifications (only for regular comments, not system-generated ones)
    if (addCommentDto.type === CommentType.COMMENT) {
      await this.sendCommentNotifications(ticket, fullComment!, currentUser);
    }

    return fullComment!;
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
    // Super admins and system admins have access to all tickets
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role)) {
      return;
    }

    // Managers and team leads can access tickets in their department
    if ([UserRole.MANAGER, UserRole.TEAM_LEAD].includes(user.role)) {
      if (user.departmentId !== ticket.departmentId) {
        throw new ForbiddenException(`You can only access tickets from your own department. Your department: ${user.departmentId}, Ticket department: ${ticket.departmentId}`);
      }
      return;
    }

    // Agents can access tickets in their department that are assigned to them, requested by them, or created by them
    if (user.role === UserRole.AGENT) {
      if (user.departmentId !== ticket.departmentId) {
        throw new ForbiddenException('You can only access tickets from your own department');
      }
      if (ticket.assigneeId !== user.id && ticket.requesterId !== user.id && ticket.createdBy?.id !== user.id) {
        throw new ForbiddenException('You can only access tickets assigned to you, requested by you, or created by you');
      }
      return;
    }

    // End users can only access their own tickets or tickets they created
    if (user.role === UserRole.END_USER) {
      if (ticket.requesterId !== user.id && ticket.createdBy?.id !== user.id) {
        throw new ForbiddenException('You can only access your own tickets or tickets you created');
      }
      return;
    }

    throw new ForbiddenException('You do not have access to this ticket');
  }

  /**
   * Check if user can update ticket
   * 
   * @param ticket - Ticket entity
   * @param user - Current user
   */
  private checkTicketUpdatePermission(ticket: Ticket, user: User): void {
    // Super admins and system admins can update all tickets
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role)) {
      return;
    }

    // Managers and team leads can update tickets in their department
    if ([UserRole.MANAGER, UserRole.TEAM_LEAD].includes(user.role)) {
      if (user.departmentId !== ticket.departmentId) {
        throw new ForbiddenException(`You can only update tickets from your own department. Your department: ${user.departmentId}, Ticket department: ${ticket.departmentId}`);
      }
      return;
    }

    // Agents can update tickets in their department that are assigned to them OR created by them
    if (user.role === UserRole.AGENT) {
      if (user.departmentId !== ticket.departmentId) {
        throw new ForbiddenException('You can only update tickets from your own department');
      }
      if (ticket.assigneeId !== user.id && ticket.createdBy?.id !== user.id) {
        throw new ForbiddenException('You can only update tickets assigned to you or created by you');
      }
      return;
    }

    // End users can update their own tickets (if not closed/resolved) OR tickets they created
    if (user.role === UserRole.END_USER) {
      // Allow if user is the requester OR the creator of the ticket
      if (ticket.requesterId !== user.id && ticket.createdBy?.id !== user.id) {
        throw new ForbiddenException('You can only update your own tickets or tickets you created');
      }
      if ([TicketStatus.CLOSED, TicketStatus.RESOLVED].includes(ticket.status)) {
        throw new ForbiddenException('You cannot update closed or resolved tickets');
      }
      return;
    }

    throw new ForbiddenException('You do not have permission to update this ticket');
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
        commentType: CommentType.STATUS_CHANGE,
        metadata,
      });
    }
  }

  // Notification helper methods

  /**
   * Send notifications when a ticket is created
   */
  private async sendTicketCreatedNotifications(ticket: Ticket, creator: User): Promise<void> {
    try {
      // Get department managers and team leads
      const managers = await this.userRepository.find({
        where: [
          { role: UserRole.MANAGER, departmentId: ticket.departmentId },
          { role: UserRole.TEAM_LEAD, departmentId: ticket.departmentId },
          { role: UserRole.ADMIN },
          { role: UserRole.SUPER_ADMIN }
        ]
      });

      // Send notifications to managers and admins
      for (const manager of managers) {
        if (manager.id !== creator.id) {
          await this.notificationsService.createNotification(
            manager.id,
            'ticket_created' as any,
            'New Ticket Created',
            `A new ticket ${ticket.ticketNumber} has been created by ${creator.displayName}: ${ticket.title}`,
            {
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              createdBy: creator.displayName,
            }
          );
        }
      }
    } catch (error) {
      console.error('Failed to send ticket created notifications:', error);
    }
  }

  /**
   * Send notifications when a ticket is updated
   */
  private async sendTicketUpdatedNotifications(
    ticket: Ticket, 
    updater: User, 
    oldStatus?: TicketStatus,
    oldAssigneeId?: string
  ): Promise<void> {
    try {
      const notifyUsers: User[] = [];

      // Always notify the requester (if not the updater)
      if (ticket.requester && ticket.requester.id !== updater.id) {
        notifyUsers.push(ticket.requester);
      }

      // Notify the assignee (if exists and not the updater)
      if (ticket.assignee && ticket.assignee.id !== updater.id) {
        notifyUsers.push(ticket.assignee);
      }

      // Notify old assignee if assignment changed
      if (oldAssigneeId && oldAssigneeId !== ticket.assigneeId && oldAssigneeId !== updater.id) {
        const oldAssignee = await this.userRepository.findOne({ where: { id: oldAssigneeId } });
        if (oldAssignee) {
          notifyUsers.push(oldAssignee);
        }
      }

      // Send notifications
      if (notifyUsers.length > 0) {
        await this.notificationsService.notifyTicketUpdated(ticket, notifyUsers, updater);
      }
    } catch (error) {
      console.error('Failed to send ticket updated notifications:', error);
    }
  }

  /**
   * Send notifications when a ticket status changes
   */
  private async sendTicketStatusChangeNotifications(
    ticket: Ticket, 
    oldStatus: TicketStatus, 
    newStatus: TicketStatus, 
    changedBy: User
  ): Promise<void> {
    try {
      const notifyUsers: User[] = [];

      // Always notify the requester (if not the one making the change)
      if (ticket.requester && ticket.requester.id !== changedBy.id) {
        notifyUsers.push(ticket.requester);
      }

      // Notify the assignee (if exists and not the one making the change)
      if (ticket.assignee && ticket.assignee.id !== changedBy.id) {
        notifyUsers.push(ticket.assignee);
      }

      // For critical status changes, also notify department managers and team leads
      if ([TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED].includes(newStatus)) {
        const departmentLeaders = await this.userRepository.find({
          where: [
            { role: UserRole.MANAGER, departmentId: ticket.departmentId },
            { role: UserRole.TEAM_LEAD, departmentId: ticket.departmentId },
          ]
        });

        for (const leader of departmentLeaders) {
          if (leader.id !== changedBy.id && !notifyUsers.some(u => u.id === leader.id)) {
            notifyUsers.push(leader);
          }
        }
      }

      // Send notifications
      if (notifyUsers.length > 0) {
        await this.notificationsService.notifyTicketStatusChanged(
          ticket, 
          oldStatus, 
          newStatus, 
          notifyUsers, 
          changedBy
        );
      }
    } catch (error) {
      console.error('Failed to send ticket status change notifications:', error);
    }
  }

  /**
   * Send notifications when a comment is added
   */
  private async sendCommentNotifications(ticket: Ticket, comment: TicketComment, commenter: User): Promise<void> {
    try {
      // Use the enhanced notification logic
      await this.notificationsService.notifyTicketCommentedEnhanced(ticket, comment, commenter);
    } catch (error) {
      console.error('Failed to send comment notifications:', error);
    }
  }
} 