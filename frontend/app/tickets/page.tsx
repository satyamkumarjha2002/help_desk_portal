'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ticketService } from '@/services/ticketService';
import { departmentService } from '@/services/departmentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/app-header';
import { 
  Search, 
  Plus, 
  Filter, 
  Loader2,
  TicketIcon,
  Calendar,
  User,
  Building
} from 'lucide-react';
import { Ticket, TicketStatus, Department } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { withProtectedPage } from '@/lib/withAuth';

function TicketsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [error, setError] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);

  const pageSize = 10;

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
  }, [currentPage, statusFilter, departmentFilter, searchTerm, assignedToMe]);

  const fetchTickets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await ticketService.getTickets({
        page: currentPage,
        limit: pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
        departmentId: departmentFilter === 'all' ? undefined : departmentFilter,
        search: searchTerm || undefined,
      });

      setTickets(response.tickets);
      setTotalTickets(response.total);
      setTotalPages(Math.ceil(response.total / pageSize));
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDepartmentFilter('all');
                  setCurrentPage(1);
                }}
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
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6" onClick={() => router.push(`/tickets/${ticket.id}`)}>
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
                </CardContent>
              </Card>
            ))}
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