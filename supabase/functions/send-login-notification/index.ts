import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { userId, userEmail, ipAddress, city, country, region, userAgent, loginTime } = await req.json();

    const loginDate = new Date(loginTime).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const location = [city, region, country].filter(Boolean).join(', ');

    // Fetch user profile to get role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    let role = 'customer';
    
    if (supabaseUrl && supabaseAnonKey && userId) {
      try {
        const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });
        const profiles = await profileRes.json();
        if (profiles && profiles.length > 0 && profiles[0].role) {
          role = profiles[0].role;
        }
      } catch (err) {
        console.error('Failed to fetch profile role:', err);
      }
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

    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (resendKey) {
      // In dev mode on the edge function, we might want to route to team@microstay.us to bypass sandbox
      // But Edge Functions don't have NODE_ENV. Let's just use the URL to guess if it's dev.
      const isDev = !supabaseUrl.includes('supabase.co');
      const targetEmail = isDev ? 'admin@microstay.us' : userEmail;

      let fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || (isDev ? 'onboarding@resend.dev' : 'MicroStay Security <no-reply@microstay.us>');

      let resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: targetEmail,
          subject: subjectText,
          html: emailHtml,
        })
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        console.warn('First login notification email send attempt failed:', errorText);

        let isDomainError = false;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message && (
            errorJson.message.toLowerCase().includes("domain") ||
            errorJson.message.toLowerCase().includes("not verified") ||
            errorJson.statusCode === 400
          )) {
            isDomainError = true;
          }
        } catch {
          if (errorText.toLowerCase().includes("domain") || errorText.toLowerCase().includes("verified")) {
            isDomainError = true;
          }
        }

        if (isDomainError && !fromEmail.includes("onboarding@resend.dev")) {
          console.log("Domain verification error in login notification. Retrying with onboarding@resend.dev...");
          fromEmail = "onboarding@resend.dev";
          resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromEmail,
              to: targetEmail,
              subject: subjectText + " (Fallback)",
              html: emailHtml,
            })
          });
        }
      }

      if (!resendResponse.ok) {
        const error = await resendResponse.text();
        console.error('Resend API error in login notification:', error);
      }
    } else {
      console.log('Login notification (no email provider configured):', {
        userEmail,
        ipAddress,
        location,
        time: loginDate
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Login notification processed' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-login-notification:', error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
