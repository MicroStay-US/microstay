-- =============================================================================
-- MicroStay: Enforce unique DBA (business_name) per vendor account
-- =============================================================================
-- Business rule: a single operator running multiple motels must create a
-- separate vendor account for each, with a distinct email AND a distinct
-- DBA (Doing Business As) name. Motel display names may still repeat across
-- accounts — this constraint is on vendors.business_name only.
--
-- Email uniqueness already exists via `vendors_email_key`.
--
-- The index is case-insensitive and trims whitespace so that
-- "ABC Motel LLC", "abc motel llc", and "  ABC Motel LLC  " collide.
-- NULL / empty business_name is allowed to avoid breaking in-progress
-- signups; application code should require a value before final submit.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS vendors_business_name_unique_idx
  ON vendors (LOWER(TRIM(business_name)))
  WHERE business_name IS NOT NULL AND TRIM(business_name) <> '';
