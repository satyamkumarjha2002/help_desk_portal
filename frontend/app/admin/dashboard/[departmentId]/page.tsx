'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/app-header';
import { 
  Users, 
  Ticket, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Timer,
  Activity,
  BarChart3,
  UserCheck,
  Settings,
  ArrowUp,
  FileText,
  Target
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { departmentService } from '@/services/departmentService';
import { useAuth } from '@/contexts/AuthContext';
import { Department } from '@/types';

interface DashboardData {
  department: {
    id: string;
    name: string;
    description: string;
    teamSize: number;
  };
  statistics: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    recentTickets: number;
    averageResponseTime: number;
  };
  urgentTickets: any[];
  summary: {
    activeTickets: number;
    completionRate: number;
    workload: string;
  };
}

export default function AdminDashboard() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const departmentId = params.departmentId as string;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has admin/manager access to this specific department
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
      loadDashboardData();
      loadDepartmentInfo();
    }
  }, [departmentId, hasAdminAccess]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDepartmentDashboard(departmentId);
      setDashboard(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentInfo = async () => {
    try {
      const dept = await departmentService.getDepartmentById(departmentId);
      setDepartment(dept);
    } catch (err) {
      console.error('Failed to load department info:', err);
    }
  };

  const getWorkloadColor = (workload: string) => {
    switch (workload.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={loadDashboardData} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No dashboard data available.</AlertDescription>
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
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {dashboard.department.name} Dashboard
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              {dashboard.department.description}
            </p>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" />
                {dashboard.department.teamSize} team members
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => router.push(`/admin/tickets/${departmentId}`)}
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage Tickets
            </Button>
            <Button 
              onClick={() => router.push(`/admin/analytics/${departmentId}`)}
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.statistics.totalTickets}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.statistics.recentTickets} created this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.summary.activeTickets}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.statistics.openTickets} open, {dashboard.statistics.inProgressTickets} in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.summary.completionRate}%</div>
              <Progress value={dashboard.summary.completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {adminService.formatDuration(dashboard.statistics.averageResponseTime)}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 100 resolved tickets
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Team & Workload Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Overview
              </CardTitle>
              <CardDescription>
                {dashboard.department.teamSize} team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Team Size</span>
                  <Badge variant="secondary">{dashboard.department.teamSize}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Workload Level</span>
                  <Badge 
                    className={getWorkloadColor(dashboard.summary.workload)}
                  >
                    {dashboard.summary.workload}
                  </Badge>
                </div>
                <Button 
                  onClick={() => router.push(`/admin/team/${departmentId}`)}
                  variant="outline" 
                  className="w-full"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Manage Team
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Urgent Tickets
              </CardTitle>
              <CardDescription>
                High priority tickets requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.urgentTickets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No urgent tickets!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.urgentTickets.slice(0, 5).map((ticket) => (
                    <div 
                      key={ticket.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{ticket.ticketNumber}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ticket.title}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                  {dashboard.urgentTickets.length > 5 && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => router.push(`/admin/tickets/${departmentId}?priority=high`)}
                    >
                      View All {dashboard.urgentTickets.length} Urgent Tickets
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common administrative tasks for this department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => router.push(`/admin/tickets/${departmentId}`)}
              >
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-sm">Manage Tickets</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => router.push(`/admin/team/${departmentId}`)}
              >
                <Users className="h-6 w-6 mb-2" />
                <span className="text-sm">Team Workload</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => router.push(`/admin/analytics/${departmentId}`)}
              >
                <BarChart3 className="h-6 w-6 mb-2" />
                <span className="text-sm">Analytics</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => router.push(`/admin/tickets/${departmentId}?status=open`)}
              >
                <ArrowUp className="h-6 w-6 mb-2" />
                <span className="text-sm">Assign Tickets</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {dashboard.statistics.resolvedTickets}
                </div>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboard.statistics.inProgressTickets}
                </div>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboard.statistics.openTickets}
                </div>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboard.summary.completionRate}%
                </div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 