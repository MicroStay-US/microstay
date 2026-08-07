import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  'https://www.microstay.us';

export async function POST(req: NextRequest) {
  // Rate-limit: 3 resend attempts per IP per 15 minutes
  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit(`vendor-resend-verify:${ip}`, 3, 15 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const { email } = (await req.json()) ?? {};
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

    const normalizedEmail = String(email).trim().toLowerCase();

    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Look up vendor — must exist and be pending email verification
    const { data: vendors } = await svc
      .from('vendors')
      .select('id, email, email_verification_token, status')
      .ilike('email', normalizedEmail)
      .limit(1);

    const vendor = vendors?.[0];

    // Return success even if not found (prevent email enumeration)
    if (!vendor || vendor.status !== 'pending_email_verification' || !vendor.email_verification_token) {
      return NextResponse.json({ success: true });
    }

    // Refresh the token and sent_at timestamp
    const newToken = crypto.randomUUID();
    await svc
      .from('vendors')
      .update({
        email_verification_token: newToken,
        email_verification_sent_at: new Date().toISOString(),
      })
      .eq('id', vendor.id);

    const verifyUrl = `${SITE_URL}/api/vendors/verify-email?token=${newToken}&email=${encodeURIComponent(normalizedEmail)}`;
    const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;

    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: 'MicroStay Partners <noreply@microstay.us>',
          to: [normalizedEmail],
          subject: 'Verify your MicroStay Partner account',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#FF5E1A;padding:24px;border-radius:8px 8px 0 0">
                <h1 style="color:white;margin:0;font-size:22px">Welcome to MicroStay Partners</h1>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #F0997B;border-top:none;border-radius:0 0 8px 8px">
                <p style="color:#2E1A16;font-size:16px;line-height:1.6">
                  Here is your new verification link for your MicroStay Partner account.
                </p>
                <div style="text-align:center;margin:32px 0">
                  <a href="${verifyUrl}"
                     style="background:#FF5E1A;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">
                    Verify Email Address
                  </a>
                </div>
                <p style="color:#8A5A50;font-size:14px">
                  This link expires in 24 hours. If you did not create a MicroStay Partner account,
                  you can safely ignore this email.
                </p>
                <hr style="border:none;border-top:1px solid #F0997B;margin:24px 0"/>
                <p style="color:#8A5A50;font-size:12px;margin:0">Microstay Holdings LLC · info@microstay.us</p>
              </div>
            </div>
          `,
        });
        return NextResponse.json({ success: true });
      } catch (e: any) {
        console.error('Resend resend-verify error — falling back to Supabase OTP:', e.message);
      }
    }

    // Fallback: Supabase OTP
    try {
      await (svc.auth as any).signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: verifyUrl },
      });
    } catch (e: any) {
      console.error('Supabase OTP fallback error:', e.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Resend-verification error:', err);
    return NextResponse.json({ error: 'Failed to resend verification email.' }, { status: 500 });
  }
}
