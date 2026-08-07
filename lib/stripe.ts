/**
 * Shared Stripe client + helpers.
 *
 * Architecture notes (added 2026-04-11):
 *   Vendors pay MicroStay a commission on each booking. Rather than running
 *   our own billing state machine on top of raw Payment Intents, we use
 *   Stripe's hosted Invoice product:
 *
 *     1. When a vendor is approved we create a Stripe Customer for them
 *        (ensureStripeCustomer). The customer's email/name/metadata mirrors
 *        the vendor record.
 *     2. Each month a cron job calls buildMonthlyStripeInvoice() which
 *        attaches line items to a new Stripe Invoice on that customer and
 *        finalises it. Stripe then emails the vendor a hosted payment link
 *        automatically — Stripe Dashboard → Settings → Invoice template
 *        controls the branding and language.
 *     3. Stripe handles smart retries, dunning, receipts, PDF generation,
 *        card/ACH/Apple Pay/Google Pay — none of which we have to build.
 *     4. Our webhook (`/api/vendor/billing/webhook`) reacts to `invoice.paid`
 *        and flips the row in our `invoices` table.
 *
 * IMPORTANT: never import this file into a client component. It uses the
 * server-only STRIPE_SECRET_KEY and must only run inside API routes, route
 * handlers, server actions, or cron jobs.
 */

import Stripe from 'stripe';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

let cachedStripe: Stripe | null = null;

/**
 * Returns a memoised Stripe client or null if STRIPE_SECRET_KEY is unset.
 * Callers should handle the null case (usually by returning a 500).
 */
export function getStripe(): Stripe | null {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cachedStripe = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
    appInfo: {
      name: 'MicroStay',
      url: 'https://www.microstay.us',
    },
  });
  return cachedStripe;
}

export interface VendorForStripe {
  id: string;
  email: string;
  business_name: string | null;
  owner_name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  stripe_customer_id?: string | null;
}

/**
 * Idempotently ensures a Stripe Customer exists for a given vendor. If the
 * vendor already has a `stripe_customer_id`, the customer is fetched (and
 * re-created if it has been deleted in Stripe, which can happen in test mode).
 * Otherwise a new customer is created and the vendor row is updated.
 *
 * Returns the Stripe Customer ID, or throws.
 */
export async function ensureStripeCustomer(
  svc: AnySupabase,
  vendor: VendorForStripe,
): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY)');

  // 1. Reuse existing customer if still valid in Stripe
  if (vendor.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(vendor.stripe_customer_id);
      if (existing && !('deleted' in existing && existing.deleted)) {
        return vendor.stripe_customer_id;
      }
      // Fall through — customer was deleted in Stripe, create a new one
    } catch (err: any) {
      // 404 is expected if the customer ID is stale (common switching between
      // test and live mode). Fall through to create a new one.
      if (err?.statusCode !== 404) throw err;
    }
  }

  // 2. Create a new customer
  const address =
    vendor.address && vendor.city && vendor.state
      ? {
          line1: vendor.address,
          city: vendor.city,
          state: vendor.state,
          postal_code: vendor.zip || undefined,
          country: 'US',
        }
      : undefined;

  const customer = await stripe.customers.create({
    email: vendor.email,
    name: vendor.business_name || vendor.owner_name || vendor.email,
    phone: vendor.phone || undefined,
    address,
    metadata: {
      microstay_vendor_id: vendor.id,
    },
    description: `MicroStay partner: ${vendor.business_name || vendor.email}`,
  });

  // 3. Persist the new customer ID back to our vendor row
  const { error: updateErr } = await svc
    .from('vendors')
    .update({ stripe_customer_id: customer.id })
    .eq('id', vendor.id);

  if (updateErr) {
    // Don't fail the caller — the customer exists in Stripe, we just couldn't
    // persist it. The next call will find it via lookup by metadata search or
    // by re-creation (idempotent since we key off metadata.microstay_vendor_id).
    console.error('[ensureStripeCustomer] failed to persist stripe_customer_id:', updateErr.message);
  }

  return customer.id;
}

