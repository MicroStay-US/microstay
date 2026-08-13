import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth-server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

// ── TOTP helpers (RFC 6238, no external lib) ──────────────────────────────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateBase32Secret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  let result = '';
  for (let i = 0; i < byteLength; i++) {
    result += BASE32_CHARS[bytes[i] % 32];
  }
  return result;
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin(req);
  if (authError) return authError;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('admin-mfa-setup:' + ip, 30, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch user email for the QR label
    const { data: userRecord } = await supabase.auth.admin.getUserById(userId);
    const email = userRecord?.user?.email ?? 'adminmotel@gmail.com';

    const secret = generateBase32Secret();

    // Store the secret (disabled until verified)
    await supabase
      .from('user_mfa_secrets')
      .upsert({ user_id: userId, secret, is_enabled: false }, { onConflict: 'user_id' });

    // Build otpauth URI and generate QR data URL
    const otpauthUrl = `otpauth://totp/MicroStay%20Admin:${encodeURIComponent(email)}?secret=${secret}&issuer=MicroStay`;
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, { width: 256, margin: 2 });

    return NextResponse.json({ secret, qrCodeUrl });
  } catch (err: any) {
    console.error('[mfa/setup]', err);
    return NextResponse.json({ error: 'Failed to initialize MFA setup' }, { status: 500 });
  }
}
