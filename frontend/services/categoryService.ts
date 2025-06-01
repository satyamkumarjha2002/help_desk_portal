import api from '@/lib/api';
import { Category } from '@/types';

export const categoryService = {
  // Get all categories
  async getAllCategories(): Promise<Category[]> {
    const response = await api.get('/categories');
    return response.data;
  },

  // Get active categories only
  async getActiveCategories(): Promise<Category[]> {
    const response = await api.get('/categories/active');
    return response.data;
  },

  // Get categories by department
  async getCategoriesByDepartment(departmentId: string): Promise<Category[]> {
    const response = await api.get(`/categories/department/${departmentId}`);
    return response.data;
  },

  // Get active categories by department
  async getActiveCategoriesByDepartment(departmentId: string): Promise<Category[]> {
    const response = await api.get(`/categories/department/${departmentId}/active`);
    return response.data;
  },

  // Get category by ID
  async getCategoryById(id: string): Promise<Category> {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  // Create new category
  async createCategory(data: {
    name: string;
    description?: string;
    departmentId: string;
    isActive?: boolean;
  }): Promise<Category> {
    const response = await api.post('/categories', data);
    return response.data;
  },

  // Update category
  async updateCategory(id: string, data: {
    name?: string;
    description?: string;
    departmentId?: string;
    isActive?: boolean;
  }): Promise<Category> {
    const response = await api.patch(`/categories/${id}`, data);
    return response.data;
  },

  // Delete category
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
}; 