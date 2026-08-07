/**
 * LIVE production end-to-end flow test.
 *
 * Signs in as admin via Supabase, approves our pre-created test vendor via
 * the real /api/vendor/approve endpoint, verifies DB side effects, programmatically
 * sets a password for the vendor, signs in as vendor, and verifies dashboard access.
 *
 * Usage:  node scripts/live-e2e.mjs
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const BASE = 'https://www.microstay.us';
const TEST_VENDOR_ID = 'e384c98f-428a-4786-a420-b45c31ad7139';
const TEST_VENDOR_EMAIL = 'test+launch-1775949460851@microstay.us';
const NEW_VENDOR_PASSWORD = 'LaunchVendor#2026!Test';

const ADMIN_EMAIL = 'admin@microstay.us';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function log(title, data) {
  console.log(`\n━━━ ${title} ━━━`);
  if (data !== undefined) console.log(data);
}

async function main() {
  if (!ADMIN_PASSWORD || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_KEY) {
    throw new Error('Missing env vars. Need ADMIN_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Sign in as admin to get JWT
  // ─────────────────────────────────────────────────────────────
  log('1. Admin sign-in');
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: adminAuth, error: adminErr } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (adminErr) throw new Error(`Admin sign-in failed: ${adminErr.message}`);
  const adminToken = adminAuth.session.access_token;
  console.log(`   ✓ Signed in as ${adminAuth.user.email}`);
  console.log(`   JWT length: ${adminToken.length} chars`);

  // ─────────────────────────────────────────────────────────────
  // 2. Verify test vendor is visible in admin applications API
  // ─────────────────────────────────────────────────────────────
  log('2. Fetch admin applications list');
  const appsRes = await fetch(`${BASE}/api/admin/applications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const appsJson = await appsRes.json();
  const apps = appsJson.data || [];
  const ourApp = apps.find((a) => a.id === TEST_VENDOR_ID);
  console.log(`   Total applications visible: ${apps.length}`);
  console.log(`   Our test vendor found: ${!!ourApp}`);
  if (ourApp) {
    console.log(`   Status: ${ourApp.status}`);
    console.log(`   Business name: ${ourApp.business_name || '(null)'}`);
  } else {
    console.log(`   First 3 application IDs:`, apps.slice(0, 3).map(a => `${a.id} (${a.status})`));
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Approve the test vendor via /api/vendor/approve
  // ─────────────────────────────────────────────────────────────
  log('3. Approve vendor via /api/vendor/approve');
  const approveRes = await fetch(`${BASE}/api/vendor/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ vendorId: TEST_VENDOR_ID }),
  });
  const approveText = await approveRes.text();
  console.log(`   HTTP ${approveRes.status}`);
  console.log(`   Response: ${approveText.slice(0, 300)}`);
  if (!approveRes.ok) {
    console.log('   ✗ APPROVAL FAILED — stopping');
    return;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Verify DB side effects
  // ─────────────────────────────────────────────────────────────
  log('4. Verify vendor row after approval');
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: vendorAfter } = await svc
    .from('vendors')
    .select('id, status, auth_user_id, stripe_customer_id, onboarded_at')
    .eq('id', TEST_VENDOR_ID)
    .single();
  console.log(`   status:             ${vendorAfter?.status}`);
  console.log(`   auth_user_id:       ${vendorAfter?.auth_user_id}`);
  console.log(`   stripe_customer_id: ${vendorAfter?.stripe_customer_id || '(null)'}`);
  console.log(`   onboarded_at:       ${vendorAfter?.onboarded_at}`);

  log('5. Verify property row was created');
  const { data: propAfter } = await svc
    .from('properties')
    .select('id, name, address, city, latitude, longitude')
    .eq('vendor_id', TEST_VENDOR_ID);
  if (propAfter && propAfter.length > 0) {
    console.log(`   ✓ ${propAfter.length} property row(s) created`);
    for (const p of propAfter) {
      console.log(`     - "${p.name}" @ ${p.address}, ${p.city} (${p.latitude}, ${p.longitude})`);
    }
  } else {
    console.log(`   ✗ No property rows found`);
  }

  log('6. Verify profile row created with role=vendor');
  const { data: profileAfter } = await svc
    .from('profiles')
    .select('id, role, name')
    .eq('id', vendorAfter.auth_user_id)
    .single();
  console.log(`   role: ${profileAfter?.role}`);
  console.log(`   name: ${profileAfter?.name}`);

  // ─────────────────────────────────────────────────────────────
  // 5. Set a known password for the test vendor via admin API
  //    (bypasses the email-based password reset for automated test)
  // ─────────────────────────────────────────────────────────────
  log('7. Set vendor password directly via admin API');
  const { error: pwErr } = await svc.auth.admin.updateUserById(vendorAfter.auth_user_id, {
    password: NEW_VENDOR_PASSWORD,
  });
  if (pwErr) {
    console.log(`   ✗ Password update failed: ${pwErr.message}`);
    return;
  }
  console.log(`   ✓ Password set to NEW_VENDOR_PASSWORD`);

  // ─────────────────────────────────────────────────────────────
  // 6. Sign in as test vendor
  // ─────────────────────────────────────────────────────────────
  log('8. Test vendor sign-in with new password');
  const vendorClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: vendorAuth, error: vendorLoginErr } = await vendorClient.auth.signInWithPassword({
    email: TEST_VENDOR_EMAIL,
    password: NEW_VENDOR_PASSWORD,
  });
  if (vendorLoginErr) {
    console.log(`   ✗ Vendor login failed: ${vendorLoginErr.message}`);
    return;
  }
  console.log(`   ✓ Logged in as ${vendorAuth.user.email}`);
  const vendorToken = vendorAuth.session.access_token;

  // ─────────────────────────────────────────────────────────────
  // 7. Vendor fetches their own info from API
  // ─────────────────────────────────────────────────────────────
  log('9. Vendor fetches /api/vendor/init (dashboard bootstrap)');
  const initRes = await fetch(`${BASE}/api/vendor/init`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  console.log(`   HTTP ${initRes.status}`);
  const initJson = await initRes.json().catch(() => ({}));
  console.log(`   Response keys: ${Object.keys(initJson).join(', ')}`);
  if (initJson.vendor) {
    console.log(`   vendor.id: ${initJson.vendor.id}`);
    console.log(`   vendor.status: ${initJson.vendor.status}`);
  }

  log('10. Vendor fetches their properties list');
  const propsRes = await fetch(`${BASE}/api/vendor/status`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  console.log(`   HTTP ${propsRes.status}`);
  const propsJson = await propsRes.json().catch(() => ({}));
  console.log(`   Response: ${JSON.stringify(propsJson).slice(0, 250)}`);

  console.log('\n✅ Live approval + vendor-login flow test complete\n');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
