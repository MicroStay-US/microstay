import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('admin-reject-vendor:' + ip, 30, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const { vendorId, reason } = await req.json();

    if (!vendorId || typeof vendorId !== 'string') {
      return NextResponse.json({ error: 'vendorId required' }, { status: 400 });
    }

    const { data: vendor, error: fetchErr } = await client
      .from('vendors')
      .select('id, email, status, auth_user_id')
      .eq('id', vendorId)
      .single();

    const v = vendor as { id: string; email: string; status: string; auth_user_id?: string } | null;

    if (fetchErr || !v) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (!v.status.startsWith('pending') && v.status !== 'suspended') {
      return NextResponse.json({ error: `Vendor is already ${v.status}` }, { status: 409 });
    }

    // agreement_signatures has no ON DELETE CASCADE — must delete manually first
    await client.from('agreement_signatures').delete().eq('vendor_id', vendorId);

    // Attempt to delete auth user (prevent orphans in auth.users)
    const targetUid = v.auth_user_id;
    if (targetUid) {
      await client.auth.admin.deleteUser(targetUid).catch((e: any) => console.warn('Failed to delete auth user:', e.message));
    }

    // Delete the vendor record — all other child tables have ON DELETE CASCADE
    const { error: deleteErr } = await client.from('vendors').delete().eq('id', vendorId);
    if (deleteErr) {
      console.error('Vendor delete failed:', deleteErr.message);
      return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
    }

    console.log(`Vendor ${vendorId} deleted. Reason: ${reason || 'Not specified'}`);

    return NextResponse.json({ success: true, message: 'Vendor application permanently deleted.' });
  } catch (err: any) {
    console.error('Rejection Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
