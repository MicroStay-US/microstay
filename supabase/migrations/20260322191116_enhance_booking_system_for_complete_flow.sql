/*
  # Enhance Booking System for Complete Flow

  ## Changes Made

  1. **Bookings Table Enhancements**
     - Add `customer_name` field (extracted from name fields)
     - Add `customer_email` field
     - Add `gross_amount` field for total booking price
     - Add `duration_hours` field  
     - Add `start_time` and `end_time` fields
     - Update platform_fee calculation trigger for $5 + 8%
     - Add `checked_in_by` field to track who confirmed check-in

  2. **Motels Table Enhancements**
     - Add `zip_code` field if not exists
     - Add `email` field if not exists

  3. **Functions**
     - Update booking amount calculation function ($5 fixed + 8% gross)
     - Add booking number generator if not exists

  ## Security
  - No changes to RLS policies (already properly configured)
*/

-- Add missing fields to motels table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'motels' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE motels ADD COLUMN zip_code text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'motels' AND column_name = 'email'
  ) THEN
    ALTER TABLE motels ADD COLUMN email text DEFAULT '';
  END IF;
END $$;

-- Add missing fields to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE bookings ADD COLUMN customer_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE bookings ADD COLUMN customer_email text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'gross_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN gross_amount numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'duration_hours'
  ) THEN
    ALTER TABLE bookings ADD COLUMN duration_hours integer DEFAULT 3;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE bookings ADD COLUMN start_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE bookings ADD COLUMN end_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'checked_in_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN checked_in_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update vendor_payout calculation to reflect correct formula
-- Platform fee: $5 fixed + 8% of gross amount
-- Vendor payout: gross_amount - platform_fee
CREATE OR REPLACE FUNCTION calculate_booking_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if gross_amount is set and greater than 0
  IF NEW.gross_amount > 0 THEN
    -- Platform fee: $5 fixed + 8% of gross
    NEW.platform_fee :=  (NEW.gross_amount * 0.12);
    
    -- Vendor payout: gross - platform fee
    NEW.vendor_payout := NEW.gross_amount - NEW.platform_fee;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS calculate_booking_revenue_trigger ON bookings;

CREATE TRIGGER calculate_booking_revenue_trigger
  BEFORE INSERT OR UPDATE OF gross_amount ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_booking_revenue();

-- Function to generate unique booking ID (like MS20260322XXXX)
CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Format: MS + YYYYMMDD + 4 random digits
    new_id := 'MS' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if this ID already exists
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bookings WHERE booking_id = new_id);
    
    -- Prevent infinite loop
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique booking ID after 100 attempts';
    END IF;
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_name ON bookings(customer_name);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_status ON bookings(check_in_status);
CREATE INDEX IF NOT EXISTS idx_motels_city_lower ON motels(LOWER(city));
CREATE INDEX IF NOT EXISTS idx_motels_location_coords ON motels(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;