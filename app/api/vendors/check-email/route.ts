import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { verifyReCaptcha } from '@/lib/recaptcha';

/**
 * GET  /api/vendors/check-email?email=...&cf-turnstile-response=...
 * POST /api/vendors/check-email { email, "cf-turnstile-response": "..." }
 *
 * Used by the partner-signup page to check if an email is already registered.
 * 2026-04-12: Protected by Cloudflare Turnstile to prevent automated enumeration.
 * Also rate-limited per IP and returns a minimal response (no status leak).
 */

async function checkEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return NextResponse.json({ available: false, error: 'email required' }, { status: 400 });
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await svc
    .from('vendors')
    .select('id, status')
    .ilike('email', normalized)
    .limit(1);

  if (!data || data.length === 0) {
    return NextResponse.json({ available: true, status: null });
  }

  // Reveal only the one status the signup wizard branches on; everything else
  // is collapsed to "in_progress" to prevent enumeration of moderation state.
  const raw = data[0].status;
  const visible = raw === 'pending_email_verification' ? raw : 'in_progress';
  return NextResponse.json({ available: false, status: visible });
}

async function verifyCaptcha(req: NextRequest, body?: any) {
  const ip = getIP(req);
  
  // 1. Try Turnstile
  const turnstileToken = req.nextUrl.searchParams.get('cf-turnstile-response') || 
                         body?.['cf-turnstile-response'] || 
                         body?.turnstileToken;
  if (turnstileToken) {
    return verifyTurnstile(turnstileToken, ip);
  }

  // 2. Try reCAPTCHA v3
  const recaptchaToken = req.nextUrl.searchParams.get('g-recaptcha-response') || 
                         req.nextUrl.searchParams.get('recaptchaToken') ||
                         body?.['g-recaptcha-response'] || 
                         body?.recaptchaToken;
  if (recaptchaToken) {
    return verifyReCaptcha(recaptchaToken, ip);
  }

  // 3. Fallback: If neither token is provided:
  // If either of the captcha services has configured keys, we must enforce token submission.
  // If neither key is configured, allow it to pass (useful for dev/test environment).
  const hasTurnstile = !!process.env.TURNSTILE_SECRET_KEY;
  const hasReCaptcha = !!process.env.RECAPTCHA_SECRET_KEY;
  if (!hasTurnstile && !hasReCaptcha) {
    return { ok: true };
  }

  return { ok: false, error: 'Missing captcha token' };
}

export async function GET(req: NextRequest) {
  const ip = getIP(req);
  const rl = rateLimit(`check-email:${ip}`, 10, 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const verify = await verifyCaptcha(req);
  if (!verify.ok) {
    return NextResponse.json(
      { available: false, error: verify.error || 'Captcha failed' },
      { status: 403 }
    );
  }

  return checkEmail(req.nextUrl.searchParams.get('email') || undefined);
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const rl = rateLimit(`check-email:${ip}`, 10, 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  let body: any = {};
  try { body = await req.json(); } catch {}

  const verify = await verifyCaptcha(req, body);
  if (!verify.ok) {
    return NextResponse.json(
      { available: false, error: verify.error || 'Captcha failed' },
      { status: 403 }
    );
  }

  return checkEmail(body?.email);
}
