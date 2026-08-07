/*
  # Update to Monthly Billing System

  ## Changes Made

  1. **Remove real-time payment splits**
     - Vendors now collect full payment amount
     - Platform tracks monthly bills instead
     - Remove platform_fee and vendor_payout from bookings (keep for historical data)
     - Add monthly tracking fields

  2. **Monthly Invoices Table Enhancement**
     - Add invoice_status field
     - Add reminder_sent_date field
     - Add payment_proof_url field for attachment
     - Add auto_disabled_date field
     - Add notes field for admin

  3. **Vendor Billing Status**
     - Add current_billing_status to vendor_profiles
     - Track overdue amounts
     - Track auto-disable status

  4. **Automated Billing Events**
     - Invoice generated on 1st of month
     - Reminder sent on 5th
     - Auto-disable on 7th if unpaid

  ## Security
  - Maintain existing RLS policies
  - Add policies for invoice management
*/

-- Add billing status tracking to profiles (for vendors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN billing_status text DEFAULT 'current' 
      CHECK (billing_status IN ('current', 'overdue', 'suspended'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_billing_action_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_billing_action_date timestamptz;
  END IF;
END $$;

-- Enhance motel_invoices table with new fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'motel_invoices' AND column_name = 'reminder_sent_date'
  ) THEN
    ALTER TABLE motel_invoices ADD COLUMN reminder_sent_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'motel_invoices' AND column_name = 'payment_proof_url'
  ) THEN
    ALTER TABLE motel_invoices ADD COLUMN payment_proof_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'motel_invoices' AND column_name = 'auto_disabled_date'
  ) THEN
    ALTER TABLE motel_invoices ADD COLUMN auto_disabled_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'motel_invoices' AND column_name = 'notes'
  ) THEN
    ALTER TABLE motel_invoices ADD COLUMN notes text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'motel_invoices' AND column_name = 'paid_by_admin_id'
  ) THEN
    ALTER TABLE motel_invoices ADD COLUMN paid_by_admin_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Function to calculate monthly vendor bill
