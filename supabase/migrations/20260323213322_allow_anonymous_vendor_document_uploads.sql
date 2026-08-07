/*
  # Allow Anonymous Vendor Document Uploads

  1. Changes
    - Allow public (anonymous) users to upload vendor documents during signup
    - Keep existing authenticated user policies for viewing documents

  2. Security
    - Only allow uploads to vendor-documents bucket
    - Users can upload during application submission before account creation
*/

-- Drop existing upload policy that requires authentication
DROP POLICY IF EXISTS "Users can upload vendor documents" ON storage.objects;

-- Allow anyone (including anonymous users) to upload vendor documents
CREATE POLICY "Anyone can upload vendor documents"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'vendor-documents');
