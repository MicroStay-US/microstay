/**
 * Payment Reminder Cron — /api/cron/remind-payment
 *
 * Scheduled TWICE per month (vercel.json):
 *   - 5th  at 09:00 UTC: `0 9 5  * *` — FIRST reminder
 *   - 25th at 09:00 UTC: `0 9 25 * *` — SECOND (final) reminder
 *
 * The cron reads a `reminder` query param to tell which reminder is being sent:
 *   ?reminder=first   → sent on the 5th
 *   ?reminder=second  → sent on the 25th (warns of imminent deactivation)
 *
 * Logic:
 *   1. Find all active vendors that have at least one invoice in 'pending' or
 *      'unpaid' status from the CURRENT month's billing cycle.
 *   2. Send each vendor an email reminder with the amount due.
 *   3. On the second reminder (25th), also warn that their property will be
 *      deactivated on the 26th if payment is not received.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` header required.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(req: Request) {
  return runReminder(req);
}

export async function POST(req: Request) {
  return runReminder(req);
}

async function runReminder(req: Request) {
  // Auth
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const url = new URL(req.url);
  const reminderType = url.searchParams.get('reminder') || 'first'; // 'first' or 'second'
  const isSecondReminder = reminderType === 'second';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(process.env.RESEND_API_KEY || '');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.microstay.us';

  // Find the current billing period (previous month's invoices are due this month)
  const now = new Date();
  const billingPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth()).padStart(2, '0')}`; // previous month

  // Fetch unpaid invoices for this billing period
  const { data: unpaidInvoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, vendor_id, total_due, invoice_period, status')
    .eq('invoice_period', billingPeriod)
    .in('status', ['pending', 'unpaid', 'overdue']);

  if (invErr) {
    console.error('[cron/remind-payment] fetch error:', invErr.message);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }

  if (!unpaidInvoices || unpaidInvoices.length === 0) {
    return NextResponse.json({ success: true, reminded: 0, message: 'No unpaid invoices found.' });
  }

  // Fetch vendor details for the relevant vendors
  const vendorIds = Array.from(new Set(unpaidInvoices.map((inv: any) => inv.vendor_id)));
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, email, business_name')
    .in('id', vendorIds)
    .eq('status', 'active');

  const vendorMap = new Map((vendors || []).map((v: any) => [v.id, v]));

  let reminded = 0;
  const errors: string[] = [];

  for (const invoice of unpaidInvoices) {
    const vendor = vendorMap.get(invoice.vendor_id);
    if (!vendor) continue;

    const amount = Number(invoice.total_due).toFixed(2);
    const billingUrl = `https://microstay.us/vendor/billing`;

    const subject = isSecondReminder
      ? `⚠️ Final Notice: $${amount} Due — Account Deactivates Tomorrow`
      : `Payment Reminder: $${amount} Due for ${invoice.invoice_period}`;

    const html = isSecondReminder
      ? `
        <div style="font-family: sans-serif; padding: 24px; max-width: 520px;">
          <h2 style="color: #dc2626;">⚠️ Final Payment Notice</h2>
          <p>Hi <strong>${escapeHtml(vendor.business_name)}</strong>,</p>
          <p>Your MicroStay commission invoice for <strong>${escapeHtml(invoice.invoice_period)}</strong> is still unpaid.</p>
          <p><strong>Amount Due: $${amount}</strong></p>
          <p style="color:#dc2626; font-weight:bold;">
            Your property will be automatically deactivated on the 26th if payment is not received.
            To reactivate after deactivation, you will owe the original invoice amount
            plus a 25% reinstatement charge (Agreement §37).
          </p>
          <p>Please pay immediately to avoid service interruption.</p>
          <a href="${billingUrl}" style="background:#FF5E1A;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">Pay Now</a>
          <p style="font-size:12px;color:#6b7280;margin-top:24px;">Questions? Reply to this email or contact support@microstay.us</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; padding: 24px; max-width: 520px;">
          <h2>Payment Reminder</h2>
          <p>Hi <strong>${escapeHtml(vendor.business_name)}</strong>,</p>
          <p>Your MicroStay commission invoice for <strong>${escapeHtml(invoice.invoice_period)}</strong> is due.</p>
          <p><strong>Amount Due: $${amount}</strong></p>
          <p>Please log in to your Vendor Portal to review and pay your invoice.</p>
          <a href="${billingUrl}" style="background:#FF5E1A;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">View Invoice</a>
          <p style="color:#6b7280;font-size:13px;margin-top:16px;">A second reminder will be sent on the 25th. If unpaid by the 26th, your property will be deactivated per your Partner Agreement (§36).</p>
          <p style="font-size:12px;color:#6b7280;">Questions? Contact support@microstay.us</p>
        </div>
      `;

    const { error: emailErr } = await resend.emails.send({
      from: 'MicroStay Billing <no-reply@microstay.us>',
      to: [vendor.email],
      subject,
      html,
    }).catch((e: any) => ({ error: e })) as any;

    if (emailErr) {
      errors.push(`vendor ${vendor.id}: ${emailErr.message || 'email send failed'}`);
    } else {
      reminded++;
    }
  }

  console.log(`[cron/remind-payment] ${reminderType} reminder — sent: ${reminded}, errors: ${errors.length}`);

  return NextResponse.json({
    success: true,
    reminderType,
    reminded,
    errors: errors.length > 0 ? errors : undefined,
  });
}
