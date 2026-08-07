import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
  try {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate previous month boundaries
    const now = new Date();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    const invoicePeriod = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    // 1. Fetch all bookings from previous month that are checked_in OR owner_cancel OR no_show (penalties)
    const { data: bookings, error: bError } = await supabase
      .from('vd_bookings')
      .select('vendor_id, platform_total_fee, penalty_fee, status')
      .gte('booking_date', startOfPrevMonth.split('T')[0])
      .lte('booking_date', endOfPrevMonth.split('T')[0])
      .in('status', ['checked_in', 'owner_cancel', 'no_show']);

    if (bError) throw bError;

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: true, message: 'No billable bookings found for last month.' });
    }

    // 2. Aggregate by vendor
    const vendorAggregates: Record<string, { platform: number; penalty: number; count: number }> = {};
    for (const b of bookings) {
      if (!vendorAggregates[b.vendor_id]) vendorAggregates[b.vendor_id] = { platform: 0, penalty: 0, count: 0 };
      
      const ptf = Number(b.platform_total_fee) || 0;
      const pf = Number(b.penalty_fee) || 0;
      
      vendorAggregates[b.vendor_id].platform += ptf;
      vendorAggregates[b.vendor_id].penalty += pf;
      vendorAggregates[b.vendor_id].count += 1;
    }

    // 3. Create Invoices
    const due_date = new Date(now.getFullYear(), now.getMonth(), 7).toISOString().split('T')[0];
    const issued_date = now.toISOString().split('T')[0];

    const invoiceInserts = [];
    for (const [vendor_id, sums] of Object.entries(vendorAggregates)) {
      const totalDue = sums.platform + sums.penalty;
      if (totalDue <= 0) continue;

      invoiceInserts.push({
        vendor_id,
        invoice_period: invoicePeriod,
        total_commission: sums.platform,
        total_platform_fees: sums.platform,
        total_penalties: sums.penalty,
        total_due: totalDue,
        status: 'pending',
        issued_date,
        due_date
      });
    }

    if (invoiceInserts.length === 0) {
      return NextResponse.json({ success: true, message: 'No non-zero invoices to generate.' });
    }

    const { error: insertErr } = await supabase
      .from('invoices')
      .upsert(invoiceInserts, { onConflict: 'vendor_id, invoice_period' });

    if (insertErr) throw insertErr;

    // 4. Send Email Notifications
    // Fetch vendor emails safely
    const vendorIds = Object.keys(vendorAggregates);
    const { data: vendors } = await supabase.from('vendors').select('id, email, business_name').in('id', vendorIds);

    if (vendors) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.microstay.us';
      const billingUrl = `${siteUrl}/vendor/billing`;
      for (const vendor of vendors) {
        const sum = vendorAggregates[vendor.id];
        if (!sum) continue;
        const total = sum.platform + sum.penalty;

        await resend.emails.send({
          from: 'MicroStay Billing <noreply@microstay.us>',
          to: [vendor.email],
          subject: `Your ${invoicePeriod} Invoice is Ready`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Invoice Generated</h2>
              <p>Hi ${escapeHtml(vendor.business_name)},</p>
              <p>Your monthly statement for <strong>${escapeHtml(invoicePeriod)}</strong> has been generated.</p>
              <p><strong>Total Due:</strong> $${total.toFixed(2)}</p>
              <p>Payment is due by <strong>${escapeHtml(due_date)}</strong>.</p>
              <a href="${billingUrl}" style="background:#FF5E1A;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">View and Pay Statement</a>
            </div>
          `
        }).catch(console.warn);
      }
    }

    return NextResponse.json({ success: true, invoicesGenerated: invoiceInserts.length });

  } catch (error: any) {
    console.error('Invoice Cron Error:', error);
    return NextResponse.json({ error: 'Invoice generation failed' }, { status: 500 });
  }
}
