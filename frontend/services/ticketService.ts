import api from '@/lib/api';
import { 
  Ticket, 
  TicketStats, 
  CreateTicketRequest, 
  UpdateTicketRequest, 
  AddCommentRequest, 
  AssignTicketRequest,
  PaginatedResponse,
  TicketStatus,
  TicketComment
} from '@/types';

interface GetTicketsParams {
  page?: number;
  limit?: number;
  status?: TicketStatus | 'all';
  departmentId?: string;
  categoryId?: string;
  priorityId?: string;
  assigneeId?: string;
  requesterId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const ticketService = {
  // Get tickets with filters
  async getTickets(params: GetTicketsParams = {}): Promise<{ tickets: Ticket[]; total: number; pages: number }> {
    const queryParams = new URLSearchParams();
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 'all') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/tickets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  // Get ticket by ID with all relations
  async getTicketById(id: string): Promise<Ticket> {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  // Create new ticket
  async createTicket(data: CreateTicketRequest): Promise<Ticket> {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  // Update ticket
  async updateTicket(id: string, data: UpdateTicketRequest): Promise<Ticket> {
    const response = await api.patch(`/tickets/${id}`, data);
    return response.data;
  },

  // Delete ticket
  async deleteTicket(id: string): Promise<void> {
    await api.delete(`/tickets/${id}`);
  },

  // Assign ticket
  async assignTicket(id: string, data: AssignTicketRequest): Promise<Ticket> {
    const response = await api.patch(`/tickets/${id}/assign`, data);
    return response.data;
  },

  // Add comment to ticket
  async addComment(id: string, data: AddCommentRequest): Promise<TicketComment> {
    const response = await api.post(`/tickets/${id}/comments`, data);
    return response.data;
  },

  // Get ticket statistics
  async getTicketStats(): Promise<TicketStats> {
    const response = await api.get('/tickets/stats/dashboard');
    return response.data;
  },

  // Close ticket
  async closeTicket(id: string): Promise<Ticket> {
    return this.updateTicket(id, { status: TicketStatus.CLOSED });
  },

  // Resolve ticket
  async resolveTicket(id: string): Promise<Ticket> {
    return this.updateTicket(id, { status: TicketStatus.RESOLVED });
  },

  // Reopen ticket
  async reopenTicket(id: string): Promise<Ticket> {
    return this.updateTicket(id, { status: TicketStatus.OPEN });
  },

  // Get tickets for current user
  async getMyTickets(): Promise<Ticket[]> {
    const response = await api.get('/tickets/my');
    return response.data;
  },

  // Get assigned tickets for current user
  async getAssignedTickets(): Promise<Ticket[]> {
    const response = await api.get('/tickets/assigned');
    return response.data;
  },
}; 