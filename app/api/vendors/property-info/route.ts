import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedVendor, AnySupabaseClient } from '@/lib/vendor-auth-server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

const REQUIRED_FIELDS = [
  'legal_business_name',
  'property_address',
  'city',
  'state',
  'zip',
  'contact_name',
  'contact_email',
  'rooms_available',
] as const;

function escapeStr(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

export async function POST(req: NextRequest) {
  const auth = await requireVerifiedVendor(req);
  if (auth.error) return auth.error;
  const { vendor, serviceClient: svc }: { vendor: any; serviceClient: AnySupabaseClient; error: null } = auth as any;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('vendor-property-info:' + ip, 15, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const body = await req.json();

    // Validate required fields
    for (const field of REQUIRED_FIELDS) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json(
          { error: `Field "${field.replace(/_/g, ' ')}" is required.` },
          { status: 400 }
        );
      }
    }

    const rooms = parseInt(body.rooms_available, 10);
    if (isNaN(rooms) || rooms < 1) {
      return NextResponse.json({ error: 'Rooms available must be a positive number.' }, { status: 400 });
    }

    const payload = {
      vendor_id: vendor.id,
      legal_business_name: escapeStr(body.legal_business_name),
      dba_name: escapeStr(body.dba_name),
      property_address: escapeStr(body.property_address),
      city: escapeStr(body.city),
      state: escapeStr(body.state),
      zip: escapeStr(body.zip),
      federal_ein: escapeStr(body.federal_ein),
      contact_name: escapeStr(body.contact_name),
      contact_phone: escapeStr(body.contact_phone),
      contact_email: escapeStr(body.contact_email),
      updated_at: new Date().toISOString(),
    };

    // Upsert vendor_properties (one record per vendor)
    const { data: existing } = await svc
      .from('vendor_properties')
      .select('id')
      .eq('vendor_id', vendor.id)
      .maybeSingle();

    let result;
    if (existing) {
      result = await svc
        .from('vendor_properties')
        .update(payload)
        .eq('vendor_id', vendor.id)
        .select('id')
        .single();
    } else {
      result = await svc
        .from('vendor_properties')
        .insert(payload)
        .select('id')
        .single();
    }

    if (result.error) {
      throw new Error(`Property save failed: ${result.error.message}`);
    }

    // --- Mirror fields to 'vendors' table for Admin Dashboard compatibility ---
    await svc.from('vendors').update({
      business_name: escapeStr(body.legal_business_name),
      motel_name: escapeStr(body.dba_name) || escapeStr(body.legal_business_name),
      owner_name: escapeStr(body.dba_name),
      phone: escapeStr(body.contact_phone),
      city: escapeStr(body.city),
      state: escapeStr(body.state),
      zip: escapeStr(body.zip),
      address: escapeStr(body.property_address),
      rooms: rooms,
      business_license_url: escapeStr(body.business_license_file_url),
      poc_name: escapeStr(body.contact_name),
      poc_phone: escapeStr(body.contact_phone),
    }).eq('id', vendor.id);

    return NextResponse.json({ success: true, propertyId: result.data.id });
  } catch (err: any) {
    console.error('Property-info error:', err);
    return NextResponse.json({ error: 'Failed to save property info' }, { status: 500 });
  }
}
