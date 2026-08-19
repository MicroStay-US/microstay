'use client';
import Image from 'next/image';
import {
  Crosshair, Calendar, Building2, Timer, DollarSign,
  BarChart3, Sparkles, Settings, Home, TrendingUp,
  Users, Banknote, Megaphone, ClipboardCheck, Map,
  ShieldAlert, MessageSquare
} from 'lucide-react';
import { useRBAC } from '@/contexts/RBACContext';
import { Permissions } from '@/lib/rbac';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingCount: number;
}

interface NavItem {
  tab: string;
  label: string;
  icon: React.ElementType;
  star?: boolean;
  violet?: boolean;
  danger?: boolean;
  requiredPermission?: keyof Permissions;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { tab: 'command',     label: 'Command Center',   icon: Crosshair,      star: true,  requiredPermission: 'accessCommandCenter' },
      { tab: 'bookings',    label: 'Live Bookings',    icon: Calendar,                    requiredPermission: 'viewBookings' },
      { tab: 'partners',    label: 'Vendors',          icon: Building2,                   requiredPermission: 'viewVendors' },
      { tab: 'approval',    label: 'Approval Queue',   icon: ClipboardCheck,              requiredPermission: 'viewVendors' },
      { tab: 'guests',      label: 'Guest Management', icon: Users,                       requiredPermission: 'viewBookings' },
      { tab: 'support',     label: 'Support Tickets',  icon: MessageSquare,               requiredPermission: 'viewBookings' },
      { tab: 'sla',         label: 'SLA Monitor',      icon: Timer,          danger: true, requiredPermission: 'viewSLA' },
      { tab: 'fraud',       label: 'Fraud Alerts',     icon: ShieldAlert,    danger: true, requiredPermission: 'viewBookings' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { tab: 'invoices',        label: 'Revenue Ops',     icon: DollarSign,  requiredPermission: 'viewRevenue' },
      { tab: 'payouts',         label: 'Payout Tracker',  icon: Banknote,    requiredPermission: 'viewRevenue' },
      { tab: 'map',             label: 'Map View',         icon: Map,         requiredPermission: 'viewReports' },
      { tab: 'motel-analytics', label: 'Motel Analytics', icon: TrendingUp,  requiredPermission: 'viewReports' },
      { tab: 'performance',     label: 'Reports',          icon: BarChart3,   requiredPermission: 'viewReports' },
      { tab: 'ai-insights',     label: 'AI Ops Insights',  icon: Sparkles,   violet: true, requiredPermission: 'viewAiInsights' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { tab: 'announcements', label: 'Announcements',  icon: Megaphone,  requiredPermission: 'accessSettings' },
      { tab: 'security',      label: 'Settings',       icon: Settings,   requiredPermission: 'accessSettings' },
    ],
  },
];

export function AdminSidebar({ activeTab, onTabChange, pendingCount }: AdminSidebarProps) {
  const { can } = useRBAC();

  return (
    <aside className="w-56 bg-ms-admin-bg text-white/70 h-full flex flex-col fixed left-0 top-0 border-r border-white/10 z-50 lg:z-50">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className=" p-1.5 rounded-lg ">
            <Image src="/MicroStayNewLogo.png" alt="MicroStay Logo" width={32} height={32} className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-[13px]  leading-none text-ms-orange">MicroStay</div>
            <div className="text-[9px] uppercase tracking-widest font-semibold text-ms-orange mt-0.5 text-white">Ops Center</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5">
        {navGroups.map((group) => {
          // Filter items by RBAC permissions
          const visibleItems = group.items.filter(item =>
            !item.requiredPermission || can(item.requiredPermission)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-4">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5 px-2">{group.label}</div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = activeTab === item.tab;
                  const Icon = item.icon;
                  const badge = item.tab === 'partners' && pendingCount > 0 ? pendingCount : null;

                  return (
                    <button
                      key={item.tab}
                      onClick={() => onTabChange(item.tab)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative group
                        ${isActive
                          ? 'bg-ms-orange-light text-ms-orange border border-ms-orange-border dark:border-transparent dark:bg-ms-orange dark:text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-ms-orange rounded-full" />
                      )}
                      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isActive
                          ? item.violet ? 'text-violet-400 ' : 'text-ms-orange dark:text-white'
                          : 'text-white/40 group-hover:text-white/70'
                      }`} />
                      <span className="flex-1 text-left truncate">{item.label}</span>

                      {item.star && (
                        <span className="text-[9px] text-ms-orange">★</span>
                      )}
                      {badge && (
                        <span className="bg-ms-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                          {badge}
                        </span>
                      )}
                      {item.violet && !isActive && (
                        <span className="text-[9px] font-semibold bg-violet-500/20 text-violet-300 px-1 py-0.5 rounded">AI</span>
                      )}
                      {item.danger && !isActive && (
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-1.5 px-2">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-[10px] text-white/30 font-medium">All systems live</span>
        </div>
      </div>
    </aside>
  );
}
