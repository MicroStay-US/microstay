/*
  # Add MFA/2FA System for Admin Users

  1. New Tables
    - `user_mfa_secrets` - Stores encrypted 2FA secrets for users
      - `user_id` (uuid, primary key, references auth.users)
      - `secret` (text, encrypted TOTP secret)
      - `is_enabled` (boolean, whether 2FA is active)
      - `backup_codes` (text array, encrypted backup codes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on user_mfa_secrets table
    - Users can only read/update their own MFA settings
    - Only authenticated users can access

  3. Notes
    - This uses TOTP (Time-based One-Time Password) standard
    - Compatible with Google Authenticator, Authy, etc.
    - Backup codes provided for account recovery
*/

-- Create user_mfa_secrets table
CREATE TABLE IF NOT EXISTS user_mfa_secrets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  is_enabled boolean DEFAULT false,
  backup_codes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_mfa_secrets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own MFA settings
CREATE POLICY "Users can read own MFA settings"
  ON user_mfa_secrets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own MFA settings
CREATE POLICY "Users can insert own MFA settings"
  ON user_mfa_secrets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own MFA settings
CREATE POLICY "Users can update own MFA settings"
  ON user_mfa_secrets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own MFA settings
CREATE POLICY "Users can delete own MFA settings"
  ON user_mfa_secrets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_mfa_secrets_user_id ON user_mfa_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_secrets_enabled ON user_mfa_secrets(user_id, is_enabled);
