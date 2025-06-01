import api from '@/lib/api';
import { Priority } from '@/types';

export const priorityService = {
  // Get all priorities
  async getAllPriorities(): Promise<Priority[]> {
    const response = await api.get('/priorities');
    return response.data;
  },

  // Get priority by ID
  async getPriorityById(id: string): Promise<Priority> {
    const response = await api.get(`/priorities/${id}`);
    return response.data;
  },

  // Create new priority (admin only)
  async createPriority(data: {
    name: string;
    level: number;
    color: string;
  }): Promise<Priority> {
    const response = await api.post('/priorities', data);
    return response.data;
  },

  // Update priority (admin only)
  async updatePriority(id: string, data: {
    name?: string;
    level?: number;
    color?: string;
  }): Promise<Priority> {
    const response = await api.patch(`/priorities/${id}`, data);
    return response.data;
  },

  // Delete priority (admin only)
  async deletePriority(id: string): Promise<void> {
    await api.delete(`/priorities/${id}`);
  },
}; 