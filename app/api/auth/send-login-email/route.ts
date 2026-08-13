import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resendKey = process.env.RESEND_API_KEY;
const isDev = process.env.NODE_ENV === 'development';

export async function POST(req: NextRequest) {
  try {
    let { userId, userEmail, userAgent, loginTime } = await req.json();

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const actualIp = clientIp.split(',')[0].trim();
    
    // Fetch geo from IP (server-side to avoid CSP)
    let ipAddress = actualIp;
    let city = 'Unknown';
    let region = '';
    let country = 'Unknown';
    
    try {
      const geoUrl = actualIp === '127.0.0.1' || actualIp === '::1' ? 'https://ipapi.co/json/' : `https://ipapi.co/${actualIp}/json/`;
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'MicroStay-Server/1.0' }
      });
      const geo = await geoRes.json();
      
      if (geo.error) {
        throw new Error(geo.reason || 'IP API returned an error');
      }

      ipAddress = geo.ip || actualIp;
      city = geo.city || 'Unknown';
      region = geo.region || '';
      country = geo.country_name || 'Unknown';
    } catch (e) {
      console.error('Geo fetch failed, falling back:', e);
      try {
        // Fallback for just IP if ipapi is rate limited
        if (actualIp === '127.0.0.1' || actualIp === '::1') {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          ipAddress = ipData.ip || actualIp;
        }
      } catch (fallbackErr) {
        console.error('Fallback IP fetch failed:', fallbackErr);
      }
    }

    loginTime = loginTime || new Date().toISOString();
    const loginDate = new Date(loginTime).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const location = [city, region, country].filter(Boolean).join(', ');

    // Fetch user profile to get role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const svc = createClient(supabaseUrl, serviceKey);

    // Audit log
    await svc.from('login_audit_log').insert({
      user_id: userId,
      ip_address: ipAddress,
      location: location,
      user_agent: userAgent || 'Unknown',
      created_at: loginTime,
    }).then(() => {});

    // Fetch user profile to get role
    let role = 'customer';
    const { data: profile } = await svc
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (profile?.role) {
      role = profile.role;
    }

    let headerText = 'New Login to MicroStay';
    let subjectText = 'New login to your MicroStay account';
    let portalName = 'MicroStay';

    if (role === 'vendor') {
      headerText = 'Vendor Login Successful';
      subjectText = 'Successful Login to MicroStay Vendor Portal';
      portalName = 'MicroStay Vendor Portal';
    } else if (role === 'admin') {
      headerText = 'Admin Login Successful';
      subjectText = 'Successful Login to MicroStay Admin Portal';
      portalName = 'MicroStay Admin Portal';
    }

    const emailHtml = `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg, #FF5E1A 0%, #F0997B 100%);padding:32px 24px;text-align:center;">
          <div style="background-color:rgba(255,255,255,0.2);display:inline-block;padding:12px;border-radius:50%;margin-bottom:16px;">
            <span style="font-size:32px;line-height:1;">🏨</span>
          </div>
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${headerText}</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0 0;font-size:15px;">Welcome back to your ${portalName}</p>
        </div>
        
        <div style="padding:32px 24px;">
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
            This email is to confirm that you have successfully logged into your account. We've recorded the following details for your session:
          </p>
          
          <div style="background-color:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-weight:600;width:100px;border-bottom:1px solid #e5e7eb;">Time</td>
                <td style="padding:8px 0;color:#111827;font-weight:500;border-bottom:1px solid #e5e7eb;">${loginDate}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">IP Address</td>
                <td style="padding:8px 0;color:#111827;font-weight:500;border-bottom:1px solid #e5e7eb;">${ipAddress}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-weight:600;">Location</td>
                <td style="padding:8px 0;color:#111827;font-weight:500;">${location}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color:#FFF1EC;border-left:4px solid #FF5E1A;padding:16px;border-radius:0 8px 8px 0;">
            <p style="color:#8A5A50;margin:0;font-size:13px;line-height:1.5;">
              <strong style="color:#2E1A16;">Security Notice:</strong> If you did not authorize this login, please immediately change your password or contact our partner support team.
            </p>
          </div>
        </div>
        
        <div style="background-color:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            &copy; ${new Date().getFullYear()} MicroStay. All rights reserved.
          </p>
        </div>
      </div>
    `;

    if (resendKey) {
      const targetEmail = isDev ? (process.env.ADMIN_EMAIL || 'adminmotel@gmail.com') : userEmail;
      const resend = new Resend(resendKey);
      
      const { error: resendErr } = await resend.emails.send({
        from: isDev ? 'onboarding@resend.dev' : 'MicroStay Security <noreply@microstay.us>',
        to: targetEmail,
        subject: subjectText,
        html: emailHtml,
      });

      if (resendErr) {
        console.error('Resend API error:', resendErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in send-login-email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
