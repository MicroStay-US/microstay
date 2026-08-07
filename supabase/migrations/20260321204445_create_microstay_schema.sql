/*
  # MicroStay Marketplace Schema

  ## Overview
  Creates the complete database schema for MicroStay - a motel booking marketplace platform.

  ## Tables Created
  
  ### 1. profiles (extends auth.users)
  - `id` (uuid, references auth.users)
  - `role` (text) - customer, vendor, or admin
  - `name` (text)
  - `phone` (text)
  - `created_at` (timestamptz)
  
  ### 2. vendor_applications
  - `id` (uuid)
  - `motel_name` (text)
  - `address` (text)
  - `city` (text)
  - `state` (text)
  - `phone` (text)
  - `email` (text)
  - `status` (text) - pending, approved, rejected
  - `created_at` (timestamptz)
  
  ### 3. motels
  - `id` (uuid)
  - `vendor_id` (uuid, references profiles)
  - `name` (text)
  - `address` (text)
  - `city` (text)
  - `state` (text)
  - `description` (text)
  - `amenities` (jsonb) - array of amenities
  - `images` (jsonb) - array of image URLs
  - `phone` (text)
  - `active` (boolean)
  - `created_at` (timestamptz)
  
  ### 4. rooms
  - `id` (uuid)
  - `motel_id` (uuid, references motels)
  - `room_type` (text) - single, double, suite
  - `price_per_slot` (numeric)
  - `active` (boolean)
  - `created_at` (timestamptz)
  
  ### 5. time_slots
  - `id` (uuid)
  - `room_id` (uuid, references rooms)
  - `date` (date)
  - `start_time` (time)
  - `end_time` (time)
  - `available` (boolean)
  - `created_at` (timestamptz)
  
  ### 6. bookings
  - `id` (uuid)
  - `booking_id` (text) - unique short booking reference
  - `user_id` (uuid, references profiles)
  - `motel_id` (uuid, references motels)
  - `room_id` (uuid, references rooms)
  - `time_slot_id` (uuid, references time_slots)
  - `booking_date` (date)
  - `last_name` (text)
  - `phone` (text)
  - `status` (text) - confirmed, cancelled
  - `created_at` (timestamptz)

  ## Security
  - All tables have RLS enabled
  - Policies enforce role-based access control
  - Customers can view public data and manage own bookings
  - Vendors can manage their own properties
  - Admins have full access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'vendor', 'admin')),
  name text,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create vendor_applications table
CREATE TABLE IF NOT EXISTS vendor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motel_name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit vendor application"
  ON vendor_applications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all applications"
  ON vendor_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update applications"
  ON vendor_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create motels table
CREATE TABLE IF NOT EXISTS motels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  description text,
  amenities jsonb DEFAULT '[]'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  phone text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE motels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active motels are viewable by everyone"
  ON motels FOR SELECT
  TO authenticated
  USING (active = true OR vendor_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Vendors can create own motels"
  ON motels FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'vendor'
    )
  );

CREATE POLICY "Vendors can update own motels"
  ON motels FOR UPDATE
  TO authenticated
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can delete own motels"
  ON motels FOR DELETE
  TO authenticated
  USING (vendor_id = auth.uid());

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motel_id uuid NOT NULL REFERENCES motels(id) ON DELETE CASCADE,
  room_type text NOT NULL CHECK (room_type IN ('single', 'double', 'suite')),
  price_per_slot numeric NOT NULL CHECK (price_per_slot >= 0),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM motels
      WHERE motels.id = rooms.motel_id
      AND (motels.active = true OR motels.vendor_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Vendors can manage own motel rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motels
      WHERE motels.id = rooms.motel_id
      AND motels.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own motel rooms"
  ON rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM motels
      WHERE motels.id = rooms.motel_id
      AND motels.vendor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motels
      WHERE motels.id = rooms.motel_id
      AND motels.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete own motel rooms"
  ON rooms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM motels
      WHERE motels.id = rooms.motel_id
      AND motels.vendor_id = auth.uid()
    )
  );

-- Create time_slots table
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time slots are viewable by everyone"
  ON time_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendors can manage own room time slots"
  ON time_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN motels ON motels.id = rooms.motel_id
      WHERE rooms.id = time_slots.room_id
      AND motels.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own room time slots"
  ON time_slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN motels ON motels.id = rooms.motel_id
      WHERE rooms.id = time_slots.room_id
      AND motels.vendor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN motels ON motels.id = rooms.motel_id
      WHERE rooms.id = time_slots.room_id
      AND motels.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete own room time slots"
  ON time_slots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN motels ON motels.id = rooms.motel_id
      WHERE rooms.id = time_slots.room_id
      AND motels.vendor_id = auth.uid()
    )
  );

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  motel_id uuid NOT NULL REFERENCES motels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  time_slot_id uuid NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM motels
      WHERE motels.id = bookings.motel_id
      AND motels.vendor_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_motels_city ON motels(city);
CREATE INDEX IF NOT EXISTS idx_motels_active ON motels(active);
CREATE INDEX IF NOT EXISTS idx_motels_vendor ON motels(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_motel ON rooms(motel_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_room ON time_slots(room_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_date ON time_slots(date);
CREATE INDEX IF NOT EXISTS idx_time_slots_available ON time_slots(available);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);

-- Function to generate short booking ID
CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := 'MS-';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;