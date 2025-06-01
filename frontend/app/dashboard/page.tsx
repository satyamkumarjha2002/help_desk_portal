'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ticketService } from '@/services/ticketService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/app-header';
import { 
  TicketIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  ArrowRight,
  User,
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Users,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import { Ticket, TicketStatus, UserRole } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { withProtectedPage } from '@/lib/withAuth';

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  myAssignedTickets: number;
  unassignedTickets: number;
  slaBreaches: number;
}

function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    myAssignedTickets: 0,
    unassignedTickets: 0,
    slaBreaches: 0,
  });
  
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch the 5 most recent tickets (latest first)
      const recentResponse = await ticketService.getTickets({
        page: 1,
        limit: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      setRecentTickets(recentResponse.tickets);

      // Fetch my assigned tickets (for agents) - also limit to 5 latest
      if (user.role !== UserRole.END_USER) {
        const myTicketsResponse = await ticketService.getTickets({
          page: 1,
          limit: 5,
          assigneeId: user.id,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        setMyTickets(myTicketsResponse.tickets);
      }

      // Calculate stats from the tickets
      const allTicketsResponse = await ticketService.getTickets({
        page: 1,
        limit: 1000, // Get all tickets for stats calculation
      });

      const tickets = allTicketsResponse.tickets;
      const newStats: DashboardStats = {
        totalTickets: allTicketsResponse.total,
        openTickets: tickets.filter(t => t.status === TicketStatus.OPEN).length,
        inProgressTickets: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
        resolvedTickets: tickets.filter(t => t.status === TicketStatus.RESOLVED).length,
        myAssignedTickets: tickets.filter(t => t.assignee?.id === user.id).length,
        unassignedTickets: tickets.filter(t => !t.assignee).length,
        slaBreaches: 0, // TODO: Implement SLA breach calculation
      };

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  if (!user) {
    return null;
  }

  // Show loading while authentication state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <AppHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading skeleton */}
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate percentage for progress indicators
  const openPercentage = stats.totalTickets > 0 ? (stats.openTickets / stats.totalTickets) * 100 : 0;
  const resolvedPercentage = stats.totalTickets > 0 ? (stats.resolvedTickets / stats.totalTickets) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with improved styling */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Welcome back, {user.displayName}!
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                Here's what's happening with your tickets today.
              </p>
            </div>
            <div className="hidden lg:block">
              <Activity className="h-16 w-16 text-gray-300 dark:text-gray-700" />
            </div>
          </div>
        </div>

        {/* Quick Actions with enhanced design */}
        <div className="mb-10">
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-200" asChild>
              <Link href="/tickets/new">
                <Plus className="h-5 w-5 mr-2" />
                Create New Ticket
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="shadow-md hover:shadow-lg transition-all duration-200" asChild>
              <Link href="/tickets">
                <TicketIcon className="h-5 w-5 mr-2" />
                View All Tickets
              </Link>
            </Button>
            {user.role !== UserRole.END_USER && (
              <Button variant="outline" size="lg" className="shadow-md hover:shadow-lg transition-all duration-200" asChild>
                <Link href="/tickets?assigneeId=unassigned">
                  <Clock className="h-5 w-5 mr-2" />
                  Unassigned Queue ({stats.unassignedTickets})
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards with gradient backgrounds */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Tickets Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-10 dark:opacity-20"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Tickets</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TicketIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTickets}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                All tickets in the system
              </p>
              <div className="mt-3 flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600">+12% from last week</span>
              </div>
            </CardContent>
          </Card>

          {/* Open Tickets Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10 dark:opacity-20"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Open Tickets</CardTitle>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.openTickets}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Awaiting attention
              </p>
              <div className="mt-3">
                <Progress value={openPercentage} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">{openPercentage.toFixed(0)}% of total</p>
              </div>
            </CardContent>
          </Card>

          {/* In Progress Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-yellow-600 opacity-10 dark:opacity-20"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">In Progress</CardTitle>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inProgressTickets}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Being worked on
              </p>
              <div className="mt-3 flex items-center text-sm">
                <Activity className="h-4 w-4 text-blue-600 mr-1" />
                <span className="text-blue-600">Active work</span>
              </div>
            </CardContent>
          </Card>

          {/* Resolved Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-10 dark:opacity-20"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Resolved</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.resolvedTickets}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Successfully completed
              </p>
              <div className="mt-3">
                <Progress value={resolvedPercentage} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">{resolvedPercentage.toFixed(0)}% resolution rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent-specific stats with improved design */}
        {user.role !== UserRole.END_USER && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-10 dark:opacity-20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">My Assigned</CardTitle>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.myAssignedTickets}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Personal workload
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 opacity-10 dark:opacity-20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Unassigned</CardTitle>
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.unassignedTickets}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Need assignment
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-600 opacity-10 dark:opacity-20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Team Performance</CardTitle>
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">87%</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Average resolution rate
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tickets with enhanced design */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Tickets</CardTitle>
                  <CardDescription className="mt-1">
                    Latest 5 tickets in the system
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="hover:bg-white dark:hover:bg-gray-600" asChild>
                  <Link href="/tickets">
                    <span className="mr-1">View All</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentTickets.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">No recent tickets</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                              #{ticket.ticketNumber}
                            </span>
                            <Badge className={`${getStatusColor(ticket.status)} text-xs`}>
                              {formatStatus(ticket.status)}
                            </Badge>
                            {ticket.priority && (
                              <div 
                                className="w-2 h-2 rounded-full ring-2 ring-white dark:ring-gray-800" 
                                style={{ backgroundColor: ticket.priority.color }}
                                title={ticket.priority.name}
                              />
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {ticket.title}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
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
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors ml-4 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Assigned Tickets with enhanced design */}
          {user.role !== UserRole.END_USER && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">My Assigned Tickets</CardTitle>
                    <CardDescription className="mt-1">
                      Your personal workload
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="hover:bg-white dark:hover:bg-gray-600" asChild>
                    <Link href={`/tickets?assigneeId=${user.id}`}>
                      <span className="mr-1">View All</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {myTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No assigned tickets</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Check the unassigned queue</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {myTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                #{ticket.ticketNumber}
                              </span>
                              <Badge className={`${getStatusColor(ticket.status)} text-xs`}>
                                {formatStatus(ticket.status)}
                              </Badge>
                              {ticket.priority && (
                                <div 
                                  className="w-2 h-2 rounded-full ring-2 ring-white dark:ring-gray-800" 
                                  style={{ backgroundColor: ticket.priority.color }}
                                  title={ticket.priority.name}
                                />
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {ticket.title}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(ticket.createdAt)}</span>
                              </div>
                              {ticket.category && (
                                <div className="flex items-center gap-1">
                                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                    {ticket.category.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors ml-4 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

// Use the HOC to protect this page
export default withProtectedPage(DashboardPage); 