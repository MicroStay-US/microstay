import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/send-email';
import crypto from 'crypto';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: Request) {
  // Rate Limiting: 3 attempts per 10 minutes
  const ip = getIP(req);
  const ipLimit = rateLimit(`booking-send-otp:${ip}`, 3, 10 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);

  try {
    const { bookingRef, guestEmail } = await req.json();

    if (!bookingRef || !guestEmail) {
      return NextResponse.json({ error: 'Booking reference and email required.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const svc = createClient(supabaseUrl, serviceKey);

    // Verify booking existence without exposing data
    const { data: booking, error: fetchError } = await svc
      .from('vd_bookings')
      .select('id')
      .eq('booking_ref', bookingRef.toUpperCase().trim())
      .eq('guest_email', guestEmail.toLowerCase().trim())
      .maybeSingle();

    if (fetchError || !booking) {
      // Return 200 anyway to prevent email enumeration, but don't send email
      return NextResponse.json({ success: true, message: 'If the booking exists, an OTP has been sent.' });
    }

    // Clean up old codes
    await svc.from('user_otp_codes').delete().lt('expires_at', new Date().toISOString());

    // Generate and hash code
    const code = generateOtp();
    const codeHash = hashCode(code);

    // Store hashed code (5-minute expiry for higher security as per prompt)
    const { error: insertErr } = await svc.from('user_otp_codes').insert({
      email: guestEmail.toLowerCase().trim(),
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });

    if (insertErr) {
      console.error('OTP insert error:', insertErr.message);
      return NextResponse.json({ error: 'Failed to generate OTP.' }, { status: 500 });
    }

    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log(`[DEV MODE] Booking OTP for ${guestEmail}: ${code}`);
    }

    const targetEmail = isDev ? (process.env.ADMIN_EMAIL || 'admin@microstay.us') : guestEmail;

    const emailRes = await sendEmail({
      from: isDev ? 'MicroStay <onboarding@resend.dev>' : 'MicroStay <no-reply@microstay.us>',
      to: targetEmail,
      subject: 'Your MicroStay Booking Access Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:linear-gradient(135deg, #FF5E1A, #F0997B);border-radius:50%;padding:16px;">
              <span style="font-size:28px;">🏨</span>
            </div>
            <h1 style="color:#111;font-size:22px;margin:16px 0 4px;">MicroStay Booking Access</h1>
            <p style="color:#666;font-size:14px;margin:0;">Verification code for booking ${bookingRef}</p>
          </div>
          <div style="background:#FFF1EC;border:1px solid #F0997B;border-radius:12px;padding:32px;text-align:center;margin:24px 0;">
            <p style="color:#2E1A16;font-size:14px;margin:0 0 12px;">Enter this code to access your booking:</p>
            <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#FF5E1A;font-family:monospace;white-space:nowrap;">
              ${code}
            </div>
            <p style="color:#8A5A50;font-size:12px;margin:16px 0 0;">Expires in <strong>5 minutes</strong></p>
          </div>
        </div>
      `,
    });

    if (!emailRes.success) {
      console.error('Failed to send booking OTP email:', emailRes.error);
    }

    return NextResponse.json({
      success: true,
      message: 'If the booking exists, an OTP has been sent.',
      ...(isDev ? { dev_code: code } : {})
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
