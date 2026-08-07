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
    const { vendorEmail, guestName, bookingRef, checkInTime, roomsBooked, price } = await req.json();

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!vendorEmail || !EMAIL_REGEX.test(vendorEmail)) {
      return NextResponse.json({ error: 'Valid vendor email required' }, { status: 400 });
    }

    const safe = {
      guestName: escapeHtml(guestName ?? ''),
      bookingRef: escapeHtml(bookingRef ?? ''),
      checkInTime: escapeHtml(checkInTime ?? ''),
      roomsBooked: escapeHtml(String(roomsBooked ?? '')),
      price: escapeHtml(String(price ?? '')),
    };

    const fromAddress = isDev ? 'MicroStay Alerts <onboarding@resend.dev>' : 'MicroStay Alerts <noreply@microstay.us>';
    // Temporarily routing to admin email as requested by user until domain is verified
    const toAddress = 'team@microstay.us';

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      subject: `[VENDOR] New Booking Request: ${safe.bookingRef} (Intended for: ${escapeHtml(vendorEmail)})`,
      html: `
        <div style="font-family: sans-serif; color: #2E1A16; padding: 20px;">
          <h2 style="color: #FF5E1A;">New Booking Received!</h2>
          <p>You have a new reservation from <strong>${safe.guestName}</strong>.</p>
          <hr />
          <ul style="list-style: none; padding: 0;">
            <li><strong>Ref:</strong> ${safe.bookingRef}</li>
            <li><strong>Rooms:</strong> ${safe.roomsBooked}</li>
            <li><strong>Expected Check-In Window:</strong> ${safe.checkInTime}</li>
            <li><strong>Total Gross:</strong> $${safe.price}</li>
          </ul>
          <hr />
          <p>Please log into your <a href="https://vendor.microstay.us">MicroStay Vendor Dashboard</a> to review and prepare for check-in.</p>
        </div>
      `,
    });

    if (error) {
      console.warn('Resend Error:', error.message);
      return NextResponse.json({ success: false, warning: 'Failed to send booking notification' });
    }

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error('Notification API Error:', err);
    return NextResponse.json({ error: 'Booking notification failed' }, { status: 500 });
  }
}
