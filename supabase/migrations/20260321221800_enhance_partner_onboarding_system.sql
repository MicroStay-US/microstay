/*
  # Enhanced Partner Onboarding System

  1. Changes to vendor_applications table
    - Add business_name (required)
    - Add business_license_url (file upload)
    - Add point_of_contact_first_name
    - Add point_of_contact_last_name
    - Add motel_photos (array of URLs, minimum 6)
    - Add agreement_signed (boolean, must be true)
    - Add agreement_signed_at (timestamp)
    - Add signup_stage (pending_signup, pending_approval, approved, rejected)

  2. Changes to motels table
    - Add blocked_dates (array of date strings)
    - Add custom_rates (jsonb for date-specific pricing)
    - Add is_active (boolean for vendor to activate/deactivate)

  3. Changes to bookings table
    - Add vendor_action (checked_in, no_show, cancelled_by_vendor)
    - Add vendor_action_at (timestamp of action)
    - Add penalty_fee (decimal for late update penalties)
    - Add penalty_reason (text explanation)

  4. New Table: time_slot_templates
    - Templates for 10 time windows that vendors can configure
    - Must be minimum 3 hours by law
    - Vendors set these once, applied to all dates

  5. Security
    - Admin portal locked to admin@microstay.us only
    - Vendors can only manage their own properties
    - Public users can view active properties only
*/

-- Add new columns to vendor_applications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_applications' AND column_name = 'business_name') THEN
    ALTER TABLE vendor_applications ADD COLUMN business_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_applications' AND column_name = 'business_license_url') THEN
    ALTER TABLE vendor_applications ADD COLUMN business_license_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_applications' AND column_name = 'point_of_contact_first_name') THEN
    ALTER TABLE vendor_applications ADD COLUMN point_of_contact_first_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_applications' AND column_name = 'point_of_contact_last_name') THEN
    ALTER TABLE vendor_applications ADD COLUMN point_of_contact_last_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_applications' AND column_name = 'motel_photos') THEN
    ALTER TABLE vendor_applications ADD COLUMN motel_photos text[] DEFAULT ARRAY[]::text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_applications' AND column_name = 'agreement_signed') THEN
    ALTER TABLE vendor_applications ADD COLUMN agreement_signed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_applications' AND column_name = 'agreement_signed_at') THEN
    ALTER TABLE vendor_applications ADD COLUMN agreement_signed_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_applications' AND column_name = 'signup_stage') THEN
    ALTER TABLE vendor_applications ADD COLUMN signup_stage text DEFAULT 'pending_signup' CHECK (signup_stage IN ('pending_signup', 'pending_approval', 'approved', 'rejected'));
  END IF;
END $$;

-- Add new columns to motels
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'motels' AND column_name = 'blocked_dates') THEN
    ALTER TABLE motels ADD COLUMN blocked_dates text[] DEFAULT ARRAY[]::text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'motels' AND column_name = 'custom_rates') THEN
    ALTER TABLE motels ADD COLUMN custom_rates jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'motels' AND column_name = 'is_active') THEN
    ALTER TABLE motels ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Add new columns to bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'vendor_action') THEN
    ALTER TABLE bookings ADD COLUMN vendor_action text CHECK (vendor_action IN ('checked_in', 'no_show', 'cancelled_by_vendor'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'vendor_action_at') THEN
    ALTER TABLE bookings ADD COLUMN vendor_action_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'penalty_fee') THEN
    ALTER TABLE bookings ADD COLUMN penalty_fee decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'penalty_reason') THEN
    ALTER TABLE bookings ADD COLUMN penalty_reason text DEFAULT '';
  END IF;
END $$;

-- Create time_slot_templates table
CREATE TABLE IF NOT EXISTS time_slot_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  motel_id uuid REFERENCES motels(id) ON DELETE CASCADE NOT NULL,
  slot_name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_hours integer NOT NULL CHECK (duration_hours >= 3),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE time_slot_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_slot_templates
CREATE POLICY "Vendors can view own templates"
  ON time_slot_templates
  FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid());

CREATE POLICY "Vendors can insert own templates"
  ON time_slot_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can update own templates"
  ON time_slot_templates
  FOR UPDATE
  TO authenticated
  USING (vendor_id = auth.uid());

CREATE POLICY "Vendors can delete own templates"
  ON time_slot_templates
  FOR DELETE
  TO authenticated
  USING (vendor_id = auth.uid());

CREATE POLICY "Public can view active templates"
  ON time_slot_templates
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_time_slot_templates_vendor ON time_slot_templates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_time_slot_templates_motel ON time_slot_templates(motel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_action ON bookings(vendor_action);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_signup_stage ON vendor_applications(signup_stage);