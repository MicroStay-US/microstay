-- =============================================================================
-- MicroStay Vendor Signup System v2.0
-- Creates vendor_properties and agreement_signatures tables,
-- and extends vendors table with email verification + new status values.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend vendors table
-- ---------------------------------------------------------------------------
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS email_verified_at          timestamptz,
  ADD COLUMN IF NOT EXISTS email_verification_token   text,
  ADD COLUMN IF NOT EXISTS email_verification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS auth_user_id               uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_vendors_auth_user_id           ON vendors(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_email_verification_token ON vendors(email_verification_token);

-- Extend the status CHECK to include all new states (keep old ones for compatibility)
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_status_check
  CHECK (status IN (
    'pending',
    'pending_email_verification',
    'pending_agreement',
    'pending_review',
    'active',
    'approved',
    'suspended',
    'rejected'
  ));

-- ---------------------------------------------------------------------------
-- 2. vendor_properties — Exhibit A data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_properties (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id              uuid REFERENCES vendors(id) ON DELETE CASCADE,
  legal_business_name    text,
  dba_name               text,
  property_address       text,
  city                   text,
  state                  text,
  zip                    text,
  motel_license_number   text,
  business_license_number text,
  state_tax_id           text,
  federal_ein            text,
  contact_name           text,
  contact_phone          text,
  contact_email          text,
  insurance_carrier      text,
  insurance_policy_number text,
  insurance_expiry       date,
  rooms_available        integer,
  hourly_rate_min        numeric(10,2),
  hourly_rate_max        numeric(10,2),
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

ALTER TABLE vendor_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_properties_vendor_manage" ON vendor_properties
  FOR ALL TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "vendor_properties_service_role" ON vendor_properties
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "vendor_properties_admin_read" ON vendor_properties
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'manager', 'support')
    )
  );

-- ---------------------------------------------------------------------------
-- 3. agreement_signatures — IMMUTABLE (no UPDATE or DELETE policies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agreement_signatures (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id                       uuid REFERENCES vendors(id),
  agreement_version               text DEFAULT 'v2.0',
  agreement_text_hash             text,
  typed_signature                 text NOT NULL,
  signed_at                       timestamptz DEFAULT now(),
  ip_address                      inet,
  user_agent                      text,
  scroll_completed                boolean DEFAULT false,
  document_viewed_at              timestamptz,
  arbitration_acknowledged        boolean DEFAULT false,
  class_action_waiver_acknowledged boolean DEFAULT false,
  signed_pdf_url                  text
);

ALTER TABLE agreement_signatures ENABLE ROW LEVEL SECURITY;

-- INSERT only — no UPDATE, no DELETE
CREATE POLICY "agreement_signatures_vendor_insert" ON agreement_signatures
  FOR INSERT TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "agreement_signatures_service_insert" ON agreement_signatures
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "agreement_signatures_service_select" ON agreement_signatures
  FOR SELECT TO service_role USING (true);

CREATE POLICY "agreement_signatures_admin_read" ON agreement_signatures
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'manager', 'support')
    )
  );

-- Vendor can read their own signatures
CREATE POLICY "agreement_signatures_vendor_read" ON agreement_signatures
  FOR SELECT TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. signed-agreements storage bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-agreements', 'signed-agreements', false)
ON CONFLICT (id) DO NOTHING;

-- Service role can upload and read
CREATE POLICY "signed_agreements_service_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'signed-agreements')
  WITH CHECK (bucket_id = 'signed-agreements');

-- Vendors can read their own signed PDFs (filename starts with their vendor_id)
CREATE POLICY "signed_agreements_vendor_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'signed-agreements'
    AND name LIKE (
      (SELECT id::text FROM vendors WHERE auth_user_id = auth.uid() LIMIT 1)
      || '/%'
    )
  );

-- Admin can read all
CREATE POLICY "signed_agreements_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'signed-agreements'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'manager', 'support')
    )
  );
