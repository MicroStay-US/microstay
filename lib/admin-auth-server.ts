import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_ROLES = ['admin', 'super_admin', 'manager', 'support'];

/**
 * Validates that the incoming request carries a valid Supabase JWT
 * and that the user has an admin role in the profiles table.
 * Returns the supabase service client on success, or a 401/403/500 NextResponse on failure.
 */
export async function requireAdmin(req: Request): Promise<
  { client: any; error: null } |
  { client: null; error: NextResponse }
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return {
      client: null,
      error: NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }),
    };
  }

  let token = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Fallback to reading the token from the Next.js cookies API
  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get('sb-access-token')?.value || null;
    } catch (e) {
      // Ignore err if cookies() is called outside of a Next.js Server Request context
    }
  }

  if (!token) {
    return {
      client: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Validate the JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userErr } = await userClient.auth.getUser();

  if (userErr || !user) {
    return {
      client: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Check role from the profiles table — single source of truth
  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data: profile, error: profileErr } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    return {
      client: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!ADMIN_ROLES.includes(profile.role)) {
    return {
      client: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { client: serviceClient, error: null };
}
