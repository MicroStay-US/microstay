-- Remove $5.00 flat fee from platform_fees_owed math in calculate_vendor_monthly_bill
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
