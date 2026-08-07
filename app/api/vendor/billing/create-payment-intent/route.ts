/**
 * @deprecated 2026-04-11
 *
 * This route is the old custom Payment Intent flow. It still works for
 * backward compatibility with any invoices that were created before the
 * Stripe-hosted Invoice migration, but new billing cycles use
 * /api/cron/bill-month → Stripe Invoices → hosted_invoice_url instead.
 *
 * The vendor billing UI no longer calls this route for new invoices. It can
 * be removed once all legacy invoices are settled.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireVendor } from '@/lib/vendor-auth-server';

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // SECURITY: Only the authenticated vendor who owns the invoice may create
  // a payment intent for it. Previously unauthenticated — any caller could
  // flip any invoice to "processing" and burn Stripe API cost. See audit H1.
  const auth = await requireVendor(req);
  if (auth.error) return auth.error;
  const supabase = auth.serviceClient;
  const authedVendor = auth.vendor;

  try {
    const { invoiceId, vendorId } = await req.json();

    if (!invoiceId || !vendorId) {
      return NextResponse.json({ error: 'invoiceId and vendorId required' }, { status: 400 });
    }

    // Caller must own the vendor they're claiming — otherwise this is an
    // attempt to create a payment intent on someone else's invoice.
    if (vendorId !== authedVendor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch invoice and verify it belongs to this vendor and is unpaid
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, vendor_id, total_due, payment_status, invoice_period')
      .eq('id', invoiceId)
      .eq('vendor_id', vendorId)
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.payment_status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(invoice.total_due) * 100), // cents
      currency: 'usd',
      metadata: {
        invoice_id: invoiceId,
        vendor_id: vendorId,
        invoice_period: invoice.invoice_period,
      },
      description: `MicroStay Commission Invoice ${invoice.invoice_period}`,
    });

    // Store the payment intent ID on the invoice
    await supabase.from('invoices').update({
      stripe_payment_intent_id: paymentIntent.id,
      payment_status: 'processing',
    }).eq('id', invoiceId);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error('Payment intent error:', err);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
