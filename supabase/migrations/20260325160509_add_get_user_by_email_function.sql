/*
  # Add Function to Get User by Email

  1. New Functions
    - `get_user_by_email` - Returns user ID and role by email
      - Takes email as parameter
      - Joins auth.users with profiles table
      - Returns any user (not just admins)
      - Used by admin dashboard when approving rejected applications
        to find existing user accounts

  2. Security
    - Function is SECURITY DEFINER to access auth.users
    - Only callable by authenticated users
    - Returns minimal data (id, email, role)
*/

CREATE OR REPLACE FUNCTION get_user_by_email(p_email text)
RETURNS TABLE (id uuid, email text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::text, p.role
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  WHERE u.email = p_email
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_by_email(text) TO authenticated;
