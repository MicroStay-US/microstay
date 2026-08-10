import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 10;

// We will resolve SITE_URL dynamically inside the handler based on req.url
// to handle Vercel preview domains correctly.

/**
 * Send the verification email.
 * Primary: Resend (branded). Fallback: Supabase OTP magic link.
 */
async function sendVerificationEmail(
  siteUrl: string,
  svc: any,
  email: string,
  token: string
) {
  const verifyUrl = `${siteUrl}/api/vendors/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'MicroStay Partners <noreply@microstay.us>',
        to: [email],
        subject: 'Verify your MicroStay Partner account',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#FF5E1A;padding:24px;border-radius:8px 8px 0 0">
              <h1 style="color:white;margin:0;font-size:22px">Welcome to MicroStay Partners</h1>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #F0997B;border-top:none;border-radius:0 0 8px 8px">
              <p style="color:#2E1A16;font-size:16px;line-height:1.6">
                Thank you for starting your MicroStay Partner application.
                Please verify your email address to continue.
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
              <p style="color:#8A5A50;font-size:12px;margin:0">MICROSTAY HOLDINGS LLC d/b/a MicroStay.us · info@microstay.us</p>
            </div>
          </div>
        `,
      });
      return;
    } catch (e: any) {
      console.error('Resend email error — falling back to Supabase OTP:', e.message);
    }
  }

  // Fallback: Supabase OTP sends a magic link via Supabase's built-in SMTP.
  // The OTP redirects to our verify-email endpoint carrying the token as a query param.
  try {
    await (svc.auth as any).signInWithOtp({
      email,
      options: { emailRedirectTo: verifyUrl },
    });
  } catch (e: any) {
    console.error('Supabase OTP fallback error:', e.message);
  }
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  // Rate-limit: 5 registration attempts per IP per hour
  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit(`vendor-register:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const body = await req.json();
    const { email, password } = body ?? {};

    // --- Input validation ---
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (
      password.length < PASSWORD_MIN_LENGTH ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return NextResponse.json(
        {
          error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and contain an uppercase letter, a number, and a special character.`,
        },
        { status: 400 }
      );
    }

    const svc = createClient(supabaseUrl, serviceKey);

    const normalizedEmail = email.trim().toLowerCase();

    // --- Check for an existing vendor record ---
    const { data: existingVendors } = await svc
      .from('vendors')
      .select('id, status, auth_user_id')
      .ilike('email', normalizedEmail)
      .limit(1);

    const existingVendor = existingVendors?.[0];

    if (existingVendor) {
      // Block only fully processed accounts
      const blockedStatuses = ['approved', 'active', 'rejected', 'suspended'];
      if (blockedStatuses.includes(existingVendor.status)) {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 }
        );
      }

      // Incomplete signup (pending_email_verification / pending_agreement / pending_review)
      // — delete old record and auth user so they can start completely fresh
      if (existingVendor.auth_user_id) {
        await svc.auth.admin.deleteUser(existingVendor.auth_user_id).catch(() => {});
      }
      await svc.from('vendors').delete().eq('id', existingVendor.id);
      // Fall through to create a brand-new account below
    }

    // --- Create Supabase Auth user, or reuse a stranded one ---
    // A stranded auth user can exist when a previous registration attempt failed
    // after auth user creation but before the vendor record was inserted.
    let authUserId: string;

    const { data: authData, error: authErr } = await svc.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
    });

    if (authErr) {
      if (!authErr.message.toLowerCase().includes('already')) {
        throw new Error(`Auth user creation failed: ${authErr.message}`);
      }
      // Auth user exists but no vendor record — stranded from a previous failed attempt.
      // Find the existing auth user and reset their password so this new attempt works.
      const { data: listData } = await svc.auth.admin.listUsers();
      const existingAuthUser = listData?.users?.find(
        u => u.email?.toLowerCase() === normalizedEmail
      );
      if (!existingAuthUser) {
        throw new Error('Account setup conflict. Please contact info@microstay.us.');
      }
      // Update password so the new credentials are used
      await svc.auth.admin.updateUserById(existingAuthUser.id, { password });
      authUserId = existingAuthUser.id;
    } else {
      authUserId = authData.user.id;
    }

    // --- Confirm auth email immediately (no email verification step) ---
    await svc.auth.admin.updateUserById(authUserId, { email_confirm: true }).catch(() => {});

    // --- Insert vendor record (auto-verified) ---
    const { data: vendor, error: vendorErr } = await svc
      .from('vendors')
      .insert({
        email: normalizedEmail,
        auth_user_id: authUserId,
        status: 'pending_agreement',
        email_verified_at: new Date().toISOString(),
      })
      .select('id, email')
      .single();

    if (vendorErr) {
      // Rollback auth user
      await svc.auth.admin.deleteUser(authUserId).catch(() => {});
      throw new Error(`Vendor insert failed: ${vendorErr.message}`);
    }

    // --- Ensure profile exists for vendor login middleware ---
    await svc.from('profiles').upsert({
      id: authUserId,
      role: 'vendor',
      name: 'Pending Partner',
    });

    return NextResponse.json({
      success: true,
      vendorId: vendor.id,
      message: 'Account created. Continue your application.',
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
