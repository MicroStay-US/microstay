import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('admin-clean-ghosts:' + ip, 30, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const { preserveEmail } = await req.json();

    if (!preserveEmail || typeof preserveEmail !== 'string' || !preserveEmail.includes('@')) {
      return NextResponse.json({ error: 'preserveEmail is required in request body' }, { status: 400 });
    }

    const { data: vendors } = await client.from('vendors').select('id, email, motel_name');
    let deletedVendors = 0;
    let preservedId: string | null = null;

    if (vendors) {
      for (const v of vendors as { id: string; email: string; motel_name: string }[]) {
        if (v.email.toLowerCase() !== preserveEmail.toLowerCase()) {
          await client.from('vendors').delete().eq('id', v.id);
          deletedVendors++;
        } else {
          preservedId = v.id;
        }
      }
    }

    let deletedApps = 0;
    const { data: apps } = await client.from('vendor_applications').select('id');
    if (apps) {
      for (const a of apps as { id: string }[]) {
        await client.from('vendor_applications').delete().eq('id', a.id);
        deletedApps++;
      }
    }

    let deletedProps = 0;
    const { data: props } = await client.from('properties').select('id, vendor_id');
    if (props) {
      for (const p of props as { id: string; vendor_id: string }[]) {
        if (p.vendor_id !== preservedId) {
          await client.from('properties').delete().eq('id', p.id);
          deletedProps++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedVendors} vendors, ${deletedApps} applications, ${deletedProps} properties. Preserved: ${preserveEmail}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Ghost cleanup failed' }, { status: 500 });
  }
}
