'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Chrome as Home, Calendar, Clock, ChartBar as BarChart3, DollarSign, Users, Settings, LogOut, ChevronLeft, ChevronRight, CircleAlert as AlertCircle } from 'lucide-react';

const navigationItems = [
  { href: '/vendor/dashboard', label: 'Operations', icon: Home, requiredRole: 'both' },
  { href: '/vendor/bookings', label: 'Bookings', icon: Calendar, requiredRole: 'both' },
  { href: '/vendor/slots', label: 'Time Slots', icon: Clock, requiredRole: 'both' },
  { href: '/vendor/analytics', label: 'Analytics', icon: BarChart3, requiredRole: 'super' },
  { href: '/vendor/fees', label: 'Fees', icon: DollarSign, requiredRole: 'super' },
  { href: '/vendor/team', label: 'Team', icon: Users, requiredRole: 'super' },
];

export default function VendorSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-slate-950 border-r border-slate-700 flex flex-col transition-all duration-300 overflow-hidden`}
    >
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">MicroStay</span>
              <span className="text-xs text-slate-400">Vendor</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-2">
        {navigationItems
          .filter(item => item.requiredRole === 'both')
          .map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-400 border-l-2 border-cyan-500'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}

        <div className="pt-2 border-t border-slate-700 mt-4">
          {navigationItems
            .filter(item => item.requiredRole === 'super')
            .map(item => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 ${
                      active
                        ? 'bg-amber-500/20 text-amber-400 border-l-2 border-amber-500'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              );
            })}
        </div>
      </nav>

      <div className="p-3 border-t border-slate-700 space-y-2">
        <div className={`${!collapsed && 'px-3 py-2'} text-xs text-slate-500`}>
          {!collapsed && (
            <div>
              <p className="font-semibold text-slate-300">{profile?.name}</p>
              <p className="text-slate-400">Owner</p>
            </div>
          )}
        </div>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-slate-800"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}
