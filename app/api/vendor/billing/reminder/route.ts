import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Get invoice
    const { data: invoice, error: invoiceError } =
      await supabaseAdmin
        .from("invoices")
        .select(`
          id,
          vendor_id,
          invoice_period,
          total_due,
          status,
          payment_status,
          due_date,
          stripe_hosted_invoice_url
        `)
        .eq("id", invoiceId)
        .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Don't send reminder if already paid
    if (
      invoice.payment_status === "paid" ||
      invoice.status === "paid"
    ) {
      return NextResponse.json(
        { error: "Invoice is already paid" },
        { status: 400 }
      );
    }

    // Get vendor
    const { data: vendor, error: vendorError } =
      await supabaseAdmin
        .from("vendors")
        .select("id, email, business_name")
        .eq("id", invoice.vendor_id)
        .single();

    if (vendorError || !vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // -------------------------------
    // PENALTY CALCULATION
    // -------------------------------

    const day = new Date().getDate();

    let penaltyPercent = 0;

    if (day >= 15) {
      penaltyPercent = 25;
    } else if (day >= 10) {
      penaltyPercent = 10;
    } else {
      penaltyPercent = 0;
    }

    const baseAmount = Number(invoice.total_due);

    const penaltyAmount =
      baseAmount * (penaltyPercent / 100);

    const finalAmount =
      baseAmount + penaltyAmount;

    // -------------------------------
    // SEND EMAIL
    // -------------------------------

    await resend.emails.send({
      from: "MicroStay <onboarding@resend.dev>",
      to: vendor.email,
      subject: `Payment Reminder - ${invoice.invoice_period}`,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
        ">

          <h2>MicroStay Payment Reminder</h2>

          <p>
            Hello ${vendor.business_name || "Vendor"},
          </p>

          <p>
            This is a reminder that your invoice
            is currently unpaid.
          </p>

          <table
            style="
              width:100%;
              border-collapse:collapse;
              margin:20px 0;
            "
          >

            <tr>
              <td style="padding:10px;border:1px solid #ddd;">
                Invoice Period
              </td>

              <td style="padding:10px;border:1px solid #ddd;">
                ${invoice.invoice_period}
              </td>
            </tr>

            <tr>
              <td style="padding:10px;border:1px solid #ddd;">
                Original Amount
              </td>

              <td style="padding:10px;border:1px solid #ddd;">
                $${baseAmount.toFixed(2)}
              </td>
            </tr>

            <tr>
              <td style="padding:10px;border:1px solid #ddd;">
                Penalty
              </td>

              <td style="padding:10px;border:1px solid #ddd;">
                ${penaltyPercent}%
                ($${penaltyAmount.toFixed(2)})
              </td>
            </tr>

            <tr>
              <td style="padding:10px;border:1px solid #ddd;">
                <strong>Total Payable</strong>
              </td>

              <td style="padding:10px;border:1px solid #ddd;">
                <strong>
                  $${finalAmount.toFixed(2)}
                </strong>
              </td>
            </tr>

          </table>

          ${
            invoice.stripe_hosted_invoice_url
              ? `
                <a
                  href="${invoice.stripe_hosted_invoice_url}"
                  style="
                    display:inline-block;
                    padding:12px 25px;
                    background:#f97316;
                    color:white;
                    text-decoration:none;
                    border-radius:6px;
                    font-weight:bold;
                  "
                >
                  Pay Invoice
                </a>
              `
              : ""
          }

          <p style="margin-top:25px;">
            Please complete your payment to avoid
            additional penalties.
          </p>

          <p>
            Regards,<br>
            MicroStay Billing Team
          </p>

        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      penalty_percent: penaltyPercent,
      penalty_amount: penaltyAmount,
      final_amount: finalAmount,
    });

  } catch (error) {
    console.error("Reminder error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send reminder",
      },
      { status: 500 }
    );
  }
}
