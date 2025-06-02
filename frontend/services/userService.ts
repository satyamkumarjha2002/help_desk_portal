import api from '@/lib/api';
import { User } from '@/types';

/**
 * User Service
 * 
 * Provides methods for user management and retrieval
 */
export const userService = {
  /**
   * Get all users in the system
   */
  async getAllUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data.data || response.data;
  },

  /**
   * Get users by department ID
   * @param departmentId - The department ID to filter by
   */
  async getUsersByDepartment(departmentId: string): Promise<User[]> {
    const response = await api.get(`/users/department/${departmentId}`);
    return response.data.data || response.data;
  },

  /**
   * Get user by ID
   * @param userId - The user ID
   */
  async getUserById(userId: string): Promise<User> {
    const response = await api.get(`/users/${userId}`);
    return response.data.data?.user || response.data.user;
  },

  /**
   * Get users available for ticket assignment
   * @param departmentId - Optional department ID to filter by
   */
  async getAssignableUsers(departmentId?: string): Promise<User[]> {
    const params = departmentId ? { departmentId } : {};
    const response = await api.get('/users/assignable', { params });
    return response.data.data || response.data;
  },

  /**
   * Search users by name or email
   * @param query - Search term
   * @param departmentId - Optional department ID to filter by
   */
  async searchUsers(query: string, departmentId?: string): Promise<User[]> {
    const params = { 
      search: query,
      ...(departmentId && { departmentId })
    };
    const response = await api.get('/users/search', { params });
    return response.data.data || response.data;
  },

  /**
   * Update user information
   * @param userId - The user ID to update
   * @param updateData - The data to update
   */
  async updateUser(userId: string, updateData: {
    displayName?: string;
    email?: string;
    role?: string;
    departmentId?: string;
    isActive?: boolean;
  }): Promise<User> {
    const response = await api.put(`/users/${userId}`, updateData);
    return response.data.data?.user || response.data.user || response.data;
  }
}; 