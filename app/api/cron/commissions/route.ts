import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateFees } from '@/lib/vendor-types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all 'pending' bookings older than 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: overdueBookings, error: fetchErr } = await supabase
      .from('vd_bookings')
      .select('*')
      .eq('status', 'pending')
      .lte('created_at', fortyEightHoursAgo);

    if (fetchErr) throw fetchErr;

    if (!overdueBookings || overdueBookings.length === 0) {
      return NextResponse.json({ success: true, message: 'No overdue bookings to penalize.' });
    }

    let processed = 0;

    for (const booking of overdueBookings) {
      const grossAmount = Number(booking.gross_amount);

      // Standard penalty: $5 flat + 8% (same as platform commission)
      // Uses the shared calculateFees() so all fee logic stays in one place.
      const { totalFee } = calculateFees(grossAmount);

      const { error: updateErr } = await supabase
        .from('vd_bookings')
        .update({
          status: 'no_show',
          penalty_fee: totalFee, 
          no_show_reason: 'System Auto-Penalty: Unconfirmed > 48h',
          action_taken_by_name: 'System Cron'
        })
        .eq('id', booking.id);

      if (!updateErr) {
        processed++;
      }
    }

    return NextResponse.json({ success: true, processed });

  } catch (error: any) {
    console.error('Commissions Cron Error:', error);
    return NextResponse.json({ error: 'Commission processing failed' }, { status: 500 });
  }
}
