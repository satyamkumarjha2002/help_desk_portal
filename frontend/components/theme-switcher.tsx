'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Moon, Sun, Monitor } from 'lucide-react';

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-10 w-10 px-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 outline-none focus:outline-none"
          style={{ 
            outline: 'none !important', 
            boxSizing: 'border-box',
            flexShrink: 0,
            width: '40px',
            height: '40px',
            minWidth: '40px',
            maxWidth: '40px'
          }}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem 
          onClick={() => setTheme('light')} 
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 outline-none focus:outline-none"
          style={{ outline: 'none !important' }}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')} 
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 outline-none focus:outline-none"
          style={{ outline: 'none !important' }}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')} 
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 outline-none focus:outline-none"
          style={{ outline: 'none !important' }}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 