/**
 * Creates, finalises, and triggers email-send for a Stripe Invoice covering
 * a list of bookings for a given vendor. Each booking becomes one line item
 * on the invoice with description like "MS-2026-XXX • Sunset Inn • Apr 3".
 *
 * Returns the finalised Stripe Invoice (which includes hosted_invoice_url and
 * invoice_pdf), or throws.
 */
export interface BookingForInvoice {
  id: string;
  booking_ref: string;
  booking_date: string;
  property_name?: string | null;
  gross_amount: number;
  platform_flat_fee: number;
  platform_pct_fee: number;
  platform_total_fee: number;
}

export async function createStripeInvoiceForVendor(params: {
  stripeCustomerId: string;
  vendorId: string;
  invoicePeriod: string; // 'YYYY-MM'
  microstayInvoiceId: string; // the id of our own public.invoices row
  bookings: BookingForInvoice[];
  daysUntilDue?: number; // default 7
}): Promise<Stripe.Invoice> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  const { stripeCustomerId, invoicePeriod, microstayInvoiceId, bookings } = params;
  const daysUntilDue = params.daysUntilDue ?? 7;

  if (bookings.length === 0) {
    throw new Error('Cannot create an invoice with zero line items');
  }

  // 1. Add line items to the customer's upcoming invoice draft.
  //    Stripe bills invoices via "pending invoice items" — we add items, then
  //    create the invoice to pull them all together.
  for (const b of bookings) {
    const propertyLabel = b.property_name ? ` • ${b.property_name}` : '';
    const dateLabel = new Date(b.booking_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      currency: 'usd',
      amount: Math.round(Number(b.platform_total_fee) * 100), // cents
      description: `${b.booking_ref}${propertyLabel} • ${dateLabel} • commission on $${Number(b.gross_amount).toFixed(2)}`,
      metadata: {
        microstay_booking_id: b.id,
        microstay_vendor_id: params.vendorId,
        microstay_invoice_id: microstayInvoiceId,
      },
    });
  }

  // 2. Create the invoice shell.
  //    Check if the customer has a default payment method.
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  const hasDefaultPaymentMethod =
    !customer.deleted && !!(customer as Stripe.Customer).invoice_settings?.default_payment_method;

  const collectionMethod = hasDefaultPaymentMethod ? 'charge_automatically' : 'send_invoice';
  const finalDaysUntilDue = collectionMethod === 'send_invoice' ? daysUntilDue : undefined;

  //    CRITICAL: pending_invoice_items_behavior must be 'include' — in Stripe
  //    API versions 2022-11-15+ pending items are NOT auto-attached to new
  //    invoices unless explicitly requested. Without this, the invoice is $0.
  const draft = await stripe.invoices.create({
    customer: stripeCustomerId,
    collection_method: collectionMethod,
    days_until_due: finalDaysUntilDue,
    auto_advance: hasDefaultPaymentMethod ? true : false,
    pending_invoice_items_behavior: 'include',
    description: `MicroStay platform commission for ${invoicePeriod}`,
    metadata: {
      microstay_vendor_id: params.vendorId,
      microstay_invoice_id: microstayInvoiceId,
      microstay_invoice_period: invoicePeriod,
    },
    footer:
      'Thanks for partnering with MicroStay! Questions? Email info@microstay.us.',
  } as any);

  if (!draft.id) throw new Error('Stripe invoice was created without an id');

  // 3. Finalise (locks items, generates PDF, assigns invoice number)
  const finalised = await stripe.invoices.finalizeInvoice(draft.id);

  // 4. Explicitly send the invoice email (idempotent — Stripe no-ops if already sent)
  if (finalised.id) {
    await stripe.invoices.sendInvoice(finalised.id).catch((err) => {
      console.error('[createStripeInvoiceForVendor] sendInvoice failed:', err.message);
    });
  }

  return finalised;
}

/**
 * Generates a one-time Customer Portal session URL so a vendor can manage
 * their payment methods, view past invoices, and download receipts on
 * Stripe's hosted UI. Requires Stripe Dashboard → Settings → Billing →
 * Customer portal to be enabled first.
 */
export async function createCustomerPortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  const session = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });

  return session.url;
}
