/**
 * Vendor authentication helper for server-side API routes.
 * Validates Supabase JWT and returns the associated vendor record.
 */
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySupabaseClient = any;

export interface VendorAuthResult {
  vendor: {
    id: string;
    email: string;
    status: string;
    email_verified_at: string | null;
    auth_user_id: string;
  };
  serviceClient: AnySupabaseClient;
  error: null;
}

export interface VendorAuthError {
  vendor: null;
  serviceClient: null;
  error: NextResponse;
}

export interface AuthUserResult {
  user: { id: string; email: string | null };
  serviceClient: AnySupabaseClient;
  error: null;
}

export interface AuthUserError {
  user: null;
  serviceClient: null;
  error: NextResponse;
}

/**
 * Reads the Supabase access token from either the Authorization header or the
 * sb-access-token cookie (written by AuthContext on every session change).
 * Returns null if neither is present.
 */
function extractAccessToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  try {
    const cookieStore = cookies();
    return cookieStore.get('sb-access-token')?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Validates a Supabase JWT and returns the underlying auth user + a
 * service-role client. Use this for endpoints that run BEFORE a vendor record
 * exists (e.g. /api/vendor/init) and therefore cannot use requireVendor.
 */
export async function requireAuthUser(
  req: Request
): Promise<AuthUserResult | AuthUserError> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return {
      user: null,
      serviceClient: null,
      error: NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }),
    };
  }

  const token = extractAccessToken(req);
  if (!token) {
    return {
      user: null,
      serviceClient: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();

  if (userErr || !user) {
    return {
      user: null,
      serviceClient: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const svc = createClient(supabaseUrl, serviceKey);
  return {
    user: { id: user.id, email: user.email ?? null },
    serviceClient: svc as AnySupabaseClient,
    error: null,
  };
}

/**
 * Validate that the request carries a valid Supabase JWT for a vendor.
 * Returns the vendor record and a service-role client, or an error response.
 */
export async function requireVendor(
  req: Request
): Promise<VendorAuthResult | VendorAuthError> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return {
      vendor: null,
      serviceClient: null,
      error: NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }),
    };
  }

  const token = extractAccessToken(req);
  if (!token) {
    return {
      vendor: null,
      serviceClient: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Validate JWT via Supabase
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr || !user) {
    return {
      vendor: null,
      serviceClient: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const svc = createClient(supabaseUrl, serviceKey);

  // Look up vendor by auth_user_id
  const { data: vendor, error: vendorErr } = await svc
    .from('vendors')
    .select('id, email, status, email_verified_at, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();

  if (vendorErr || !vendor) {
    return {
      vendor: null,
      serviceClient: null,
      error: NextResponse.json({ error: 'Vendor account not found' }, { status: 404 }),
    };
  }

  return { vendor, serviceClient: svc as AnySupabaseClient, error: null };
}

/**
 * Like requireVendor, but also enforces that the vendor's email is verified.
 */
export async function requireVerifiedVendor(
  req: Request
): Promise<VendorAuthResult | VendorAuthError> {
  const result = await requireVendor(req);
  if (result.error) return result;

  if (!result.vendor.email_verified_at) {
    return {
      vendor: null,
      serviceClient: null,
      error: NextResponse.json(
        { error: 'Email not verified. Please check your inbox.' },
        { status: 403 }
      ),
    };
  }

  return result;
}
