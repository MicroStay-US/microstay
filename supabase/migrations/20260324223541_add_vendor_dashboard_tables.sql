/*
  # Add Vendor Dashboard Support Tables

  Adds support for the new vendor dashboard while maintaining compatibility with existing schema.
  - Vendors table (mapped from profiles with role='vendor')
  - Team members for front desk staff management
  - Fee ledger for financial tracking
  - Activity log for audit trail
*/

-- VENDORS TABLE (aligned with existing profiles)
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
  business_name text NOT NULL,
  owner_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  status text DEFAULT 'active' CHECK (status IN ('pending','active','suspended')),
  is_flagged boolean DEFAULT false,
  flag_reason text,
  flagged_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  supabase_user_id uuid REFERENCES auth.users(id) UNIQUE,
  name text NOT NULL,
  username text NOT NULL,
  login_email text NOT NULL,
  role text DEFAULT 'staff' CHECK (role IN ('manager','staff')),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  last_seen timestamptz,
  created_at timestamptz DEFAULT now()
);

-- FEE LEDGER TABLE
CREATE TABLE IF NOT EXISTS fee_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  motel_id uuid REFERENCES motels(id),
  entry_type text NOT NULL CHECK (entry_type IN ('checkin_fee','owner_cancel_penalty')),
  gross_amount numeric(10,2),
  flat_fee numeric(10,2),
  pct_fee numeric(10,2),
  total_fee numeric(10,2) NOT NULL,
  vendor_net numeric(10,2),
  ledger_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id),
  action text NOT NULL,
  performed_by_user_id uuid REFERENCES auth.users(id),
  performed_by_name text,
  performed_by_role text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTION
CREATE OR REPLACE FUNCTION get_current_vendor_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (SELECT id FROM vendors WHERE user_id = auth.uid()),
    (SELECT vendor_id FROM team_members WHERE supabase_user_id = auth.uid() AND is_active = true)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS POLICIES
CREATE POLICY "vendors_own" ON vendors FOR ALL USING (user_id = auth.uid());

CREATE POLICY "team_members_own" ON team_members
  FOR ALL USING (vendor_id = get_current_vendor_id());

CREATE POLICY "ledger_own" ON fee_ledger
  FOR ALL USING (vendor_id = get_current_vendor_id());

CREATE POLICY "activity_own" ON activity_log
  FOR ALL USING (vendor_id = get_current_vendor_id());

-- AUTO FLAG FUNCTION
CREATE OR REPLACE FUNCTION check_vendor_flag(p_vendor_id uuid)
RETURNS void AS $$
DECLARE
  total_actioned int;
  total_owner_cancels int;
  cancel_rate numeric;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE vendor_action IS NOT NULL),
    COUNT(*) FILTER (WHERE vendor_action = 'cancelled_by_vendor')
  INTO total_actioned, total_owner_cancels
  FROM bookings
  WHERE motel_id IN (SELECT id FROM motels WHERE vendor_id IN (
    SELECT id FROM profiles WHERE id IN (
      SELECT user_id FROM vendors WHERE id = p_vendor_id
    )
  ));

  IF total_actioned = 0 THEN
    cancel_rate := 0;
  ELSE
    cancel_rate := total_owner_cancels::numeric / total_actioned::numeric;
  END IF;

  IF cancel_rate >= 0.30 THEN
    UPDATE vendors SET
      is_flagged = true,
      flag_reason = 'Owner cancellation rate is ' || ROUND(cancel_rate * 100, 1) || '% — exceeds 30% threshold. Account under review.',
      flagged_at = now()
    WHERE id = p_vendor_id;
  ELSE
    UPDATE vendors SET
      is_flagged = false,
      flag_reason = null,
      flagged_at = null
    WHERE id = p_vendor_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;