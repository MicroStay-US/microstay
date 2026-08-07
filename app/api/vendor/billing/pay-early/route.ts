import { NextResponse } from 'next/server';
import { requireVendor } from '@/lib/vendor-auth-server';
import { billVendorForPeriod, computeCurrentBillingWindow } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requireVendor(req);
    if (auth.error) return auth.error;
    
    const supabase = auth.serviceClient;
    const vendor = auth.vendor;

    const { periodStart, periodEnd, periodLabel } = computeCurrentBillingWindow();
    
    // We need the full vendor object with required fields for Stripe customer creation
    const { data: vendorData, error: vendorErr } = await supabase
      .from('vendors')
      .select('id, email, business_name, owner_name, phone, address, city, state, zip, stripe_customer_id')
      .eq('id', vendor.id)
      .single();

    if (vendorErr || !vendorData) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const result = await billVendorForPeriod({
      svc: supabase,
      vendor: vendorData,
      periodStart,
      periodEnd,
      periodLabel: `${periodLabel} (Early)`,
    });

    if (result.status === 'error') {
      return NextResponse.json({ error: result.error || 'Failed to process early payment' }, { status: 500 });
    }
    
    if (result.status === 'skipped_no_bookings' || result.booking_count === 0) {
      return NextResponse.json({ error: 'No unbilled balance to pay' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      invoice_url: result.hosted_invoice_url,
      total_due: result.total_due,
    });
  } catch (err: any) {
    console.error('[pay-early] error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