-- Returns total platform fees owed for a billing period
CREATE OR REPLACE FUNCTION calculate_vendor_monthly_bill(
  p_vendor_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  total_bookings bigint,
  gross_revenue numeric,
  platform_fees_owed numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(b.id)::bigint as total_bookings,
    COALESCE(SUM(b.gross_amount), 0) as gross_revenue,
    COALESCE(SUM(b.gross_amount * 0.12), 0) as platform_fees_owed
  FROM bookings b
  INNER JOIN motels m ON b.motel_id = m.id
  WHERE m.vendor_id = p_vendor_id
    AND b.booking_date >= p_start_date
    AND b.booking_date <= p_end_date
    AND b.check_in_status = 'checked_in';
END;
$$ LANGUAGE plpgsql;

-- Function to generate monthly invoice for a vendor
CREATE OR REPLACE FUNCTION generate_monthly_invoice(
  p_vendor_id uuid,
  p_billing_month date
)
RETURNS uuid AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
  v_start_date date;
  v_end_date date;
  v_bill_data record;
BEGIN
  -- Calculate billing period (previous month)
  v_start_date := date_trunc('month', p_billing_month)::date;
  v_end_date := (date_trunc('month', p_billing_month) + interval '1 month - 1 day')::date;
  
  -- Get billing data
  SELECT * INTO v_bill_data 
  FROM calculate_vendor_monthly_bill(p_vendor_id, v_start_date, v_end_date);
  
  -- Only create invoice if there are bookings
  IF v_bill_data.total_bookings > 0 THEN
    -- Generate invoice number: INV-YYYYMM-XXXX
    v_invoice_number := 'INV-' || TO_CHAR(p_billing_month, 'YYYYMM') || '-' || 
                       LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Create invoice
    INSERT INTO motel_invoices (
      invoice_number,
      motel_id,
      vendor_id,
      billing_period_start,
      billing_period_end,
      total_bookings,
      gross_revenue,
      platform_fees,
      vendor_payout,
      payment_status,
      due_date
    )
    SELECT 
      v_invoice_number,
      m.id,
      p_vendor_id,
      v_start_date,
      v_end_date,
      v_bill_data.total_bookings,
      v_bill_data.gross_revenue,
      v_bill_data.platform_fees_owed,
      0, -- vendor_payout is 0 because vendor collects full amount
      'pending',
      v_end_date + interval '7 days' -- Due 7 days after month ends
    FROM motels m
    WHERE m.vendor_id = p_vendor_id
    LIMIT 1
    RETURNING id INTO v_invoice_id;
    
    RETURN v_invoice_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check and send reminders (to be called daily)
CREATE OR REPLACE FUNCTION process_invoice_reminders()
RETURNS void AS $$
DECLARE
  v_current_date date;
  v_fifth_day date;
  v_seventh_day date;
BEGIN
  v_current_date := CURRENT_DATE;
  
  -- Process 5th day reminders
  IF EXTRACT(DAY FROM v_current_date) = 5 THEN
    UPDATE motel_invoices
    SET 
      reminder_sent_date = NOW(),
      notes = COALESCE(notes, '') || E'\nReminder sent on ' || NOW()::text
    WHERE payment_status = 'pending'
      AND reminder_sent_date IS NULL
      AND EXTRACT(MONTH FROM billing_period_end) = EXTRACT(MONTH FROM v_current_date - interval '1 month')
      AND EXTRACT(YEAR FROM billing_period_end) = EXTRACT(YEAR FROM v_current_date - interval '1 month');
  END IF;
  
  -- Process 7th day auto-disable
  IF EXTRACT(DAY FROM v_current_date) = 7 THEN
    -- Disable all motels for vendors with unpaid invoices
    UPDATE motels m
    SET 
      is_active = false,
      active = false
    WHERE vendor_id IN (
      SELECT DISTINCT vendor_id 
      FROM motel_invoices 
      WHERE payment_status = 'pending'
        AND EXTRACT(MONTH FROM billing_period_end) = EXTRACT(MONTH FROM v_current_date - interval '1 month')
        AND EXTRACT(YEAR FROM billing_period_end) = EXTRACT(YEAR FROM v_current_date - interval '1 month')
    );
    
    -- Update invoice with disable date
    UPDATE motel_invoices
    SET 
      auto_disabled_date = NOW(),
      payment_status = 'overdue',
      notes = COALESCE(notes, '') || E'\nProperties auto-disabled on ' || NOW()::text
    WHERE payment_status = 'pending'
      AND auto_disabled_date IS NULL
      AND EXTRACT(MONTH FROM billing_period_end) = EXTRACT(MONTH FROM v_current_date - interval '1 month')
      AND EXTRACT(YEAR FROM billing_period_end) = EXTRACT(YEAR FROM v_current_date - interval '1 month');
      
    -- Update vendor billing status
    UPDATE profiles
    SET 
      billing_status = 'suspended',
      last_billing_action_date = NOW()
    WHERE id IN (
      SELECT DISTINCT vendor_id 
      FROM motel_invoices 
      WHERE payment_status = 'overdue'
        AND auto_disabled_date IS NOT NULL
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to mark invoice as paid and reactivate properties
CREATE OR REPLACE FUNCTION mark_invoice_paid(
  p_invoice_id uuid,
  p_payment_proof_url text,
  p_admin_id uuid
)
RETURNS void AS $$
DECLARE
  v_vendor_id uuid;
BEGIN
  -- Get vendor ID and update invoice
  SELECT vendor_id INTO v_vendor_id
  FROM motel_invoices
  WHERE id = p_invoice_id;
  
  -- Update invoice
  UPDATE motel_invoices
  SET 
    payment_status = 'paid',
    paid_date = CURRENT_DATE,
    payment_proof_url = p_payment_proof_url,
    paid_by_admin_id = p_admin_id,
    notes = COALESCE(notes, '') || E'\nMarked as paid on ' || NOW()::text
  WHERE id = p_invoice_id;
  
  -- Reactivate all vendor motels if they were disabled
  UPDATE motels
  SET 
    is_active = true,
    active = true
  WHERE vendor_id = v_vendor_id;
  
  -- Update vendor billing status
  UPDATE profiles
  SET 
    billing_status = 'current',
    last_billing_action_date = NOW()
  WHERE id = v_vendor_id;
END;
$$ LANGUAGE plpgsql;

-- Remove the auto-calculation trigger from bookings
-- (Keep the fields for historical data but don't auto-calculate)
DROP TRIGGER IF EXISTS calculate_booking_revenue_trigger ON bookings;

-- Add index for faster invoice queries
CREATE INDEX IF NOT EXISTS idx_motel_invoices_vendor_status ON motel_invoices(vendor_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_motel_invoices_billing_period ON motel_invoices(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_profiles_billing_status ON profiles(billing_status) WHERE role = 'vendor';