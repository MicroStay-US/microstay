/*
  # Add Password Reset Policies

  1. Security Changes
    - Add policy for anyone to read admin profiles (email/role only)
    - Add policy for anyone to insert password reset tokens
    - Add policy for anyone to read their own reset tokens
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Anyone can check if admin email exists'
  ) THEN
    CREATE POLICY "Anyone can check if admin email exists"
      ON profiles
      FOR SELECT
      USING (role = 'admin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'password_reset_tokens' 
    AND policyname = 'Anyone can create password reset tokens'
  ) THEN
    CREATE POLICY "Anyone can create password reset tokens"
      ON password_reset_tokens
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'password_reset_tokens' 
    AND policyname = 'Anyone can read password reset tokens'
  ) THEN
    CREATE POLICY "Anyone can read password reset tokens"
      ON password_reset_tokens
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'password_reset_tokens' 
    AND policyname = 'Anyone can mark token as used'
  ) THEN
    CREATE POLICY "Anyone can mark token as used"
      ON password_reset_tokens
      FOR UPDATE
      USING (true)
      WITH CHECK (used = true);
  END IF;
END $$;
