'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/app-header';
import { UserRole } from '@/types';

interface AuthWrapperProps {
  children: React.ReactNode;
  /**
   * Page protection type:
   * - 'public': No authentication required
   * - 'protected': Authentication required, redirects to login if not authenticated
   * - 'auth-only': Only non-authenticated users (login/register pages)
   */
  protection?: 'public' | 'protected' | 'auth-only';
  /**
   * Required user roles to access this page
   */
  requiredRoles?: UserRole[];
  /**
   * Where to redirect unauthenticated users
   */
  loginRedirect?: string;
  /**
   * Where to redirect authenticated users (for auth-only pages)
   */
  authenticatedRedirect?: string;
  /**
   * Where to redirect users without required roles
   */
  unauthorizedRedirect?: string;
  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;
  /**
   * Whether to show the app header during loading
   */
  showHeaderOnLoading?: boolean;
}

export function AuthWrapper({ 
  children,
  protection = 'protected',
  requiredRoles = [],
  loginRedirect = '/login',
  authenticatedRedirect = '/dashboard',
  unauthorizedRedirect = '/dashboard',
  loadingComponent,
  showHeaderOnLoading = true
}: AuthWrapperProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect if we're still loading the authentication state
    if (loading) {
      return;
    }

    // Handle different protection types
    switch (protection) {
      case 'public':
        // Public pages - no authentication checks needed
        break;
        
      case 'auth-only':
        // Auth-only pages (login, register) - redirect if already authenticated
        if (user) {
          // Redirect based on department membership
          const redirectUrl = user.departmentId 
            ? `/admin/dashboard/${user.departmentId}`
            : authenticatedRedirect;
          router.push(redirectUrl);
          return;
        }
        break;
        
      case 'protected':
      default:
        // Protected pages - require authentication
        if (!user) {
          router.push(loginRedirect);
          return;
        }
        
        // Check role requirements if specified
        if (requiredRoles.length > 0 && user.role) {
          if (!requiredRoles.includes(user.role)) {
            router.push(unauthorizedRedirect);
            return;
          }
        }
        break;
    }
  }, [user, router, loading, protection, requiredRoles, loginRedirect, authenticatedRedirect, unauthorizedRedirect]);

  // Show loading spinner while authentication state is being determined
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {showHeaderOnLoading && <AppHeader />}
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle rendering based on protection type and auth state
  switch (protection) {
    case 'public':
      // Public pages - always render
      return <>{children}</>;
      
    case 'auth-only':
      // Auth-only pages - only render if not authenticated
      if (user) {
        return null; // Will redirect in useEffect
      }
      return <>{children}</>;
      
    case 'protected':
    default:
      // Protected pages - only render if authenticated and authorized
      if (!user) {
        return null; // Will redirect in useEffect
      }
      
      // Check role requirements
      if (requiredRoles.length > 0 && user.role) {
        if (!requiredRoles.includes(user.role)) {
          return null; // Will redirect in useEffect
        }
      }
      
      return <>{children}</>;
  }
} 