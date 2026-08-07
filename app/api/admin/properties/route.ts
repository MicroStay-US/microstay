import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { data, error: dbError } = await client
      .from('properties')
      .select('*, vendor:vendors(auth_user_id, business_name, owner_name, email, phone)')
      .order('created_at', { ascending: false });

    if (dbError) throw new Error(dbError.message);

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Admin Fetch Properties Error:', err);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}
