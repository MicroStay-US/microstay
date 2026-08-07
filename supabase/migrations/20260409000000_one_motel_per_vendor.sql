-- =============================================================================
-- MicroStay: Enforce 1 motel per vendor (strict)
-- =============================================================================
-- Business rule: each vendor account owns exactly one property/motel.
-- This migration enforces the rule at the database level via a UNIQUE
-- constraint on properties.vendor_id, so it is structurally impossible
-- for a vendor to have more than one property regardless of the code path
-- (API, direct SQL, future migrations, etc.).
--
-- Notes:
--   - The legacy `motels` table is intentionally NOT modified. The active
--     table used by the admin portal and vendor flows is `properties`.
--   - App-level guards already exist in app/api/vendor/approve/route.ts,
--     but this constraint is the authoritative source of truth.
-- =============================================================================

ALTER TABLE properties
  ADD CONSTRAINT properties_vendor_id_unique UNIQUE (vendor_id);
