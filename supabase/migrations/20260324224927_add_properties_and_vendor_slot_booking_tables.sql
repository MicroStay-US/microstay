/*
  # Add Properties table and vendor dashboard slot/booking tables

  1. New Tables:
     - properties: Vendor motel properties
     - vd_time_slots: New time slots with min 3hr, min $50/room constraints
     - vd_bookings: New bookings table aligned with vendor dashboard spec

  2. Security:
     - RLS on all new tables
     - Policies using get_current_vendor_id()
*/

-- PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  total_rooms int NOT NULL DEFAULT 10,
  star_rating int DEFAULT 2 CHECK (star_rating BETWEEN 1 AND 5),
  check_in_instructions text,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_own" ON properties
  FOR ALL USING (vendor_id = get_current_vendor_id());

-- VD TIME SLOTS TABLE (vendor dashboard slots)
CREATE TABLE IF NOT EXISTS vd_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  slot_label text NOT NULL,
  start_hour int NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour int NOT NULL CHECK (end_hour BETWEEN 0 AND 23),
  duration_hours int NOT NULL CHECK (duration_hours >= 3),
  price_per_room numeric(10,2) NOT NULL CHECK (price_per_room >= 50.00),
  max_rooms int NOT NULL DEFAULT 1 CHECK (max_rooms >= 1),
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_slot_duration CHECK (
    CASE
      WHEN end_hour > start_hour THEN (end_hour - start_hour) >= 3
      WHEN end_hour <= start_hour THEN (24 - start_hour + end_hour) >= 3
      ELSE false
    END
  )
);

ALTER TABLE vd_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vd_slots_own" ON vd_time_slots
  FOR ALL USING (
    property_id IN (SELECT id FROM properties WHERE vendor_id = get_current_vendor_id())
  );

-- VD BOOKINGS TABLE (vendor dashboard bookings)
CREATE TABLE IF NOT EXISTS vd_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text UNIQUE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  slot_id uuid REFERENCES vd_time_slots(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  guest_name text NOT NULL,
  guest_email text,
  guest_phone text,
  rooms_booked int NOT NULL DEFAULT 1 CHECK (rooms_booked >= 1),
  gross_amount numeric(10,2) NOT NULL,
  platform_flat_fee numeric(10,2) DEFAULT 5.00,
  platform_pct_fee numeric(10,2),
  platform_total_fee numeric(10,2),
  vendor_net numeric(10,2),
  penalty_fee numeric(10,2) DEFAULT 0.00,
  status text DEFAULT 'pending' CHECK (status IN ('pending','checked_in','no_show','owner_cancel')),
  checked_in_at timestamptz,
  no_show_at timestamptz,
  owner_cancelled_at timestamptz,
  booking_date date NOT NULL,
  action_taken_by uuid REFERENCES auth.users(id),
  action_taken_by_name text,
  cancel_reason text,
  no_show_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vd_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vd_bookings_own" ON vd_bookings
  FOR ALL USING (vendor_id = get_current_vendor_id());

-- Update fee_ledger to reference new tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_ledger' AND column_name = 'vd_booking_id'
  ) THEN
    ALTER TABLE fee_ledger ADD COLUMN vd_booking_id uuid REFERENCES vd_bookings(id);
  END IF;
END $$;

-- Update activity_log to reference new tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_log' AND column_name = 'vd_booking_id'
  ) THEN
    ALTER TABLE activity_log ADD COLUMN vd_booking_id uuid REFERENCES vd_bookings(id);
  END IF;
END $$;

-- Updated booking ref generator for vd_bookings
CREATE OR REPLACE FUNCTION generate_vd_booking_ref()
RETURNS text AS $$
DECLARE
  ref text;
  already_exists boolean;
BEGIN
  LOOP
    ref := 'MS-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 99999 + 1)::text, 5, '0');
    SELECT EXISTS(SELECT 1 FROM vd_bookings WHERE booking_ref = ref) INTO already_exists;
    EXIT WHEN NOT already_exists;
  END LOOP;
  RETURN ref;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated check_vendor_flag to use vd_bookings
CREATE OR REPLACE FUNCTION check_vendor_flag(p_vendor_id uuid)
RETURNS void AS $$
DECLARE
  total_actioned int;
  total_owner_cancels int;
  cancel_rate numeric;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status != 'pending'),
    COUNT(*) FILTER (WHERE status = 'owner_cancel')
  INTO total_actioned, total_owner_cancels
  FROM vd_bookings
  WHERE vendor_id = p_vendor_id;

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