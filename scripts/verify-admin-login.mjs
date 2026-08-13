import { createClient } from '@supabase/supabase-js';

const c = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const { data, error } = await c.auth.signInWithPassword({
  email: 'adminmotel@gmail.com',
  password: process.env.ADMIN_PASSWORD,
});
console.log('Admin login with rotated password:', error ? 'FAIL ' + error.message : 'OK ✓');
console.log('User id:', data?.user?.id);
