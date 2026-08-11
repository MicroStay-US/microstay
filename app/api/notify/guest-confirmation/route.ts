import { NextResponse } from 'next/server';
import { Resend } from 'resend';

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function POST(req: Request) {

  const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;
  if (!resendKey) return NextResponse.json({ success: true, skipped: true });
  
  const resend = new Resend(resendKey);
  const isDev = process.env.NODE_ENV !== 'production';

  try {
    const {
      guestEmail,
      guestName,
      bookingRef,
      propertyName,
      propertyAddress,
      propertyCity,
      propertyPhone,
      checkInTime,   // e.g. "10 AM - 1 PM"
      bookingDate,   // e.g. "Saturday, Apr 5, 2026"
      roomType,      // e.g. "1 Bed Standard"
      price,         // number
    } = await req.json();

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!guestEmail || !EMAIL_REGEX.test(guestEmail)) {
      return NextResponse.json({ error: 'Valid guest email required' }, { status: 400 });
    }

    const safe = {
      guestName: escapeHtml(guestName ?? ''),
      bookingRef: escapeHtml(bookingRef ?? ''),
      propertyName: escapeHtml(propertyName ?? ''),
      propertyAddress: escapeHtml(propertyAddress ?? ''),
      propertyCity: escapeHtml(propertyCity ?? ''),
      propertyPhone: escapeHtml(propertyPhone ?? ''),
      checkInTime: escapeHtml(checkInTime ?? ''),
      bookingDate: escapeHtml(bookingDate ?? ''),
      roomType: escapeHtml(roomType ?? ''),
    };

    const fromAddress = isDev ? 'MicroStay Reservations <onboarding@resend.dev>' : 'MicroStay Reservations <noreply@microstay.us>';
    // Temporarily routing to admin email as requested by user until domain is verified
    const toAddress = 'team@microstay.us';

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      subject: `[GUEST] Booking Confirmed – ${safe.bookingRef} · ${safe.propertyName} (Intended for: ${escapeHtml(guestEmail)})`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#FFF1EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background-color:#FFF1EC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #FF5E1A, #F0997B);padding:36px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:3px;color:rgba(255,255,255,0.7);text-transform:uppercase;">MicroStay · Hourly Bookings</p>
                    <h1 style="margin:8px 0 0;font-size:28px;font-weight:900;color:#ffffff;line-height:1.1;">Booking Confirmed!</h1>
                    <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.85);font-weight:500;">Hi ${safe.guestName}, your reservation is all set.</p>
                  </td>
                  <td align="right" valign="top">
                    <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 16px;text-align:center;display:inline-block;">
                      <p style="margin:0;font-size:9px;font-weight:800;letter-spacing:2px;color:rgba(255,255,255,0.7);text-transform:uppercase;">Ref #</p>
                      <p style="margin:4px 0 0;font-size:18px;font-weight:900;color:#ffffff;font-family:monospace;letter-spacing:1px;">${safe.bookingRef}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">

              <!-- Booking Summary Card -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 20px;font-size:11px;font-weight:800;letter-spacing:2px;color:#94a3b8;text-transform:uppercase;">Reservation Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;width:40%;">
                          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Property</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;">${safe.propertyName}</p>
                          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${safe.propertyAddress}${safe.propertyCity ? ', ' + safe.propertyCity : ''}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Date</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;">${safe.bookingDate}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Time Window</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;">${safe.checkInTime}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Room Type</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;text-transform:capitalize;">${safe.roomType}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:10px 0 0;">
                          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Total Due</p>
                        </td>
                        <td style="padding:10px 0 0;">
                          <p style="margin:0;font-size:20px;font-weight:900;color:#16a34a;">$${Number(price).toFixed(2)}</p>
                          <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">Pay at front desk on arrival</p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>

              <!-- What's next -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#FF5E1A;text-transform:uppercase;letter-spacing:1px;">What to Bring</p>
                    <ul style="margin:0;padding-left:18px;color:#7c2d12;">
                      <li style="font-size:13px;font-weight:500;margin-bottom:4px;line-height:1.5;">A valid photo ID (driver's license or passport)</li>
                      <li style="font-size:13px;font-weight:500;margin-bottom:4px;line-height:1.5;">Your booking reference: <strong>${safe.bookingRef}</strong></li>
                      <li style="font-size:13px;font-weight:500;line-height:1.5;">Cash or card to pay at the front desk</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Property contact -->
              ${propertyPhone ? `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;background:#f1f5f9;border-radius:10px;">
                    <p style="margin:0;font-size:12px;font-weight:700;color:#64748b;">Property contact: <a href="tel:${safe.propertyPhone}" style="color:#FF5E1A;text-decoration:none;font-weight:800;">${safe.propertyPhone}</a></p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://microstay.us/check-booking"
                      style="display:inline-block;background:linear-gradient(135deg, #FF5E1A, #F0997B);color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.5px;">
                      View My Bookings
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:24px 40px;">
              <p style="margin:0;font-size:11px;color:#475569;text-align:center;line-height:1.6;">
                Questions? Email us at <a href="mailto:support@microstay.us" style="color:#FF5E1A;text-decoration:none;">support@microstay.us</a><br/>
                MicroStay · Hourly Motel Bookings · <a href="https://microstay.us" style="color:#475569;text-decoration:none;">microstay.us</a>
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
      console.warn('[guest-confirmation] Resend error:', error.message);
      return NextResponse.json({ success: false, warning: 'Failed to send confirmation email' });
    }

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error('[guest-confirmation]', err);
    return NextResponse.json({ error: 'Guest confirmation failed' }, { status: 500 });
  }
}
