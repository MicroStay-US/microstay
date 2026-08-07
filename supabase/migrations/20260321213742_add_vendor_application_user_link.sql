/*
  # Link Vendor Applications to User Accounts

  1. Changes
    - Add user_id column to vendor_applications table to track which user account was created
    - Add index for faster lookups
    - Update RLS policies to allow vendors to see their own approved applications

  2. Security
    - Vendors can only see their own approved applications
    - Admins can see all applications
*/

-- Add user_id column to track created accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_applications_user_id ON vendor_applications(user_id);

-- Update RLS policy to allow vendors to see their approved applications
DROP POLICY IF EXISTS "Vendors can view own approved application" ON vendor_applications;
CREATE POLICY "Vendors can view own approved application"
  ON vendor_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND status = 'approved');