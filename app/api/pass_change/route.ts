// scripts/change-admin-password.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function changeAdminPassword() {
  const newPassword = 'Adminmotel@123';

  const { data, error } =
    await supabase.auth.admin.updateUserById(
      'f2535376-0e91-4087-b7d3-6cfdf30261ee',
      {
        password: newPassword,
      }
    );

  if (error) {
    console.error('Failed to change password:', error.message);
    process.exit(1);
  }

  console.log('Admin password changed successfully.');
  console.log('User:', data.user.email);
}

changeAdminPassword();