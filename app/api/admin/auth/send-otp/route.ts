import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

const ADMIN_EMAIL = 'admin@microstay.us';

function generateOtp(): string {
  // Cryptographically secure 6-digit code
  return String(crypto.randomInt(100000, 999999));
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: Request) {
  // Rate limit: 5 OTP sends per IP per hour + 10 globally per hour.
  // This blocks attackers from flooding the admin inbox or exhausting
  // the Resend quota. Legitimate admin use is ~1 login per few days.
  const ip = getIP(req);
  const ipLimit = rateLimit(`admin-otp-ip:${ip}`, 5, 60 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);
  const globalLimit = rateLimit('admin-otp-global', 10, 60 * 60 * 1000);
  if (!globalLimit.allowed) return rateLimitResponse(globalLimit.retryAfterMs);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;

  // In local development, log the code to the server console instead of emailing
  const isDev = process.env.NODE_ENV === 'development';

  const svc = createClient(supabaseUrl, serviceKey);

  // Clean up old codes
  await svc.from('admin_otp_codes').delete().lt('expires_at', new Date().toISOString());

  // Generate and hash code
  const code = generateOtp();
  const codeHash = hashCode(code);

  // Store hashed code (10-minute expiry)
  const { error: insertErr } = await svc.from('admin_otp_codes').insert({
    code_hash: codeHash,
  });

  if (insertErr) {
    console.error('OTP insert error:', insertErr.message);
    return NextResponse.json({ error: 'Failed to generate OTP.' }, { status: 500 });
  }

  if (isDev || !resendKey) {
    // Local dev — print code to server console (check your terminal)
    console.log('\n');
    console.log('┌─────────────────────────────────────┐');
    console.log('│     ADMIN OTP (local dev only)       │');
    console.log(`│           CODE: ${code}              │`);
    console.log('│        Expires in 10 minutes         │');
    console.log('└─────────────────────────────────────┘');
    console.log('\n');
    return NextResponse.json({ success: true });
  }

  // Production — send via Resend
  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: 'MicroStay <noreply@microstay.us>',
      to: [ADMIN_EMAIL],
      subject: 'Your MicroStay Admin Login Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:linear-gradient(135deg, #FF5E1A, #F0997B);border-radius:50%;padding:16px;">
              <span style="font-size:28px;">🛡️</span>
            </div>
            <h1 style="color:#111;font-size:22px;margin:16px 0 4px;">MicroStay Admin Login</h1>
            <p style="color:#666;font-size:14px;margin:0;">Your one-time password</p>
          </div>

          <div style="background:#FFF1EC;border:1px solid #F0997B;border-radius:12px;padding:32px;text-align:center;margin:24px 0;">
            <p style="color:#2E1A16;font-size:14px;margin:0 0 12px;">Enter this code on the login page:</p>
            <div style="font-size:42px;font-weight:700;letter-spacing:12px;color:#FF5E1A;font-family:monospace;">
              ${code}
            </div>
            <p style="color:#8A5A50;font-size:12px;margin:16px 0 0;">Expires in <strong>10 minutes</strong></p>
          </div>

          <p style="color:#8A5A50;font-size:12px;text-align:center;margin:24px 0 0;">
            If you did not request this code, someone may be attempting to access the admin portal.
            You can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (e: any) {
    console.error('Resend error:', e.message);
    return NextResponse.json({ error: 'Failed to send OTP email.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
