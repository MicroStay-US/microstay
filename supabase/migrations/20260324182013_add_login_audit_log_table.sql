/*
  # Add Login Audit Log Table

  1. New Tables
    - `login_audit_log`
      - `id` (uuid, primary key) - Unique identifier for each login event
      - `user_id` (uuid, foreign key) - References the user who logged in
      - `ip_address` (text) - IP address from which the login occurred
      - `location` (text) - Geographic location (city, region, country)
      - `user_agent` (text) - Browser/device information
      - `created_at` (timestamptz) - Timestamp of the login event

  2. Security
    - Enable RLS on `login_audit_log` table
    - Add policy for users to view their own login history
    - Add policy for service to insert login logs for authenticated users

  3. Purpose
    - Track all login events for security monitoring
    - Provide audit trail for user account access
    - Support login notification emails with location data
*/

CREATE TABLE IF NOT EXISTS login_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  location text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE login_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON login_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert login logs"
  ON login_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
