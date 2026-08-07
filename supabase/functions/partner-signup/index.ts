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
    const {
      email,
      password,
      pocFirstName,
      pocLastName,
      phone,
      businessName,
      businessLicenseUrl,
      motelName,
      address,
      city,
      state,
      zipCode,
      motelPhotos,
      agreementVersion,
    } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email.toLowerCase()
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({
          error:
            "An account with this email already exists. Please use a different email or log in.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          name: `${pocFirstName} ${pocLastName}`,
          phone,
        },
      });

    if (authError || !authData.user) {
      console.error("Auth user creation error:", authError);
      return new Response(
        JSON.stringify({
          error: authError?.message || "Failed to create account",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      name: `${pocFirstName} ${pocLastName}`,
      phone,
      role: "vendor",
      requires_password_reset: false,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }

    const { error: appError } = await supabase
      .from("vendor_applications")
      .insert({
        user_id: userId,
        business_name: businessName,
        business_license_url: businessLicenseUrl || "",
        motel_name: motelName,
        address,
        city,
        state,
        zip_code: zipCode,
        contact_phone: phone,
        contact_email: email.toLowerCase(),
        point_of_contact_first_name: pocFirstName,
        point_of_contact_last_name: pocLastName,
        motel_photos: motelPhotos || [],
        agreement_accepted: true,
        agreement_accepted_at: new Date().toISOString(),
        agreement_version: agreementVersion || "1.0",
        signup_stage: "pending_approval",
        status: "pending",
        created_user_id: userId,
      });

    if (appError) {
      console.error("Application insert error:", appError);
      return new Response(
        JSON.stringify({
          error: appError.message || "Failed to submit application",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendKey =
      Deno.env.get("RESEND_API_KEY") || Deno.env.get("Resend_API_KEY");

    if (resendKey) {
      const emailHtml = `
        <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
          <div style='background:#f97316;padding:24px;border-radius:8px 8px 0 0'>
            <h1 style='color:white;margin:0;font-size:20px'>Welcome to MicroStay!</h1>
          </div>
          <div style='background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px'>
            <p style='color:#374151;font-size:16px;line-height:1.5'>Hi ${pocFirstName},</p>
            <p style='color:#374151;font-size:16px;line-height:1.5'>Thank you for applying to partner with MicroStay! Your application for <strong>${motelName}</strong> has been received.</p>
            <div style='background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:16px;margin:20px 0'>
              <p style='color:#166534;margin:0;font-size:14px'><strong>What happens next?</strong></p>
              <ul style='color:#166534;font-size:14px;margin:8px 0 0;padding-left:20px'>
                <li>Our team will review your application within 24-48 hours</li>
                <li>You will receive an email once your application is approved</li>
                <li>After approval, you can log in with the email and password you created</li>
              </ul>
            </div>
            <p style='color:#6b7280;font-size:14px;line-height:1.5'>Your login email: <strong>${email}</strong></p>
            <hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0'>
            <p style='color:#9ca3af;font-size:12px;margin:0'>MicroStay - Hourly Bookings</p>
          </div>
        </div>
      `;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MicroStay <noreply@microstay.us>",
            to: email,
            subject:
              "Your MicroStay Partner Application Has Been Received",
            html: emailHtml,
          }),
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Application submitted successfully",
        userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Partner signup error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
