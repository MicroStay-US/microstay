import { supabase } from './supabase';

export async function sendLoginNotification(userId: string, userEmail: string) {
  try {
    const geoRes = await fetch('https://ipapi.co/json/');
    const geo = await geoRes.json();

    const loginData = {
      userId,
      userEmail,
      ipAddress: geo.ip || 'Unknown',
      city: geo.city || 'Unknown',
      country: geo.country_name || 'Unknown',
      region: geo.region || '',
      userAgent: navigator.userAgent,
      loginTime: new Date().toISOString(),
    };

    await supabase.from('login_audit_log').insert({
      user_id: userId,
      ip_address: loginData.ipAddress,
      location: `${loginData.city}, ${loginData.region}, ${loginData.country}`,
      user_agent: loginData.userAgent,
      created_at: loginData.loginTime,
    }).then(() => {});

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await fetch(`${supabaseUrl}/functions/v1/send-login-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });
  } catch (err) {
    console.error('Login notification error:', err);
  }
}
