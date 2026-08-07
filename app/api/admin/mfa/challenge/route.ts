import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

// ── TOTP helpers (RFC 6238) ────────────────────────────────────────────────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str: string): Buffer {
  const s = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const ch of s) {
    const idx = BASE32_CHARS.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function computeTOTP(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buf);
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const counter = Math.floor(Date.now() / 30_000);
  for (let delta = -window; delta <= window; delta++) {
    if (computeTOTP(secret, counter + delta) === token) return true;
  }
  return false;
}

// ── Route ──────────────────────────────────────────────────────────────────────
// Called at login time — user has already passed password but NOT yet entered
// the dashboard. We verify the TOTP before letting them through.
// We use the service role key to read the secret (no JWT needed at this point).

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 attempts per IP per 5 minutes to prevent TOTP brute-force
    const ip = getIP(req);
    const ipLimit = rateLimit(`mfa-challenge-ip:${ip}`, 5, 5 * 60 * 1000);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);

    const { userId, token } = await req.json();

    if (!userId || !token) {
      return NextResponse.json({ error: 'userId and token are required' }, { status: 400 });
    }

    // Per-user rate limit: 10 attempts per hour to catch distributed brute-force
    const userLimit = rateLimit(`mfa-challenge-user:${userId}`, 10, 60 * 60 * 1000);
    if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfterMs);

    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: 'Token must be a 6-digit number' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the stored secret for this user
    const { data, error } = await supabase
      .from('user_mfa_secrets')
      .select('secret, is_enabled')
      .eq('user_id', userId)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'MFA not configured for this account' }, { status: 400 });
    }

    if (!verifyTOTP(data.secret, token)) {
      return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[mfa/challenge]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
