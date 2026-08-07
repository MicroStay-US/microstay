/*
  # Remove OTP System

  1. Changes
    - Drop `admin_otp_codes` table
    - Drop `password_reset_tokens` table
    - Drop `get_admin_by_email` function
    - Remove OTP-related infrastructure

  2. Notes
    - Admin authentication now uses simple email/password login
    - No more multi-factor authentication required
*/

DROP TABLE IF EXISTS admin_otp_codes CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP FUNCTION IF EXISTS get_admin_by_email(text);
DROP FUNCTION IF EXISTS reset_admin_password_helper(uuid, text);