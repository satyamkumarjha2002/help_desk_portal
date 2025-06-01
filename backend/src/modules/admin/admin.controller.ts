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
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { User, UserRole } from '../../entities/user.entity';
import { TicketStatus } from '../../entities/ticket.entity';

/**
 * Admin Controller
 * 
 * Provides advanced administrative functionality for department managers,
 * team leads, and system administrators. Includes ticket management,
 * department analytics, and bulk operations.
 */
@Controller('admin')
@UseGuards(FirebaseAuthGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * Get department dashboard overview
   * GET /admin/dashboard/:departmentId
   */
  @Get('dashboard/:departmentId')
  async getDepartmentDashboard(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Request() req: any,
  ) {
    this.logger.log(`Getting dashboard for department: ${departmentId}, user: ${req.user?.uid}`);
    
    await this.validateDepartmentAccess(req.user, departmentId);

    try {
      const dashboard = await this.adminService.getDepartmentDashboard(departmentId, req.user);
      
      return {
        success: true,
        data: dashboard,
        message: 'Dashboard data retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get department tickets with advanced filtering
   * GET /admin/departments/:departmentId/tickets
   */
  @Get('departments/:departmentId/tickets')
  async getDepartmentTickets(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: string,
    @Query('assignee') assignee?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Request() req?: any,
  ) {
    this.logger.log(`Getting tickets for department: ${departmentId}`);
    
    await this.validateDepartmentAccess(req.user, departmentId);

    try {
      const result = await this.adminService.getDepartmentTickets(
        departmentId,
        {
          status,
          priority,
          assignee,
          search,
          page: Math.max(1, parseInt(page || '1')),
          limit: Math.min(100, Math.max(1, parseInt(limit || '20'))),
          sortBy: sortBy || 'createdAt',
          sortOrder: (sortOrder as 'ASC' | 'DESC') || 'DESC',
        },
        req.user,
      );
      
      return {
        success: true,
        data: result.tickets,
        pagination: result.pagination,
        message: `Found ${result.tickets.length} tickets`,
      };
    } catch (error) {
      this.logger.error(`Failed to get department tickets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk assign tickets
   * POST /admin/tickets/bulk-assign
   */
  @Post('tickets/bulk-assign')
  @HttpCode(HttpStatus.OK)
  async bulkAssignTickets(
    @Body() body: {
      ticketIds: string[];
      assigneeId: string;
      reason?: string;
    },
    @Request() req: any,
  ) {
    this.logger.log(`Bulk assigning ${body.ticketIds.length} tickets to ${body.assigneeId}`);
    
    if (!body.ticketIds?.length) {
      throw new BadRequestException('No tickets provided for assignment');
    }

    try {
      const result = await this.adminService.bulkAssignTickets(
        body.ticketIds,
        body.assigneeId,
        req.user,
        body.reason,
      );
      
      return {
        success: true,
        data: result,
        message: `Successfully assigned ${result.successCount} tickets`,
      };
    } catch (error) {
      this.logger.error(`Bulk assignment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk update ticket status
   * POST /admin/tickets/bulk-status
   */
  @Post('tickets/bulk-status')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStatus(
    @Body() body: {
      ticketIds: string[];
      status: TicketStatus;
      reason?: string;
    },
    @Request() req: any,
  ) {
    this.logger.log(`Bulk updating ${body.ticketIds.length} tickets to status: ${body.status}`);
    
    if (!body.ticketIds?.length) {
      throw new BadRequestException('No tickets provided for status update');
    }

    try {
      const result = await this.adminService.bulkUpdateStatus(
        body.ticketIds,
        body.status,
        req.user,
        body.reason,
      );
      
      return {
        success: true,
        data: result,
        message: `Successfully updated ${result.successCount} tickets`,
      };
    } catch (error) {
      this.logger.error(`Bulk status update failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transfer tickets between departments
   * POST /admin/tickets/transfer
   */
  @Post('tickets/transfer')
  @HttpCode(HttpStatus.OK)
  async transferTickets(
    @Body() body: {
      ticketIds: string[];
      targetDepartmentId: string;
      reason: string;
      maintainAssignee?: boolean;
    },
    @Request() req: any,
  ) {
    this.logger.log(`Transferring ${body.ticketIds.length} tickets to department: ${body.targetDepartmentId}`);
    
    if (!body.ticketIds?.length) {
      throw new BadRequestException('No tickets provided for transfer');
    }

    if (!body.reason?.trim()) {
      throw new BadRequestException('Transfer reason is required');
    }

    try {
      const result = await this.adminService.transferTickets(
        body.ticketIds,
        body.targetDepartmentId,
        req.user,
        body.reason,
        body.maintainAssignee,
      );
      
      return {
        success: true,
        data: result,
        message: `Successfully transferred ${result.successCount} tickets`,
      };
    } catch (error) {
      this.logger.error(`Ticket transfer failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get department team members
   * GET /admin/departments/:departmentId/team
   */
  @Get('departments/:departmentId/team')
  async getDepartmentTeam(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Request() req: any,
  ) {
    this.logger.log(`Getting team for department: ${departmentId}`);
    
    await this.validateDepartmentAccess(req.user, departmentId);

    try {
      const team = await this.adminService.getDepartmentTeam(departmentId, req.user);
      
      return {
        success: true,
        data: team,
        message: `Found ${team.length} team members`,
      };
    } catch (error) {
      this.logger.error(`Failed to get department team: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get team workload statistics
   * GET /admin/departments/:departmentId/workload
   */
  @Get('departments/:departmentId/workload')
  async getTeamWorkload(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Request() req: any,
  ) {
    this.logger.log(`Getting workload for department: ${departmentId}`);
    
    await this.validateDepartmentAccess(req.user, departmentId);

    try {
      const workload = await this.adminService.getTeamWorkload(departmentId, req.user);
      
      return {
        success: true,
        data: workload,
        message: 'Workload statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get team workload: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get department analytics
   * GET /admin/departments/:departmentId/analytics
   */
  @Get('departments/:departmentId/analytics')
  async getDepartmentAnalytics(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Query('period') period: string = '30d',
    @Request() req: any,
  ) {
    this.logger.log(`Getting analytics for department: ${departmentId}, period: ${period}`);
    
    await this.validateDepartmentAccess(req.user, departmentId);

    try {
      const analytics = await this.adminService.getDepartmentAnalytics(
        departmentId,
        period,
        req.user,
      );
      
      return {
        success: true,
        data: analytics,
        message: 'Analytics retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get department analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Escalate ticket
   * POST /admin/tickets/:ticketId/escalate
   */
  @Post('tickets/:ticketId/escalate')
  @HttpCode(HttpStatus.OK)
  async escalateTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() body: {
      reason: string;
      escalateTo?: string; // User ID or role
      priority?: string;
    },
    @Request() req: any,
  ) {
    this.logger.log(`Escalating ticket: ${ticketId}`);
    
    if (!body.reason?.trim()) {
      throw new BadRequestException('Escalation reason is required');
    }

    try {
      const result = await this.adminService.escalateTicket(
        ticketId,
        req.user,
        body.reason,
        body.escalateTo,
        body.priority,
      );
      
      return {
        success: true,
        data: result,
        message: 'Ticket escalated successfully',
      };
    } catch (error) {
      this.logger.error(`Ticket escalation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate department access
   */
  private async validateDepartmentAccess(user: User, departmentId: string): Promise<void> {
    // Super admins and system admins have access to all departments
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role)) {
      return;
    }

    // Managers and team leads can access their own department
    if ([UserRole.MANAGER, UserRole.TEAM_LEAD].includes(user.role)) {
      if (user.departmentId === departmentId) {
        return;
      }
    }

    // Regular users with department assignment can view their department (read-only access)
    if (user.role === UserRole.END_USER && user.departmentId === departmentId) {
      return;
    }

    throw new ForbiddenException('You do not have access to this department');
  }
} 