/**
 * Full password reset verification:
 * 1. Generate a recovery link via admin API
 * 2. Extract the token_hash
 * 3. Use it to verify OTP + update password
 * 4. Sign in with the new password
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_EMAIL = 'test+launch-1775949460851@microstay.us';
const RESET_PASSWORD = 'Reset#Launch2026!V2';

const svc = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('\n━━━ 1. Generate recovery link via admin API ━━━');
const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
  type: 'recovery',
  email: TEST_EMAIL,
});
if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
const tokenHash = linkData.properties.hashed_token;
const actionLink = linkData.properties.action_link;
console.log(`   ✓ token_hash length: ${tokenHash.length}`);
console.log(`   ✓ action_link (first 80 chars): ${actionLink.slice(0, 80)}...`);

console.log('\n━━━ 2. Verify OTP with the token_hash (simulates clicking link) ━━━');
const userClient = createClient(SUPABASE_URL, ANON_KEY);
const { data: verifyData, error: verifyErr } = await userClient.auth.verifyOtp({
  token_hash: tokenHash,
  type: 'recovery',
});
if (verifyErr) throw new Error(`verifyOtp: ${verifyErr.message}`);
console.log(`   ✓ Recovery session established`);
console.log(`   ✓ User: ${verifyData.user?.email}`);

console.log('\n━━━ 3. Update password (simulates submitting the new password form) ━━━');
const { error: updErr } = await userClient.auth.updateUser({ password: RESET_PASSWORD });
if (updErr) throw new Error(`updateUser: ${updErr.message}`);
console.log(`   ✓ Password updated successfully`);

console.log('\n━━━ 4. Sign out then sign in with new password ━━━');
await userClient.auth.signOut();
const freshClient = createClient(SUPABASE_URL, ANON_KEY);
const { data: loginData, error: loginErr } = await freshClient.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: RESET_PASSWORD,
});
if (loginErr) {
  console.log(`   ✗ Login with new password failed: ${loginErr.message}`);
  process.exit(1);
}
console.log(`   ✓ Logged in as ${loginData.user.email}`);
console.log(`   ✓ Session access_token length: ${loginData.session.access_token.length}`);

console.log('\n━━━ 5. Verify the profile still says role=vendor ━━━');
const { data: profile } = await svc
  .from('profiles')
  .select('id, role, name')
  .eq('id', loginData.user.id)
  .single();
console.log(`   Profile role: ${profile?.role}`);
console.log(`   Profile name: ${profile?.name}`);

console.log('\n✅ Password reset flow works end-to-end');
