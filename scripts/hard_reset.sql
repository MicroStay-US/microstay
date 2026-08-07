-- =========================================================================
-- MICROSTAY PHASE 8: HARD RESET SCRIPT
-- =========================================================================
-- INSTRUCTIONS: Open your Supabase Dashboard -> SQL Editor
-- Paste this entire script and click "RUN".

BEGIN;

-- 1. TRUNCATE ALL BUSINESS DATA TABLES AND RESET IDENTITIES
-- (Using CASCADE ensures any dangling foreign keys are forcefully wiped)
TRUNCATE TABLE 
    public.vendor_applications,
    public.vendors,
    public.properties,
    public.rooms,
    public.vd_time_slots,
    public.vd_bookings,
    public.invoices,
    public.motel_invoices
RESTART IDENTITY CASCADE;

-- 2. WIPE NON-ADMIN USERS FROM THE CORE AUTH SYSTEM
-- To allow "fresh signups without conflict", we MUST delete the underlying 
-- Supabase Auth identity for anyone who is not an Admin.
DELETE FROM auth.users 
WHERE id IN (
    SELECT id FROM public.profiles WHERE role != 'admin'
);

-- Note: The `profiles` table is tied via ON DELETE CASCADE to `auth.users`.
-- Deleting the non-admin users from `auth.users` automatically deletes 
-- their public profile rows, while safely keeping your Admin profile intact!

COMMIT;

-- SUCCESS: The system is now wiped to a pristine Phase 8 state.
