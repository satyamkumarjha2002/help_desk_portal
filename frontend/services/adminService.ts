import api from '@/lib/api';
import { User, Ticket, Department } from '@/types';

interface DashboardData {
  department: {
    id: string;
    name: string;
    description: string;
    teamSize: number;
  };
  statistics: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    recentTickets: number;
    averageResponseTime: number;
  };
  urgentTickets: Ticket[];
  summary: {
    activeTickets: number;
    completionRate: number;
    workload: string;
  };
}

interface TeamMember extends User {
  statistics: {
    assignedTickets: number;
    activeTickets: number;
    workloadLevel: string;
  };
}

interface WorkloadData {
  teamSize: number;
  totalActiveTickets: number;
  averageWorkload: number;
  workloadDistribution: Array<{
    userId: string;
    displayName: string;
    role: string;
    activeTickets: number;
    workloadLevel: string;
  }>;
  overloadedMembers: Array<{
    userId: string;
    displayName: string;
    role: string;
    activeTickets: number;
    workloadLevel: string;
  }>;
}

interface AnalyticsData {
  period: { startDate: string; endDate: string };
  summary: {
    totalTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    completionRate: number;
  };
  distributions: {
    status: Record<string, number>;
    priority: Record<string, number>;
  };
  trends: {
    daily: Array<{ date: string; count: number }>;
  };
}

interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

/**
 * Admin Service
 * 
 * Provides comprehensive administrative functionality for department
 * management, analytics, and bulk operations.
 */
export const adminService = {
  /**
   * Get department dashboard data
   */
  async getDepartmentDashboard(departmentId: string): Promise<DashboardData> {
    try {
      const response = await api.get(`/admin/dashboard/${departmentId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get dashboard data');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to get dashboard data:', error);
      throw new Error(`Failed to get dashboard data: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get department tickets with filtering and pagination
   */
  async getDepartmentTickets(
    departmentId: string,
    filters: {
      status?: string;
      priority?: string;
      assignee?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{
    tickets: Ticket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/admin/departments/${departmentId}/tickets?${params}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get tickets');
      }

      return {
        tickets: response.data.data,
        pagination: response.data.pagination,
      };
    } catch (error: any) {
      console.error('Failed to get department tickets:', error);
      throw new Error(`Failed to get tickets: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Bulk assign tickets to a user
   */
  async bulkAssignTickets(
    ticketIds: string[],
    assigneeId: string,
    reason?: string
  ): Promise<BulkOperationResult> {
    try {
      const response = await api.post('/admin/tickets/bulk-assign', {
        ticketIds,
        assigneeId,
        reason,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to assign tickets');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to bulk assign tickets:', error);
      throw new Error(`Failed to assign tickets: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Bulk update ticket status
   */
  async bulkUpdateStatus(
    ticketIds: string[],
    status: string,
    reason?: string
  ): Promise<BulkOperationResult> {
    try {
      const response = await api.post('/admin/tickets/bulk-status', {
        ticketIds,
        status,
        reason,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update ticket status');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to bulk update status:', error);
      throw new Error(`Failed to update status: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Transfer tickets between departments
   */
  async transferTickets(
    ticketIds: string[],
    targetDepartmentId: string,
    reason: string,
    maintainAssignee: boolean = false
  ): Promise<BulkOperationResult> {
    try {
      const response = await api.post('/admin/tickets/transfer', {
        ticketIds,
        targetDepartmentId,
        reason,
        maintainAssignee,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to transfer tickets');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to transfer tickets:', error);
      throw new Error(`Failed to transfer tickets: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get department team members
   */
  async getDepartmentTeam(departmentId: string): Promise<TeamMember[]> {
    try {
      const response = await api.get(`/admin/departments/${departmentId}/team`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get team data');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to get team data:', error);
      throw new Error(`Failed to get team data: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get team workload statistics
   */
  async getTeamWorkload(departmentId: string): Promise<WorkloadData> {
    try {
      const response = await api.get(`/admin/departments/${departmentId}/workload`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get workload data');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to get workload data:', error);
      throw new Error(`Failed to get workload data: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get department analytics
   */
  async getDepartmentAnalytics(departmentId: string, period: string = '30d'): Promise<AnalyticsData> {
    try {
      const response = await api.get(`/admin/departments/${departmentId}/analytics?period=${period}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get analytics data');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to get analytics data:', error);
      throw new Error(`Failed to get analytics data: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Escalate a ticket
   */
  async escalateTicket(
    ticketId: string,
    reason: string,
    escalateTo?: string,
    priority?: string
  ): Promise<any> {
    try {
      const response = await api.post(`/admin/tickets/${ticketId}/escalate`, {
        reason,
        escalateTo,
        priority,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to escalate ticket');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to escalate ticket:', error);
      throw new Error(`Failed to escalate ticket: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get workload level badge color
   */
  getWorkloadLevelColor(level: string): string {
    switch (level) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'secondary';
      default:
        return 'secondary';
    }
  },

  /**
   * Format ticket status for display
   */
  formatTicketStatus(status: string): string {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  },

  /**
   * Get status badge color
   */
  getStatusBadgeColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'open':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  },

  /**
   * Calculate completion rate percentage
   */
  calculateCompletionRate(resolved: number, closed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round(((resolved + closed) / total) * 100);
  },

  /**
   * Format time duration in hours to human readable format
   */
  formatDuration(hours: number): string {
    if (hours < 1) return '< 1 hour';
    if (hours < 24) return `${Math.round(hours)} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) return `${days} days`;
    return `${days}d ${remainingHours}h`;
  }
}; 