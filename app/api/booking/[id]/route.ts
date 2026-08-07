import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/booking/:id
 * Public lookup for the booking confirmation page.
 * Uses service-role so it can read the booking regardless of the guest's
 * auth state — the UUID itself is the access token (128-bit entropy, unguessable).
 * Returns only the fields the confirmation page needs; never returns sensitive
 * financial breakdowns or internal vendor data.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Basic UUID format validation — prevents probing with garbage strings
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // NOTE: slot_id FK to vd_time_slots was dropped to support date-window slots.
  // We must NOT use PostgREST relationship join for vd_time_slots — it fails without the FK.
  // Fetch booking + property via FK join, then fetch slot separately.
  const { data, error } = await supabase
    .from('vd_bookings')
    .select(`
      id,
      booking_ref,
      booking_date,
      gross_amount,
      status,
      guest_name,
      rooms_booked,
      slot_id,
      properties ( name, address, city, phone )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Booking lookup error:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Fetch slot from vd_time_slots first, fall back to vd_date_windows
  let slotData = null;
  if (data.slot_id) {
    const { data: ts } = await supabase
      .from('vd_time_slots')
      .select('start_hour, end_hour, room_type')
      .eq('id', data.slot_id)
      .maybeSingle();
    if (ts) {
      slotData = ts;
    } else {
      const { data: dw } = await supabase
        .from('vd_date_windows')
        .select('start_hour, end_hour, room_type')
        .eq('id', data.slot_id)
        .maybeSingle();
      slotData = dw;
    }
  }

  return NextResponse.json({ ...data, vd_time_slots: slotData });
}
