/*
  # Security Hardening Migration

  Addresses VAPT findings:
  - C-02: Make vendor-documents bucket private (use signed URLs instead)
  - C-03: Lock down vd_bookings RLS (no unrestricted public read/insert)
  - L-02: Restrict profiles table to own profile only

  NOTE: The admin signed-url endpoint already exists at
        /api/admin/documents/signed-url for authenticated access.
*/

-- ============================================================
-- C-02: Revert vendor-documents bucket to PRIVATE
-- Files are now accessed via signed URLs only (admin endpoint already exists).
-- ============================================================
UPDATE storage.buckets
SET public = false
WHERE id = 'vendor-documents';

-- ============================================================
-- C-03: Lock down vd_bookings — no unrestricted public access
-- ============================================================

-- Drop the overly-permissive policies
DROP POLICY IF EXISTS "vd_bookings_public_read" ON vd_bookings;
DROP POLICY IF EXISTS "vd_bookings_public_insert" ON vd_bookings;

-- Guests can only read bookings matching their email (for confirmation pages).
-- The service role key (used by API routes) bypasses RLS entirely, so admin
-- and vendor API endpoints are unaffected.
CREATE POLICY "vd_bookings_guest_read_own" ON vd_bookings
  FOR SELECT
  USING (
    guest_email = current_setting('request.jwt.claims', true)::json->>'email'
    OR
    -- Allow service-role and authenticated vendor/admin reads via API routes
    auth.role() = 'service_role'
  );

-- Bookings can only be created through the API route (which uses service_role).
-- Direct client inserts are blocked — the API validates pricing, availability,
-- and rate limits before inserting.
CREATE POLICY "vd_bookings_service_insert" ON vd_bookings
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- L-02: Restrict profiles to own profile + service_role
-- ============================================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "profiles_own_or_service" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR auth.role() = 'service_role'
  );

-- ============================================================
-- Fix tables with RLS enabled but no policies (Supabase advisor)
-- ============================================================
CREATE POLICY "admin_otp_service_only" ON admin_otp_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admin_reset_service_only" ON admin_reset_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "vd_rate_limits_service_only" ON vd_rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
