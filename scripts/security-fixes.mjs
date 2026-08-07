// Executes all security fixes I can do automatically via REST APIs.
// Usage: node --env-file=.env.local scripts/security-fixes.mjs
//
// Requires these env vars (set from the ones I was given):
//   SUPABASE_PAT   (sbp_...)
//   NEW_RESEND_KEY (re_...)
//   SENTRY_TOKEN   (sntryu_...)
//   CLOUDFLARE_TOKEN (cfut_...)

const PROJECT_REF = 'sznxbdjzlwpzugiavjwg';
const SUPABASE_PAT = process.env.SUPABASE_PAT;
const NEW_RESEND_KEY = process.env.NEW_RESEND_KEY;
const SENTRY_TOKEN = process.env.SENTRY_TOKEN;
const CLOUDFLARE_TOKEN = process.env.CLOUDFLARE_TOKEN;

if (!SUPABASE_PAT || !NEW_RESEND_KEY || !SENTRY_TOKEN || !CLOUDFLARE_TOKEN) {
  console.error('Missing required env vars. Need: SUPABASE_PAT, NEW_RESEND_KEY, SENTRY_TOKEN, CLOUDFLARE_TOKEN');
  process.exit(1);
}

const h = (title) => console.log(`\n━━━ ${title} ━━━`);

const supaFetch = async (path, opts = {}) => {
  const res = await fetch(`https://api.supabase.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${SUPABASE_PAT}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};

// ─────────────────────────────────────────────────────────────
// #3 — Strengthen password rules (free-tier-compatible)
// ─────────────────────────────────────────────────────────────
h('#3 — Strengthen Supabase password rules');

// Valid enum value (lowercase + uppercase + digits + symbols)
const STRONG_CHARS = "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!@#$%^&*()_+-=[]{};'\\\\:\"|<>?,./`~";

const r3 = await supaFetch(`/v1/projects/${PROJECT_REF}/config/auth`, {
  method: 'PATCH',
  body: JSON.stringify({
    password_min_length: 12,
    password_required_characters: STRONG_CHARS,
  }),
});
console.log(`   status: ${r3.status}`);
if (r3.status !== 200) {
  console.log(`   error: ${JSON.stringify(r3.body).slice(0, 300)}`);
} else {
  console.log(`   ✓ Password rules strengthened: min 12 chars, requires lower+upper+digit+symbol`);
}

// Re-check
const r3Check = await supaFetch(`/v1/projects/${PROJECT_REF}/config/auth`);
console.log(`   min_length: ${r3Check.body.password_min_length}`);
console.log(`   hibp_enabled: ${r3Check.body.password_hibp_enabled} (requires Pro plan — not enabled on free tier)`);
