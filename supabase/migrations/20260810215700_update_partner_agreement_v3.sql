-- =============================================================================
-- Update Partner Agreement to v3.0
-- =============================================================================

ALTER TABLE agreement_signatures
  ALTER COLUMN agreement_version SET DEFAULT 'v3.0';
