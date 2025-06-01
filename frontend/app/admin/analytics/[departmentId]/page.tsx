'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/app-header';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Ticket,
  Clock,
  Target,
  AlertTriangle,
  Activity,
  Calendar,
  FileText,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { departmentService } from '@/services/departmentService';
import { Department } from '@/types';

export default function AdminAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const departmentId = params.departmentId as string;

  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, [departmentId, hasAdminAccess]);

  const loadDepartmentInfo = async () => {
    try {
      setLoading(true);
      const dept = await departmentService.getDepartmentById(departmentId);
      setDepartment(dept);
      setError(null);
    } catch (err) {
      console.error('Failed to load department info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load department info');
    } finally {
      setLoading(false);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
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
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={loadDepartmentInfo} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
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
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/admin/dashboard/${departmentId}`)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {department?.name} Analytics
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Detailed analytics and performance metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => router.push(`/admin/tickets/${departmentId}`)}
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage Tickets
            </Button>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">Analytics Dashboard Coming Soon</CardTitle>
            <CardDescription className="text-lg mt-2">
              Advanced analytics and reporting features are currently under development
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <div className="space-y-4 max-w-2xl mx-auto">
              <p className="text-gray-600 dark:text-gray-400">
                The analytics dashboard will provide comprehensive insights into your department's performance, 
                including detailed charts, trends, and reporting capabilities.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Performance Metrics</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track response times, resolution rates, and team performance
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Visual Reports</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Interactive charts and graphs for data visualization
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Historical Trends</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analyze patterns and trends over time
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Team Analytics</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Individual and team performance insights
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  In the meantime, you can view basic metrics on the dashboard page
                </p>
                <Button 
                  onClick={() => router.push(`/admin/dashboard/${departmentId}`)}
                  className="mt-4"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  View Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 