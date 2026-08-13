import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function POST(req: Request) {

  const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;
  if (!resendKey) return NextResponse.json({ success: true, skipped: true });
  
  const resend = new Resend(resendKey);
  const isDev = process.env.NODE_ENV !== 'production';

  try {
    const { vendorEmail: initialVendorEmail, guestName, bookingRef, checkInTime, roomsBooked, price, vendorId, propertyId } = await req.json();

    let targetVendorEmail = initialVendorEmail;

    // Fallback lookup from database if client did not pass vendorEmail directly
    if (!targetVendorEmail && (vendorId || propertyId)) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey);
        if (vendorId) {
          const { data: vData } = await supabase.from('vendors').select('email').eq('id', vendorId).maybeSingle();
          if (vData?.email) targetVendorEmail = vData.email;
        } else if (propertyId) {
          const { data: pData } = await supabase.from('vd_properties').select('vendor_id, email').eq('id', propertyId).maybeSingle();
          if (pData?.email) {
            targetVendorEmail = pData.email;
          } else if (pData?.vendor_id) {
            const { data: vData } = await supabase.from('vendors').select('email').eq('id', pData.vendor_id).maybeSingle();
            if (vData?.email) targetVendorEmail = vData.email;
          }
        }
      }
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!targetVendorEmail || !EMAIL_REGEX.test(targetVendorEmail)) {
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
    const toAddress = targetVendorEmail.trim();

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      subject: `New Booking Request: ${safe.bookingRef}`,
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
