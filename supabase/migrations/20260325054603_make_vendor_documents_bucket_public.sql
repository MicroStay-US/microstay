/*
  # Make vendor-documents bucket public

  1. Changes
    - Updates the `vendor-documents` storage bucket to be publicly accessible
    - This allows business license files and motel photos to be viewed via public URLs
    - Files are uploaded with unique random filenames so they are not guessable

  2. Security Notes
    - Upload policies remain restricted (only authenticated or anonymous during signup)
    - Public read access is needed because admin dashboard views these files directly
*/

UPDATE storage.buckets 
SET public = true 
WHERE id = 'vendor-documents';