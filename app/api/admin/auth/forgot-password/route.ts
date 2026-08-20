import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/send-email';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@microstay.us';

export async function POST(req: Request) {
  // Rate limit: 3 reset attempts per IP per hour
  const ip = getIP(req);
  const ipLimit = rateLimit(`admin-reset-ip:${ip}`, 3, 60 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);

  const body = await req.json().catch(() => ({}));
  const { email } = body;

  // Always respond with success to prevent email enumeration
  const safeResponse = { success: true, message: 'If this email exists, a reset link has been sent.' };

  if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    // Don't reveal whether the email is valid
    return NextResponse.json(safeResponse);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceKey) {
    console.error('[forgot-password] Missing Supabase config');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const svc = createClient(supabaseUrl, serviceKey);

    // Generate a recovery link via Supabase admin API
    const { data: resetData, error: resetError } = await svc.auth.admin.generateLink({
      type: 'recovery',
      email: ADMIN_EMAIL,
    });

    if (resetError || !resetData?.properties?.hashed_token) {
      console.error('[forgot-password] Generate link error:', resetError);
      return NextResponse.json({ success: false, error: 'Failed to generate reset link' }, { status: 500 });
    }

    const token = resetData.properties.hashed_token;
    // const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://microstay.us';
    const resetLink = `https://microstay.us/reset-password?token_hash=${encodeURIComponent(token)}&type=recovery`;

    const isDev = process.env.NODE_ENV === 'development';

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg, #FF5E1A, #f97316);padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">Reset Your Password</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p style="color:#374151;font-size:16px;line-height:1.5">Hello,</p>
          <p style="color:#374151;font-size:16px;line-height:1.5">We received a request to reset your MicroStay admin account password. Click the button below to create a new password:</p>

          <div style="text-align:center;margin:32px 0">
            <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg, #FF5E1A, #f97316);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">Reset Password</a>
          </div>

          <p style="color:#6b7280;font-size:14px;line-height:1.5;margin-top:24px">This link will expire in 24 hours. If you didn't request a password reset, please ignore this email.</p>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

          <p style="color:#9ca3af;font-size:12px;margin:0">
            If you're having trouble clicking the link, copy and paste this URL into your browser:<br>
            <span style="word-break:break-all;color:#6b7280">${resetLink}</span>
          </p>
        </div>
      </div>
    `;

    // Send via the same unified email sender that works for OTPs
    const emailRes = await sendEmail({
      from: isDev ? 'MicroStay Security <onboarding@resend.dev>' : 'MicroStay Security <no-reply@microstay.us>',
      to: ADMIN_EMAIL,
      subject: 'Reset Your MicroStay Admin Password',
      html: emailHtml,
    });

    if (isDev) {
      console.log(`[DEV MODE] Admin password reset link: ${resetLink}`);
    }

    if (!emailRes.success) {
      console.error('[forgot-password] Email send failed:', emailRes.error);
      // In dev mode, still return the link for testing
      if (isDev) {
        return NextResponse.json({
          success: true,
          message: 'Email sending failed, but reset link generated for local testing.',
          resetLink,
          warning: emailRes.error,
        });
      }
      return NextResponse.json({ success: false, error: 'Failed to send reset email. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully.',
      ...(isDev ? { resetLink } : {}),
    });
  } catch (err: any) {
    console.error('[forgot-password] Unexpected error:', err);
    return NextResponse.json({ success: false, error: err.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
