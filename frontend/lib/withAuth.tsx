'use client';

import React from 'react';
import { AuthWrapper } from '@/components/auth-wrapper';
import { UserRole } from '@/types';

interface WithAuthOptions {
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
}

/**
 * Higher-Order Component that wraps pages with authentication protection
 * 
 * Usage:
 * ```tsx
 * export default withAuth(YourPageComponent, { 
 *   protection: 'protected',
 *   requiredRoles: [UserRole.ADMIN] 
 * });
 * ```
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const AuthenticatedComponent = (props: P) => {
    return (
      <AuthWrapper {...options}>
        <WrappedComponent {...props} />
      </AuthWrapper>
    );
  };

  // Set display name for debugging
  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return AuthenticatedComponent;
}

/**
 * Convenience HOCs for common patterns
 */

// For protected pages (default)
export const withProtectedPage = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, { protection: 'protected' });

// For public pages
export const withPublicPage = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, { protection: 'public' });

// For auth-only pages (login, register)
export const withAuthOnlyPage = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, { protection: 'auth-only' });

// For admin-only pages
export const withAdminPage = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, { 
    protection: 'protected', 
    requiredRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] 
  });

// For manager and above pages
export const withManagerPage = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, { 
    protection: 'protected', 
    requiredRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN] 
  });

// For agent and above pages
export const withAgentPage = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, { 
    protection: 'protected', 
    requiredRoles: [UserRole.AGENT, UserRole.TEAM_LEAD, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN] 
  }); 