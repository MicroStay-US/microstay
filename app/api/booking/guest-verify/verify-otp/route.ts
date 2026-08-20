import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-for-booking-auth-must-change'
);

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: Request) {
  try {
    const { guestEmail, code } = await req.json();

    if (!guestEmail || !code) {
      return NextResponse.json({ error: 'Missing email or OTP code.' }, { status: 400 });
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

    // Generate short-lived JWT (15 minutes) as verification token
    const token = await new SignJWT({
      guestEmail: email,
      verified: true
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(JWT_SECRET);

    return NextResponse.json({ success: true, verificationToken: token });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
