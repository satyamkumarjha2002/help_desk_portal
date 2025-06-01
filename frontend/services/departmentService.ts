import api from '@/lib/api';
import { Department } from '@/types';

export const departmentService = {
  // Get all departments
  async getAllDepartments(): Promise<Department[]> {
    const response = await api.get('/departments');
    return response.data;
  },

  // Get active departments only
  async getActiveDepartments(): Promise<Department[]> {
    const response = await api.get('/departments/active');
    return response.data;
  },

  // Get department hierarchy
  async getDepartmentHierarchy(): Promise<Department[]> {
    const response = await api.get('/departments/hierarchy');
    return response.data;
  },

  // Get department by ID
  async getDepartmentById(id: string): Promise<Department> {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  // Create new department
  async createDepartment(data: {
    name: string;
    description?: string;
    parentId?: string;
    isActive?: boolean;
  }): Promise<Department> {
    const response = await api.post('/departments', data);
    return response.data;
  },

  // Update department
  async updateDepartment(id: string, data: {
    name?: string;
    description?: string;
    parentId?: string;
    isActive?: boolean;
  }): Promise<Department> {
    const response = await api.patch(`/departments/${id}`, data);
    return response.data;
  },

  // Delete department
  async deleteDepartment(id: string): Promise<void> {
    await api.delete(`/departments/${id}`);
  },
}; 