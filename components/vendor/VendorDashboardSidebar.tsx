'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendor } from '@/contexts/VendorContext';
import { LayoutDashboard, Calendar, Clock, BarChart3,BadgeCheck, DollarSign, Users, Building2, LogOut, ChevronLeft, ChevronRight, Home, CalendarOff, CreditCard, Camera, MessageCircle, Star } from 'lucide-react';

const navItems = [
  { href: '/vendor/dashboard',  label: 'Operations',      icon: LayoutDashboard, roles: ['super_vendor', 'front_desk'] },
  // { href: '/vendor/onboarding', label: 'Onboarding',      icon: BadgeCheck,      roles: ['super_vendor'] },
  { href: '/vendor/bookings',   label: 'Bookings',        icon: Calendar,        roles: ['super_vendor', 'front_desk'] },
  { href: '/vendor/slots',      label: 'Time Windows',    icon: Clock,           roles: ['super_vendor', 'front_desk'] },
  { href: '/vendor/messages',   label: 'Guest Messages',  icon: MessageCircle,   roles: ['super_vendor', 'front_desk'] },
  { href: '/vendor/calendar',   label: 'Rate Calendar',   icon: CalendarOff,     roles: ['super_vendor'] },
  { href: '/vendor/photos',     label: 'Photo Manager',   icon: Camera,          roles: ['super_vendor'] },
  { href: '/vendor/reviews',    label: 'Reviews',         icon: Star,            roles: ['super_vendor'] },
  { href: '/vendor/properties', label: 'Motel Details',   icon: Building2,       roles: ['super_vendor'] },
  { href: '/vendor/analytics',  label: 'Analytics',       icon: BarChart3,       roles: ['super_vendor'] },
  { href: '/vendor/financials', label: 'Financials',      icon: DollarSign,      roles: ['super_vendor'] },
  { href: '/vendor/billing',    label: 'Billing',         icon: CreditCard,      roles: ['super_vendor'] },
  { href: '/vendor/team',       label: 'Staff Management',icon: Users,           roles: ['super_vendor'] },
];

export default function VendorDashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const { vendor, role, teamMember } = useVendor();

  const displayName = role === 'front_desk' ? teamMember?.name : vendor?.owner_name || profile?.name;
  const roleBadge = role === 'front_desk' ? 'Front Desk' : 'Owner';
  const businessName = vendor?.business_name || '';

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const filteredNav = navItems.filter(item => role && item.roles.includes(role));

  return (
    <div
      className={`${
        collapsed ? 'w-[72px]' : 'w-64'
      } h-full flex flex-col transition-all duration-300 shrink-0 z-10 bg-ms-admin-bg`}
    >
      {/* Logo */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ">
              <Image src="/MicroStayNewLogo.png" alt="MicroStay Logo" width={32} height={32} className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">MicroStay</p>
              <p className="text-[10px] text-ms-orange uppercase tracking-widest font-semibold">Vendor Portal</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 bg-ms-orange rounded-lg flex items-center justify-center mx-auto shadow-md">
            <Home className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md transition-colors text-white/40 hover:text-white hover:bg-white/10 hidden lg:block"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="block w-full">
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group w-full ${
                  active
                    ? 'bg-ms-orange-light text-ms-orange border border-ms-orange-border shadow-sm dark:bg-ms-orange dark:border-transparent'
                    : 'text-white/60 hover:text-white hover:bg-white/10 '
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-ms-orange dark:text-white' : 'text-white/50 group-hover:text-white'}`} />
                {!collapsed && (
                  <span className={`text-sm truncate font-medium ${active ? 'text-ms-text dark:text-white' : ''}`}>
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10 space-y-3">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-ms-orange flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {(displayName || 'V').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  role === 'super_vendor' ? 'text-ms-orange' : 'text-ms-orange-border'
                }`}
              >
                {roleBadge}
              </span>
              {businessName && (
                <p className="text-[10px] text-white/40 truncate mt-0.5">{businessName}</p>
              )}
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Log out</span>}
        </button>
      </div>
    </div>
  );
}
