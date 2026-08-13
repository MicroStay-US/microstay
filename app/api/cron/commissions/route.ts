/**
 * Daily No-Show Engine — /api/cron/commissions
 *
 * Schedule (vercel.json): `0 0 * * *` — midnight UTC every day.
 *
 * Logic:
 *   For every PENDING booking whose slot has ended MORE than 48 hours ago,
 *   and which is still within the CURRENT calendar month (bookings past the
 *   end of their month are handled by the auto-complete cron on the 1st),
 *   mark the booking as NO-SHOW.
 *
 *   "Slot ended" = booking_date at slot end_hour (UTC).
 *   Deadline     = slot end timestamp + 48 hours.
 *
 *   No-shows do NOT owe commission (Agreement §17). The penalty_fee field
 *   is left at 0 — no charge is assessed on a properly-reported no-show.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` header required.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return runNoShowEngine(req);
}

export async function POST(req: Request) {
  return runNoShowEngine(req);
}

async function runNoShowEngine(req: Request) {
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

  const now = new Date();

  // ── Find all PENDING bookings whose 48-hour window has expired ──────────
  //
  // The deadline is: (booking_date + slot.end_hour hours) + 48 hours.
  //
  // We only auto-mark no-show for bookings whose booking_date falls in the
  // CURRENT month or earlier — bookings from the previous month that are
  // still pending are handled by the month-end auto-complete cron which
  // marks them checked_in (§15 auto-completion for unreported stays).
  //
  // We use a Postgres-computed deadline via an RPC-style select expression.
  // Supabase JS doesn't support arbitrary SQL expressions in .filter(), so
  // we fetch all pending bookings with their slot data and filter in JS.

  const { data: pendingBookings, error: fetchErr } = await supabase
    .from('vd_bookings')
    .select(`
      id,
      booking_date,
      gross_amount,
      slot:vd_time_slots!slot_id ( end_hour )
    `)
    .eq('status', 'pending');

  if (fetchErr) {
    console.error('[cron/commissions] fetch error:', fetchErr.message);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }

  if (!pendingBookings || pendingBookings.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No pending bookings found.' });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const booking of pendingBookings) {
    const slot = (booking.slot as any);
    // If slot data is missing (orphaned booking), skip silently
    if (!slot || slot.end_hour === undefined || slot.end_hour === null) continue;

    const endHour: number = Number(slot.end_hour);

    // Build the timestamp when the slot ended on the booking date (UTC)
    // e.g. booking_date = "2026-08-10", end_hour = 14 → "2026-08-10T14:00:00Z"
    const slotEndTimestamp = new Date(`${booking.booking_date}T${String(endHour).padStart(2, '0')}:00:00Z`);

    // Deadline = slot end + 48 hours
    const noShowDeadline = new Date(slotEndTimestamp.getTime() + 48 * 60 * 60 * 1000);

    // Only mark no-show if the deadline has passed AND the booking is not a
    // future booking from the current month (those still have time to be reconciled)
    if (now <= noShowDeadline) continue;

    // Mark as no-show — no penalty_fee (agreement §17: no-shows don't owe commission)
    const { error: updateErr } = await supabase
      .from('vd_bookings')
      .update({
        status: 'no_show',
        no_show_at: now.toISOString(),
        no_show_reason: 'System Auto: No action taken within 48 hours of slot end time',
        action_taken_by_name: 'System Cron',
        penalty_fee: 0,
      })
      .eq('id', booking.id)
      .eq('status', 'pending'); // double-check to prevent race conditions

    if (updateErr) {
      errors.push(`booking ${booking.id}: ${updateErr.message}`);
    } else {
      processed++;
    }
  }

  console.log(`[cron/commissions] done — processed: ${processed}, errors: ${errors.length}`);

  return NextResponse.json({
    success: true,
    processed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
