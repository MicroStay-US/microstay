'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVendor } from '@/contexts/VendorContext';
import Link from 'next/link';
import { Menu, CreditCard } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { NotificationBell } from '@/components/shared/NotificationBell';

interface VendorDashboardHeaderProps {
  onMenuClick?: () => void;
}

export default function VendorDashboardHeader({ onMenuClick }: VendorDashboardHeaderProps) {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const { profile } = useAuth();
  const { vendor, role, teamMember, properties, selectedPropertyId, setSelectedPropertyId } = useVendor();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
      setDateStr(
        now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayName = role === 'front_desk' ? teamMember?.name : vendor?.owner_name || profile?.name;
  const initials = (displayName || 'V')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const activeProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];

  return (
    <div className="h-16 bg-ms-surface dark:bg-ms-admin-surface border-b border-ms-orange-border/30 dark:border-white/10 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
      {/* Left: hamburger (mobile) + property selector */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-ms-text-muted hover:bg-ms-orange-light dark:text-white/60 dark:hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
        {properties.length > 1 ? (
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Active Property</span>
            <select
              value={selectedPropertyId || ''}
              onChange={e => setSelectedPropertyId(e.target.value)}
              className="text-sm font-bold text-ms-text bg-transparent border-none outline-none cursor-pointer pr-4 -ml-0.5 "
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              {activeProperty ? 'Active Property' : 'Dashboard'}
            </span>
            <span className="text-sm font-bold text-ms-text dark:text-ms-orange">
              {activeProperty?.name || 'No Property'}
            </span>
          </div>
        )}

        {/* Status badge */}
        {vendor?.status === 'pending' && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-700/40 dark:text-white dark:border-transparent animate-pulse">
            Pending Approval
          </span>
        )}
        {vendor?.status === 'active' && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ms-teal-light text-ms-teal border border-ms-teal-border dark:bg-black dark:border-transparent animate-pulse">
            Active
          </span>
        )}
        </div>
      </div>

      {/* Right: clock + user */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end">
          <span className="font-mono text-sm font-bold text-ms-text dark:text-white tracking-tight">{time}</span>
          <span className="text-[11px] text-slate-400 dark:text-white/40 font-medium">{dateStr}</span>
        </div>

        {role === 'super_vendor' && (
          <Link 
            href="/vendor/billing"
            className="p-2 text-gray-500 hover:text-ms-orange dark:text-white/60 dark:hover:text-white transition-colors flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
            title="Billing"
          >
            <CreditCard className="w-5 h-5" />
          </Link>
        )}
        <ThemeToggle variant="vendor" />
        <NotificationBell variant="vendor" />

        <div className="flex items-center gap-2.5 pl-3 border-l border-ms-orange-border/30 dark:border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-ms-text dark:text-white font-bold leading-tight">{displayName}</p>
            <p className="text-[11px] text-slate-400 dark:text-white/40 font-medium">
              {role === 'super_vendor' ? 'Owner' : 'Front Desk'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-ms-orange flex items-center justify-center shadow-sm">
            <span className="text-sm font-bold text-white tracking-wider">{initials}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
