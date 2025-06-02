'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/app-header';
import { 
  Ticket,
  Calendar,
  User,
  Building,
  Filter,
  Search,
  Download,
  RefreshCw,
  UserPlus,
  CheckSquare,
  Square,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Settings
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { departmentService } from '@/services/departmentService';
import { ticketService } from '@/services/ticketService';
import { TicketStatus, UserRole, Department, Ticket as TicketType } from '@/types';
import { canUserEditTicket, canUserAssignTickets } from '@/lib/ticketPermissions';
import { TicketAssignmentModal } from '@/components/ticket-assignment-modal';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Filters {
  status: TicketStatus | 'all';
  priority: string;
  assignee: string;
  search: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export default function AdminTicketsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const departmentId = params.departmentId as string;

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);

  // Assignment modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<TicketType | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'bulk'>('single');

  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC'
  });

  // Check if user has admin access to this department
  const hasAdminAccess = user?.role && (
    // System-wide admin access
    ['admin', 'super_admin'].includes(user.role) ||
    // Department-specific access (user belongs to this department)
    (user.departmentId === departmentId && ['manager', 'team_lead'].includes(user.role))
  );

  useEffect(() => {
    if (!hasAdminAccess) {
      router.push('/tickets');
      return;
    }

    if (departmentId) {
      loadDepartmentInfo();
      loadTickets();
    }
  }, [departmentId, hasAdminAccess, currentPage, filters]);

  const loadDepartmentInfo = async () => {
    try {
      const dept = await departmentService.getDepartmentById(departmentId);
      setDepartment(dept);
    } catch (err) {
      console.error('Failed to load department info:', err);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDepartmentTickets(departmentId, {
        page: currentPage,
        limit: 20,
        status: filters.status === 'all' ? undefined : filters.status,
        priority: filters.priority === 'all' ? undefined : filters.priority,
        assignee: filters.assignee === 'all' ? undefined : filters.assignee,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      setTickets(response.tickets || []);
      setTotalTickets(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
      setError(null);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    const newSelected = new Set(selectedTickets);
    if (checked) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(new Set(tickets.map(t => t.id)));
    } else {
      setSelectedTickets(new Set());
    }
  };

  const handleBulkAssign = async (assigneeId: string) => {
    if (selectedTickets.size === 0) return;

    try {
      setBulkLoading(true);
      await adminService.bulkAssignTickets(
        Array.from(selectedTickets),
        assigneeId
      );
      await loadTickets();
      setSelectedTickets(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign tickets');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (status: TicketStatus) => {
    if (selectedTickets.size === 0) return;

    try {
      setBulkLoading(true);
      await adminService.bulkUpdateStatus(
        Array.from(selectedTickets),
        status
      );
      await loadTickets();
      setSelectedTickets(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tickets');
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle assignment modal opening
  const handleOpenAssignModal = (ticket?: TicketType, mode: 'single' | 'bulk' = 'single') => {
    if (!canUserAssignTickets(user)) {
      setError('You do not have permission to assign tickets');
      return;
    }

    setTicketToAssign(ticket || null);
    setAssignmentMode(mode);
    setIsAssignModalOpen(true);
  };

  // Handle ticket assignment from modal
  const handleAssignTicket = async (assigneeId: string, assigneeName: string) => {
    try {
      if (assignmentMode === 'bulk' && selectedTickets.size > 0) {
        // Bulk assignment
        await adminService.bulkAssignTickets(Array.from(selectedTickets), assigneeId);
        setSelectedTickets(new Set());
      } else if (assignmentMode === 'single' && ticketToAssign) {
        // Single ticket assignment - use ticket service directly
        await ticketService.assignTicket(ticketToAssign.id, { assigneeId });
      }

      await loadTickets(); // Refresh the ticket list
    } catch (error) {
      console.error('Failed to assign ticket:', error);
      throw new Error('Failed to assign ticket. Please try again.');
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case TicketStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case TicketStatus.PENDING:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case TicketStatus.RESOLVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case TicketStatus.CLOSED:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case TicketStatus.CANCELLED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatStatus = (status: TicketStatus) => {
    return status.replace('_', ' ').toUpperCase();
  };

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 gap-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
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
              {department?.name} - Ticket Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage tickets for your department
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={loadTickets}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => router.push(`/admin/dashboard/${departmentId}`)}
              variant="outline"
            >
              <Building className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tickets..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                  <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TicketStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                  <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
                  <SelectItem value={TicketStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Assignee Filter */}
              <Select value={filters.assignee} onValueChange={(value) => handleFilterChange('assignee', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value={user?.id || ''}>My tickets</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={`${filters.sortBy}_${filters.sortOrder}`} onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split('_');
                setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'ASC' | 'DESC' }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt_DESC">Newest first</SelectItem>
                  <SelectItem value="createdAt_ASC">Oldest first</SelectItem>
                  <SelectItem value="updatedAt_DESC">Recently updated</SelectItem>
                  <SelectItem value="priority_DESC">High priority first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedTickets.size > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedTickets.size} ticket(s) selected
                </span>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={bulkLoading}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBulkAssign(user?.id || '')}>
                        <User className="h-4 w-4 mr-2" />
                        Myself
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAssignModal(undefined, 'bulk')}>
                        <Users className="h-4 w-4 mr-2" />
                        Others...
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAssign('')}>
                        <User className="h-4 w-4 mr-2" />
                        Unassign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={bulkLoading}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Update Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Change status to</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBulkStatusUpdate(TicketStatus.IN_PROGRESS)}>
                        In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusUpdate(TicketStatus.PENDING)}>
                        Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusUpdate(TicketStatus.RESOLVED)}>
                        Resolved
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusUpdate(TicketStatus.CLOSED)}>
                        Closed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedTickets(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tickets ({totalTickets})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedTickets.size === tickets.length && tickets.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Select all</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tickets.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No tickets found</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Try adjusting your filters or search terms
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Checkbox
                      checked={selectedTickets.has(ticket.id)}
                      onCheckedChange={(checked) => handleSelectTicket(ticket.id, checked as boolean)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          #{ticket.ticketNumber}
                        </span>
                        <Badge className={getStatusColor(ticket.status)}>
                          {formatStatus(ticket.status)}
                        </Badge>
                        {ticket.priority && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: ticket.priority.color }}
                            title={ticket.priority.name}
                          />
                        )}
                      </div>
                      
                      <h3 className="font-medium text-gray-900 dark:text-white truncate mb-1">
                        {ticket.title}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(ticket.createdAt)}</span>
                        </div>
                        {ticket.requester && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{ticket.requester.displayName}</span>
                          </div>
                        )}
                        {ticket.assignee && (
                          <div className="flex items-center gap-1">
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                              {ticket.assignee.displayName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/tickets/${ticket.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {canUserEditTicket(user, ticket) && (
                          <DropdownMenuItem onClick={() => router.push(`/tickets/${ticket.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Ticket
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleBulkAssign(user?.id || '')}
                          className="text-blue-600 dark:text-blue-400"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign to me
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleOpenAssignModal(ticket, 'single')}
                          className="text-green-600 dark:text-green-400"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Assign to others
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalTickets)} of {totalTickets} tickets
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Assignment Modal */}
      <TicketAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignTicket}
        ticket={ticketToAssign}
        ticketIds={assignmentMode === 'bulk' ? Array.from(selectedTickets) : undefined}
      />
    </div>
  );
} 