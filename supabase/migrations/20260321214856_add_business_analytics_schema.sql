/*
  # Add Business Analytics and Financial Tracking

  1. Changes to bookings table
    - Add check_in_status (pending, checked_in, no_show)
    - Add actual_check_in_time for tracking when customer arrived
    - Add platform_fee for MicroStay commission
    - Add vendor_payout for amount going to motel owner
    - Add payment_status (pending, paid, refunded)
    - Add notes for tracking issues

  2. New Tables
    - `motel_invoices` for monthly billing to motels
      - invoice_number, motel_id, billing_period
      - total_bookings, total_revenue, platform_fees
      - amount_owed, payment_status, due_date
    
    - `platform_revenue` for daily revenue tracking
      - date, total_bookings, gross_revenue
      - platform_fees, vendor_payouts

  3. Security
    - Admins have full access to all financial data
    - Vendors can only see their own invoices
    - Public users cannot access financial tables

  4. Notes
    - Platform charges $5 flat + 8% of gross booking revenue
    - Monthly invoices generated for vendor payments
*/

-- Add financial and tracking columns to bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'check_in_status') THEN
    ALTER TABLE bookings ADD COLUMN check_in_status text DEFAULT 'pending' CHECK (check_in_status IN ('pending', 'checked_in', 'no_show'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'actual_check_in_time') THEN
    ALTER TABLE bookings ADD COLUMN actual_check_in_time timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'platform_fee') THEN
    ALTER TABLE bookings ADD COLUMN platform_fee decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'vendor_payout') THEN
    ALTER TABLE bookings ADD COLUMN vendor_payout decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
    ALTER TABLE bookings ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'notes') THEN
    ALTER TABLE bookings ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- Create motel_invoices table
CREATE TABLE IF NOT EXISTS motel_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  motel_id uuid REFERENCES motels(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  total_bookings integer DEFAULT 0,
  gross_revenue decimal(10,2) DEFAULT 0,
  platform_fees decimal(10,2) DEFAULT 0,
  vendor_payout decimal(10,2) DEFAULT 0,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  due_date date NOT NULL,
  paid_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create platform_revenue table for daily tracking
CREATE TABLE IF NOT EXISTS platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  total_bookings integer DEFAULT 0,
  gross_revenue decimal(10,2) DEFAULT 0,
  platform_fees decimal(10,2) DEFAULT 0,
  vendor_payouts decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE motel_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for motel_invoices
CREATE POLICY "Admins can view all invoices"
  ON motel_invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Vendors can view own invoices"
  ON motel_invoices
  FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid());

CREATE POLICY "Admins can insert invoices"
  ON motel_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update invoices"
  ON motel_invoices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for platform_revenue
CREATE POLICY "Admins can view revenue"
  ON platform_revenue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage revenue"
  ON platform_revenue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_motel_invoices_motel_id ON motel_invoices(motel_id);
CREATE INDEX IF NOT EXISTS idx_motel_invoices_vendor_id ON motel_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_motel_invoices_billing_period ON motel_invoices(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_date ON platform_revenue(date);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_status ON bookings(check_in_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);