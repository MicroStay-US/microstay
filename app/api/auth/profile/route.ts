import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/auth/profile
 * Returns the profile row for the authenticated user.
 * Uses service role key → bypasses all RLS policies entirely.
 * Accepts the JWT via Authorization: Bearer <token> header.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT signature via Supabase Auth — prevents forged tokens
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const userId = user.id;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, name, phone, created_at, requires_password_reset, billing_status')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[api/auth/profile] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: data });
  } catch (err: any) {
    console.error('[api/auth/profile] unexpected error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
