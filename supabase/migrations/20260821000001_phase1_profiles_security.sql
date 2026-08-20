-- Migration to harden profile role assignments and insert/update privileges

-- 1. Restrict INSERT so users can only create customer profiles via the client side.
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own customer profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'customer');

-- 2. Restrict UPDATE to prevent any role escalation via client side.
-- We create a trigger to outright reject role updates unless done by service_role (Admin API).
CREATE OR REPLACE FUNCTION prevent_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- In Supabase, service_role operations bypass RLS and triggers can check current_setting.
    -- However, to be perfectly safe, we'll just prevent role updates from the auth layer
    -- by checking if it's the authenticated role doing it.
    IF auth.role() = 'authenticated' THEN
      RAISE EXCEPTION 'Role modification via client API is strictly forbidden.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_role_update ON profiles;
CREATE TRIGGER tr_prevent_role_update
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_update();
