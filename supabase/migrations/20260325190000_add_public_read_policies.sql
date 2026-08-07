/*
  # Add Public Access Policies for Customer Workflows

  This migration solves the issue where properties and slots 
  are invisible to unauthenticated customers on the frontend 
  because there were no public Read/Write policies configured.
*/

-- 1. Allow customers to read active properties
DROP POLICY IF EXISTS "properties_public_read" ON properties;
CREATE POLICY "properties_public_read" ON properties
  FOR SELECT USING (status = 'active');

-- 2. Allow customers to read active time slots
DROP POLICY IF EXISTS "vd_slots_public_read" ON vd_time_slots;
CREATE POLICY "vd_slots_public_read" ON vd_time_slots
  FOR SELECT USING (is_active = true);

-- 3. Allow customers to create bookings during checkout
DROP POLICY IF EXISTS "vd_bookings_public_insert" ON vd_bookings;
CREATE POLICY "vd_bookings_public_insert" ON vd_bookings
  FOR INSERT WITH CHECK (true);

-- 4. Allow customers to read their booking details for the confirmation page
DROP POLICY IF EXISTS "vd_bookings_public_read" ON vd_bookings;
CREATE POLICY "vd_bookings_public_read" ON vd_bookings
  FOR SELECT USING (true);
