/*
  # Production Dashboard Schema Migrations
  
  1. Updates:
  - Adds bed_type and smoking_type to vd_time_slots
  
  2. New Tables:
  - rate_overrides
  - invoices
  - staff_roles
  
  3. Functions:
  - Updates get_current_vendor_id to check staff_roles
*/

-- 1. Update vd_time_slots
ALTER TABLE vd_time_slots 
ADD COLUMN IF NOT EXISTS bed_type text DEFAULT '1 bed' CHECK (bed_type IN ('1 bed', '2 bed', 'executive')),
ADD COLUMN IF NOT EXISTS smoking_type text DEFAULT 'non-smoking' CHECK (smoking_type IN ('smoking', 'non-smoking'));

-- 2. Create rate_overrides
CREATE TABLE IF NOT EXISTS rate_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  time_slot_id uuid NOT NULL REFERENCES vd_time_slots(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  price_per_room numeric(10,2) NOT NULL CHECK (price_per_room >= 50.00),
  created_at timestamptz DEFAULT now(),
  UNIQUE(property_id, time_slot_id, override_date)
);

ALTER TABLE rate_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can manage rate_overrides"
  ON rate_overrides FOR ALL
  TO authenticated
  USING (property_id IN (SELECT id FROM properties WHERE vendor_id = get_current_vendor_id()));

-- 3. Create staff_roles
CREATE TABLE IF NOT EXISTS staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  supabase_user_id uuid REFERENCES auth.users(id) UNIQUE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text DEFAULT 'front_desk' CHECK (role IN ('owner', 'front_desk')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage staff roles"
  ON staff_roles FOR ALL
  TO authenticated
  USING (vendor_id = get_current_vendor_id());

-- IMPORTANT: Update get_current_vendor_id to also check staff_roles
CREATE OR REPLACE FUNCTION get_current_vendor_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (SELECT id FROM vendors WHERE user_id = auth.uid()),
    (SELECT vendor_id FROM team_members WHERE supabase_user_id = auth.uid() AND is_active = true),
    (SELECT vendor_id FROM staff_roles WHERE supabase_user_id = auth.uid() AND is_active = true)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Create invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  invoice_period text NOT NULL, 
  total_commission numeric(10,2) NOT NULL DEFAULT 0.00,
  total_platform_fees numeric(10,2) NOT NULL DEFAULT 0.00,
  total_penalties numeric(10,2) NOT NULL DEFAULT 0.00,
  total_due numeric(10,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'paid')),
  issued_date date NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  admin_notes text,
  payment_proof_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, invoice_period)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (vendor_id = get_current_vendor_id());
  
CREATE POLICY "Admin manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'adminmotel@gmail.com');
