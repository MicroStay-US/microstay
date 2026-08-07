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
    const { guestName, guestEmail, propertyName, bookingRef, checkInTime, roomsBooked, price } = await req.json();

    const safe = {
      guestName: escapeHtml(guestName ?? ''),
      guestEmail: escapeHtml(guestEmail ?? ''),
      propertyName: escapeHtml(propertyName ?? ''),
      bookingRef: escapeHtml(bookingRef ?? ''),
      checkInTime: escapeHtml(checkInTime ?? ''),
      roomsBooked: escapeHtml(String(roomsBooked ?? '')),
      price: escapeHtml(String(price ?? '')),
    };

    const fromAddress = isDev ? 'MicroStay Admin <onboarding@resend.dev>' : 'MicroStay Admin <noreply@microstay.us>';
    const toAddress = 'team@microstay.us';

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      subject: `[ADMIN] New Booking Alert: ${safe.bookingRef}`,
      html: `
        <div style="font-family: sans-serif; color: #2E1A16; padding: 20px;">
          <h2 style="color: #FF5E1A;">New Booking Created (Admin Copy)</h2>
          <hr />
          <ul style="list-style: none; padding: 0;">
            <li><strong>Ref:</strong> ${safe.bookingRef}</li>
            <li><strong>Guest Name:</strong> ${safe.guestName}</li>
            <li><strong>Guest Email:</strong> ${safe.guestEmail}</li>
            <li><strong>Property:</strong> ${safe.propertyName}</li>
            <li><strong>Rooms:</strong> ${safe.roomsBooked}</li>
            <li><strong>Expected Check-In Window:</strong> ${safe.checkInTime}</li>
            <li><strong>Total Gross:</strong> $${safe.price}</li>
          </ul>
        </div>
      `,
    });

    if (error) {
      console.warn('Resend Error:', error.message);
      return NextResponse.json({ success: false, warning: 'Failed to send admin notification' });
    }

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error('Notification API Error:', err);
    return NextResponse.json({ error: 'Admin booking notification failed' }, { status: 500 });
  }
}
