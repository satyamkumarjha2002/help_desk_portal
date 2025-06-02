'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  LogOut, 
  Settings, 
  HelpCircle, 
  TicketIcon,
  Home,
  Plus,
  ChevronDown,
  Activity,
  Users,
  BarChart3,
  Shield,
  Building,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActiveRoute = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true;
    if (path !== '/dashboard' && pathname.startsWith(path)) return true;
    return false;
  };

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case UserRole.ADMIN:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case UserRole.MANAGER:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case UserRole.TEAM_LEAD:
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case UserRole.AGENT:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatRoleName = (role?: UserRole) => {
    if (!role) return 'User';
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const navItems = [
    { 
      href: '/dashboard', 
      label: 'Dashboard', 
      icon: Home,
      show: true 
    },
    { 
      href: '/tickets', 
      label: 'Tickets', 
      icon: TicketIcon,
      show: true 
    },
    { 
      href: '/faq', 
      label: 'AI Assistant', 
      icon: MessageSquare,
      show: true 
    },
    { 
      href: '/tickets/new', 
      label: 'New Ticket', 
      icon: Plus,
      show: true,
      highlight: true
    },
  ];

  const adminItems = [
    // Department Admin Items - Show if user has a department
    ...(user?.departmentId ? [
      {
        href: `/admin/dashboard/${user.departmentId}`,
        label: 'Department Dashboard',
        icon: BarChart3,
        show: true
      },
      {
        href: `/admin/tickets/${user.departmentId}`,
        label: 'Manage Tickets',
        icon: TicketIcon,
        show: true
      },
      {
        href: `/admin/team/${user.departmentId}`,
        label: 'Team Management',
        icon: Users,
        show: true
      },
      {
        href: `/admin/analytics/${user.departmentId}`,
        label: 'Analytics',
        icon: BarChart3,
        show: true
      }
    ] : []),
    
    // System Admin Items - Show only for super admins and system admins
    {
      href: '/admin/users',
      label: 'All Users',
      icon: Users,
      show: user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
    },
    {
      href: '/admin/departments',
      label: 'All Departments',
      icon: Building,
      show: user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
    },
    {
      href: '/admin/faq',
      label: 'FAQ Management',
      icon: MessageSquare,
      show: user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
    },
    {
      href: '/admin/system',
      label: 'System Settings',
      icon: Settings,
      show: user?.role === UserRole.SUPER_ADMIN
    }
  ];

  // User has admin access if they have a department OR are system admin
  const hasAdminAccess = user?.departmentId || user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="w-full">
        <div className="flex h-16 items-center px-4 md:px-6 lg:px-8" style={{ boxSizing: 'border-box' }}>
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4" style={{ flexShrink: 0, minWidth: 'fit-content' }}>
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-2 group outline-none focus:outline-none"
              style={{ outline: 'none !important', boxSizing: 'border-box' }}
            >
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-200">
                <HelpCircle className="h-6 w-6 text-white" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Help Desk Portal
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Support Management System</p>
              </div>
            </Link>
          </div>

          {/* Center Navigation */}
          <nav className="flex-1 flex items-center justify-center px-6" style={{ minWidth: 0 }}>
            <div className="flex items-center space-x-1">
              {navItems.filter(item => item.show).map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                      "outline-none focus:outline-none",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
                      item.highlight && !isActive && "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    )}
                    style={{ 
                      outline: 'none !important', 
                      boxSizing: 'border-box',
                      minWidth: 'fit-content',
                      flexShrink: 0
                    }}
                  >
                    <Icon className={cn(
                      "h-4 w-4",
                      item.highlight && !isActive && "text-blue-600 dark:text-blue-400"
                    )} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
                    )}
                  </Link>
                );
              })}

              {/* Admin Dropdown */}
              {hasAdminAccess && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium",
                        "outline-none focus:outline-none",
                        pathname.startsWith('/admin')
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      )}
                      style={{ 
                        outline: 'none !important', 
                        boxSizing: 'border-box',
                        minWidth: 'fit-content',
                        flexShrink: 0
                      }}
                    >
                      <Shield className="h-4 w-4" style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap' }}>Admin</span>
                      <ChevronDown className="h-3 w-3" style={{ flexShrink: 0 }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-56">
                    <DropdownMenuLabel className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Administration</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {adminItems.filter(item => item.show).map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href} className="flex items-center outline-none focus:outline-none">
                            <Icon className="mr-2 h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2" style={{ flexShrink: 0, minWidth: 'fit-content' }}>
            {/* Activity Indicator */}
            <div className="hidden lg:flex items-center space-x-2 mr-4">
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <Activity className="h-3 w-3" />
                <span>Online</span>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>

            {/* Theme Switcher */}
            <div style={{ flexShrink: 0, width: '40px', height: '40px' }}>
              <ThemeSwitcher />
            </div>

            {/* Notification Bell */}
            <div style={{ flexShrink: 0 }}>
              <NotificationBell />
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-10 rounded-lg px-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors outline-none focus:outline-none"
                  style={{ 
                    outline: 'none !important', 
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    minWidth: 'fit-content'
                  }}
                >
                  <div className="flex items-center space-x-2" style={{ minWidth: 0 }}>
                    <Avatar className="h-8 w-8 ring-2 ring-gray-200 dark:ring-gray-700" style={{ flexShrink: 0 }}>
                      <AvatarImage src={user?.profilePictureUrl} alt={user?.displayName || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        {user?.displayName ? getInitials(user.displayName) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left" style={{ minWidth: 0, maxWidth: '150px' }}>
                      <p className="text-sm font-medium text-gray-900 dark:text-white" style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {user?.displayName || 'User'}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs h-5 px-2",
                          getRoleBadgeColor(user?.role)
                        )}
                      >
                        {formatRoleName(user?.role)}
                      </Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block" style={{ flexShrink: 0 }} />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user?.profilePictureUrl} alt={user?.displayName || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        {user?.displayName ? getInitials(user.displayName) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.displayName || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs w-fit",
                          getRoleBadgeColor(user?.role)
                        )}
                      >
                        {formatRoleName(user?.role)}
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                {user?.role !== UserRole.END_USER && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin/activity" className="flex items-center cursor-pointer">
                        <Activity className="mr-2 h-4 w-4" />
                        <span>Activity Log</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
} 