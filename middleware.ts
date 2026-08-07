import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PUBLIC = ['/admin/login', '/admin/reset-password', '/admin/login/totp'];
const VENDOR_PUBLIC = ['/vendor/login', '/vendor/signup', '/vendor/pending', '/vendor/login/reset-password'];

/**
 * Lightweight middleware — only checks that a Supabase JWT exists and is
 * not obviously expired. Role enforcement is handled by each page's own
 * layout/auth context, which has the full profile loaded.
 *
 * We deliberately avoid a DB round-trip here to prevent latency and edge
 * cases that caused the "stuck on login" bug.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin') && !ADMIN_PUBLIC.includes(pathname);
  const isVendorRoute = pathname.startsWith('/vendor') && !VENDOR_PUBLIC.some(p => pathname === p || pathname.startsWith(p + '/'));

  if (!isAdminRoute && !isVendorRoute) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectRef = supabaseUrl.split('//')[1].split('.')[0];

  // ── Locate the access token from any known cookie location ──────────────
  let accessToken: string | undefined;

  // 1. Plain fallback cookie set by login pages
  accessToken = req.cookies.get('sb-access-token')?.value;

  // 2. Supabase JS v2 JSON session cookie (may be chunked)
  if (!accessToken) {
    const raw =
      req.cookies.get(`sb-${projectRef}-auth-token`)?.value ||
      req.cookies.get(`sb-${projectRef}-auth-token.0`)?.value;
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        accessToken =
          parsed?.access_token ??
          (Array.isArray(parsed) ? parsed[0]?.access_token : undefined);
      } catch {
        // Don't fall back to raw value — malformed JSON should not be treated as a token
        accessToken = undefined;
      }
    }
  }

  // No token at all → redirect to login
  if (!accessToken) {
    const dest = isAdminRoute ? '/admin/login' : '/vendor/login';
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // ── Verify the JWT structure and expiry ──────────────────────────────────
  // Full signature verification happens at the API/page level via
  // supabase.auth.getUser(). Middleware does a lightweight structural +
  // expiry check to avoid a DB round-trip on every navigation (which
  // previously caused "stuck on login" bugs). The token's cryptographic
  // validity is enforced by Supabase RLS on every data access.
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) throw new Error('bad jwt');
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.sub || typeof payload.sub !== 'string') throw new Error('no sub');
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('expired');
    }
    // Token is present, well-formed, and not expired — let the page handle role check
    return NextResponse.next();
  } catch {
    const dest = isAdminRoute ? '/admin/login' : '/vendor/login';
    return NextResponse.redirect(new URL(dest, req.url));
  }
}

export const config = {
  matcher: ['/admin/:path*', '/vendor/:path*'],
};
