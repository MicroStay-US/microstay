/**
 * Google reCAPTCHA v3 token verification helper.
 *
 * Protects public endpoints from automated attacks.
 * Real users submit their reCAPTCHA token; bots fail verification.
 *
 * Docs: https://developers.google.com/recaptcha/docs/v3
 */

const SITE_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export async function verifyReCaptcha(
  token: string | undefined | null,
  clientIp?: string,
): Promise<{ ok: boolean; score?: number; error?: string }> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // If no secret is configured, skip verification (dev/preview without keys).
  // Production MUST have RECAPTCHA_SECRET_KEY set.
  if (!secret) {
    return { ok: true, score: 1.0 };
  }

  // If token is missing, fail verification
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'Missing or invalid reCAPTCHA token' };
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

      if (!res.ok) {
        throw new Error(`Google API returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.success === true) {
        const score = data.score ?? 1.0;
        const threshold = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');
        if (score >= threshold) {
          return { ok: true, score };
        }
        return {
          ok: false,
          score,
          error: `reCAPTCHA score ${score} is below threshold ${threshold}`,
        };
      }

      return {
        ok: false,
        error: `reCAPTCHA failed: ${Array.isArray(data['error-codes']) ? data['error-codes'].join(',') : 'unknown'}`,
      };
    } catch (err: any) {
      console.error(`[recaptcha] siteverify attempt ${attempt + 1} failed:`, err?.message);
      if (attempt < 2) continue;
      // Fail CLOSED after exhausting retries — prevents bot bypass via network disruption.
      return { ok: false, error: 'reCAPTCHA verification unavailable. Please try again.' };
    }
  }

  return { ok: false, error: 'reCAPTCHA verification failed' };
}
