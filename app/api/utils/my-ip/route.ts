import { NextRequest, NextResponse } from 'next/server';
import { getIP } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  return NextResponse.json({ ip: getIP(req) });
}
