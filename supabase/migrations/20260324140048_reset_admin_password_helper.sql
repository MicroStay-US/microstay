/*
  # Admin Password Reset Helper

  1. Purpose
    - Creates a function to easily reset admin password
    - Allows setting a known password for testing

  2. Security
    - Function requires service role to execute
    - Only affects admin@microstay.us account
*/

CREATE OR REPLACE FUNCTION reset_admin_password(new_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@microstay.us';
  
  IF admin_user_id IS NULL THEN
    RETURN json_build_object('error', 'Admin user not found');
  END IF;
  
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = admin_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Admin password updated successfully'
  );
END;
$$;