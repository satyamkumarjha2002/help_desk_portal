import { User, UserRole, Ticket, TicketStatus } from '@/types';

/**
 * Check if a user can edit a specific ticket
 * This matches the backend authorization logic
 */
export const canUserEditTicket = (user: User | null, ticket: Ticket | null): boolean => {
  if (!user || !ticket) return false;
  
  // Super admins and system admins can edit all tickets
  if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role)) {
    return true;
  }

  // Managers and team leads can edit tickets in their department
  if ([UserRole.MANAGER, UserRole.TEAM_LEAD].includes(user.role)) {
    return user.departmentId === ticket.department?.id;
  }

  // Agents can edit tickets in their department that are assigned to them OR created by them
  if (user.role === UserRole.AGENT) {
    if (user.departmentId !== ticket.department?.id) {
      return false;
    }
    return ticket.assignee?.id === user.id || ticket.createdBy?.id === user.id;
  }

  // End users can edit their own tickets (if not closed/resolved) OR tickets they created
  if (user.role === UserRole.END_USER) {
    // Check if ticket is closed or resolved
    if ([TicketStatus.CLOSED, TicketStatus.RESOLVED].includes(ticket.status)) {
      return false;
    }
    // Allow if user is the requester OR the creator of the ticket
    return ticket.requester?.id === user.id || ticket.createdBy?.id === user.id;
  }

  return false;
};

/**
 * Check if a user can change ticket status
 */
export const canUserChangeTicketStatus = (user: User | null, ticket: Ticket | null): boolean => {
  if (!user || !ticket) return false;
  
  // Admin, managers, team leads, and agents can change status
  return [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD, UserRole.AGENT].includes(user.role);
};

/**
 * Check if a user can assign tickets
 */
export const canUserAssignTickets = (user: User | null): boolean => {
  if (!user) return false;
  
  return [UserRole.TEAM_LEAD, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
};

/**
 * Check if a user can view a specific ticket
 */
export const canUserViewTicket = (user: User | null, ticket: Ticket | null): boolean => {
  if (!user || !ticket) return false;
  
  // Super admins and system admins have access to all tickets
  if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role)) {
    return true;
  }

  // Managers and team leads can access tickets in their department
  if ([UserRole.MANAGER, UserRole.TEAM_LEAD].includes(user.role)) {
    return user.departmentId === ticket.department?.id;
  }

  // Agents can access tickets in their department that are assigned to them, requested by them, or created by them
  if (user.role === UserRole.AGENT) {
    if (user.departmentId !== ticket.department?.id) {
      return false;
    }
    return ticket.assignee?.id === user.id || ticket.requester?.id === user.id || ticket.createdBy?.id === user.id;
  }

  // End users can only access their own tickets or tickets they created
  if (user.role === UserRole.END_USER) {
    return ticket.requester?.id === user.id || ticket.createdBy?.id === user.id;
  }

  return false;
}; 