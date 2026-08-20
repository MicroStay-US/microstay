import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { isValidEmail, isValidPhone, sanitizeString } from '@/lib/validation';

export async function POST(req: Request) {
  // 10 booking attempts per IP per 10 minutes
  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit(`booking:${ip}`, 10, 10 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    const {
      slotId, propertyId, vendorId,
      guestName, guestEmail, guestPhone,
      dateStr, grossAmount, verificationToken
    } = await req.json();

    // Basic validation
    if (!slotId || !propertyId || !vendorId || !guestName || !dateStr) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!guestEmail || !isValidEmail(guestEmail)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (guestPhone && !isValidPhone(guestPhone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }
    // Sanitize guest name to prevent injection in downstream outputs (emails, PDFs)
    const safeName = sanitizeString(guestName, 100);
    if (safeName.length < 1) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 });
    }

    // Verify Email Ownership
    const { cookies } = await import('next/headers');
    const { jwtVerify } = await import('jose');
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-for-booking-auth-must-change'
    );

    const token = cookies().get('sb-access-token')?.value;
    let isUserAuthed = false;
    
    if (token) {
      const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { user } } = await authClient.auth.getUser(token);
      if (user && user.email?.toLowerCase() === guestEmail.toLowerCase()) {
        isUserAuthed = true;
      }
    }

    if (!isUserAuthed && !verificationToken) {
       return NextResponse.json({ error: 'Email verification required.' }, { status: 401 });
    } else if (!isUserAuthed && verificationToken) {
      try {
        const { payload } = await jwtVerify(verificationToken, JWT_SECRET);
        if (payload.guestEmail !== guestEmail.toLowerCase().trim()) {
           return NextResponse.json({ error: 'Verification token email mismatch.' }, { status: 401 });
        }
      } catch (err) {
        return NextResponse.json({ error: 'Invalid or expired verification token.' }, { status: 401 });
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Determine which table owns this slot ──────────────────────────────────
    // First, check if the slot exists in vd_date_windows.
    // Date windows can be mirrored into vd_time_slots on first booking, so we cannot
    // rely on slot absence from vd_time_slots to detect date-window bookings.
    const { data: dwData } = await supabase
      .from('vd_date_windows')
      .select('id, max_rooms, duration_hours, price_per_room, start_hour, end_hour')
      .eq('id', slotId)
      .maybeSingle();

    const isDateWindow = !!dwData;

    if (isDateWindow) {
      // ── Date-window path: handle entirely in the API route ─────────────────
      if (!dwData) {
        return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
      }

      const serverPrice = Number(dwData.price_per_room);
      if (!serverPrice || serverPrice <= 0) {
        return NextResponse.json({ error: 'Invalid slot price' }, { status: 400 });
      }

      if (Math.abs(Number(grossAmount) - serverPrice) > 0.01) {
        return NextResponse.json({ error: 'Price mismatch. Please refresh and try again.' }, { status: 400 });
      }

      // Check current bookings for this slot + date
      const { count } = await supabase
        .from('vd_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', slotId)
        .eq('booking_date', dateStr)
        .in('status', ['pending', 'checked_in']);

      if (count !== null && count >= dwData.max_rooms) {
        return NextResponse.json(
          { error: 'This time window just sold out. Please choose another.' },
          { status: 409 },
        );
      }

      // Calculate platform fees: 12% of server-verified gross
      // const platformFlat  = 5.00;
      const platformPct   = serverPrice * 0.12;
      const platformTotal =  platformPct;
      const vendorNet     = serverPrice - platformTotal;

      // Generate a unique booking reference (mirrors generate_vd_booking_ref())
      const year = new Date().getFullYear();
      const rand = String(Math.floor(Math.random() * 99999 + 1)).padStart(5, '0');
      const bookingRef = `MS-${year}-${rand}`;

      // Bypass FK Constraint by syncing a "mirrored" slot into vd_time_slots
      // This prevents DDL errors for vd_date_windows while preserving integrity.
      const { error: syncErr } = await supabase.from('vd_time_slots')
        .upsert({
          id: slotId,
          property_id: propertyId,
          slot_label: `${dwData.duration_hours || 3}H Date Window Booking`,
          price_per_room: Math.max(Number(dwData.price_per_room) || 50, 50),
          start_hour: dwData.start_hour,
          end_hour: (dwData.start_hour + Math.max(dwData.duration_hours, 3)) % 24,
          duration_hours: Math.max(dwData.duration_hours, 3),
          max_rooms: Math.max(dwData.max_rooms || 1, 1),
          is_active: false,
          room_type: 'Standard',
          bed_type: '1 bed',
          smoking_type: 'non-smoking',
          rooms_available: Math.max(dwData.max_rooms || 1, 1)
        }, { onConflict: 'id' });
      
      if (syncErr) {
        console.error('Silent FK Shadow Slot Sync Error:', syncErr);
      }

      const { data: newBooking, error: insertError } = await supabase
        .from('vd_bookings')
        .insert({
          booking_ref:       bookingRef,
          property_id:       propertyId,
          slot_id:           slotId,
          vendor_id:         vendorId,
          guest_name:        guestName,
          guest_email:       guestEmail,
          guest_phone:       guestPhone || '',
          rooms_booked:      1,
          gross_amount:      serverPrice,   // always server-verified price
          // platform_flat_fee: platformFlat,
          platform_pct_fee:  platformPct,
          platform_total_fee: platformTotal,
          vendor_net:        vendorNet,
          status:            'pending',
          booking_date:      dateStr,
        })
        .select('id, booking_ref')
        .single();
        console.log('datas---',newBooking);

      if (insertError) {
        if (insertError.message.includes('SOLD_OUT')) {
          return NextResponse.json(
            { error: 'This time window just sold out. Please choose another.' },
            { status: 409 },
          );
        }
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        bookingId: newBooking.id,
        bookingRef: newBooking.booking_ref,
      });
    }

    // ── Default slot path: use the atomic Postgres RPC ────────────────────────
    // Re-fetch slot details and authoritative price from DB — never trust client-supplied grossAmount
    const { data: tsData } = await supabase
      .from('vd_time_slots')
      .select('id, max_rooms, price_per_room')
      .eq('id', slotId)
      .maybeSingle();

    if (!tsData) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    const serverPrice = Number(tsData.price_per_room ?? 0);
    if (!serverPrice || serverPrice <= 0) {
      return NextResponse.json({ error: 'Invalid slot price' }, { status: 400 });
    }

    if (Math.abs(Number(grossAmount) - serverPrice) > 0.01) {
      return NextResponse.json({ error: 'Price mismatch. Please refresh and try again.' }, { status: 400 });
    }

    const { error: lockErr } = await supabase.rpc('create_booking_atomic', {
      p_slot_id:      slotId,
      p_property_id:  propertyId,
      p_vendor_id:    vendorId,
      p_guest_name:   guestName,
      p_guest_email:  guestEmail,
      p_guest_phone:  guestPhone || '',
      p_booking_date: dateStr,
      p_gross_amount: serverPrice,  // server-verified price, not client-supplied
    });

    if (lockErr) {
      if (lockErr.message.includes('SOLD_OUT')) {
        return NextResponse.json(
          { error: 'This time window just sold out. Please choose another.' },
          { status: 409 },
        );
      }
      throw lockErr;
    }

    // Fetch the newly created booking
    const { data: newBooking } = await supabase
      .from('vd_bookings')
      .select('id, booking_ref')
      .eq('slot_id', slotId)
      .eq('booking_date', dateStr)
      .eq('guest_email', guestEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      bookingId: newBooking?.id,
      bookingRef: newBooking?.booking_ref,
    });
  } catch (err: any) {
    console.error('Booking create error:', err);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 },
    );
  }
}
