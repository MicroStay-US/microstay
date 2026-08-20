import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/send-email';
import crypto from 'crypto';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { verifyReCaptcha } from '@/lib/recaptcha';
import { cookies } from 'next/headers';

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: Request) {
  const ip = getIP(req);
  const ipLimit = rateLimit(`public-otp-ip:${ip}`, 5, 60 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);
  
  const globalLimit = rateLimit('public-otp-global', 200, 60 * 60 * 1000);
  if (!globalLimit.allowed) return rateLimitResponse(globalLimit.retryAfterMs);

  const body = await req.json().catch(() => ({}));
  const { email, password, recaptchaToken } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });
  }

  // Verify Google reCAPTCHA v3 token
  const captchaVerification = await verifyReCaptcha(recaptchaToken, ip);
  if (!captchaVerification.ok) {
    console.error('reCAPTCHA verification failed:', captchaVerification.error);
    return NextResponse.json(
      { error: captchaVerification.error || 'Captcha verification failed' },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // 1. Validate credentials FIRST
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user) {
    console.error('Invalid credentials attempt:', signInError?.message);
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const svc = createClient(supabaseUrl, serviceKey);

  // --- OTP Bypass Logic for Onboarding Vendors ---
  let shouldBypassOtp = false;
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', signInData.user.id)
    .single();

  if (profile?.role === 'vendor') {
    const { data: vendorData } = await svc
      .from('vendors')
      .select('status')
      .eq('auth_user_id', signInData.user.id)
      .single();

    if (vendorData) {
      // If the vendor is not fully active, skip OTP so they can complete onboarding
      const bypassStatuses = ['pending_agreement', 'pending_review', 'approved', 'pending_email_verification'];
      if (bypassStatuses.includes(vendorData.status)) {
        shouldBypassOtp = true;
      }
    }
  }

  if (shouldBypassOtp && signInData.session) {
    const cookieStore = cookies();
    const maxAge = 7 * 24 * 60 * 60; // 7 days
    
    cookieStore.set('sb-access-token', signInData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/'
    });
    
    cookieStore.set('sb-refresh-token', signInData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/'
    });

    return NextResponse.json({
      success: true,
      bypassed: true,
    });
  }
  // -----------------------------------------------

  // Clean up old codes
  await svc.from('user_otp_codes').delete().lt('expires_at', new Date().toISOString());

  // Generate and hash code
  const code = generateOtp();
  const codeHash = hashCode(code);

  // Store hashed code (10-minute expiry)
  const { error: insertErr } = await svc.from('user_otp_codes').insert({
    email: email.toLowerCase(),
    code_hash: codeHash,
  });

  if (insertErr) {
    console.error('OTP insert error:', insertErr.message);
    return NextResponse.json({ error: 'Failed to generate OTP.' }, { status: 500 });
  }

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.log(`[DEV MODE] Public User OTP for ${email}: ${code}`);
  }

  const targetEmail = isDev ? (process.env.ADMIN_EMAIL || 'admin@microstay.us') : email;
  let subject = 'Your MicroStay Login Code';
  let headerText = 'MicroStay Login';
  
  if (profile?.role === 'vendor') {
    subject = 'Your MicroStay Vendor Login Code';
    headerText = 'MicroStay Vendor Portal';
  } else if (profile?.role === 'admin') {
    subject = 'Your MicroStay Admin Login Code';
    headerText = 'MicroStay Admin Portal';
  }

  // Send via unified email sender (Resend with SMTP fallback)
  const emailRes = await sendEmail({
    from: isDev ? 'MicroStay <onboarding@resend.dev>' : 'MicroStay <no-reply@microstay.us>',
    to: targetEmail,
    subject: subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:linear-gradient(135deg, #FF5E1A, #F0997B);border-radius:50%;padding:16px;">
            <span style="font-size:28px;">🏨</span>
          </div>
          <h1 style="color:#111;font-size:22px;margin:16px 0 4px;">${headerText}</h1>
          <p style="color:#666;font-size:14px;margin:0;">Your login verification code</p>
        </div>
        <div style="background:#FFF1EC;border:1px solid #F0997B;border-radius:12px;padding:32px;text-align:center;margin:24px 0;">
          <p style="color:#2E1A16;font-size:14px;margin:0 0 12px;">Enter this code to log in:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#FF5E1A;font-family:monospace;white-space:nowrap;">
            ${code}
          </div>
          <p style="color:#8A5A50;font-size:12px;margin:16px 0 0;">Expires in <strong>10 minutes</strong></p>
        </div>
      </div>
    `,
  });

  if (!emailRes.success) {
    console.error('Failed to send public OTP email:', emailRes.error);
  }

  return NextResponse.json({
    success: true,
    email,
    ...(isDev ? { dev_code: code } : {})
  });
}
