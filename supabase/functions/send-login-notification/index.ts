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

    const emailHtml = `
      <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
        <div style='background:#f97316;padding:24px;border-radius:8px 8px 0 0'>
          <h1 style='color:white;margin:0;font-size:20px'>New Login to MicroStay</h1>
        </div>
        <div style='background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none'>
          <p style='color:#374151'>We noticed a new sign-in to your MicroStay account.</p>
          <table style='width:100%;border-collapse:collapse;margin:16px 0'>
            <tr><td style='padding:8px;background:#f9fafb;font-weight:bold;color:#374151'>Time</td>
                <td style='padding:8px;color:#374151'>${loginDate}</td></tr>
            <tr><td style='padding:8px;font-weight:bold;color:#374151'>IP Address</td>
                <td style='padding:8px;color:#374151'>${ipAddress}</td></tr>
            <tr><td style='padding:8px;background:#f9fafb;font-weight:bold;color:#374151'>Location</td>
                <td style='padding:8px;color:#374151'>${location}</td></tr>
          </table>
          <div style='background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin-top:16px'>
            <p style='color:#92400e;margin:0;font-size:14px'>
              <strong>Not you?</strong> If you did not sign in, please
              <a href='https://microstay.us/reset-password' style='color:#b45309'>reset your password immediately</a>.
            </p>
          </div>
        </div>
      </div>
    `;

    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (resendKey) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'MicroStay Security <noreply@microstay.us>',
          to: userEmail,
          subject: 'New login to your MicroStay account',
          html: emailHtml,
        })
      });

      if (!resendResponse.ok) {
        const error = await resendResponse.text();
        console.error('Resend API error:', error);
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
