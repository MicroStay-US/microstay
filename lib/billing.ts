import {
  ensureStripeCustomer,
  createStripeInvoiceForVendor,
  type BookingForInvoice,
} from '@/lib/stripe';

export interface BillingResult {
  vendor_id: string;
  vendor_email: string;
  status: 'billed' | 'skipped_no_bookings' | 'skipped_no_customer' | 'error';
  booking_count?: number;
  total_due?: number;
  stripe_invoice_id?: string;
  hosted_invoice_url?: string;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function billVendorForPeriod(params: {
  svc: any;
  vendor: any;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
}): Promise<BillingResult> {
  const { svc, vendor, periodStart, periodEnd, periodLabel } = params;

  // Fetch unbilled bookings in the period. Only bill bookings that actually
  // checked in (or completed) — no-shows and cancellations don't owe commission.
  const { data: bookings, error: bookingsErr } = await svc
    .from('vd_bookings')
    .select('id, booking_ref, booking_date, gross_amount, platform_flat_fee, platform_pct_fee, platform_total_fee, property:properties(name)')
    .eq('vendor_id', vendor.id)
    .in('status', ['checked_in', 'completed'])
    .gte('booking_date', periodStart.toISOString().slice(0, 10))
    .lt('booking_date', periodEnd.toISOString().slice(0, 10))
    .is('billed_on_invoice_id', null);

  if (bookingsErr) throw new Error(`booking fetch failed: ${bookingsErr.message}`);
  if (!bookings || bookings.length === 0) {
    return {
      vendor_id: vendor.id,
      vendor_email: vendor.email,
      status: 'skipped_no_bookings',
      booking_count: 0,
    };
  }

  // Ensure the vendor has a Stripe Customer (creates lazily if missing)
  let stripeCustomerId: string;
  try {
    stripeCustomerId = await ensureStripeCustomer(svc, {
      id: vendor.id,
      email: vendor.email,
      business_name: vendor.business_name,
      owner_name: vendor.owner_name,
      phone: vendor.phone,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      zip: vendor.zip,
      stripe_customer_id: vendor.stripe_customer_id,
    });
  } catch (err: any) {
    return {
      vendor_id: vendor.id,
      vendor_email: vendor.email,
      status: 'skipped_no_customer',
      error: 'Stripe customer creation failed',
    };
  }

  // Aggregate totals
  const totalCommission = bookings.reduce(
    (s: number, b: any) => s + Number(b.platform_pct_fee || 0),
    0,
  );
  const totalPlatformFees = bookings.reduce(
    (s: number, b: any) => s + Number(b.platform_flat_fee || 0),
    0,
  );
  const totalDue = bookings.reduce(
    (s: number, b: any) => s + Number(b.platform_total_fee || 0),
    0,
  );
  const totalGross = bookings.reduce(
    (s: number, b: any) => s + Number(b.gross_amount || 0),
    0,
  );

  // Insert our own invoice row first (gives us a uuid to reference from Stripe metadata)
  const issuedDate = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 7 days from now
  const { data: localInvoice, error: insertErr } = await svc
    .from('invoices')
    .insert({
      vendor_id: vendor.id,
      invoice_period: periodLabel,
      total_gross: totalGross,
      total_commission: totalCommission,
      total_platform_fees: totalPlatformFees,
      total_penalties: 0,
      total_due: totalDue,
      status: 'pending',
      payment_status: 'unpaid',
      issued_date: issuedDate,
      due_date: dueDate,
    })
    .select('id')
    .single();

  if (insertErr || !localInvoice) throw new Error(`local invoice insert failed: ${insertErr?.message}`);

  // Create and finalise the Stripe Invoice
  const bookingLineItems: BookingForInvoice[] = bookings.map((b: any) => ({
    id: b.id,
    booking_ref: b.booking_ref,
    booking_date: b.booking_date,
    property_name: b.property?.name ?? null,
    gross_amount: Number(b.gross_amount),
    platform_flat_fee: Number(b.platform_flat_fee),
    platform_pct_fee: Number(b.platform_pct_fee),
    platform_total_fee: Number(b.platform_total_fee),
  }));

  const stripeInvoice = await createStripeInvoiceForVendor({
    stripeCustomerId,
    vendorId: vendor.id,
    invoicePeriod: periodLabel,
    microstayInvoiceId: localInvoice.id,
    bookings: bookingLineItems,
    daysUntilDue: 7,
  });

  // Persist Stripe info back to our row
  await svc
    .from('invoices')
    .update({
      stripe_invoice_id: stripeInvoice.id,
      stripe_hosted_invoice_url: stripeInvoice.hosted_invoice_url ?? null,
      stripe_invoice_pdf: stripeInvoice.invoice_pdf ?? null,
      stripe_finalized_at: new Date().toISOString(),
      due_date: stripeInvoice.due_date
        ? new Date(stripeInvoice.due_date * 1000).toISOString().slice(0, 10)
        : null,
    })
    .eq('id', localInvoice.id);

  // Mark each booking as billed so future runs skip them
  await svc
    .from('vd_bookings')
    .update({ billed_on_invoice_id: localInvoice.id })
    .in(
      'id',
      bookings.map((b: any) => b.id),
    );

  return {
    vendor_id: vendor.id,
    vendor_email: vendor.email,
    status: 'billed',
    booking_count: bookings.length,
    total_due: totalDue,
    stripe_invoice_id: stripeInvoice.id,
    hosted_invoice_url: stripeInvoice.hosted_invoice_url ?? undefined,
  };
}

export function computeBillingWindow(override: string | null): {
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
} {
  if (override && /^\d{4}-\d{2}$/.test(override)) {
    const [yStr, mStr] = override.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1; // JS months are 0-indexed
    return {
      periodStart: new Date(Date.UTC(y, m, 1)),
      periodEnd: new Date(Date.UTC(y, m + 1, 1)),
      periodLabel: override,
    };
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed
  // Previous month
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const periodStart = new Date(Date.UTC(prevYear, prevMonth, 1));
  const periodEnd = new Date(Date.UTC(prevYear, prevMonth + 1, 1));
  const periodLabel = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
  return { periodStart, periodEnd, periodLabel };
}

export function computeCurrentBillingWindow(): {
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
} {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed
  
  const periodStart = new Date(Date.UTC(year, month, 1));
  const periodEnd = new Date(Date.UTC(year, month + 1, 1));
  const periodLabel = `${year}-${String(month + 1).padStart(2, '0')}`;
  return { periodStart, periodEnd, periodLabel };
}
