'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppHeader } from '@/components/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, 
  CheckCheck, 
  Search, 
  Filter,
  Calendar,
  User,
  MessageCircle, 
  UserPlus, 
  Edit, 
  PlusCircle,
  CheckCircle,
  XCircle,
  AtSign,
  MessageSquare,
  RefreshCw,
  Clock,
  AlertTriangle,
  Loader2,
  MoreVertical,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const iconMap: Record<string, React.ComponentType<any>> = {
  'user-plus': UserPlus,
  'edit': Edit,
  'message-circle': MessageCircle,
  'plus-circle': PlusCircle,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'clock': Clock,
  'alert-triangle': AlertTriangle,
  'at-sign': AtSign,
  'message-square': MessageSquare,
  'bell': Bell,
  'refresh-cw': RefreshCw,
};

const colorMap: Record<string, string> = {
  blue: 'text-blue-500',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
  purple: 'text-purple-500',
  gray: 'text-gray-500',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { 
    notifications = [],
    unreadCount = 0,
    isLoading, 
    markAsRead, 
    markAllAsRead,
    loadNotifications 
  } = useNotifications();
  
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (loadNotifications) {
      loadNotifications(currentPage);
    }
  }, [currentPage, loadNotifications]);

  const handleNotificationClick = async (notification: any, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // Navigate to the notification URL
    const targetUrl = notification.actionUrl || '/dashboard';
    router.push(targetUrl);
  };

  const handleMarkAllRead = async () => {
    setLocalLoading(true);
    try {
      await markAllAsRead();
    } finally {
      setLocalLoading(false);
    }
  };

  // Filter notifications based on current filter and search term
  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'unread' && !notification.isRead) ||
      (filter === 'read' && notification.isRead);
    
    const matchesSearch = !searchTerm || 
      notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p>Please log in to view notifications.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Stay updated with all your help desk activities
              </p>
            </div>
            
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllRead}
                disabled={localLoading}
                variant="outline"
              >
                {localLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Mark all read ({unreadCount})
              </Button>
            )}
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold">{notifications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
                    <p className="text-2xl font-bold">{unreadCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Read</p>
                    <p className="text-2xl font-bold">{notifications.length - unreadCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter notifications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All notifications</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
                <SelectItem value="read">Read only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {filter === 'all' && !searchTerm ? 'No notifications yet' :
                   filter === 'unread' ? 'No unread notifications' :
                   filter === 'read' ? 'No read notifications' :
                   'No notifications found'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {filter === 'all' && !searchTerm ? 
                    'When you receive notifications, they\'ll appear here.' :
                    'Try adjusting your filters or search terms.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const IconComponent = iconMap[notification.icon || 'bell'] || Bell;
              const colorClass = colorMap[notification.color || 'gray'] || 'text-gray-500';
              
              return (
                <Card 
                  key={notification.id}
                  className={`transition-all hover:shadow-md cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={(e) => handleNotificationClick(notification, e)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 mt-1 ${colorClass}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className={`text-sm font-medium ${
                                !notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.title || 'Notification'}
                              </h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {notification.message || 'No message available'}
                            </p>
                            
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-500 space-x-4">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : 'Unknown time'}
                              </span>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!notification.isRead && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              {notification.actionUrl && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(notification.actionUrl, '_blank');
                                }}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Open in new tab
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Load More Button */}
        {filteredNotifications.length > 0 && filteredNotifications.length >= 20 && (
          <div className="text-center mt-8">
            <Button 
              onClick={() => setCurrentPage(prev => prev + 1)}
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Load more notifications
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 