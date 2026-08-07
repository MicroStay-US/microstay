import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Statuses we DO reveal: these are the ones the signup wizard needs to branch
// on to decide whether to show "continue application" or "already approved".
// Everything else (pending_review, suspended, rejected, etc.) maps to "in_progress"
// so we don't leak moderation state to a random enumerator.
const REVEALED_STATUSES = new Set([
  'pending_email_verification',
  'pending_agreement',
  'active',
]);

export async function POST(req: Request) {
  // Tighter rate limit: 10/min/IP (was 30/min) — this endpoint is used sparingly
  // during signup so the limit is still generous for real users but noisier for
  // enumerators.
  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit(`vendor-status:${ip}`, 10, 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ status: null }, { status: 500 });
    }

    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data } = await supabase
      .from('vendors')
      .select('status')
      .eq('email', email.trim().toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Privacy: only reveal the 3 statuses the signup wizard needs to know about.
    // Anything else (pending_review, suspended, rejected, flagged) maps to
    // "in_progress" so attackers can't enumerate moderation state.
    const raw = data?.status || null;
    const visible = raw && REVEALED_STATUSES.has(raw) ? raw : raw ? 'in_progress' : null;

    return NextResponse.json({ status: visible });
  } catch {
    return NextResponse.json({ status: null });
  }
}
