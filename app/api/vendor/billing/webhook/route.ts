/**
 * Stripe webhook for billing-related events.
 *
 * Handles the events our automated invoicing flow needs:
 *   - invoice.paid                → flip our invoice row to status=paid
 *   - invoice.payment_failed      → mark as failed (user sees overdue)
 *   - invoice.finalized           → backup: store hosted_invoice_url in case
 *                                   the cron's direct write failed
 *   - invoice.marked_uncollectible → flag for manual write-off in admin UI
 *
 * Legacy Payment Intent events (payment_intent.succeeded / .payment_failed)
 * are still handled for backward compat with any invoices created via the
 * pre-Stripe-Invoice flow. They can be removed once those are all settled.
 *
 * Configure the webhook in Stripe Dashboard → Developers → Webhooks:
 *   URL:    https://www.microstay.us/api/vendor/billing/webhook
 *   Events: invoice.paid, invoice.payment_failed, invoice.finalized,
 *           invoice.marked_uncollectible,
 *           payment_intent.succeeded, payment_intent.payment_failed
 *
 * Then copy the signing secret into Vercel as STRIPE_WEBHOOK_SECRET.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripe || !webhookSecret || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[webhook] signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    switch (event.type) {
      // ───────── Stripe Invoice events (the primary flow) ─────────
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const microstayInvoiceId = inv.metadata?.microstay_invoice_id;
        if (microstayInvoiceId) {
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              payment_status: 'paid',
              paid_at: new Date().toISOString(),
              paid_date: new Date().toISOString().slice(0, 10),
              stripe_payment_method: 'stripe_hosted_invoice',
            })
            .eq('id', microstayInvoiceId);
          console.log(`[webhook] invoice.paid → marked ${microstayInvoiceId} as paid`);
        } else if (inv.id) {
          // Fallback: match by stripe_invoice_id if metadata is missing
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              payment_status: 'paid',
              paid_at: new Date().toISOString(),
              paid_date: new Date().toISOString().slice(0, 10),
            })
            .eq('stripe_invoice_id', inv.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const microstayInvoiceId = inv.metadata?.microstay_invoice_id;
        const updateTarget = microstayInvoiceId
          ? { col: 'id', val: microstayInvoiceId }
          : inv.id
          ? { col: 'stripe_invoice_id', val: inv.id }
          : null;
        if (updateTarget) {
          await supabase
            .from('invoices')
            .update({ payment_status: 'failed' })
            .eq(updateTarget.col, updateTarget.val);
          console.log(`[webhook] invoice.payment_failed for ${updateTarget.val}`);
        }
        break;
      }

      case 'invoice.finalized': {
        // Backup path: if the cron crashed between finalising and persisting
        // the hosted_invoice_url, this catches the URL and stores it.
        const inv = event.data.object as Stripe.Invoice;
        const microstayInvoiceId = inv.metadata?.microstay_invoice_id;
        if (microstayInvoiceId && inv.hosted_invoice_url) {
          await supabase
            .from('invoices')
            .update({
              stripe_invoice_id: inv.id,
              stripe_hosted_invoice_url: inv.hosted_invoice_url,
              stripe_invoice_pdf: inv.invoice_pdf ?? null,
              stripe_finalized_at: new Date().toISOString(),
            })
            .eq('id', microstayInvoiceId);
        }
        break;
      }

      case 'invoice.marked_uncollectible': {
        const inv = event.data.object as Stripe.Invoice;
        const microstayInvoiceId = inv.metadata?.microstay_invoice_id;
        if (microstayInvoiceId) {
          await supabase
            .from('invoices')
            .update({
              status: 'uncollectible',
              payment_status: 'failed',
            })
            .eq('id', microstayInvoiceId);
        }
        break;
      }

      // ───────── Legacy Payment Intent events (backward compat) ─────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceId = pi.metadata?.invoice_id;
        if (invoiceId) {
          await supabase
            .from('invoices')
            .update({
              payment_status: 'paid',
              stripe_payment_method: pi.payment_method as string,
              paid_at: new Date().toISOString(),
              status: 'paid',
            })
            .eq('id', invoiceId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceId = pi.metadata?.invoice_id;
        if (invoiceId) {
          await supabase
            .from('invoices')
            .update({ payment_status: 'failed' })
            .eq('id', invoiceId);
        }
        break;
      }

      default:
        // Event type we don't care about — ACK it so Stripe doesn't retry
        console.log(`[webhook] ignoring event type ${event.type}`);
    }
  } catch (err: any) {
    console.error('[webhook] handler error:', err.message);
    // Return 500 so Stripe retries later — don't mask handler failures
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
