import { UserRole } from '@/types';

/**
 * Get user-friendly display name for a role
 */
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case UserRole.END_USER:
      return 'End User';
    case UserRole.AGENT:
      return 'Agent';
    case UserRole.TEAM_LEAD:
      return 'Team Lead';
    case UserRole.MANAGER:
      return 'Manager';
    case UserRole.ADMIN:
      return 'Administrator';
    case UserRole.SUPER_ADMIN:
      return 'Super Administrator';
    default:
      return 'Unknown Role';
  }
};

/**
 * Get description for a role
 */
export const getRoleDescription = (role: UserRole): string => {
  switch (role) {
    case UserRole.END_USER:
      return 'Submit tickets and track their progress';
    case UserRole.AGENT:
      return 'Handle tickets and provide customer support';
    case UserRole.TEAM_LEAD:
      return 'Lead a team and manage workflows';
    case UserRole.MANAGER:
      return 'Full department management access';
    case UserRole.ADMIN:
      return 'System-wide administrative access';
    case UserRole.SUPER_ADMIN:
      return 'Complete system control and management';
    default:
      return 'Unknown role permissions';
  }
};

/**
 * Get roles available for self-registration
 */
export const getSelfRegistrationRoles = (): UserRole[] => {
  return [
    UserRole.AGENT,
    UserRole.TEAM_LEAD,
    UserRole.MANAGER
  ];
};

/**
 * Check if a role requires department selection
 */
export const roleRequiresDepartment = (role: UserRole): boolean => {
  return [UserRole.AGENT, UserRole.TEAM_LEAD, UserRole.MANAGER].includes(role);
};

/**
 * Get role color for UI display
 */
export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case UserRole.END_USER:
      return 'gray';
    case UserRole.AGENT:
      return 'blue';
    case UserRole.TEAM_LEAD:
      return 'green';
    case UserRole.MANAGER:
      return 'purple';
    case UserRole.ADMIN:
      return 'orange';
    case UserRole.SUPER_ADMIN:
      return 'red';
    default:
      return 'gray';
  }
}; 