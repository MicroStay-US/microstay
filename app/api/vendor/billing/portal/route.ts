/**
 * POST /api/vendor/billing/portal
 *
 * Returns a one-time Stripe Customer Portal session URL the vendor can use
 * to:
 *   - View and download past invoices
 *   - Update their default payment method
 *   - See upcoming charges
 *   - Download receipts
 *
 * All of that UI is hosted by Stripe — zero maintenance on our side. Requires
 * Stripe Dashboard → Settings → Billing → Customer portal → "Activate" to be
 * enabled first (a one-time click during setup).
 */

import { NextResponse } from 'next/server';
import { requireVendor } from '@/lib/vendor-auth-server';
import { ensureStripeCustomer, createCustomerPortalSession } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireVendor(req);
  if (auth.error) return auth.error;

  const svc = auth.serviceClient;
  const authedVendor = auth.vendor;

  try {
    // Fetch full vendor row (requireVendor only returns a slim projection)
    const { data: vendor, error: vendorErr } = await svc
      .from('vendors')
      .select('id, email, business_name, owner_name, phone, address, city, state, zip, stripe_customer_id')
      .eq('id', authedVendor.id)
      .single();

    if (vendorErr || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Ensure the Stripe Customer exists (creates one lazily if missing — e.g.
    // for vendors that were approved before the Stripe integration was added)
    const stripeCustomerId = await ensureStripeCustomer(svc, vendor);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://www.microstay.us';

    const url = await createCustomerPortalSession({
      stripeCustomerId,
      returnUrl: `https://microstay.us/vendor/billing`,
    });

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('[vendor/billing/portal] error:', err.message);
    // Most common failure: Customer Portal is not enabled in Stripe Dashboard
    const message = /No configuration provided/i.test(err.message || '')
      ? 'Customer Portal is not enabled in Stripe. Enable it at Stripe Dashboard → Settings → Billing → Customer portal.'
      : 'Failed to open payment portal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
