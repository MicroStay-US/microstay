import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-for-booking-auth-must-change'
);

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: Request) {
  try {
    const { bookingRef, guestEmail, code } = await req.json();

    if (!bookingRef || !guestEmail || !code) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const svc = createClient(supabaseUrl, serviceKey);

    const email = guestEmail.toLowerCase().trim();
    const codeHash = hashCode(code);

    // Verify OTP
    const { data: otpRecords, error: otpError } = await svc
      .from('user_otp_codes')
      .select('id, expires_at')
      .eq('email', email)
      .eq('code_hash', codeHash)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError || !otpRecords || otpRecords.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 401 });
    }

    // Delete the OTP to prevent replay attacks
    await svc.from('user_otp_codes').delete().eq('id', otpRecords[0].id);

    // Verify booking
    const { data: booking, error: fetchError } = await svc
      .from('vd_bookings')
      .select('id')
      .eq('booking_ref', bookingRef.toUpperCase().trim())
      .eq('guest_email', email)
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    // Generate short-lived JWT (15 minutes)
    const token = await new SignJWT({
      bookingRef: bookingRef.toUpperCase().trim(),
      guestEmail: email,
      role: 'booking_guest'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(JWT_SECRET);

    // Set HttpOnly cookie
    const cookieStore = cookies();
    cookieStore.set('booking_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/'
    });

    return NextResponse.json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
