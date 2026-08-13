/**
 * Deactivate Overdue Vendors Cron — /api/cron/deactivate-overdue
 *
 * Schedule (vercel.json): `0 0 26 * *` — midnight UTC on the 26th of every month.
 *
 * Logic (Agreement §36):
 *   If a vendor still has an unpaid invoice from the previous billing period
 *   after the 25th (i.e., the second reminder has been sent and ignored),
 *   their property/vendor account is set to INACTIVE – NON-PAYMENT.
 *
 *   The vendor must pay:
 *     - The original unpaid commission (12% of gross earned)
 *     - A 25% reinstatement/delay penalty on the unpaid amount  (Agreement §37)
 *   before reactivation.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` header required.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(req: Request) {
  return runDeactivation(req);
}

export async function POST(req: Request) {
  return runDeactivation(req);
}

async function runDeactivation(req: Request) {
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
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(process.env.RESEND_API_KEY || '');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.microstay.us';

  const now = new Date();

  // Previous billing period (e.g., if today is Aug 26, billing period is 2026-07)
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const billingPeriod = `${prevMonth.getUTCFullYear()}-${String(prevMonth.getUTCMonth() + 1).padStart(2, '0')}`;

  // Find all unpaid invoices for the previous billing period
  const { data: overdueInvoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, vendor_id, total_due, invoice_period')
    .eq('invoice_period', billingPeriod)
    .in('status', ['pending', 'unpaid', 'overdue']);

  if (invErr) {
    console.error('[cron/deactivate-overdue] invoice fetch error:', invErr.message);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }

  if (!overdueInvoices || overdueInvoices.length === 0) {
    return NextResponse.json({ success: true, deactivated: 0, message: 'No overdue invoices found.' });
  }

  const vendorIds = Array.from(new Set(overdueInvoices.map((inv: any) => inv.vendor_id)));

  // Fetch vendor details
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, email, business_name')
    .in('id', vendorIds)
    .eq('status', 'active'); // only deactivate currently active vendors

  const vendorMap = new Map((vendors || []).map((v: any) => [v.id, v]));

  let deactivated = 0;
  const errors: string[] = [];

  for (const invoice of overdueInvoices) {
    const vendor = vendorMap.get(invoice.vendor_id);
    if (!vendor) continue; // already inactive or not found

    const originalDue = Number(invoice.total_due);
    // 25% reinstatement penalty (Agreement §37 — includes and replaces any earlier 10% charge)
    const reinstatementPenalty = Math.round(originalDue * 0.25 * 100) / 100;
    const totalToReactivate = Math.round((originalDue + reinstatementPenalty) * 100) / 100;

    // 1. Set vendor status to suspended (non-payment)
    const { error: vendorErr } = await supabase
      .from('vendors')
      .update({
        status: 'suspended',
        flag_reason: `Non-payment: invoice ${invoice.id} for ${billingPeriod}. Reactivation requires $${totalToReactivate.toFixed(2)} (original $${originalDue.toFixed(2)} + 25% reinstatement $${reinstatementPenalty.toFixed(2)}).`,
        is_flagged: true,
        flagged_at: now.toISOString(),
      })
      .eq('id', invoice.vendor_id);

    if (vendorErr) {
      errors.push(`vendor ${invoice.vendor_id}: ${vendorErr.message}`);
      continue;
    }

    // 2. Mark invoice as overdue + record reinstatement penalty
    await supabase
      .from('invoices')
      .update({
        status: 'overdue',
        total_penalties: reinstatementPenalty,
        total_due: totalToReactivate,
      })
      .eq('id', invoice.id);

    // 3. Send deactivation email
    await resend.emails.send({
      from: 'MicroStay Billing <noreply@microstay.us>',
      to: [vendor.email],
      subject: '🔴 Your MicroStay Property Has Been Deactivated – Payment Required',
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 520px;">
          <h2 style="color: #dc2626;">Property Deactivated – Non-Payment</h2>
          <p>Hi <strong>${escapeHtml(vendor.business_name)}</strong>,</p>
          <p>Your MicroStay property has been deactivated because the commission invoice for 
          <strong>${escapeHtml(billingPeriod)}</strong> remains unpaid after multiple reminders.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;border:1px solid #e5e7eb;">Original Invoice</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;"><strong>$${originalDue.toFixed(2)}</strong></td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;">25% Reinstatement Charge</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;color:#dc2626;"><strong>$${reinstatementPenalty.toFixed(2)}</strong></td></tr>
            <tr style="background:#fef2f2;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Total Required to Reactivate</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:#dc2626;">$${totalToReactivate.toFixed(2)}</td></tr>
          </table>
          <p>Your property is no longer visible to guests. To restore your listing, please pay the total above.</p>
          <a href="${siteUrl}/vendor/billing" style="background:#FF5E1A;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;margin:8px 0;">Pay to Reactivate</a>
          <p style="font-size:12px;color:#6b7280;margin-top:24px;">
            Per your MicroStay Partner Agreement (§36–§38), properties with unpaid invoices 
            after the 25th of the month following the billing period may be deactivated. 
            Reactivation requires payment of all outstanding amounts plus the 25% reinstatement charge.
          </p>
          <p style="font-size:12px;color:#6b7280;">Contact support@microstay.us with questions.</p>
        </div>
      `,
    }).catch(console.warn);

    deactivated++;
  }

  console.log(`[cron/deactivate-overdue] done — deactivated: ${deactivated}, errors: ${errors.length}`);

  return NextResponse.json({
    success: true,
    billingPeriod,
    deactivated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
