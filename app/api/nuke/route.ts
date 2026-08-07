import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';

export async function POST(req: Request) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  // Second factor: require a NUKE_SECRET header to prevent accidental invocation
  const nukeSecret = process.env.NUKE_SECRET;
  if (!nukeSecret) {
    return NextResponse.json({ error: 'NUKE_SECRET env var not configured' }, { status: 503 });
  }
  const provided = req.headers.get('x-nuke-secret');
  if (!provided || provided !== nukeSecret) {
    return NextResponse.json({ error: 'Missing or invalid x-nuke-secret header' }, { status: 403 });
  }

  try {
    const { data: props } = await client
      .from('properties')
      .select('*')
      .order('created_at', { ascending: true });

    if (!props || props.length === 0) {
      return NextResponse.json({ success: true, message: 'No properties found.' });
    }

    const grouped = props.reduce((acc: any, prop: any) => {
      if (!acc[prop.vendor_id]) acc[prop.vendor_id] = [];
      acc[prop.vendor_id].push(prop);
      return acc;
    }, {});

    let deletedCount = 0;
    for (const vendorId of Object.keys(grouped)) {
      const vendorProps = grouped[vendorId];
      if (vendorProps.length > 1) {
        const toDelete = vendorProps.slice(1);
        for (const p of toDelete) {
          await client.from('vd_time_slots').delete().eq('property_id', p.id);
          await client.from('vd_bookings').delete().eq('motel_id', p.id);
          await client.from('properties').delete().eq('id', p.id);
          deletedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${deletedCount} duplicate properties across all vendors.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Nuke operation failed' }, { status: 500 });
  }
}
