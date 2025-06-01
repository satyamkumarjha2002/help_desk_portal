'use client';

import React, { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  MessageCircle, 
  UserPlus, 
  Edit, 
  PlusCircle,
  CheckCircle,
  XCircle,
  AtSign,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

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

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    loadNotifications 
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="pb-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-8 px-2 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading notifications...
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentNotifications.map((notification) => {
                const IconComponent = iconMap[notification.icon] || Bell;
                const colorClass = colorMap[notification.color] || 'text-gray-500';
                
                return (
                  <Link
                    key={notification.id}
                    href={notification.actionUrl}
                    onClick={() => handleNotificationClick(notification)}
                    className={`block p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l-4 ${
                      notification.isRead 
                        ? 'border-transparent' 
                        : notification.isHighPriority 
                          ? 'border-red-500' 
                          : 'border-blue-500'
                    } ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 mt-1 ${colorClass}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm font-medium truncate ${
                            !notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link href="/notifications">
                <Button variant="ghost" className="w-full justify-center text-sm">
                  View all notifications
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 