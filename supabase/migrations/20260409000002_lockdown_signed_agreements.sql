-- =============================================================================
-- MicroStay: Lock down signed-agreements storage
-- =============================================================================
-- Security audit finding C5:
--   The `signed-agreements` bucket was public with no size/MIME limits,
--   and signed legal PDFs were exposed via direct public URLs. This migration:
--     1. Makes the bucket private
--     2. Restricts uploads to PDFs (max 10 MB)
--     3. Adds a `signed_pdf_path` column to agreement_signatures so we can
--        mint fresh short-lived signed URLs on every read
--     4. Backfills the path from any existing rows' public URLs
-- After this migration, the application must use `createSignedUrl` instead
-- of `getPublicUrl` for every read of a signed agreement. See lib/signed-pdf.ts.
-- =============================================================================

-- 1. Privatize the bucket + enforce size / MIME
UPDATE storage.buckets
   SET public = false,
       file_size_limit = 10485760,                       -- 10 MB
       allowed_mime_types = ARRAY['application/pdf']::text[]
 WHERE id = 'signed-agreements';

-- 2. Add the path column (keep signed_pdf_url for now for backwards compat
--    with any in-flight code; it will stop being written in the new sign
--    route and can be dropped once all reads use the helper).
ALTER TABLE agreement_signatures
  ADD COLUMN IF NOT EXISTS signed_pdf_path text;

-- 3. Backfill existing rows by parsing the public URL format
--    `.../storage/v1/object/public/signed-agreements/<path>`
UPDATE agreement_signatures
   SET signed_pdf_path = regexp_replace(
         signed_pdf_url,
         '^.*/storage/v1/object/public/signed-agreements/',
         ''
       )
 WHERE signed_pdf_path IS NULL
   AND signed_pdf_url IS NOT NULL
   AND signed_pdf_url <> '';
