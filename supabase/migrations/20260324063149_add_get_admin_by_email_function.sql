/*
  # Add Function to Get Admin by Email

  1. New Functions
    - `get_admin_by_email` - Returns admin user ID and role by email
      - Takes email as parameter
      - Joins auth.users with profiles table
      - Only returns admin users
  
  2. Security
    - Function is callable by anyone (needed for password reset)
    - Only returns minimal data (id, email, role)
    - Only returns admin accounts
*/

CREATE OR REPLACE FUNCTION get_admin_by_email(p_email text)
RETURNS TABLE (id uuid, email text, role text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::text, p.role
  FROM auth.users u
  JOIN profiles p ON u.id = p.id
  WHERE u.email = p_email
  AND p.role = 'admin';
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_by_email(text) TO anon, authenticated;
