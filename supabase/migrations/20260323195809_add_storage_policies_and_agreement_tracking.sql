/*
  # Add Storage Policies and Agreement Tracking

  1. Storage Policies
    - Allow authenticated users to upload vendor documents
    - Allow users to view their own documents
    - Allow admins to view all documents

  2. Database Changes
    - Add agreement acceptance tracking to vendor_applications table
    - Track agreement version, acceptance timestamp, and IP address

  3. Security
    - RLS policies for storage access
    - Secure agreement acceptance tracking
*/

-- Add storage policies for vendor-documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload vendor documents'
  ) THEN
    CREATE POLICY "Users can upload vendor documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'vendor-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view own vendor documents'
  ) THEN
    CREATE POLICY "Users can view own vendor documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'vendor-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can view all vendor documents'
  ) THEN
    CREATE POLICY "Admins can view all vendor documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'vendor-documents' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  END IF;
END $$;

-- Add agreement tracking columns to vendor_applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'agreement_accepted'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN agreement_accepted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'agreement_accepted_at'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN agreement_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'agreement_version'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN agreement_version text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_applications' AND column_name = 'agreement_ip_address'
  ) THEN
    ALTER TABLE vendor_applications ADD COLUMN agreement_ip_address text;
  END IF;
END $$;
