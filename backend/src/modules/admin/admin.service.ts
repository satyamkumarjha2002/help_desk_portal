import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { Ticket, TicketStatus } from '../../entities/ticket.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { TicketComment, CommentType } from '../../entities/ticket-comment.entity';
import { Priority } from '../../entities/priority.entity';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Admin Service
 * 
 * Provides comprehensive administrative functionality for department
 * management, ticket operations, analytics, and team coordination.
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(TicketComment)
    private readonly commentRepository: Repository<TicketComment>,
    @InjectRepository(Priority)
    private readonly priorityRepository: Repository<Priority>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get department dashboard overview
   */
  async getDepartmentDashboard(departmentId: string, currentUser: User) {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
      relations: ['users'],
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Get ticket statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      recentTickets,
      urgentTickets,
      averageResponseTime,
    ] = await Promise.all([
      this.ticketRepository.count({ where: { departmentId } }),
      this.ticketRepository.count({ where: { departmentId, status: TicketStatus.OPEN } }),
      this.ticketRepository.count({ where: { departmentId, status: TicketStatus.IN_PROGRESS } }),
      this.ticketRepository.count({ where: { departmentId, status: TicketStatus.RESOLVED } }),
      this.ticketRepository.count({
        where: {
          departmentId,
          createdAt: Between(thirtyDaysAgo, now),
        },
      }),
      this.ticketRepository.find({
        where: {
          departmentId,
          status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
        },
        relations: ['priority'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.calculateAverageResponseTime(departmentId),
    ]);

    return {
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
        teamSize: department.users.length,
      },
      statistics: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        recentTickets,
        averageResponseTime,
      },
      urgentTickets,
      summary: {
        activeTickets: openTickets + inProgressTickets,
        completionRate: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0,
        workload: this.calculateWorkloadLevel(openTickets + inProgressTickets, department.users.length),
      },
    };
  }

  /**
   * Get department tickets with filtering
   */
  async getDepartmentTickets(
    departmentId: string,
    filters: {
      status?: TicketStatus;
      priority?: string;
      assignee?: string;
      search?: string;
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'ASC' | 'DESC';
    },
    currentUser: User,
  ) {
    const queryBuilder = this.ticketRepository.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.priority', 'priority')
      .leftJoinAndSelect('ticket.category', 'category')
      .leftJoinAndSelect('ticket.department', 'department')
      .where('ticket.departmentId = :departmentId', { departmentId });

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      queryBuilder.andWhere('priority.id = :priorityId', { priorityId: filters.priority });
    }

    if (filters.assignee) {
      if (filters.assignee === 'unassigned') {
        queryBuilder.andWhere('ticket.assigneeId IS NULL');
      } else {
        queryBuilder.andWhere('ticket.assigneeId = :assigneeId', { assigneeId: filters.assignee });
      }
    }

    // Apply search filter
    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(ticket.title) LIKE LOWER(:search) OR LOWER(ticket.description) LIKE LOWER(:search) OR LOWER(ticket.ticketNumber) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    // Apply sorting
    const sortField = this.validateSortField(filters.sortBy);
    queryBuilder.orderBy(`ticket.${sortField}`, filters.sortOrder);

    // Apply pagination
    const skip = (filters.page - 1) * filters.limit;
    queryBuilder.skip(skip).take(filters.limit);

    const [tickets, total] = await queryBuilder.getManyAndCount();

    return {
      tickets,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  /**
   * Bulk assign tickets
   */
  async bulkAssignTickets(
    ticketIds: string[],
    assigneeId: string,
    currentUser: User,
    reason?: string,
  ) {
    // Validate assignee exists and is active
    const assignee = await this.userRepository.findOne({
      where: { id: assigneeId, isActive: true },
      relations: ['department'],
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found or inactive');
    }

    // Get tickets and validate access
    const tickets = await this.ticketRepository.find({
      where: { id: In(ticketIds) },
      relations: ['department', 'assignee'],
    });

    if (tickets.length !== ticketIds.length) {
      throw new BadRequestException('Some tickets not found');
    }

    // Pre-validate department access for all tickets
    const departmentIds = [...new Set(tickets.map(ticket => ticket.departmentId))];
    for (const departmentId of departmentIds) {
      await this.validateDepartmentOperationAccess(departmentId, currentUser);
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
    };

    for (const ticket of tickets) {
      try {
        // Validate user has access to this specific ticket
        await this.validateTicketAccess(ticket, currentUser);

        // For managers/team leads, ensure assignee is from the same department
        if ([UserRole.MANAGER, UserRole.TEAM_LEAD].includes(currentUser.role)) {
          if (assignee.departmentId !== ticket.departmentId) {
            throw new ForbiddenException(`Cannot assign ticket to user from different department. Ticket department: ${ticket.departmentId}, Assignee department: ${assignee.departmentId}`);
          }
        }

        // Update ticket assignment
        ticket.assigneeId = assigneeId;
        ticket.updatedAt = new Date();

        await this.ticketRepository.save(ticket);

        // Add comment about assignment
        await this.commentRepository.save({
          ticketId: ticket.id,
          userId: currentUser.id,
          content: reason || `Ticket assigned to ${assignee.displayName}`,
          commentType: CommentType.ASSIGNMENT,
          isInternal: true,
          metadata: {
            previousAssignee: ticket.assignee?.id,
            newAssignee: assigneeId,
            assignedBy: currentUser.id,
          },
        });

        results.successCount++;
      } catch (error) {
        results.failureCount++;
        results.errors.push(`Ticket ${ticket.ticketNumber}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Bulk update ticket status
   */
  async bulkUpdateStatus(
    ticketIds: string[],
    status: TicketStatus,
    currentUser: User,
    reason?: string,
  ) {
    const tickets = await this.ticketRepository.find({
      where: { id: In(ticketIds) },
      relations: ['department'],
    });

    if (tickets.length !== ticketIds.length) {
      throw new BadRequestException('Some tickets not found');
    }

    // Pre-validate department access for all tickets
    const departmentIds = [...new Set(tickets.map(ticket => ticket.departmentId))];
    for (const departmentId of departmentIds) {
      await this.validateDepartmentOperationAccess(departmentId, currentUser);
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
    };

    for (const ticket of tickets) {
      try {
        await this.validateTicketAccess(ticket, currentUser);

        const oldStatus = ticket.status;
        ticket.status = status;
        ticket.updatedAt = new Date();

        if (status === TicketStatus.CLOSED || status === TicketStatus.RESOLVED) {
          ticket.closedAt = new Date();
        }

        await this.ticketRepository.save(ticket);

        // Send status change notifications
        await this.sendBulkStatusChangeNotifications(ticket, oldStatus, status, currentUser);

        // Add comment about status change
        await this.commentRepository.save({
          ticketId: ticket.id,
          userId: currentUser.id,
          content: reason || `Status changed from ${oldStatus} to ${status}`,
          commentType: CommentType.STATUS_CHANGE,
          isInternal: true,
          metadata: {
            previousStatus: oldStatus,
            newStatus: status,
            changedBy: currentUser.id,
          },
        });

        results.successCount++;
      } catch (error) {
        results.failureCount++;
        results.errors.push(`Ticket ${ticket.ticketNumber}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Transfer tickets between departments
   */
  async transferTickets(
    ticketIds: string[],
    targetDepartmentId: string,
    currentUser: User,
    reason: string,
    maintainAssignee: boolean = false,
  ) {
    // Validate target department
    const targetDepartment = await this.departmentRepository.findOne({
      where: { id: targetDepartmentId, isActive: true },
    });

    if (!targetDepartment) {
      throw new NotFoundException('Target department not found or inactive');
    }

    // Validate user has access to target department (only admins can transfer TO any department)
    if (![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('Only system administrators can transfer tickets between departments');
    }

    const tickets = await this.ticketRepository.find({
      where: { id: In(ticketIds) },
      relations: ['department', 'assignee'],
    });

    if (tickets.length !== ticketIds.length) {
      throw new BadRequestException('Some tickets not found');
    }

    // Pre-validate department access for all source tickets
    const sourceDepartmentIds = [...new Set(tickets.map(ticket => ticket.departmentId))];
    for (const departmentId of sourceDepartmentIds) {
      await this.validateDepartmentOperationAccess(departmentId, currentUser);
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
    };

    for (const ticket of tickets) {
      try {
        await this.validateTicketAccess(ticket, currentUser);

        const oldDepartment = ticket.department;
        ticket.departmentId = targetDepartmentId;
        ticket.updatedAt = new Date();

        // Clear assignee if not maintaining and assignee is not in target department
        if (!maintainAssignee || (ticket.assignee && ticket.assignee.departmentId !== targetDepartmentId)) {
          ticket.assigneeId = undefined as any;
        }

        await this.ticketRepository.save(ticket);

        // Add comment about transfer
        await this.commentRepository.save({
          ticketId: ticket.id,
          userId: currentUser.id,
          content: `Ticket transferred from ${oldDepartment.name} to ${targetDepartment.name}. Reason: ${reason}`,
          commentType: CommentType.ASSIGNMENT,
          isInternal: true,
          metadata: {
            previousDepartment: oldDepartment.id,
            newDepartment: targetDepartmentId,
            transferredBy: currentUser.id,
            reason,
          },
        });

        results.successCount++;
      } catch (error) {
        results.failureCount++;
        results.errors.push(`Ticket ${ticket.ticketNumber}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get department team members
   */
  async getDepartmentTeam(departmentId: string, currentUser: User) {
    const users = await this.userRepository.find({
      where: { 
        departmentId, 
        isActive: true,
        role: In([UserRole.AGENT, UserRole.TEAM_LEAD, UserRole.MANAGER])
      },
      select: ['id', 'displayName', 'email', 'role', 'createdAt'],
      order: { role: 'DESC', displayName: 'ASC' },
    });

    // Get ticket counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [assignedTickets, activeTickets] = await Promise.all([
          this.ticketRepository.count({ where: { assigneeId: user.id } }),
          this.ticketRepository.count({
            where: {
              assigneeId: user.id,
              status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
            },
          }),
        ]);

        return {
          ...user,
          statistics: {
            assignedTickets,
            activeTickets,
            workloadLevel: this.getWorkloadLevel(activeTickets),
          },
        };
      }),
    );

    return usersWithStats;
  }

  /**
   * Get team workload statistics
   */
  async getTeamWorkload(departmentId: string, currentUser: User) {
    const team = await this.getDepartmentTeam(departmentId, currentUser);
    
    const workloadDistribution = team.map(member => ({
      userId: member.id,
      displayName: member.displayName,
      role: member.role,
      activeTickets: member.statistics.activeTickets,
      workloadLevel: member.statistics.workloadLevel,
    }));

    const totalActiveTickets = team.reduce((sum, member) => sum + member.statistics.activeTickets, 0);
    const averageWorkload = team.length > 0 ? totalActiveTickets / team.length : 0;

    return {
      teamSize: team.length,
      totalActiveTickets,
      averageWorkload,
      workloadDistribution,
      overloadedMembers: workloadDistribution.filter(m => m.workloadLevel === 'High'),
    };
  }

  /**
   * Get department analytics
   */
  async getDepartmentAnalytics(departmentId: string, period: string, currentUser: User) {
    const { startDate, endDate } = this.parsePeriod(period);

    const tickets = await this.ticketRepository.find({
      where: {
        departmentId,
        createdAt: Between(startDate, endDate),
      },
      relations: ['priority', 'category', 'assignee'],
    });

    // Calculate various metrics
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === TicketStatus.RESOLVED).length;
    const closedTickets = tickets.filter(t => t.status === TicketStatus.CLOSED).length;
    
    const completionRate = totalTickets > 0 ? ((resolvedTickets + closedTickets) / totalTickets) * 100 : 0;

    // Group by status
    const statusDistribution = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by priority
    const priorityDistribution = tickets.reduce((acc, ticket) => {
      const priority = ticket.priority?.name || 'Unknown';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily ticket creation trend
    const dailyTrend = this.calculateDailyTrend(tickets, startDate, endDate);

    return {
      period: { startDate, endDate },
      summary: {
        totalTickets,
        resolvedTickets,
        closedTickets,
        completionRate,
      },
      distributions: {
        status: statusDistribution,
        priority: priorityDistribution,
      },
      trends: {
        daily: dailyTrend,
      },
    };
  }

  /**
   * Escalate ticket
   */
  async escalateTicket(
    ticketId: string,
    currentUser: User,
    reason: string,
    escalateTo?: string,
    priority?: string,
  ) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['department', 'priority', 'assignee'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.validateTicketAccess(ticket, currentUser);

    // Update priority if specified
    if (priority) {
      const priorityObj = await this.priorityRepository.findOne({ where: { id: priority } });
      if (priorityObj) {
        ticket.priorityId = priority;
      }
    }

    // Handle escalation target
    let escalatedTo = 'Team Lead';
    if (escalateTo) {
      const targetUser = await this.userRepository.findOne({ where: { id: escalateTo } });
      if (targetUser) {
        ticket.assigneeId = escalateTo;
        escalatedTo = targetUser.displayName;
      }
    }

    ticket.updatedAt = new Date();
    await this.ticketRepository.save(ticket);

    // Add escalation comment
    const comment = await this.commentRepository.save({
      ticketId: ticket.id,
      userId: currentUser.id,
      content: `Ticket escalated to ${escalatedTo}. Reason: ${reason}`,
      commentType: CommentType.ESCALATION,
      isInternal: true,
      metadata: {
        escalatedBy: currentUser.id,
        escalatedTo,
        reason,
        previousPriority: ticket.priority?.id,
        newPriority: priority,
      },
    });

    return {
      ticket,
      comment,
      escalatedTo,
    };
  }

  // Helper methods
  private async validateTicketAccess(ticket: Ticket, user: User): Promise<void> {
    // Super admins have access to all tickets
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    // System admins have access to all tickets
    if (user.role === UserRole.ADMIN) {
      return;
    }

    // Managers and team leads can only access tickets in their own department
    if ([UserRole.MANAGER, UserRole.TEAM_LEAD].includes(user.role)) {
      if (user.departmentId !== ticket.departmentId) {
        throw new ForbiddenException(`You do not have access to tickets from other departments. Your department: ${user.departmentId}, Ticket department: ${ticket.departmentId}`);
      }
      return;
    }

    // Agents can only access tickets in their department that are assigned to them
    if (user.role === UserRole.AGENT) {
      if (user.departmentId !== ticket.departmentId) {
        throw new ForbiddenException('You can only access tickets from your own department');
      }
      if (ticket.assigneeId !== user.id && ticket.requesterId !== user.id) {
        throw new ForbiddenException('You can only access tickets assigned to you or created by you');
      }
      return;
    }

    // End users can only access their own tickets
    if (user.role === UserRole.END_USER) {
      if (ticket.requesterId !== user.id) {
        throw new ForbiddenException('You can only access your own tickets');
      }
      return;
    }

    throw new ForbiddenException('You do not have access to this ticket');
  }

  /**
   * Validate that user has access to perform operations in a specific department
   */
  private async validateDepartmentOperationAccess(departmentId: string, user: User): Promise<void> {
    // Super admins can perform operations in any department
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    // System admins can perform operations in any department
    if (user.role === UserRole.ADMIN) {
      return;
    }

    // Managers and team leads can only perform operations in their own department
    if ([UserRole.MANAGER, UserRole.TEAM_LEAD].includes(user.role)) {
      if (user.departmentId !== departmentId) {
        throw new ForbiddenException(`You can only perform operations in your own department. Your department: ${user.departmentId}, Target department: ${departmentId}`);
      }
      return;
    }

    // All other roles are not allowed to perform bulk operations
    throw new ForbiddenException('You do not have permission to perform bulk operations');
  }

  private validateSortField(field: string): string {
    const allowedFields = ['createdAt', 'updatedAt', 'status', 'title', 'ticketNumber'];
    return allowedFields.includes(field) ? field : 'createdAt';
  }

  private calculateWorkloadLevel(activeTickets: number, teamSize: number): string {
    const avgTicketsPerPerson = teamSize > 0 ? activeTickets / teamSize : 0;
    if (avgTicketsPerPerson > 10) return 'High';
    if (avgTicketsPerPerson > 5) return 'Medium';
    return 'Low';
  }

  private getWorkloadLevel(activeTickets: number): string {
    if (activeTickets > 15) return 'High';
    if (activeTickets > 8) return 'Medium';
    return 'Low';
  }

  private async calculateAverageResponseTime(departmentId: string): Promise<number> {
    // This is a simplified calculation - in a real system, you'd track first response times
    const resolvedTickets = await this.ticketRepository.find({
      where: { 
        departmentId, 
        status: In([TicketStatus.RESOLVED, TicketStatus.CLOSED])
      },
      select: ['createdAt', 'updatedAt'],
      take: 100, // Sample size
    });

    if (resolvedTickets.length === 0) return 0;

    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      const diff = ticket.updatedAt.getTime() - ticket.createdAt.getTime();
      return sum + diff;
    }, 0);

    return Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60)); // Convert to hours
  }

  private parsePeriod(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
  }

  private calculateDailyTrend(tickets: Ticket[], startDate: Date, endDate: Date) {
    const dayMap = new Map<string, number>();
    
    // Initialize all days with 0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dayMap.set(dateKey, 0);
    }

    // Count tickets per day
    tickets.forEach(ticket => {
      const dateKey = ticket.createdAt.toISOString().split('T')[0];
      dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1);
    });

    return Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
  }

  /**
   * Send status change notifications for bulk operations
   */
  private async sendBulkStatusChangeNotifications(
    ticket: Ticket, 
    oldStatus: TicketStatus, 
    newStatus: TicketStatus, 
    currentUser: User
  ): Promise<void> {
    try {
      // Load ticket with relations for notifications
      const fullTicket = await this.ticketRepository.findOne({
        where: { id: ticket.id },
        relations: ['requester', 'assignee', 'department']
      });

      if (!fullTicket) return;

      const notifyUsers: User[] = [];

      // Always notify the requester (if not the one making the change)
      if (fullTicket.requester && fullTicket.requester.id !== currentUser.id) {
        notifyUsers.push(fullTicket.requester);
      }

      // Notify the assignee (if exists and not the one making the change)
      if (fullTicket.assignee && fullTicket.assignee.id !== currentUser.id) {
        notifyUsers.push(fullTicket.assignee);
      }

      // For critical status changes, also notify department managers and team leads
      if ([TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED].includes(newStatus)) {
        const departmentLeaders = await this.userRepository.find({
          where: [
            { role: UserRole.MANAGER, departmentId: fullTicket.departmentId },
            { role: UserRole.TEAM_LEAD, departmentId: fullTicket.departmentId },
          ]
        });

        for (const leader of departmentLeaders) {
          if (leader.id !== currentUser.id && !notifyUsers.some(u => u.id === leader.id)) {
            notifyUsers.push(leader);
          }
        }
      }

      // Send notifications
      if (notifyUsers.length > 0) {
        await this.notificationsService.notifyTicketStatusChanged(
          fullTicket, 
          oldStatus, 
          newStatus, 
          notifyUsers, 
          currentUser
        );
      }
    } catch (error) {
      console.error('Failed to send bulk status change notifications:', error);
    }
  }
} 