import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/auth/profile-role
 * Returns the role of the currently authenticated user.
 * Requires: Authorization: Bearer <access_token>
 *
 * Used by the vendor login page to reliably check the user's role
 * server-side (bypasses any client-side session timing issues).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ error: 'No token' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Decode the user ID from the JWT without trusting it — verify via service client
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get the user from the token (validates the JWT signature)
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // Fetch the user's profile role using service role (bypasses RLS safely server-side)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    role: profile?.role ?? null,
    userId: user.id,
  });
}
