import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_ROLES = ['admin', 'super_admin', 'manager', 'support'];

/**
 * GET /api/admin/bookings
 * Server-side bookings fetch using service role — bypasses client-side
 * auth state. Verifies admin role via sb-access-token cookie.
 */
export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const accessToken = req.cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all bookings with property join (no date filter — client handles it)
  const { data, error } = await supabase
    .from('vd_bookings')
    .select('*, property:properties(name, zip, city)')
    .order('booking_date', { ascending: false })
    .order('created_at',   { ascending: false })
    .limit(500);

  if (error) {
    console.error('Admin bookings API error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }

  const rows = data || [];

  // Enrich with slot data
  const slotIds = Array.from(new Set(rows.map((b: any) => b.slot_id).filter(Boolean)));
  const slotMap: Record<string, any> = {};
  if (slotIds.length > 0) {
    const [{ data: ts }, { data: dw }] = await Promise.all([
      supabase.from('vd_time_slots').select('*').in('id', slotIds),
      supabase.from('vd_date_windows').select('*').in('id', slotIds),
    ]);
    for (const s of (ts || [])) slotMap[s.id] = s;
    for (const s of (dw || [])) slotMap[s.id] = s;
  }

  const enriched = rows.map((b: any) => ({ ...b, slot: slotMap[b.slot_id] || null }));
  return NextResponse.json({ data: enriched });
}
