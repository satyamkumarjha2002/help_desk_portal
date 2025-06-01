'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { ProfileSheet } from '@/components/profile-sheet';
import { UserIcon, ChevronDownIcon } from 'lucide-react';

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title = "Help Desk Portal" }: AppHeaderProps) {
  const { user } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeSwitcher />
            
            <ProfileSheet>
              <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profilePictureUrl} alt={user?.displayName} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm">
                    {user?.displayName ? getInitials(user.displayName) : <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.displayName}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role ? user.role.replace('_', ' ').toUpperCase() : 'USER'}
                  </span>
                </div>
                
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </div>
            </ProfileSheet>
          </div>
        </div>
      </div>
    </header>
  );
} 