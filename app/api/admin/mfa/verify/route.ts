import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth-server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

// ── TOTP helpers (RFC 6238, no external lib) ──────────────────────────────────

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

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin(req);
  if (authError) return authError;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('admin-mfa-verify:' + ip, 30, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const { userId, token, secret } = await req.json();
    if (!userId || !token || !secret) {
      return NextResponse.json({ error: 'userId, token and secret are required' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: 'Token must be a 6-digit number' }, { status: 400 });
    }

    if (!verifyTOTP(secret, token)) {
      return NextResponse.json({ error: 'Invalid or expired token. Try again.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('user_mfa_secrets')
      .update({ is_enabled: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[mfa/verify]', err);
    return NextResponse.json({ error: 'Failed to verify token' }, { status: 500 });
  }
}
