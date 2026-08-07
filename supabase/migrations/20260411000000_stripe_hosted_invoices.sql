-- =============================================================================
-- Stripe hosted invoice automation
-- =============================================================================
-- Adds the columns needed to track Stripe Customers + hosted Stripe Invoices,
-- which replaces the half-built custom Payment Intent flow with a fully
-- automated pipeline:
--   1. When a vendor is approved, we create a Stripe Customer for them and
--      store stripe_customer_id.
--   2. Monthly cron creates a Stripe Invoice on that customer, finalises it,
--      and stores the stripe_invoice_id + hosted_invoice_url that Stripe
--      emails to the vendor automatically.
--   3. When paid, Stripe fires `invoice.paid` webhook which flips the row.
-- =============================================================================

-- 1. Stripe Customer on the vendor record
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- stripe_customer_id should be unique when present (one customer per vendor)
CREATE UNIQUE INDEX IF NOT EXISTS vendors_stripe_customer_id_unique
  ON public.vendors (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 2. Stripe Invoice linkage on the invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id         text,
  ADD COLUMN IF NOT EXISTS stripe_hosted_invoice_url text,
  ADD COLUMN IF NOT EXISTS stripe_invoice_pdf        text,
  ADD COLUMN IF NOT EXISTS stripe_finalized_at       timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_stripe_invoice_id_unique
  ON public.invoices (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

-- 3. Track which bookings have been billed, so the monthly cron doesn't
--    double-bill bookings that already went out on a prior invoice.
ALTER TABLE public.vd_bookings
  ADD COLUMN IF NOT EXISTS billed_on_invoice_id uuid REFERENCES public.invoices(id);

CREATE INDEX IF NOT EXISTS idx_vd_bookings_billed_on_invoice_id
  ON public.vd_bookings (billed_on_invoice_id)
  WHERE billed_on_invoice_id IS NOT NULL;
