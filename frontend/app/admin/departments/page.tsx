'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { AppHeader } from '@/components/app-header';
import { 
  Building,
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Building2,
  Folder,
  FolderOpen,
  Settings
} from 'lucide-react';
import { departmentService } from '@/services/departmentService';
import { userService } from '@/services/userService';
import { Department, UserRole, User } from '@/types';
import { withProtectedPage } from '@/lib/withAuth';

interface DepartmentFormData {
  name: string;
  description: string;
  parentId: string;
  isActive: boolean;
}

const initialFormData: DepartmentFormData = {
  name: '',
  description: '',
  parentId: '',
  isActive: true,
};

function AdminDepartmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user has admin access
  const hasAdminAccess = user?.role && [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

  useEffect(() => {
    if (!hasAdminAccess) {
      router.push('/dashboard');
      return;
    }
    loadDepartments();
  }, [hasAdminAccess]);

  useEffect(() => {
    // Filter departments based on search term
    if (!searchTerm.trim()) {
      setFilteredDepartments(departments);
    } else {
      const filtered = departments.filter(dept => 
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDepartments(filtered);
    }
  }, [searchTerm, departments]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const deps = await departmentService.getAllDepartments();
      setDepartments(deps);
      setError('');
    } catch (err) {
      console.error('Failed to load departments:', err);
      setError('Failed to load departments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = () => {
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      parentId: department.parent?.id || '',
      isActive: department.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Department name is required');
      return;
    }

    setFormLoading(true);
    setError('');

    try {
      const departmentData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parentId: formData.parentId || undefined,
        isActive: formData.isActive,
      };

      if (isEditModalOpen && selectedDepartment) {
        await departmentService.updateDepartment(selectedDepartment.id, departmentData);
        setSuccess('Department updated successfully');
        setIsEditModalOpen(false);
      } else {
        await departmentService.createDepartment(departmentData);
        setSuccess('Department created successfully');
        setIsCreateModalOpen(false);
      }

      await loadDepartments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save department');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDepartment) return;

    setFormLoading(true);
    setError('');

    try {
      await departmentService.deleteDepartment(selectedDepartment.id);
      setSuccess('Department deactivated successfully');
      setIsDeleteDialogOpen(false);
      await loadDepartments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete department');
    } finally {
      setFormLoading(false);
    }
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteDialogOpen(false);
    setSelectedDepartment(null);
    setFormData(initialFormData);
    setError('');
  };

  const getDepartmentLevel = (department: Department): number => {
    let level = 0;
    let currentParentId = department.parent?.id;
    
    while (currentParentId) {
      level++;
      const parent = departments.find(d => d.id === currentParentId);
      currentParentId = parent?.parent?.id;
    }
    
    return level;
  };

  const getChildrenCount = (departmentId: string): number => {
    return departments.filter(d => d.parent?.id === departmentId).length;
  };

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this page. Only administrators can manage departments.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Department Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage organizational departments and their hierarchy
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={loadDepartments}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleCreateDepartment}>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search departments by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Departments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Departments ({filteredDepartments.length})
            </CardTitle>
            <CardDescription>
              Manage your organization's department structure and hierarchy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {searchTerm ? 'No departments found matching your search.' : 'No departments found.'}
                </p>
                {!searchTerm && (
                  <Button onClick={handleCreateDepartment} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Department
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDepartments.map((department) => {
                  const level = getDepartmentLevel(department);
                  const childrenCount = getChildrenCount(department.id);
                  
                  return (
                    <div
                      key={department.id}
                      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        level > 0 ? `ml-${level * 6}` : ''
                      }`}
                      style={{ marginLeft: level * 24 }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {level > 0 ? (
                            <Folder className="h-5 w-5 text-gray-400" />
                          ) : (
                            <FolderOpen className="h-5 w-5 text-blue-600" />
                          )}
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {department.name}
                          </h3>
                          <Badge variant={department.isActive ? "default" : "secondary"}>
                            {department.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {childrenCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {childrenCount} sub-departments
                            </Badge>
                          )}
                        </div>
                        
                        {department.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {department.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>ID: {department.id}</span>
                          {department.parent && (
                            <span>Parent: {department.parent.name}</span>
                          )}
                          <span>Created: {new Date(department.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/dashboard/${department.id}`)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDepartment(department)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {user?.role === UserRole.SUPER_ADMIN && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDepartment(department)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Department Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {isEditModalOpen ? 'Edit Department' : 'Create Department'}
            </DialogTitle>
            <DialogDescription>
              {isEditModalOpen 
                ? 'Update department information and settings.' 
                : 'Create a new department in your organization.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter department name"
                required
                disabled={formLoading}
              />
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter department description (optional)"
                rows={3}
                disabled={formLoading}
              />
            </div>

            {/* Parent Department */}
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Department</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value }))}
                disabled={formLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Parent</SelectItem>
                  {departments
                    .filter(dept => dept.isActive && dept.id !== selectedDepartment?.id)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Status */}
            <div className="space-y-2">
              <Label htmlFor="isActive">Status</Label>
              <Select
                value={formData.isActive.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value === 'true' }))}
                disabled={formLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModals}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditModalOpen ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Department"
        description={
          selectedDepartment 
            ? `Are you sure you want to deactivate "${selectedDepartment.name}"? This action will make the department inactive but preserve all historical data.`
            : ''
        }
        confirmText="Delete"
        confirmVariant="destructive"
        isLoading={formLoading}
      />
    </div>
  );
}

export default withProtectedPage(AdminDepartmentsPage); 