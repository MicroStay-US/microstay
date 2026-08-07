/*
  # Vendor Application System

  1. New Tables
    - `vendor_applications` - Stores vendor/partner applications for motel listing
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - User who submitted application
      - `business_name` (text) - Name of motel/business
      - `business_license_number` (text) - Business license number
      - `business_license_file` (text) - URL to uploaded license file
      - `contact_name` (text) - Contact person name
      - `contact_email` (text) - Contact email
      - `contact_phone` (text) - Contact phone number
      - `business_address` (text) - Business street address
      - `city` (text) - City
      - `state` (text) - State
      - `zip_code` (text) - ZIP code
      - `photos` (text[]) - Array of photo URLs (minimum 6 required)
      - `agreement_signed` (boolean) - Whether agreement was signed
      - `agreement_signed_at` (timestamptz) - When agreement was signed
      - `status` (text) - Application status: pending, approved, rejected
      - `admin_notes` (text) - Notes from admin review
      - `reviewed_by` (uuid) - Admin who reviewed application
      - `reviewed_at` (timestamptz) - When application was reviewed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Updates to existing tables
    - Add `smoking_allowed` to rooms table
    - Add `latitude` and `longitude` to motels table

  3. Security
    - Enable RLS
    - Users can read their own applications
    - Users can create applications
    - Users can update their own pending applications
    - Admins can read and update all applications
*/

-- Add smoking_allowed to rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'smoking_allowed'
  ) THEN
    ALTER TABLE rooms ADD COLUMN smoking_allowed boolean DEFAULT false;
  END IF;
END $$;

-- Add location coordinates to motels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'motels' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE motels ADD COLUMN latitude decimal(10, 8);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'motels' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE motels ADD COLUMN longitude decimal(11, 8);
  END IF;
END $$;

-- Create vendor_applications table
CREATE TABLE IF NOT EXISTS vendor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name text NOT NULL,
  business_license_number text NOT NULL,
  business_license_file text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  business_address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  photos text[] DEFAULT '{}' NOT NULL,
  agreement_signed boolean DEFAULT false NOT NULL,
  agreement_signed_at timestamptz,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE vendor_applications ENABLE ROW LEVEL SECURITY;

-- Users can read their own applications
CREATE POLICY "Users can read own applications"
  ON vendor_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all applications  
CREATE POLICY "Admins can read all applications"
  ON vendor_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can create their own applications
CREATE POLICY "Users can create applications"
  ON vendor_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own pending applications
CREATE POLICY "Users can update own pending applications"
  ON vendor_applications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Admins can update any application
CREATE POLICY "Admins can update applications"
  ON vendor_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendor_applications_user_id ON vendor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_status ON vendor_applications(status);
CREATE INDEX IF NOT EXISTS idx_motels_location ON motels(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_rooms_smoking ON rooms(smoking_allowed);