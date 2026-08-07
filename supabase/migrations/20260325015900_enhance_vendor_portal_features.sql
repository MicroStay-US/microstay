/*
  # Enhance Vendor Portal - Motel Details, Room Types, Blocked Dates, Auto-Checkin

  1. Modified Tables
    - `properties`: Added motel detail columns (description, phone, email, photos, amenities, special_instructions)
    - `vd_time_slots`: Added room_type column for each slot

  2. New Tables
    - `blocked_dates`: Vendors can block dates to deactivate their property
      - `id` (uuid, primary key)
      - `property_id` (uuid, FK to properties)
      - `vendor_id` (uuid, FK to vendors)
      - `blocked_date` (date)
      - `reason` (text, optional)
      - `created_at` (timestamptz)

  3. Security
    - RLS on `blocked_dates` for vendor ownership
    - Separate SELECT, INSERT, DELETE policies

  4. Important Notes
    - room_type defaults to 'Standard' for existing slots
    - photos stored as JSONB array of URLs (uploaded to Supabase storage)
    - amenities stored as JSONB array of strings
    - auto_checkin_deadline_at added to vd_bookings for 48-hour rule
*/

-- Add motel detail columns to properties
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'description') THEN
    ALTER TABLE properties ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'phone') THEN
    ALTER TABLE properties ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'email') THEN
    ALTER TABLE properties ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'photos') THEN
    ALTER TABLE properties ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'amenities') THEN
    ALTER TABLE properties ADD COLUMN amenities jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'special_instructions') THEN
    ALTER TABLE properties ADD COLUMN special_instructions text;
  END IF;
END $$;

-- Add room_type to vd_time_slots
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vd_time_slots' AND column_name = 'room_type') THEN
    ALTER TABLE vd_time_slots ADD COLUMN room_type text NOT NULL DEFAULT 'Standard';
  END IF;
END $$;

-- Add auto_checkin_deadline to vd_bookings for 48-hour rule
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vd_bookings' AND column_name = 'auto_checkin_deadline') THEN
    ALTER TABLE vd_bookings ADD COLUMN auto_checkin_deadline timestamptz;
  END IF;
END $$;

-- Create blocked_dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(property_id, blocked_date)
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own blocked dates"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING (vendor_id = get_current_vendor_id());

CREATE POLICY "Vendors can insert own blocked dates"
  ON blocked_dates FOR INSERT
  TO authenticated
  WITH CHECK (vendor_id = get_current_vendor_id());

CREATE POLICY "Vendors can delete own blocked dates"
  ON blocked_dates FOR DELETE
  TO authenticated
  USING (vendor_id = get_current_vendor_id());

-- Create index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_blocked_dates_property_date ON blocked_dates(property_id, blocked_date);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_vendor ON blocked_dates(vendor_id);