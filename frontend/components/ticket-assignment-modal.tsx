'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  User, 
  Users, 
  UserCheck, 
  Loader2, 
  Building,
  X,
  CheckCircle
} from 'lucide-react';
import { User as UserType, UserRole, Ticket } from '@/types';
import { adminService } from '@/services/adminService';
import { userService } from '@/services/userService';
import { getRoleDisplayName, getRoleColor } from '@/lib/roleUtils';

interface TicketAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assigneeId: string, assigneeName: string) => Promise<void>;
  ticket?: Ticket | null;
  ticketIds?: string[];
  title?: string;
  description?: string;
}

export function TicketAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  ticket,
  ticketIds,
  title,
  description
}: TicketAssignmentModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  const modalTitle = title || (ticketIds ? `Assign ${ticketIds.length} Tickets` : 'Assign Ticket');
  const modalDescription = description || (
    ticketIds 
      ? `Select a user to assign ${ticketIds.length} selected tickets to.`
      : ticket 
        ? `Select a user to assign ticket #${ticket.ticketNumber} to.`
        : 'Select a user to assign the ticket to.'
  );

  // Load users when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadUsers();
    }
  }, [isOpen, user]);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(u => 
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getRoleDisplayName(u.role).toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      let departmentUsers: UserType[] = [];

      // Get users based on current user's role and permissions
      if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
        // Super admins and admins can assign to anyone
        // If ticket has a department, get users from that department, otherwise get all users
        const targetDepartmentId = ticket?.department?.id || user.departmentId;
        
        if (targetDepartmentId) {
          departmentUsers = await userService.getUsersByDepartment(targetDepartmentId);
        } else {
          departmentUsers = await userService.getAllUsers();
        }
      } else if (user.role === UserRole.MANAGER || user.role === UserRole.TEAM_LEAD) {
        // Managers and team leads can only assign within their department
        if (user.departmentId) {
          departmentUsers = await userService.getUsersByDepartment(user.departmentId);
        }
      }

      // Filter out inactive users and the current user (optional)
      const activeUsers = departmentUsers.filter(u => 
        u.isActive && 
        u.id !== user.id && // Don't include current user
        [UserRole.AGENT, UserRole.TEAM_LEAD, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(u.role)
      );

      setUsers(activeUsers);
      setFilteredUsers(activeUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) return;

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) return;

    setAssigning(true);
    setError('');

    try {
      await onAssign(selectedUserId, selectedUser.displayName);
      
      // Reset state and close modal
      setSelectedUserId('');
      setSearchTerm('');
      onClose();
    } catch (err) {
      console.error('Failed to assign ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign ticket. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const handleClose = () => {
    if (!assigning) {
      setSelectedUserId('');
      setSearchTerm('');
      setError('');
      onClose();
    }
  };

  const getRoleColorClass = (role: UserRole): string => {
    const color = getRoleColor(role);
    return `bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-400`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            {modalTitle}
          </DialogTitle>
          <DialogDescription>
            {modalDescription}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={loading || assigning}
            />
          </div>

          {/* Users List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Available Users ({filteredUsers.length})
            </Label>
            
            <ScrollArea className="h-64 w-full border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Loading users...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Users className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    {searchTerm ? 'No users found matching your search.' : 'No users available for assignment.'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredUsers.map((assignee) => (
                    <div
                      key={assignee.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUserId === assignee.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                      }`}
                      onClick={() => setSelectedUserId(assignee.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={assignee.profilePictureUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {assignee.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {assignee.displayName}
                          </p>
                          {selectedUserId === assignee.id && (
                            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500 truncate">
                            {assignee.email}
                          </p>
                          <Badge variant="outline" className={`text-xs ${getRoleColorClass(assignee.role)}`}>
                            {getRoleDisplayName(assignee.role)}
                          </Badge>
                        </div>
                        {assignee.department && (
                          <div className="flex items-center gap-1 mt-1">
                            <Building className="h-3 w-3 text-gray-400" />
                            <p className="text-xs text-gray-400 truncate">
                              {assignee.department.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedUserId || assigning || loading}
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Assign {ticketIds ? `${ticketIds.length} Tickets` : 'Ticket'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 