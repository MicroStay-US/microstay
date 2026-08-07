-- =============================================================================
-- Restore email verification columns on vendors
-- =============================================================================
-- Migration 20260403220416_fix_vendor_drop_dead_columns removed
--   email_verified_at, email_verification_token, email_verification_sent_at
-- as "dead auth columns (Supabase owns these natively)". However the v2 signup
-- wizard and several API handlers still reference them:
--   app/api/vendors/register/route.ts        (INSERT)
--   app/api/vendors/verify-email/route.ts    (SELECT + UPDATE)
--   app/api/vendors/resend-verification/route.ts (SELECT + UPDATE)
--   app/api/vendors/me/route.ts              (SELECT)
--   app/api/admin/vendors/route.ts           (SELECT)
--   lib/vendor-auth-server.ts                (SELECT + requireVerifiedVendor)
--
-- Because these columns are gone, new vendor signups fail with:
--   "Could not find the 'email_verified_at' column of 'vendors' in the schema cache"
-- and requireVerifiedVendor returns 500 on every vendor-gated call.
--
-- This migration restores the columns. They are semantically distinct from
-- Supabase's auth.users.email_confirmed_at because they track the MicroStay
-- vendor-application-level verification state (which includes a token we
-- email out ourselves via Resend, separate from Supabase's magic-link flow).
-- =============================================================================

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS email_verified_at          timestamptz,
  ADD COLUMN IF NOT EXISTS email_verification_token   text,
  ADD COLUMN IF NOT EXISTS email_verification_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_vendors_email_verification_token
  ON public.vendors (email_verification_token)
  WHERE email_verification_token IS NOT NULL;
