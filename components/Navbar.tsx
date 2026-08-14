'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from './theme-toggle';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const getDashboardLink = () => {
    if (!profile) return '/';
    if (profile.role === 'admin') return '/admin/dashboard';
    if (profile.role === 'vendor') return '/vendor/dashboard';
    return '/';
  };

  return (
    <nav className="border-b border-gray-100 bg-white/95  backdrop-blur-md sticky top-0 z-50 shadow-lg dark:shadow-lg dark:shadow-slate-950 glossy-white dark:border-slate-950">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 dark:bg-black">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl  opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative  p-2 rounded-full  transition-all shine-effect">
                 <Image
                  src="/MicroStayLogo.png"
                  alt="MicroStay Logo"
                  width={50}
                  height={50}
                  className="w-50 h-50 fill-ms-orange text-ms-orange"
                  priority
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-ms-orange to-ms-orange bg-clip-text text-transparent group-hover:from-ms-orange group-hover:to-ms-orange transition-all">
                MicroStay.us
              </span>
              <span className="text-[10px] font-medium text-gray-500 -mt-1 tracking-wider">
                HOURLY BOOKINGS
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center space-x-6">
            <ThemeToggle />
            <Link href="/search"  className="text-gray-700 hover:text-ms-orange transition-all font-medium hover:scale-105 dark:text-ms-orange-light dark:hover:text-ms-orange active:scale-95">
              Book Now
            </Link>
            <Link href="/partner-signup" className="text-gray-700 hover:text-ms-orange transition-all font-medium hover:scale-105 dark:text-ms-orange-light dark:hover:text-ms-orange active:scale-95">
              Partner With Us
            </Link>
            <Link href="/check-booking" className="text-gray-700 hover:text-ms-orange transition-all font-medium hover:scale-105 dark:text-ms-orange-light dark:hover:text-ms-orange active:scale-95">
              My Bookings
            </Link>

            {user ? (
              <>
                <Link href={getDashboardLink()}>
                  <Button variant="outline" className="border-ms-orange text-ms-orange hover:bg-ms-orange-light hover:scale-105 transition-all active:scale-95 dark:hover:bg-ms-orange ">Dashboard</Button>
                </Link>
                <Button onClick={handleSignOut} variant="ghost" className="hover:text-ms-orange hover:scale-105 transition-all active:scale-95 dark:hover:bg-zinc-700 dark:bg-zinc-500/40">
                  Sign Out
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-gradient-to-r from-ms-orange to-ms-orange hover:from-ms-orange hover:to-ms-orange text-white shadow-md hover:shadow-lg hover:scale-105 transition-all shine-effect active:scale-95 ">Sign-in</Button>
              </Link>
            )}
          </div>

          <button
            className="lg:hidden text-ms-orange hover:scale-110 transition-transform"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="flex flex-col justify-center items-center lg:hidden py-4 space-y-3">
          <ThemeToggle />
            <Link
              href="/search"
              className="block text-gray-700 hover:text-ms-orange transition font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Book Now
            </Link>
            <Link
              href="/partner-signup"
              className="block text-gray-700 hover:text-ms-orange transition font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Partner With Us
            </Link>
            <Link
              href="/check-booking"
              className="block text-gray-700 hover:text-ms-orange transition font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              My Bookings
            </Link>

            {user ? (
              <>
                <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-ms-orange text-ms-orange hover:bg-ms-orange-light dark:hover:bg-ms-orange ">
                    Dashboard
                  </Button>
                </Link>
                <Button onClick={handleSignOut} variant="ghost" className="w-full hover:text-ms-orange">
                  Sign Out
                </Button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-gradient-to-r from-ms-orange to-ms-orange hover:from-ms-orange hover:to-ms-orange text-white">Sign-in</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
