import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { data, error: dbError } = await client
      .from('vendors')
      .select('*, vendor_agreements(*), vendor_photos(*)')
      .order('created_at', { ascending: false });

    if (dbError) throw new Error(dbError.message);

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Admin Fetch Apps Error:', err);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
