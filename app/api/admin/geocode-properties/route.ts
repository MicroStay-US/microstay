import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';

export const dynamic = 'force-dynamic';

type Property = { id: string; name: string; address: string; city: string; state: string };

export async function GET(req: Request) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { data: properties, error: dbError } = await client
      .from('properties')
      .select('id, name, address, city, state')
      .is('latitude', null);

    if (dbError) throw dbError;
    if (!properties || properties.length === 0) {
      return NextResponse.json({ message: 'All properties already have coordinates!' });
    }

    const results = [];

    for (const prop of properties as Property[]) {
      if (!prop.address || !prop.city || !prop.state) continue;

      try {
        const q = encodeURIComponent(`${prop.address}, ${prop.city}, ${prop.state}`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
          headers: { 'User-Agent': 'MicroStay.US (admin support script)' },
        });

        const geoData = await res.json();

        if (geoData && geoData.length > 0) {
          const lat = parseFloat(geoData[0].lat);
          const lon = parseFloat(geoData[0].lon);

          await client.from('properties').update({ latitude: lat, longitude: lon }).eq('id', prop.id);
          results.push({ id: prop.id, name: prop.name, status: 'success', lat, lon });
        } else {
          results.push({ id: prop.id, name: prop.name, status: 'coordinates_not_found' });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e: any) {
        results.push({ id: prop.id, name: prop.name, status: 'error', error: 'Geocode failed for property' });
      }
    }

    return NextResponse.json({ success: true, message: `Processed ${properties.length} properties.`, results });
  } catch (err: any) {
    console.error('Geocode Script Error:', err);
    return NextResponse.json({ error: 'Geocode processing failed' }, { status: 500 });
  }
}
