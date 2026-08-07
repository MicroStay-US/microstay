import { NextResponse } from 'next/server';
import { requireVendor } from '@/lib/vendor-auth-server';
import { computeCurrentBillingWindow } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireVendor(req);
    if (auth.error) return auth.error;
    
    const supabase = auth.serviceClient;
    const vendor = auth.vendor;

    const { periodStart, periodEnd } = computeCurrentBillingWindow();

    // Fetch unbilled bookings in the current period.
    const { data: bookings, error: bookingsErr } = await supabase
      .from('vd_bookings')
      .select('platform_total_fee')
      .eq('vendor_id', vendor.id)
      .in('status', ['checked_in', 'completed'])
      .gte('booking_date', periodStart.toISOString().slice(0, 10))
      .lt('booking_date', periodEnd.toISOString().slice(0, 10))
      .is('billed_on_invoice_id', null);

    if (bookingsErr) {
      console.error('[unbilled] failed to fetch bookings:', bookingsErr.message);
      return NextResponse.json({ error: 'Failed to fetch unbilled balance' }, { status: 500 });
    }

    const totalDue = (bookings || []).reduce(
      (s: number, b: any) => s + Number(b.platform_total_fee || 0),
      0,
    );

    return NextResponse.json({
      unbilled_balance: totalDue,
      booking_count: (bookings || []).length,
    });
  } catch (err: any) {
    console.error('[unbilled] error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
