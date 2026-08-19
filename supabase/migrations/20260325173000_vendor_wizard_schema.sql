-- Phase 5: Vendor Onboarding Wizard Schema
-- 1. Alter vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS motel_name text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS rooms integer,
ADD COLUMN IF NOT EXISTS business_license_url text,
ADD COLUMN IF NOT EXISTS permit_or_ein text,
ADD COLUMN IF NOT EXISTS poc_name text,
ADD COLUMN IF NOT EXISTS poc_phone text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS amenities text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS agreement_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS password_hash text;

ALTER TABLE vendors ALTER COLUMN user_id DROP NOT NULL;

-- 2. Create vendor_photos table
CREATE TABLE IF NOT EXISTS vendor_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for vendor photos" ON vendor_photos FOR SELECT TO public USING (true);
CREATE POLICY "Service insert vendor photos" ON vendor_photos FOR ALL USING (true) WITH CHECK (true); -- Allow anon/service role during signup flow

-- 3. Create vendor_agreements table
CREATE TABLE IF NOT EXISTS vendor_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  signature_type text NOT NULL CHECK (signature_type IN ('drawn', 'typed')),
  signature_image_url text,
  signature_text text,
  ip_address text,
  timestamp timestamptz DEFAULT now(),
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view vendor agreements" ON vendor_agreements FOR SELECT TO authenticated USING (auth.jwt() ->> 'email' = 'admin@microstay.us');
CREATE POLICY "Service insert vendor agreements" ON vendor_agreements FOR ALL USING (true) WITH CHECK (true);

-- Ensure vendors table also allows service role inserts during signup
CREATE POLICY "Anon insert into vendors for signup" ON vendors FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anon update own vendors for signup" ON vendors FOR UPDATE TO public USING (true);
