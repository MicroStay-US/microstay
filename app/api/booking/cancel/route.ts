import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-for-booking-auth-must-change'
);

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('booking_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Please verify your booking again.' }, { status: 401 });
    }

    // Verify token
    let payload;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid or expired session. Please verify your booking again.' }, { status: 401 });
    }

    if (payload.role !== 'booking_guest' || !payload.bookingRef || !payload.guestEmail) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const bookingRef = String(payload.bookingRef);
    const guestEmail = String(payload.guestEmail);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch booking to verify it exists and belongs to the email
    const { data: booking, error: fetchError } = await supabase
      .from('vd_bookings')
      .select('*, slot:vd_time_slots(start_hour)')
      .eq('booking_ref', bookingRef.toUpperCase().trim())
      .eq('guest_email', guestEmail.toLowerCase().trim())
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found or invalid email' }, { status: 404 });
    }

    if (booking.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending bookings can be cancelled' }, { status: 400 });
    }

    // Check if it's before boarding time
    const now = new Date();
    const bookingDateStr = booking.booking_date; // YYYY-MM-DD
    const [year, month, day] = bookingDateStr.split('-').map(Number);
    const startHour = booking.slot?.start_hour || booking.start_hour || 14; 
    
    const boardingTime = new Date(year, month - 1, day, startHour, 0, 0);

    if (now >= boardingTime) {
      return NextResponse.json({ error: 'Cannot cancel booking after boarding time' }, { status: 400 });
    }

    // Perform cancellation
    const { error: updateError } = await supabase
      .from('vd_bookings')
      .update({
        status: 'customer_cancel',
        cancel_reason: 'Cancelled by customer',
        customer_cancelled_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Booking cancelled successfully' });

  } catch (error: any) {
    console.error('Cancellation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel booking' }, { status: 500 });
  }
}
