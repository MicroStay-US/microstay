import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('admin-property-edit:' + ip, 30, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const propertyId = params.id;
    if (!propertyId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)) {
      return NextResponse.json({ error: 'Invalid property ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;
    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'status must be active or inactive' }, { status: 400 });
    }

    const { error: upErr } = await client
      .from('properties')
      .update({ status })
      .eq('id', propertyId);

    if (upErr) throw new Error(upErr.message);
    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error('Toggle Property Status Error:', err);
    return NextResponse.json({ error: 'Failed to update property status' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  const ip2 = getIP(req);
  const { allowed: allowed2, retryAfterMs: retryAfterMs2 } = rateLimit('admin-property-edit:' + ip2, 30, 5 * 60 * 1000);
  if (!allowed2) return rateLimitResponse(retryAfterMs2);

  try {
    const propertyId = params.id;
    if (!propertyId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)) {
      return NextResponse.json({ error: 'Invalid property ID' }, { status: 400 });
    }

    const { error: bkErr } = await client.from('vd_bookings').delete().eq('property_id', propertyId);
    if (bkErr) console.warn('Warning: Could not clear bookings:', bkErr.message);

    const { error: bkOldErr } = await client.from('vd_bookings').delete().eq('motel_id', propertyId);
    if (bkOldErr) console.warn('Warning: Could not clear old motel_id bookings:', bkOldErr.message);

    const { error: tsErr } = await client.from('vd_time_slots').delete().eq('property_id', propertyId);
    if (tsErr) console.warn('Warning: Could not clear slots:', tsErr.message);

    const { error: propErr } = await client.from('properties').delete().eq('id', propertyId);
    if (propErr) throw new Error(propErr.message);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete Property Error:', err);
    return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 });
  }
}
