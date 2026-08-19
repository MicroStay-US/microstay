/*
  # Add Email-Based OTP System for Admin Login

  1. New Tables
    - `admin_otp_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `code` (text, 6-digit OTP)
      - `used` (boolean, default false)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `admin_otp_codes` table
    - Add policy for admins to read their own OTP codes
    - Add policy for admins to create OTP codes
    - Add policy for admins to update (mark as used) their OTP codes

  3. Notes
    - OTP codes expire after 10 minutes
    - Codes are single-use only
    - System sends OTP to admin@microstay.us email
*/

CREATE TABLE IF NOT EXISTS admin_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  used boolean DEFAULT false NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE admin_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own OTP codes"
  ON admin_otp_codes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create OTP codes"
  ON admin_otp_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update own OTP codes"
  ON admin_otp_codes
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_otp_user_id ON admin_otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_otp_expires_at ON admin_otp_codes(expires_at);