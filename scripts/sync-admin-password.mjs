import { createClient } from '@supabase/supabase-js';

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: list } = await svc.auth.admin.listUsers();
const admin = list?.users.find((u) => u.email === 'adminmotel@gmail.com');
console.log('Admin user id:', admin?.id);
console.log('Admin confirmed:', admin?.email_confirmed_at ? 'yes' : 'no');
console.log('ADMIN_PASSWORD env len:', (process.env.ADMIN_PASSWORD || '').length);
if (admin) {
  const { error } = await svc.auth.admin.updateUserById(admin.id, { password: process.env.ADMIN_PASSWORD });
  console.log('Sync result:', error ? 'ERR: ' + error.message : 'OK - admin password synced with .env.local');
}
