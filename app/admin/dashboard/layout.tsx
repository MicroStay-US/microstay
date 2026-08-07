'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DateRangeProvider } from '@/contexts/DateRangeContext';
import { AdminTabProvider, useAdminTab } from '@/contexts/AdminTabContext';
import { RBACProvider } from '@/contexts/RBACContext';
import { useQuery, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { safeFetch } from '@/lib/api';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const DATE_FILTER_TABS = ['overview', 'invoices', 'performance'];

// Tiny helper: triggers router.push inside a useEffect to avoid calling
// router during the render phase (which causes React warnings).
function RedirectToLogin({ router }: { router: ReturnType<typeof useRouter> }) {
  useEffect(() => { router.push('/admin/login'); }, [router]);
  return null;
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading: authLoading, profileLoaded: _profileLoaded, profileFetchFailed: _pff, refreshProfile } = useAuth() as any;
  const profileLoaded: boolean = !!_profileLoaded;
  const profileFetchFailed: boolean = !!_pff;

  // Hard 20-second safety timeout so the spinner NEVER hangs forever.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 20000);
    return () => clearTimeout(t);
  }, []);

  const ADMIN_ROLES = ['admin', 'super_admin', 'manager', 'support'];

  // Show spinner while: auth is loading, OR user is authenticated but profile isn't done yet.
  const stillLoading = !timedOut && (authLoading || (!profileLoaded && !profile));
  const waitingForProfile = !!user && !profileLoaded && !timedOut && !profileFetchFailed;
  if (stillLoading || waitingForProfile) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#7C8797] text-sm font-medium tracking-wide">Securing Operations Center...</p>
        </div>
      </div>
    );
  }

  // No user — redirect to login
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <RedirectToLogin router={router} />
      </div>
    );
  }

  // Profile fetch failed (network/DB error) — user IS authenticated, show retry UI
  if (profileFetchFailed) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <svg className="w-7 h-7 text-[#c9a96e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-[#1e293b] text-lg">Connection issue</p>
            <p className="text-[#7C8797] text-sm mt-1">Could not load your account details. Please try again.</p>
          </div>
          <button
            onClick={() => refreshProfile?.()}
            className="px-6 py-2.5 bg-[#c9a96e] hover:bg-[#b8954f] text-white rounded-lg font-medium text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Auth resolved — enforce role access
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <RedirectToLogin router={router} />
        <div className="text-center">
          <p className="text-[#B42318] font-bold text-lg">Access Denied</p>
          <p className="text-[#7C8797] text-sm mt-2">You do not have permission to access the admin portal.</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DateRangeProvider>
        <AdminTabProvider>
          <RBACProvider>
            <DashboardContent profileName={profile?.name || undefined}>{children}</DashboardContent>
          </RBACProvider>
        </AdminTabProvider>
      </DateRangeProvider>
    </QueryClientProvider>
  );
}

function DashboardContent({ children, profileName }: { children: React.ReactNode; profileName?: string }) {
  const { activeTab, setActiveTab } = useAdminTab();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ISSUE 1 FIX: use safeFetch to prevent JSON parse crash on HTML error responses
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-applications-count'],
    queryFn: async () => {
      const json = await safeFetch<{ data?: any[] }>('/api/admin/applications');
      return json?.data?.length ?? 0;
    },
    // Never throw — return 0 on failure
    retry: false,
  });

  // Redirect away from restricted tabs based on role
  const isOpsTab = !DATE_FILTER_TABS.includes(activeTab);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07101f] font-sans flex admin-root">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingCount={pendingCount || 0}
        />
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-56 border-none">
          <AdminSidebar
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab); setMobileOpen(false); }}
            pendingCount={pendingCount || 0}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        <AdminHeader
          profileName={profileName}
          onSettingsClick={() => setActiveTab('security')}
          onMenuClick={() => setMobileOpen(true)}
        />

        {DATE_FILTER_TABS.includes(activeTab) && (
          <div className="bg-[#f1f5f9] dark:bg-[#0a1628] border-b border-[#e2e8f0] dark:border-white/10">
            <DateRangeFilter />
          </div>
        )}

        <main className={`flex-1 overflow-y-auto text-[#1e293b] dark:text-white/90 ${isOpsTab ? 'p-4 bg-[#f8fafc] dark:bg-[#07101f]' : 'p-6 bg-[#f8fafc] dark:bg-[#07101f]'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
