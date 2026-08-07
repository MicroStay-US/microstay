import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth-server';

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAdmin(req);
  if (authError) return authError;

  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('vd_bookings')
    .select('id, booking_ref, booking_date, status, gross_amount, property_id')
    .eq('guest_email', email)
    .order('booking_date', { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ error: 'Failed to fetch guest bookings' }, { status: 500 });

  // Fetch property names separately (avoids join RLS issues)
  const propertyIds = Array.from(new Set((data || []).map((b: any) => b.property_id).filter(Boolean)));
  let propertyNames: Record<string, string> = {};
  if (propertyIds.length > 0) {
    const { data: props } = await supabase
      .from('properties')
      .select('id, name')
      .in('id', propertyIds);
    for (const p of props || []) propertyNames[p.id] = p.name;
  }

  const bookings = (data || []).map(b => ({
    ...b,
    property_name: propertyNames[b.property_id] || 'Unknown Property',
  }));

  return NextResponse.json({ bookings });
}
