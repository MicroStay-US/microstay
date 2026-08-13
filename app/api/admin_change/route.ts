import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
 const { data, error } =
  await adminSupabase.auth.admin.updateUserById(
    'f2535376-0e91-4087-b7d3-6cfdf30261ee',
    {
      email: 'adminmotel@gmail.com',
      email_confirm: true
    }
  );

  return Response.json({ data, error });
}