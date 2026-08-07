/**
 * Cloudflare Turnstile token verification helper.
 *
 * Protects public endpoints from automated enumeration (e.g. check-email).
 * Real users get a silent pass from the invisible widget; bots fail verification.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const SITE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Test keys documented by Cloudflare that always pass — useful for local dev
// and e2e tests. In production the real key is in env.
const ALWAYS_PASS_TEST_KEY = '1x0000000000000000000000000000000AA';

export async function verifyTurnstile(
  token: string | undefined | null,
  clientIp?: string,
): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // If no secret is configured, skip verification (dev/preview without keys).
  // Production MUST have TURNSTILE_SECRET_KEY set — this is safe because
  // the check-email endpoint is not the last line of defense.
  if (!secret || secret === ALWAYS_PASS_TEST_KEY) {
    return { ok: true };
  }

  if (!token || typeof token !== 'string' || token.length < 20) {
    return { ok: false, error: 'Missing or invalid captcha token' };
  }

  const body = new URLSearchParams();
  body.append('secret', secret);
  body.append('response', token);
  if (clientIp) body.append('remoteip', clientIp);

  // Retry up to 2 times on transient network errors, then fail closed.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(SITE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (data.success === true) return { ok: true };
      return {
        ok: false,
        error: `Captcha failed: ${Array.isArray(data['error-codes']) ? data['error-codes'].join(',') : 'unknown'}`,
      };
    } catch (err: any) {
      console.error(`[turnstile] siteverify attempt ${attempt + 1} failed:`, err?.message);
      if (attempt < 2) continue;
      // Fail CLOSED after exhausting retries — prevents bot bypass via
      // network disruption. Rate limiting still applies as a separate layer.
      return { ok: false, error: 'Captcha verification unavailable. Please try again.' };
    }
  }
  return { ok: false, error: 'Captcha verification failed' };
}
