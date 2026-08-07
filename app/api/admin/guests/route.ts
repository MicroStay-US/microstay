import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth-server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── GET /api/admin/guests — fetch all guests aggregated from vd_bookings ─────
export async function GET(req: NextRequest) {
  const { error: authError } = await requireAdmin(req);
  if (authError) return authError;

  const supabase = serviceClient();

  // Fetch all bookings (service role bypasses RLS)
  const { data: bookings, error: bErr } = await supabase
    .from('vd_bookings')
    .select('guest_email, guest_name, guest_phone, booking_date, status, gross_amount, booking_ref, property_id');

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  // Aggregate by email
  const map = new Map<string, any>();
  for (const b of bookings || []) {
    const email = (b.guest_email || '').toLowerCase();
    if (!email) continue;
    if (!map.has(email)) {
      map.set(email, {
        guest_email: email,
        guest_name: b.guest_name || '',
        guest_phone: b.guest_phone || '',
        total_bookings: 0,
        total_spent: 0,
        no_show_count: 0,
        last_booking_date: b.booking_date || '',
        flagged: false,
        banned: false,
      });
    }
    const row = map.get(email)!;
    row.total_bookings += 1;
    row.total_spent += Number(b.gross_amount) || 0;
    if (b.status === 'no_show') row.no_show_count += 1;
    if ((b.booking_date || '') > row.last_booking_date) row.last_booking_date = b.booking_date;
    if (b.guest_name) row.guest_name = b.guest_name;
    if (b.guest_phone) row.guest_phone = b.guest_phone;
  }

  // Overlay moderation flags from guest_moderation table
  const emails = Array.from(map.keys());
  if (emails.length > 0) {
    const { data: mods } = await supabase
      .from('guest_moderation')
      .select('email, flagged, banned')
      .in('email', emails);

    for (const m of mods || []) {
      const key = m.email?.toLowerCase();
      if (key && map.has(key)) {
        map.get(key)!.flagged = m.flagged || false;
        map.get(key)!.banned = m.banned || false;
      }
    }
  }

  const guests = Array.from(map.values()).sort((a, b) => b.total_bookings - a.total_bookings);
  return NextResponse.json({ guests });
}

// ── PATCH /api/admin/guests — update flag/ban status ─────────────────────────
export async function PATCH(req: NextRequest) {
  const { error: authError } = await requireAdmin(req);
  if (authError) return authError;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('admin-guest-mod:' + ip, 30, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  const supabase = serviceClient();

  try {
    const { email, field, value } = await req.json();

    if (!email || !field || !['flagged', 'banned'].includes(field)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      email,
      [field]: value,
      updated_at: new Date().toISOString(),
    };
    if (field === 'banned' && value) updateData.banned_at = new Date().toISOString();
    if (field === 'flagged' && value) updateData.flagged_at = new Date().toISOString();

    const { error } = await supabase
      .from('guest_moderation')
      .upsert(updateData, { onConflict: 'email' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update guest moderation' }, { status: 500 });
  }
}

// ── GET /api/admin/guests/bookings?email=xxx — expanded booking history ───────
// Handled in a sub-route below — see /api/admin/guests/bookings/route.ts
