/**
 * DISABLED — This cron endpoint has been superseded by:
 *   - /api/cron/auto-complete  (month-end pending → checked_in, runs 1st at 06:00)
 *   - /api/cron/bill-month     (invoice generation via Stripe, runs 1st at 07:00)
 *   - /api/cron/remind-payment (payment reminders, runs 5th and 25th)
 *   - /api/cron/deactivate-overdue (vendor deactivation, runs 26th)
 *
 * This route is kept in place (rather than deleted) to return a clear 410
 * if it is ever triggered manually or by an old cron config entry.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Gone',
      message:
        'This billing cron has been disabled. Use /api/cron/bill-month for invoice generation.',
    },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}
