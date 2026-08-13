import { createClient } from '@supabase/supabase-js';

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 1. Sign in as admin
const { data: auth, error: authErr } = await c.auth.signInWithPassword({
  email: 'adminmotel@gmail.com',
  password: process.env.ADMIN_PASSWORD,
});
if (authErr) { console.log('Auth failed:', authErr.message); process.exit(1); }
console.log('Signed in as:', auth.user.email);

// 2. Check profile role
const { data: profile } = await c.from('profiles').select('role').eq('id', auth.user.id).single();
console.log('Profile role:', profile?.role);

// 3. Query invoices exactly as InvoicesTab does
const { data: invoices, error: invErr } = await c
  .from('invoices')
  .select('*, vendor:vendors(auth_user_id, business_name, email, poc_name)')
  .order('created_at', { ascending: false });

if (invErr) {
  console.log('Invoice query ERROR:', invErr.message, invErr.code, invErr.details);
} else {
  console.log('Invoices returned:', invoices?.length || 0);
  for (const inv of (invoices || []).slice(0, 10)) {
    console.log('  ', inv.invoice_period, '|', inv.vendor?.business_name, '| $' + inv.total_due, '|', inv.status, '|', inv.payment_status);
  }
}
