/*
  # Vendor Approval and First Login Password Reset

  1. Changes to existing tables
    - Add `requires_password_reset` column to profiles table to track first-time login
    - Add `approved_by` and `approved_at` columns to vendor_applications table
    - Add `created_user_id` reference to vendor_applications after account creation
    - Add `temporary_password` to vendor_applications for storing temp password

  2. Security
    - Maintains existing RLS policies
    - All columns have appropriate defaults
*/

-- Add password reset flag to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'requires_password_reset'
  ) THEN
    ALTER TABLE profiles ADD COLUMN requires_password_reset boolean DEFAULT false;
  END IF;
END $$;

-- Add approval tracking columns to vendor_applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN approved_by uuid REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN approved_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN rejection_reason text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'created_user_id'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN created_user_id uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'temporary_password'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN temporary_password text;
  END IF;
END $$;