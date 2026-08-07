'use client';

import { ChevronDown, Search, LogOut, User, Shield, Activity, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRBAC } from '@/contexts/RBACContext';

interface AdminHeaderProps {
  profileName?: string;
  onSettingsClick: () => void;
  onMenuClick?: () => void;
}

export function AdminHeader({ profileName, onSettingsClick, onMenuClick }: AdminHeaderProps) {
  const router = useRouter();
  const { roleLabel, roleColor } = useRBAC();
  const [searchFocused, setSearchFocused] = useState(false);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(id);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const getInitials = () => {
    if (profileName) return profileName.substring(0, 2).toUpperCase();
    return 'AD';
  };

  return (
    <header className="h-14 bg-ms-surface dark:bg-ms-admin-surface border-b border-ms-orange-border/20 dark:border-white/10 flex items-center justify-between px-4 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Left: Mobile hamburger + Search */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-ms-text-muted hover:bg-ms-orange-light dark:text-white/60 dark:hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      <div className={`relative flex items-center transition-all duration-200 ${searchFocused ? 'w-64 sm:w-72' : 'w-40 sm:w-56'}`}>
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 dark:text-white/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search booking ID, vendor, guest..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-ms-orange-light dark:bg-white/10 border border-ms-orange-border/30 dark:border-white/10 rounded-lg text-ms-text dark:text-white placeholder-ms-text-muted dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-ms-orange/25 focus:border-ms-orange-border focus:bg-white dark:focus:bg-white/15 transition-all"
        />
      </div>
      </div>

      {/* Center: Live Status */}
      <div className="flex items-center gap-1.5 bg-ms-teal-light dark:bg-transparent dark:border-transparent border border-ms-teal-border px-3 py-1 rounded-full">
        <span className={`w-1.5 h-1.5 rounded-full bg-ms-teal ${pulse ? 'opacity-100' : 'opacity-40'} transition-opacity duration-500`} />
        <span className="text-[11px] font-semibold text-ms-teal uppercase tracking-wider">Live</span>
        <Activity className="h-3 w-3 text-ms-teal" />
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5">
        {/* Role badge */}
        <span className="hidden sm:flex items-center text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-lg border border-ms-orange-border/30 dark:border-white/10 bg-ms-orange-light dark:bg-white/10 text-ms-text-muted dark:text-white/60">
          {roleLabel}
        </span>

        <div className="w-px h-5 bg-ms-orange-border/30 dark:bg-white/10 mx-1" />

        <ThemeToggle variant="admin" />
        <NotificationBell variant="admin" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-8 pl-2 pr-2 rounded-lg hover:bg-ms-orange-light dark:hover:bg-white/10 transition-all"
            >
              <Avatar className="h-6 w-6 ring-1 ring-ms-orange/40">
                <AvatarFallback className="bg-gradient-to-br from-ms-orange to-ms-orange-border text-white font-bold text-[10px]">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-ms-text dark:text-white hidden sm:block max-w-[80px] truncate">
                {profileName || 'Admin'}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-ms-surface dark:bg-ms-admin-surface border-ms-orange-border/20 dark:border-white/10 rounded-xl shadow-lg shadow-black/8 p-1"
          >
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-semibold text-ms-text dark:text-white">{profileName || 'Admin User'}</p>
              <p className="text-[10px] text-slate-400 dark:text-white/40">admin@microstay.us</p>
            </div>
            <DropdownMenuSeparator className="bg-ms-orange-border/20 dark:bg-white/10" />
            <DropdownMenuItem onClick={onSettingsClick} className="rounded-lg cursor-pointer text-xs text-ms-text-muted dark:text-white/70 focus:bg-ms-orange-light dark:focus:bg-white/10 gap-2">
              <User className="h-3.5 w-3.5" />Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg cursor-pointer text-xs text-ms-text-muted dark:text-white/70 focus:bg-ms-orange-light dark:focus:bg-white/10 gap-2">
              <Shield className="h-3.5 w-3.5" />Security
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-ms-orange-border/20 dark:bg-white/10" />
            <DropdownMenuItem onClick={handleSignOut} className="rounded-lg cursor-pointer text-xs text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10 gap-2">
              <LogOut className="h-3.5 w-3.5" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
