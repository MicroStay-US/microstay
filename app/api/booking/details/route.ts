import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-for-booking-auth-must-change'
);

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('booking_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let payload;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (payload.role !== 'booking_guest' || !payload.bookingRef || !payload.guestEmail) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const svc = createClient(supabaseUrl, serviceKey);

    const { data: booking, error: searchError } = await svc
      .from('vd_bookings')
      .select(`
        *,
        property:properties(name,address,city,phone)
      `)
      .eq('booking_ref', payload.bookingRef)
      .eq('guest_email', payload.guestEmail)
      .maybeSingle();

    if (searchError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    let slotData = null;

    // Check vd_time_slots
    const { data: timeSlot } = await svc
      .from('vd_time_slots')
      .select('start_hour,end_hour,room_type,bed_type')
      .eq('id', booking.slot_id)
      .maybeSingle();

    if (timeSlot) {
      slotData = timeSlot;
    } else {
      // Check vd_date_windows
      const { data: dateWindow } = await svc
        .from('vd_date_windows')
        .select('start_hour,end_hour')
        .eq('id', booking.slot_id)
        .maybeSingle();

      if (dateWindow) {
        slotData = {
          ...dateWindow,
          room_type: 'Room',
          bed_type: 'Standard',
        };
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        slot: slotData,
      }
    });
  } catch (error) {
    console.error('Booking details fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
