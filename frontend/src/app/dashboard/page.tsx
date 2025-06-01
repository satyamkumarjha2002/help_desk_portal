'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ticketService } from '@/services/ticketService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app-header';
import { TicketStats, Ticket, TicketStatus } from '@/types';
import { 
  TicketIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon,
  PlusIcon,
  UserIcon
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [statsData, ticketsData] = await Promise.allSettled([
          ticketService.getTicketStats(),
          ticketService.getTickets({ limit: 5 })
        ]);
        
        // Handle stats data
        if (statsData.status === 'fulfilled') {
          setStats(statsData.value);
        } else {
          console.error('Error fetching ticket stats:', statsData.reason);
          // Set default stats if API fails
          setStats({
            total: 0,
            open: 0,
            inProgress: 0,
            resolved: 0,
            overdue: 0
          });
        }

        // Handle tickets data  
        if (ticketsData.status === 'fulfilled') {
          setRecentTickets(ticketsData.value.tickets || []);
        } else {
          console.error('Error fetching recent tickets:', ticketsData.reason);
          setRecentTickets([]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set fallback data
        setStats({
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          overdue: 0
        });
        setRecentTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      case TicketStatus.IN_PROGRESS:
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case TicketStatus.RESOLVED:
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case TicketStatus.CLOSED:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Welcome back, {user?.displayName}!</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium dark:text-gray-300">Total Tickets</CardTitle>
                <TicketIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold dark:text-white">{stats.total}</div>
                <p className="text-xs text-muted-foreground">All time tickets</p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium dark:text-gray-300">Open Tickets</CardTitle>
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.open}</div>
                <p className="text-xs text-muted-foreground">Awaiting response</p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium dark:text-gray-300">In Progress</CardTitle>
                <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground">Being worked on</p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium dark:text-gray-300">Resolved</CardTitle>
                <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolved}</div>
                <p className="text-xs text-muted-foreground">Successfully resolved</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Recent Tickets</CardTitle>
              <CardDescription className="dark:text-gray-400">Your latest ticket activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTickets.length > 0 ? (
                <div className="space-y-4">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-600 dark:bg-gray-700/50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm dark:text-gray-300">{ticket.ticketNumber}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {ticket.status ? ticket.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-white mt-1">{ticket.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Created {formatDate(ticket.createdAt)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/tickets/${ticket.id}`}>View</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No tickets found</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Quick Actions</CardTitle>
              <CardDescription className="dark:text-gray-400">Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" asChild>
                <Link href="/tickets/new">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create New Ticket
                </Link>
              </Button>
              
              <Button variant="outline" className="w-full" asChild>
                <Link href="/tickets">
                  <TicketIcon className="h-4 w-4 mr-2" />
                  View All Tickets
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 