/*
  # Vendor Sub-Users System

  1. New Tables
    - `vendor_team_members`
      - `id` (uuid, primary key)
      - `vendor_id` (uuid, references profiles) - The main vendor/super partner
      - `user_id` (uuid, references auth.users) - The sub-user account
      - `email` (text) - Sub-user email
      - `name` (text) - Sub-user name
      - `role` (text) - Always 'vendor_team_member'
      - `permissions` (jsonb) - Specific permissions for this sub-user
      - `is_active` (boolean) - Whether this sub-user is active
      - `created_by` (uuid) - Who created this sub-user
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Permissions Structure
    - can_manage_time_slots: boolean
    - can_manage_rates: boolean
    - can_confirm_checkin: boolean
    - can_mark_no_show: boolean
    - can_cancel_booking: boolean

  3. Security
    - Enable RLS on vendor_team_members table
    - Vendors can read their own team members
    - Vendors can create/update/delete their team members (max 3)
    - Team members can read their own record
    - Admins have full access
*/

-- Create vendor_team_members table
CREATE TABLE IF NOT EXISTS vendor_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'vendor_team_member',
  permissions jsonb DEFAULT '{
    "can_manage_time_slots": true,
    "can_manage_rates": true,
    "can_confirm_checkin": true,
    "can_mark_no_show": true,
    "can_cancel_booking": true
  }'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_vendor_team_email UNIQUE(vendor_id, email)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_vendor_team_members_vendor_id ON vendor_team_members(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_team_members_user_id ON vendor_team_members(user_id);

-- Enable RLS
ALTER TABLE vendor_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_team_members

-- Vendors can view their own team members
CREATE POLICY "Vendors can view own team members"
  ON vendor_team_members
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'vendor'
    )
  );

-- Team members can view their own record
CREATE POLICY "Team members can view own record"
  ON vendor_team_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Vendors can insert team members (will enforce limit in app)
CREATE POLICY "Vendors can create team members"
  ON vendor_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'vendor'
    )
  );

-- Vendors can update their team members
CREATE POLICY "Vendors can update team members"
  ON vendor_team_members
  FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'vendor'
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'vendor'
    )
  );

-- Vendors can delete their team members
CREATE POLICY "Vendors can delete team members"
  ON vendor_team_members
  FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'vendor'
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to team members"
  ON vendor_team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add vendor_team_member_id to profiles table to link sub-users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'vendor_team_member_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN vendor_team_member_id uuid REFERENCES vendor_team_members(id) ON DELETE SET NULL;
  END IF;
END $$;