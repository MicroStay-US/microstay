/*
  # Allow admins to create and update motels

  1. Security Changes
    - Add INSERT policy on `motels` table for admin users
    - Add UPDATE policy on `motels` table for admin users
    - Admins need to create motel records when approving vendor applications

  2. Notes
    - The existing vendor policies remain unchanged
    - These policies check that the user has an admin role in the profiles table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can create motels' AND tablename = 'motels'
  ) THEN
    CREATE POLICY "Admins can create motels"
      ON motels
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update motels' AND tablename = 'motels'
  ) THEN
    CREATE POLICY "Admins can update motels"
      ON motels
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
  END IF;
END $$;
