'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-black m-[-15px] pt-6 md:pt-16 pb-4 md:pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-10 md:ml-10 mb- md:mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-2 md:mb-4">
              <div className=" p rounded-xl ">
                <Image
                  src="/MicroStayNewLogo.png"
                  alt="MicroStay Logo"
                  width={50}
                  height={50}
                  className="w-50 h-50 fill-ms-orange text-ms-orange"
                  priority
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-ms-orange to-ms-orange tracking-tight bg-clip-text text-transparent group-hover:from-ms-orange group-hover:to-ms-orange transition-all">MicroStay.us</span>
            </div>
            <p className="text-sm text-black/60 dark:text-white leading-relaxed font-medium ml-5">
              The flexible way to book a hotel for the time you need.
            </p>
          </div>

          {/* Guests */}
          <div className="md:col-span-3 grid grid-cols-3 gap-4 md:gap-10 md:ml-5 mt-4 md:mt-0">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-black/50 dark:text-white/40 mb-4">For Guests</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Book Now', href: '/search' },
                  { label: 'My Bookings', href: '/check-booking' },
                  // { label: 'How It Works', href: '/#how-it-works' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-md  tracking-tighter text-orange-500 hover:text-orange-700 font-medium transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Partners */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-black/50 dark:text-white/40 mb-4">For Partners</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Become a Partner', href: '/partner' },
                  // { label: 'Partner Sign Up', href: '/partner-signup' },
                  { label: 'Partner Login', href: '/vendor/login' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-md tracking-tighter text-orange-500 hover:text-orange-700 font-medium transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-black/50 dark:text-white/40 mb-4">Company</h4>
              <ul className="space-y-2.5 ">
                {[
                  { label: 'About Us', href: '/about' },
                  { label: 'Contact', href: '/contact' },
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-orange-500 hover:text-orange-700 font-medium transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-black/20 pt-4 md:pt-6 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-3 text-center md:text-left">
          <p className="text-xs md:text-sm text-black/60 font-medium">© {new Date().getFullYear()} MICROSTAY HOLDINGS LLC. All rights reserved.</p>
          <Link href="/admin/login" className="text-[11px] md:text-xs text-black/60 hover:text-white font-medium transition-colors border border-black/30 hover:border-white hover:bg-slate-600 px-3 py-1 rounded-full dark:bg-transparent dark:text-white/70 dark:border-white/50 dark:hover:bg-black dark:hover:text-ms-orange">🔐 Admin Portal</Link>
        </div>
      </div>
    </footer>
  );
}
