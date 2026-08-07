import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/vendor/bookings
 * Server-side bookings fetch using service role — bypasses client-side
 * auth state so it always works regardless of localStorage/session state.
 * Authenticates via the sb-access-token cookie to verify vendor identity.
 */
export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Read the access token from the cookie set by AuthContext on login
  const accessToken = req.cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Verify the token and get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Find the vendor record for this user
  const { data: vendorData } = await supabase
    .from('vendors')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  // Also check vendor_staff
  let vendorId = vendorData?.id;
  if (!vendorId) {
    const { data: staffData } = await supabase
      .from('vendor_staff')
      .select('vendor_id')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    vendorId = staffData?.vendor_id;
  }

  if (!vendorId) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 403 });
  }

  // Parse query params
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get('propertyId');
  const dateFrom   = searchParams.get('dateFrom');
  const dateTo     = searchParams.get('dateTo');

  let query = supabase
    .from('vd_bookings')
    .select('*, property:properties(name, address, city, phone, zip)')
    .eq('vendor_id', vendorId)
    .order('booking_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (propertyId) query = query.eq('property_id', propertyId);
  if (dateFrom)   query = query.gte('booking_date', dateFrom);
  if (dateTo)     query = query.lte('booking_date', dateTo);

  const { data, error } = await query;
  if (error) {
    console.error('Vendor bookings API error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }

  // Enrich with slot data
  const rows = data || [];
  const slotIds = Array.from(new Set(rows.map((b: any) => b.slot_id).filter(Boolean)));
  const slotMap: Record<string, any> = {};
  if (slotIds.length > 0) {
    const [{ data: ts }, { data: dw }] = await Promise.all([
      supabase.from('vd_time_slots').select('id, start_hour, end_hour, duration_hours, room_type, bed_type').in('id', slotIds),
      supabase.from('vd_date_windows').select('id, start_hour, end_hour, duration_hours, room_type, bed_type').in('id', slotIds),
    ]);
    for (const s of (ts || [])) slotMap[s.id] = s;
    for (const s of (dw || [])) slotMap[s.id] = s;
  }

  const enriched = rows.map((b: any) => ({ ...b, slot: slotMap[b.slot_id] || null }));
  return NextResponse.json({ data: enriched });
}
