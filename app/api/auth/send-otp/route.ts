import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

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
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;

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
    return NextResponse.json({
      success: true,
      bypassed: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
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

  if (!resendKey) {
    return NextResponse.json({ success: true, email });
  }

  // Send via Resend (Works in production, and locally if API key is provided)
  try {
    const resend = new Resend(resendKey);
    
    let subject = 'Your MicroStay Login Code';
    let headerText = 'MicroStay Login';
    
    if (profile?.role === 'vendor') {
      subject = 'Your MicroStay Vendor Login Code';
      headerText = 'MicroStay Vendor Portal';
    } else if (profile?.role === 'admin') {
      subject = 'Your MicroStay Admin Login Code';
      headerText = 'MicroStay Admin Portal';
    }

    const { error: resendErr } = await resend.emails.send({
      from: isDev ? 'onboarding@resend.dev' : 'MicroStay <noreply@microstay.us>',
      to: isDev ? [process.env.ADMIN_EMAIL || 'adminmotel@gmail.com'] : [email],
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

    if (resendErr) {
      console.error('Resend API error:', resendErr);
    }
  } catch (e: any) {
    console.error('Resend Exception:', e.message);
  }

  return NextResponse.json({ success: true, email });
}
