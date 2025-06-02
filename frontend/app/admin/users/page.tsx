'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { AppHeader } from '@/components/app-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users,
  Search,
  Filter,
  RefreshCw,
  Edit,
  UserX,
  UserCheck,
  Settings,
  Eye,
  Building,
  Shield,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { userService } from '@/services/userService';
import { departmentService } from '@/services/departmentService';
import { User, UserRole, Department } from '@/types';
import { withProtectedPage } from '@/lib/withAuth';
import { getRoleDisplayName, getRoleColor } from '@/lib/roleUtils';

interface UserFilters {
  search: string;
  department: string;
  role: UserRole | 'all';
  status: 'all' | 'active' | 'inactive';
}

interface UserFormData {
  displayName: string;
  email: string;
  role: UserRole;
  departmentId: string;
  isActive: boolean;
}

const initialFilters: UserFilters = {
  search: '',
  department: 'all',
  role: 'all',
  status: 'all',
};

const initialFormData: UserFormData = {
  displayName: '',
  email: '',
  role: UserRole.END_USER,
  departmentId: '',
  isActive: true,
};

function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>(initialFilters);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Add new state for user details modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);

  // Check if user has admin access
  const hasAdminAccess = user?.role && [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

  useEffect(() => {
    if (!hasAdminAccess) {
      router.push('/dashboard');
      return;
    }
    loadUsers();
    loadDepartments();
  }, [hasAdminAccess]);

  useEffect(() => {
    // Apply filters
    let filtered = [...users];

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(u => 
        u.displayName.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm)
      );
    }

    // Department filter
    if (filters.department !== 'all') {
      filtered = filtered.filter(u => u.department?.id === filters.department);
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(u => u.role === filters.role);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(u => 
        filters.status === 'active' ? u.isActive : !u.isActive
      );
    }

    setFilteredUsers(filtered);
  }, [filters, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userData = await userService.getAllUsers();
      setUsers(userData);
      setError('');
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const deptData = await departmentService.getAllDepartments();
      setDepartments(deptData);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleEditUser = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setFormData({
      displayName: userToEdit.displayName,
      email: userToEdit.email,
      role: userToEdit.role,
      departmentId: userToEdit.department?.id || '',
      isActive: userToEdit.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleDeactivateUser = (userToDeactivate: User) => {
    setSelectedUser(userToDeactivate);
    setIsDeactivateDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.displayName.trim() || !formData.email.trim()) {
      setError('Display name and email are required');
      return;
    }

    if (!selectedUser) {
      setError('No user selected for editing');
      return;
    }

    setFormLoading(true);
    setError('');

    try {
      // Prepare update data
      const updateData = {
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        departmentId: formData.departmentId || undefined,
        isActive: formData.isActive,
      };

      // Call the backend to update user
      await userService.updateUser(selectedUser.id, updateData);
      
      setSuccess('User updated successfully');
      setIsEditModalOpen(false);
      await loadUsers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!selectedUser) return;

    setFormLoading(true);
    setError('');

    try {
      // Toggle user active status
      const newStatus = !selectedUser.isActive;
      await userService.updateUser(selectedUser.id, { isActive: newStatus });
      
      setSuccess(`User ${selectedUser.displayName} ${newStatus ? 'reactivated' : 'deactivated'} successfully`);
      setIsDeactivateDialogOpen(false);
      await loadUsers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${selectedUser.isActive ? 'deactivate' : 'reactivate'} user`);
    } finally {
      setFormLoading(false);
    }
  };

  const closeModals = () => {
    setIsEditModalOpen(false);
    setIsDeactivateDialogOpen(false);
    setIsDetailsModalOpen(false);
    setSelectedUser(null);
    setSelectedUserForDetails(null);
    setFormData(initialFormData);
    setError('');
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const getRoleColorClass = (role: UserRole): string => {
    const color = getRoleColor(role);
    return `bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-400`;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this page. Only system administrators can manage users.
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
              User Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage system users, roles, and permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={loadUsers}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>

              {/* Department Filter */}
              <Select 
                value={filters.department} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Role Filter */}
              <Select 
                value={filters.role} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, role: value as UserRole | 'all' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                  <SelectItem value={UserRole.TEAM_LEAD}>Team Lead</SelectItem>
                  <SelectItem value={UserRole.AGENT}>Agent</SelectItem>
                  <SelectItem value={UserRole.END_USER}>End User</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as 'all' | 'active' | 'inactive' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length})
            </CardTitle>
            <CardDescription>
              Manage system users and their access permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array(10).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {Object.values(filters).some(f => f !== '' && f !== 'all') 
                    ? 'No users found matching your filters.' 
                    : 'No users found.'}
                </p>
                {Object.values(filters).some(f => f !== '' && f !== 'all') && (
                  <Button onClick={clearFilters} className="mt-4" variant="outline">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((userItem) => (
                  <div
                    key={userItem.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={userItem.profilePictureUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm">
                          {getInitials(userItem.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {userItem.displayName}
                          </h3>
                          <Badge className={getRoleColorClass(userItem.role)}>
                            {getRoleDisplayName(userItem.role)}
                          </Badge>
                          <Badge className={getStatusColor(userItem.isActive)}>
                            {userItem.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>{userItem.email}</span>
                          {userItem.department && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                <span>{userItem.department.name}</span>
                              </div>
                            </>
                          )}
                          <span>•</span>
                          <span>ID: {userItem.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditUser(userItem)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedUserForDetails(userItem);
                            setIsDetailsModalOpen(true);
                          }}
                          className="text-blue-600 dark:text-blue-400"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {userItem.isActive ? (
                          <DropdownMenuItem 
                            onClick={() => handleDeactivateUser(userItem)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleDeactivateUser(userItem)}
                            className="text-green-600 dark:text-green-400"
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit User
            </DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Enter display name"
                required
                disabled={formLoading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                required
                disabled={formLoading}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
                disabled={formLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.END_USER}>End User</SelectItem>
                  <SelectItem value={UserRole.AGENT}>Agent</SelectItem>
                  <SelectItem value={UserRole.TEAM_LEAD}>Team Lead</SelectItem>
                  <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  {user?.role === UserRole.SUPER_ADMIN && (
                    <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.departmentId || "no-department"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value === "no-department" ? "" : value }))}
                disabled={formLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-department">No Department</SelectItem>
                  {departments
                    .filter(dept => dept.isActive)
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
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Update User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeactivateDialogOpen}
        onClose={() => setIsDeactivateDialogOpen(false)}
        onConfirm={handleDeactivateConfirm}
        title={selectedUser?.isActive ? "Deactivate User" : "Reactivate User"}
        description={
          selectedUser 
            ? selectedUser.isActive
              ? `Are you sure you want to deactivate "${selectedUser.displayName}"? They will lose access to the system but their data will be preserved.`
              : `Are you sure you want to reactivate "${selectedUser.displayName}"? They will regain access to the system.`
            : ''
        }
        confirmText={selectedUser?.isActive ? "Deactivate" : "Reactivate"}
        confirmVariant={selectedUser?.isActive ? "destructive" : "default"}
        isLoading={formLoading}
      />

      {/* User Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={() => setIsDetailsModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              User Details
            </DialogTitle>
            <DialogDescription>
              View user details and access permissions
            </DialogDescription>
          </DialogHeader>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUserForDetails?.profilePictureUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm">
                    {getInitials(selectedUserForDetails?.displayName || '')}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {selectedUserForDetails?.displayName}
                </h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Email:</strong> {selectedUserForDetails?.email}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Role:</strong> {getRoleDisplayName(selectedUserForDetails?.role || UserRole.END_USER)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Department:</strong> {selectedUserForDetails?.department?.name || 'No Department'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Status:</strong> {selectedUserForDetails?.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withProtectedPage(AdminUsersPage); 