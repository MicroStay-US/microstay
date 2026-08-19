import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import LayoutShell from '@/components/LayoutShell';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.microstay.us'
  ),
  title: 'MicroStay – Flexible Hotel Stay',
  description:
    'Find and book nearby motels for flexible hourly stays. Pay at front desk, no prepayment needed.',
  applicationName: 'MicroStay',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },

  openGraph: {
    type: 'website',
    siteName: 'MicroStay',
    title: 'MicroStay – Flexible Hotel Stay',
    description:
      'Find and book nearby motels for flexible hourly stays. Pay at front desk, no prepayment needed.',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'MicroStay - Hourly Motel Bookings',
      },
    ],
  },

  twitter: {
    card: 'summary',
    title: 'MicroStay – Flexible Hotel Stay',
    description:
      'Find and book nearby motels for flexible hourly stays.',
    images: ['/icon-512.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#FF5E1A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans flex flex-col min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <AuthProvider>
            <LayoutShell>{children}</LayoutShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
