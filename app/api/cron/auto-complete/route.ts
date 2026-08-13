/**
 * Month-End Auto-Complete Cron — /api/cron/auto-complete
 *
 * Schedule (vercel.json): `0 6 1 * *` — 06:00 UTC on the 1st of every month.
 *
 * Logic (Agreement §15 — Automatic Completion):
 *   1. Find all bookings from the PREVIOUS calendar month that are still
 *      in PENDING status (vendor never reconciled them).
 *   2. Mark each one as `checked_in` (auto-completed) — the vendor owes
 *      the 12% commission regardless of whether the guest actually stayed,
 *      because the vendor failed to update the status within the month.
 *   3. The fee fields are computed using the canonical calculateFees() formula
 *      so billing is consistent with all other check-in paths.
 *
 * This is the ONLY place that converts pending → checked_in automatically.
 * The 48-hour daily cron (/api/cron/commissions) handles pending → no_show
 * within the same month when the 48h window after slot end has passed.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` header required.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateFees } from '@/lib/vendor-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: Request) {
  return runAutoComplete(req);
}

export async function POST(req: Request) {
  return runAutoComplete(req);
}

async function runAutoComplete(req: Request) {
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

  // Compute the previous calendar month's date range
  const now = new Date();
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const prevMonthStartStr = prevMonthStart.toISOString().slice(0, 10);
  const prevMonthEndStr = new Date(prevMonthEnd.getTime() - 1).toISOString().slice(0, 10); // last day of prev month

  console.log(`[cron/auto-complete] processing month ${prevMonthStartStr} → ${prevMonthEndStr}`);

  // Fetch all pending bookings from the previous month
  const { data: overdueBookings, error: fetchErr } = await supabase
    .from('vd_bookings')
    .select('id, gross_amount, booking_date')
    .eq('status', 'pending')
    .gte('booking_date', prevMonthStartStr)
    .lte('booking_date', prevMonthEndStr);

  if (fetchErr) {
    console.error('[cron/auto-complete] fetch error:', fetchErr.message);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }

  if (!overdueBookings || overdueBookings.length === 0) {
    return NextResponse.json({ success: true, autoCompleted: 0, message: 'No pending bookings from last month.' });
  }

  let autoCompleted = 0;
  const errors: string[] = [];

  for (const booking of overdueBookings) {
    const grossAmount = Number(booking.gross_amount) || 0;
    const { pctFee, totalFee, vendorNet } = calculateFees(grossAmount);

    const { error: updateErr } = await supabase
      .from('vd_bookings')
      .update({
        status: 'checked_in',
        checked_in_at: now.toISOString(),
        platform_pct_fee: pctFee,
        platform_total_fee: totalFee,
        vendor_net: vendorNet,
        action_taken_by_name: 'System Auto-Complete',
        no_show_reason: null,
        // Agreement §15: vendor is liable for 12% regardless of guest presence
      })
      .eq('id', booking.id)
      .eq('status', 'pending'); // safety guard against race

    if (updateErr) {
      errors.push(`booking ${booking.id}: ${updateErr.message}`);
    } else {
      autoCompleted++;
    }
  }

  console.log(`[cron/auto-complete] done — auto-completed: ${autoCompleted}, errors: ${errors.length}`);

  return NextResponse.json({
    success: true,
    period: `${prevMonthStartStr} to ${prevMonthEndStr}`,
    autoCompleted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
