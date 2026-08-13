import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getIP } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminEmail = process.env.ADMIN_EMAIL || 'adminmotel@gmail.com';

    // Collect request metadata for security context
    const ip = getIP(req);

    // Prefer user-agent from body (sent by browser JS, most accurate) over header
    const userAgent = body.userAgent || req.headers.get('user-agent') || 'Unknown';
    const loginTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://microstay.us';
    const resetUrl = `${siteUrl}/admin/login`;

    const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;
    if (!resendKey) {
      console.log('[login-alert] No Resend key configured — skipping email');
      return NextResponse.json({ success: true, skipped: true });
    }

    const isDev = process.env.NODE_ENV !== 'production';
    const resend = new Resend(resendKey);

    // Dev: use Resend's built-in test sender (no domain verification needed)
    // Prod: use the verified microstay.us domain
    const fromAddress = isDev
      ? 'MicroStay Security <onboarding@resend.dev>'
      : 'MicroStay Security <noreply@microstay.us>';

    // Dev: Resend free tier only delivers to the account owner's verified email
    const toAddress = process.env.ADMIN_EMAIL || 'adminmotel@gmail.com';

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      subject: '🔐 Admin Login Successful — MicroStay',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Admin Login Alert</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ff5e1a 0%,#e84c08 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">🔐</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                Admin Login Successful
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                MicroStay Admin Panel
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;color:#d1d5db;font-size:15px;line-height:1.6;">
                A successful login was recorded on your admin account. Here are the details:
              </p>

              <!-- Info Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:10px;border:1px solid #2a2a2a;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #2a2a2a;">
                    <span style="color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Account</span>
                    <div style="color:#f9fafb;font-size:14px;font-weight:600;margin-top:3px;">${adminEmail}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #2a2a2a;">
                    <span style="color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Login Time</span>
                    <div style="color:#f9fafb;font-size:14px;font-weight:600;margin-top:3px;">${loginTime} (Eastern)</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #2a2a2a;">
                    <span style="color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">IP Address</span>
                    <div style="color:#f9fafb;font-size:14px;font-weight:600;margin-top:3px;">${ip}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;">
                    <span style="color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Device</span>
                    <div style="color:#f9fafb;font-size:12px;margin-top:3px;word-break:break-all;line-height:1.5;">${userAgent}</div>
                  </td>
                </tr>
              </table>

              <!-- Security Alert Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f1200;border:1px solid #92400e;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;color:#fbbf24;font-size:13px;font-weight:600;">
                      ⚠️ Was this not you?
                    </p>
                    <p style="margin:6px 0 0;color:#d97706;font-size:13px;line-height:1.5;">
                      If you did not log in, reset your password immediately to secure your account.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Reset Password Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#ff5e1a,#e84c08);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 30px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="margin:0;color:#4b5563;font-size:12px;line-height:1.6;">
                This is an automated security notification from MicroStay.<br/>
                Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[login-alert] Resend error:', error);
      return NextResponse.json({ success: false, error: 'Email send failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[login-alert] Unexpected error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
