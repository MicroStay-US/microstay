'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { VendorProvider, useVendor } from '@/contexts/VendorContext';
import VendorDashboardSidebar from '@/components/vendor/VendorDashboardSidebar';
import VendorDashboardHeader from '@/components/vendor/VendorDashboardHeader';
import { AnnouncementBanner } from '@/components/vendor/AnnouncementBanner';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const DASHBOARD_PATHS = [
  '/vendor/dashboard',
  '/vendor/bookings',
  '/vendor/slots',
  '/vendor/analytics',
  '/vendor/fees',
  '/vendor/properties',
  '/vendor/team',
  '/vendor/blocked-dates',
  '/vendor/agreement',
  '/vendor/calendar',
  '/vendor/financials',
  '/vendor/billing',
  '/vendor/photos',
  '/vendor/messages',
  '/vendor/reviews',
];

// Sits inside VendorProvider — can read context and redirect
function VendorGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { vendor, vendorLoading, needsOnboarding } = useVendor();

  useEffect(() => {
    if (vendorLoading) return;
    if (!vendor) return;

    const isOnboarding = pathname === '/vendor/onboarding';

    if (needsOnboarding && !isOnboarding) {
      router.replace('/vendor/onboarding');
    } else if (!needsOnboarding && isOnboarding) {
      router.replace('/vendor/dashboard');
    }
  }, [vendorLoading, vendor, needsOnboarding, pathname, router]);

  return <>{children}</>;
}

function VendorDashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#07101f] overflow-hidden font-sans">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <VendorDashboardSidebar />
      </div>

      {/* Mobile sidebar — Sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 border-none">
          <VendorDashboardSidebar />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <VendorDashboardHeader onMenuClick={() => setMobileOpen(true)} />
        <AnnouncementBanner />
        <main className="flex-1 overflow-auto p-4 md:p-8 dark:text-white/90">{children}</main>
      </div>
    </div>
  );
}

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, profileLoaded: _profileLoaded, profileFetchFailed: _pff, refreshProfile } = useAuth() as any;
  const profileLoaded: boolean = !!_profileLoaded;
  const profileFetchFailed: boolean = !!_pff;
  const [ready, setReady] = useState(false);

  // Hard 20-second safety timeout so the spinner NEVER hangs forever
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 20000);
    return () => clearTimeout(t);
  }, []);

  const isFullLayout = DASHBOARD_PATHS.some(p => pathname?.startsWith(p));
  const isAuthPage = pathname === '/vendor/login' || pathname === '/vendor/register' || pathname === '/vendor/login/reset-password';

  useEffect(() => {
    const authPage = pathname === '/vendor/login' || pathname === '/vendor/register' || pathname === '/vendor/login/reset-password';
    if (authPage) { setReady(true); return; }

    // Still loading auth state — keep waiting
    if (!timedOut && loading) return;

    // No user at all — definitely not logged in
    if (!user) {
      router.push('/vendor/login');
      return;
    }

    // User IS authenticated — wait for profile to finish loading
    if (!profileLoaded && !timedOut) return;

    // Profile fetch failed (network/timeout) — do NOT redirect; show retry UI instead
    if (profileFetchFailed) return;

    // Profile loaded with wrong role, or definitively null (user has no profile row)
    if (!profile || (profile.role !== 'vendor' && profile.role !== 'admin')) {
      router.push('/vendor/login');
    } else {
      setReady(true);
    }
  }, [user, profile, loading, profileLoaded, profileFetchFailed, timedOut, router, pathname]);

  // Profile fetch failed but user is authenticated — show retry UI, NOT login redirect
  if (!isAuthPage && user && profileFetchFailed && !ready) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">Connection issue</p>
            <p className="text-gray-500 text-sm mt-1">Could not load your account details. Please try again.</p>
          </div>
          <button
            onClick={() => refreshProfile?.()}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthPage && !timedOut && (loading || !ready)) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium tracking-wide">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isFullLayout) {
    return (
      <VendorProvider>
        <VendorGuard>{children}</VendorGuard>
      </VendorProvider>
    );
  }

  return (
    <VendorProvider>
      <VendorGuard>
        <VendorDashboardShell>{children}</VendorDashboardShell>
      </VendorGuard>
    </VendorProvider>
  );
}
