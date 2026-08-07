import { createClient } from '@supabase/supabase-js';

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: list } = await svc.auth.admin.listUsers({ perPage: 1000 });
const testUsers = (list?.users || []).filter(u => u.email && u.email.startsWith('test+launch-'));

console.log(`Found ${testUsers.length} test auth user(s):`);
for (const u of testUsers) {
  console.log(`  - ${u.email} (${u.id})`);
  const { error } = await svc.auth.admin.deleteUser(u.id);
  console.log(`    delete: ${error ? 'ERR ' + error.message : 'OK'}`);
}

// Verify cleanup
const { data: after } = await svc.auth.admin.listUsers({ perPage: 1000 });
const remaining = (after?.users || []).filter(u => u.email && u.email.startsWith('test+launch-'));
console.log(`\nRemaining test auth users: ${remaining.length}`);
