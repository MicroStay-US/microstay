/**
 * Monthly commission billing cron.
 *
 * Run schedule (from vercel.json): `0 6 1 * *` — 06:00 UTC on the 1st of every
 * month. That maps to ~10pm PT on the last day of the previous month, so
 * vendors see the invoice when they wake up on the 1st.
 *
 * What it does:
 *   1. For each approved vendor, find all `checked_in` (or `completed`)
 *      bookings from the previous calendar month that haven't already been
 *      billed (`billed_on_invoice_id IS NULL`).
 *   2. Ensures a Stripe Customer exists for the vendor.
 *   3. Creates a row in our local `invoices` table with aggregate totals.
 *   4. Creates a Stripe Invoice with one line item per booking.
 *   5. Finalises the Stripe invoice — Stripe then emails the vendor a hosted
 *      payment link automatically.
 *   6. Marks each booking with its `billed_on_invoice_id` so it never double-bills.
 *   7. Persists the stripe_invoice_id + hosted_invoice_url back to our row.
 *
 * Auth: request must carry `Authorization: Bearer ${CRON_SECRET}`. Vercel
 * Cron automatically sends this header when triggering the endpoint on the
 * configured schedule.
 *
 * Safety: this route is idempotent for a given (vendor, period) — running it
 * twice in the same month for the same vendor will no-op because all bookings
 * will already be marked as billed on the first run.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';
import { billVendorForPeriod, computeBillingWindow, type BillingResult } from '@/lib/billing';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — enough for dozens of vendors

export async function POST(req: Request) {
  return runBilling(req);
}

// Vercel Cron triggers endpoints with GET by default, so accept both.
export async function GET(req: Request) {
  return runBilling(req);
}

async function runBilling(req: Request) {
  // 1. Auth: CRON_SECRET header
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Environment checks
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration (Supabase)' }, { status: 500 });
  }
  if (!getStripe()) {
    return NextResponse.json({ error: 'Server misconfiguration (Stripe)' }, { status: 500 });
  }

  const svc = createClient(supabaseUrl, serviceKey);

  // 3. Compute billing period = previous calendar month (UTC-anchored)
  //    Allow override via ?period=YYYY-MM for manual re-runs.
  const url = new URL(req.url);
  const periodOverride = url.searchParams.get('period');
  const { periodStart, periodEnd, periodLabel } = computeBillingWindow(periodOverride);

  console.log(`[cron/bill-month] billing period ${periodLabel} (${periodStart.toISOString()} → ${periodEnd.toISOString()})`);

  // 4. Fetch all approved vendors
  const { data: vendors, error: vendorErr } = await svc
    .from('vendors')
    .select('id, email, business_name, owner_name, phone, address, city, state, zip, stripe_customer_id')
    .eq('status', 'active');

  if (vendorErr) {
    console.error('[cron/bill-month] failed to list vendors:', vendorErr.message);
    return NextResponse.json({ error: 'Failed to list vendors' }, { status: 500 });
  }

  const results: BillingResult[] = [];

  // 5. Process each vendor sequentially (Stripe rate-limits ~100/sec anyway)
  for (const vendor of vendors || []) {
    try {
      const result = await billVendorForPeriod({
        svc,
        vendor,
        periodStart,
        periodEnd,
        periodLabel,
      });
      results.push(result);
    } catch (err: any) {
      console.error(`[cron/bill-month] vendor ${vendor.id} failed:`, err.message);
      results.push({
        vendor_id: vendor.id,
        vendor_email: vendor.email,
        status: 'error',
        error: 'Billing failed for vendor',
      });
    }
  }

  const summary = {
    period: periodLabel,
    processed: results.length,
    billed: results.filter((r) => r.status === 'billed').length,
    skipped: results.filter((r) => r.status.startsWith('skipped')).length,
    errors: results.filter((r) => r.status === 'error').length,
    total_billed_usd: results
      .filter((r) => r.status === 'billed')
      .reduce((s, r) => s + (r.total_due || 0), 0),
  };

  console.log('[cron/bill-month] done:', summary);
  return NextResponse.json({ success: true, summary, results });
}
