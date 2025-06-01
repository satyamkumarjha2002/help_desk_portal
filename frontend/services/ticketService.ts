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
  status?: TicketStatus;
  assigneeId?: string;
  departmentId?: string;
  search?: string;
  tags?: string[];
}

export const ticketService = {
  // Get tickets with filters
  async getTickets(params: GetTicketsParams = {}): Promise<PaginatedResponse<Ticket>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(','));
        } else {
          searchParams.set(key, value.toString());
        }
      }
    });

    const response = await api.get(`/tickets?${searchParams}`);
    return response.data;
  },

  // Get ticket by ID
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
    const response = await api.post(`/tickets/${id}/assign`, data);
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
}; 