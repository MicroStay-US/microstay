-- =============================================================================
-- Update Partner Agreement to v6.0
-- =============================================================================

ALTER TABLE agreement_signatures
  ALTER COLUMN agreement_version SET DEFAULT 'v6.0';
