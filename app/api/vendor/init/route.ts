import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/vendor-auth-server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // SECURITY: Must be called by the authenticated user creating their OWN
  // vendor shell. Previously unauthenticated — any caller could bind a
  // vendor row to an arbitrary auth user. See audit C3.
  const auth = await requireAuthUser(req);
  if (auth.error) return auth.error;
  const supabase = auth.serviceClient;
  const authedUser = auth.user;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('vendor-init:' + ip, 15, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const { userId, email, name } = await req.json();
    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email required' }, { status: 400 });
    }

    // The caller may only initialize their own vendor shell. Comparing
    // against the JWT subject prevents passing a foreign userId.
    if (userId !== authedUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Guard: don't double-create
    // NOTE: column renamed user_id → auth_user_id in fix_vendor_dual_identity migration
    const { data: existing } = await supabase
      .from('vendors')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (existing) return NextResponse.json({ vendor: existing });

    const ownerName = name || email.split('@')[0] || 'New Vendor';

    const { data: vendor, error } = await supabase
      .from('vendors')
      .insert({
        auth_user_id: userId,
        business_name: 'My Property',
        owner_name: ownerName,
        email,
        status: 'pending',
        onboarded_at: null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ vendor });
  } catch (err: any) {
    console.error('[vendor/init]', err);
    return NextResponse.json({ error: 'Failed to initialize vendor' }, { status: 500 });
  }
}
