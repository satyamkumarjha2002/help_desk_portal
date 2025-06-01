'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { ticketService } from '@/services/ticketService';
import { departmentService } from '@/services/departmentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppHeader } from '@/components/app-header';
import { 
  Search, 
  Plus, 
  Filter, 
  Loader2,
  TicketIcon,
  Calendar,
  User,
  Building,
  UserPlus,
  CheckSquare,
  Square,
  CheckCircle
} from 'lucide-react';
import { Ticket, TicketStatus, Department } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { withProtectedPage } from '@/lib/withAuth';

function TicketsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [error, setError] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  
  // New state for bulk operations
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const pageSize = 10;

  // Handle URL parameters
  useEffect(() => {
    const assigneeId = searchParams.get('assigneeId');
    if (assigneeId === 'unassigned') {
      setAssigneeFilter('unassigned');
    } else if (assigneeId && user && assigneeId === user.id) {
      setAssigneeFilter('me');
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!user) return;

    const fetchDepartments = async () => {
      try {
        const departments = await departmentService.getActiveDepartments();
        setDepartments(departments);
      } catch (error) {
        // Handle error silently
      }
    };

    fetchDepartments();
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [currentPage, statusFilter, departmentFilter, assigneeFilter, searchTerm, assignedToMe]);

  const fetchTickets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let assigneeId: string | undefined;
      if (assigneeFilter === 'unassigned') {
        assigneeId = 'unassigned';
      } else if (assigneeFilter === 'me') {
        assigneeId = user.id;
      }

      const response = await ticketService.getTickets({
        page: currentPage,
        limit: pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
        departmentId: departmentFilter === 'all' ? undefined : departmentFilter,
        assigneeId,
        search: searchTerm || undefined,
      });

      setTickets(response.tickets);
      setTotalTickets(response.total);
      setTotalPages(Math.ceil(response.total / pageSize));
      setSelectedTickets(new Set()); // Clear selection when fetching new data
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as TicketStatus | 'all');
    setCurrentPage(1);
  };

  const handleDepartmentFilter = (value: string) => {
    setDepartmentFilter(value);
    setCurrentPage(1);
  };

  const handleAssigneeFilter = (value: string) => {
    setAssigneeFilter(value);
    setCurrentPage(1);
  };

  // Bulk selection handlers
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
      const unassignedTickets = tickets.filter(ticket => !ticket.assignee);
      setSelectedTickets(new Set(unassignedTickets.map(t => t.id)));
    } else {
      setSelectedTickets(new Set());
    }
  };

  // Assign selected tickets to current user
  const handleAssignToMe = async () => {
    if (selectedTickets.size === 0 || !user) return;

    setBulkLoading(true);
    setError(''); // Clear any existing error
    try {
      const assignmentPromises = Array.from(selectedTickets).map(ticketId =>
        ticketService.assignTicket(ticketId, { assigneeId: user.id })
      );

      await Promise.all(assignmentPromises);
      
      setSuccessMessage(`Successfully assigned ${selectedTickets.size} ticket(s) to yourself!`);
      setSelectedTickets(new Set());
      await fetchTickets(); // Refresh the ticket list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to assign tickets:', error);
      setError('Failed to assign tickets. Please try again.');
    } finally {
      setBulkLoading(false);
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatStatus = (status: TicketStatus) => {
    return status.replace('_', ' ').toUpperCase();
  };

  // user is guaranteed to exist here because of withAuth wrapper
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tickets</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage and track your support tickets
              </p>
            </div>
            <Button asChild>
              <Link href="/tickets/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
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

              {/* Department Filter */}
              <Select value={departmentFilter} onValueChange={handleDepartmentFilter}>
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

              {/* Assignee Filter */}
              <Select value={assigneeFilter} onValueChange={handleAssigneeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="me">Assigned to me</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDepartmentFilter('all');
                  setAssigneeFilter('all');
                  setCurrentPage(1);
                  setError('');
                  setSuccessMessage('');
                }}
                className="whitespace-nowrap"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {tickets.length} of {totalTickets} tickets
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="mb-4 bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Bulk Actions for Unassigned Tickets */}
        {assigneeFilter === 'unassigned' && tickets.some(ticket => !ticket.assignee) && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedTickets.size > 0 && selectedTickets.size === tickets.filter(t => !t.assignee).length}
                      onCheckedChange={handleSelectAll}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Select all unassigned ({tickets.filter(t => !t.assignee).length})
                    </label>
                  </div>
                  
                  {selectedTickets.size > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedTickets.size} ticket(s) selected
                    </span>
                  )}
                </div>

                {selectedTickets.size > 0 && (
                  <Button
                    onClick={handleAssignToMe}
                    disabled={bulkLoading}
                    className="flex items-center gap-2"
                  >
                    {bulkLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Assign to Me ({selectedTickets.size})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No tickets found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || (statusFilter !== 'all') || (departmentFilter !== 'all')
                  ? 'Try adjusting your filters or search terms.'
                  : 'Get started by creating your first ticket.'}
              </p>
              <Button asChild>
                <Link href="/tickets/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const isUnassigned = !ticket.assignee;
              const isSelected = selectedTickets.has(ticket.id);
              const showCheckbox = assigneeFilter === 'unassigned' && isUnassigned;

              return (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Checkbox for unassigned tickets */}
                      {showCheckbox && (
                        <div className="flex-shrink-0 pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectTicket(ticket.id, checked === true)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}

                      {/* Ticket content */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                                #{ticket.ticketNumber}
                              </span>
                              <Badge className={getStatusColor(ticket.status)}>
                                {formatStatus(ticket.status)}
                              </Badge>
                              {ticket.priority && (
                                <div 
                                  className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-800" 
                                  style={{ backgroundColor: ticket.priority.color }}
                                  title={ticket.priority.name}
                                />
                              )}
                              {isUnassigned && (
                                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20">
                                  Unassigned
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate">
                              {ticket.title}
                            </h3>
                            
                            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(ticket.createdAt)}</span>
                              </div>
                              
                              {ticket.requester && (
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>{ticket.requester.displayName}</span>
                                </div>
                              )}
                              
                              {ticket.department && (
                                <div className="flex items-center gap-1">
                                  <Building className="h-4 w-4" />
                                  <span>{ticket.department.name}</span>
                                </div>
                              )}
                              
                              {ticket.assignee && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                                    Assigned to {ticket.assignee.displayName}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-4 flex-shrink-0">
                            {ticket.category && (
                              <span className="inline-block px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                                {ticket.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick assign button for individual tickets when not in bulk mode */}
                      {isUnassigned && assigneeFilter !== 'unassigned' && (
                        <div className="flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTicket(ticket.id, true);
                              setTimeout(() => handleAssignToMe(), 100);
                            }}
                            disabled={bulkLoading}
                            className="flex items-center gap-1"
                          >
                            <UserPlus className="h-3 w-3" />
                            Assign to Me
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
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
      </main>
    </div>
  );
}

// Use the HOC to protect this page
export default withProtectedPage(TicketsPage); 