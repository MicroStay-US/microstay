import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, redirectTo } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      throw new Error("Failed to look up users");
    }

    const user = authData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "If this email exists, a reset link has been sent.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const siteUrl = redirectTo || "https://microstay.us";

    const { data: resetData, error: resetError } =
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email: email,
      });

    if (resetError) {
      console.error("Generate link error:", resetError);
      throw new Error("Failed to generate reset link");
    }

    if (
      !resetData?.properties?.hashed_token
    ) {
      throw new Error("No reset token generated");
    }

    const token = resetData.properties.hashed_token;
    const resetLink = `${siteUrl}/reset-password?token_hash=${encodeURIComponent(token)}&type=recovery`;

    const emailHtml = `
      <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
        <div style='background:#f97316;padding:24px;border-radius:8px 8px 0 0'>
          <h1 style='color:white;margin:0;font-size:20px'>Reset Your Password</h1>
        </div>
        <div style='background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none'>
          <p style='color:#374151;font-size:16px;line-height:1.5'>Hello,</p>
          <p style='color:#374151;font-size:16px;line-height:1.5'>We received a request to reset your MicroStay account password. Click the button below to create a new password:</p>

          <div style='text-align:center;margin:32px 0'>
            <a href='${resetLink}' style='display:inline-block;background:#f97316;color:white;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px'>Reset Password</a>
          </div>

          <p style='color:#6b7280;font-size:14px;line-height:1.5;margin-top:24px'>This link will expire in 24 hours. If you didn't request a password reset, please ignore this email.</p>

          <hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0'>

          <p style='color:#9ca3af;font-size:12px;margin:0'>
            If you're having trouble clicking the link, copy and paste this URL into your browser:<br>
            <span style='word-break:break-all;color:#6b7280'>${resetLink}</span>
          </p>
        </div>
      </div>
    `;

    const resendKey =
      Deno.env.get("Resend_API_KEY") || Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      console.warn("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MicroStay Security <noreply@microstay.us>",
        to: email,
        subject: "Reset Your MicroStay Password",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error("Resend API error:", error);
      throw new Error(`Resend API error: ${error}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password reset email sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-password-reset:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
