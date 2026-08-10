import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { requireVerifiedVendor, AnySupabaseClient } from '@/lib/vendor-auth-server';
import {
  AGREEMENT_TEXT,
  AGREEMENT_VERSION,
  AGREEMENT_SECTIONS,
  computeAgreementHash,
} from '@/lib/agreement-text';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { mintSignedAgreementUrl } from '@/lib/signed-pdf';

function escapeStr(val: unknown): string {
  return String(val ?? '').replace(/[<>&"']/g, '').trim();
}

/**
 * Replace Unicode characters that WinAnsi (pdf-lib StandardFonts) cannot encode.
 * Covers smart quotes, dashes, ellipsis, bullets, and other common symbols.
 */
function toWinAnsi(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")   // ' '  → '
    .replace(/[\u201C\u201D]/g, '"')   // " "  → "
    .replace(/\u2014/g, '--')          // —    → --
    .replace(/\u2013/g, '-')           // –    → -
    .replace(/\u2026/g, '...')         // …    → ...
    .replace(/\u2022/g, '*')           // •    → *
    .replace(/\u00A0/g, ' ')           // NBSP → space
    .replace(/\u2500/g, '-')           // ─    → -
    .replace(/\u2501/g, '-')           // ━    → -
    .replace(/[\u2502-\u257F]/g, '|') // box-drawing → |
    .replace(/\u00AE/g, '(R)')         // ®    → (R)
    .replace(/\u00A9/g, '(C)')         // ©    → (C)
    .replace(/\u2122/g, '(TM)')        // ™    → (TM)
    .replace(/\u00B0/g, ' deg')        // °    → deg
    .replace(/[^\x00-\xFF]/g, '?');    // anything else outside Latin-1 → ?
}

/** Wrap long text into lines of maxWidth characters */
function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxWidth) {
      lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

async function generateSignedPDF(params: {
  agreementText: string;
  agreementHash: string;
  typedSignature: string;
  signedAt: string;
  ipAddress: string;
  userAgent: string;
  vendorEmail: string;
  exhibitA: Record<string, string | number | null>;
}): Promise<Uint8Array> {
  const { agreementText, agreementHash, typedSignature, signedAt, ipAddress, userAgent, vendorEmail, exhibitA } = params;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 10;
  const lineHeight = 14;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const usableWidth = pageWidth - margin * 2;
  const maxCharsPerLine = Math.floor(usableWidth / (fontSize * 0.55));





  // COLORS ADDED
  const COLORS = {
    primary: rgb(1, 0.45, 0),          // Main headings
    primaryDark: rgb(0.85, 0.32, 0),   // Sub-headings
    primaryLight: rgb(1, 0.92, 0.85),  // Highlight boxes

    text: rgb(0.12, 0.12, 0.12),       // Main agreement text
    secondaryText: rgb(0, 0, 0), // Notes/version/footer

    border: rgb(0.85, 0.85, 0.85),
    white: rgb(1, 1, 1),
  };

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const nextPage = () => {
    // Footer on current page
    page.drawText(
      toWinAnsi(`Electronically signed under E-SIGN Act 15 U.S.C. SS 7001 - MicroStay Partner Agreement ${AGREEMENT_VERSION}`),
      { x: margin, y: 20, size: 7, font, color: COLORS.secondaryText }
    );
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const drawLine = (
    text: string,
    fnt = font,
    size = fontSize,
    color = COLORS.text,
    align: 'left' | 'center' | 'right' = 'left'
  ) => {
    if (y < margin + lineHeight * 3) nextPage();

    const cleanText = toWinAnsi(text);
    const textWidth = fnt.widthOfTextAtSize(cleanText, size);

    let x = margin;

    if (align === 'center') {
      x = (pageWidth - textWidth) / 2;
    } else if (align === 'right') {
      x = pageWidth - margin - textWidth;
    }

    page.drawText(cleanText, {
      x,
      y,
      size,
      font: fnt,
      color,
    });

    y -= lineHeight;
  };

  const drawBlank = () => { y -= lineHeight / 2; };

  // --- Title ---
  drawLine(
  'MICROSTAY PARTNER AGREEMENT',
  fontBold,
  18,
  COLORS.primary,
  'center'
);

drawLine(
  `Version ${AGREEMENT_VERSION}`,
  font,
  10,
  COLORS.secondaryText,
  'center'
);

drawLine(
  'SIGNED COPY',
  fontBold,
  12,
  COLORS.primaryDark,
  'center'
);
  drawBlank();

  // --- Signature Block (first) ---
  drawLine(
  'SIGNATURE BLOCK',
  fontBold,
  13,
  COLORS.primary
);
  drawLine(`Signed by:        ${typedSignature}`, fontBold, 11, rgb(0.8, 0.1, 0.1));
  drawLine(`Vendor Email:     ${vendorEmail}`);
  drawLine(`Timestamp (UTC):  ${signedAt}`);
  drawLine(`IP Address:       ${ipAddress}`);
  drawLine(
    `Agreement Ver.: ${AGREEMENT_VERSION}`,
    font,
    10,
    COLORS.secondaryText
  );
  drawLine(`SHA-256 Hash:     ${agreementHash}`);
  drawBlank();

  // --- Exhibit A ---
  drawLine('EXHIBIT A — PROPERTY INFORMATION', fontBold, 11, COLORS.primary);
  const exhibitFields: [string, string][] = [
    ['Legal Business Name', String(exhibitA.legal_business_name ?? '')],
    ['DBA Name', String(exhibitA.dba_name ?? '')],
    ['Property Address', String(exhibitA.property_address ?? '')],
    ['City', String(exhibitA.city ?? '')],
    ['State', String(exhibitA.state ?? '')],
    ['ZIP', String(exhibitA.zip ?? '')],
    ['Motel License #', String(exhibitA.motel_license_number ?? '')],
    ['Business License #', String(exhibitA.business_license_number ?? '')],
    ['State Tax ID', String(exhibitA.state_tax_id ?? '')],
    ['Federal EIN', String(exhibitA.federal_ein ?? '')],
    ['Contact Name', String(exhibitA.contact_name ?? '')],
    ['Contact Phone', String(exhibitA.contact_phone ?? '')],
    ['Contact Email', String(exhibitA.contact_email ?? '')],
    ['Insurance Carrier', String(exhibitA.insurance_carrier ?? '')],
    ['Insurance Policy #', String(exhibitA.insurance_policy_number ?? '')],
    ['Insurance Expiry', String(exhibitA.insurance_expiry ?? '')],
    ['Rooms Available', String(exhibitA.rooms_available ?? '')],
    ['Hourly Rate Min', `$${exhibitA.hourly_rate_min ?? ''}`],
    ['Hourly Rate Max', `$${exhibitA.hourly_rate_max ?? ''}`],
  ];
  for (const [label, value] of exhibitFields) {
  drawLine(
    `${label.padEnd(22)}: ${value}`,
    font,
    10,
    COLORS.text
  )
  }
  drawBlank();

  // --- Agreement Text ---
  drawLine('FULL AGREEMENT TEXT', fontBold, 11, COLORS.primary);
  drawBlank();

  const rawLines = agreementText.split('\n');
// Changed pdf format color from here
const renderedHeadings = new Set<string>();

for (const rawLine of rawLines) {
  const line = rawLine.trim();

  if (!line) {
    drawBlank();
    continue;
  }

  // MAIN SECTION HEADINGS
  // Example:
  // RECITALS & AGREEMENT TO TERMS
  // IMPORTANT LEGAL NOTICE
  if (
    /^[A-Z][A-Z\s&\-]{5,}$/.test(line) &&
    !/^\d+\./.test(line) &&
    !renderedHeadings.has(line)
  ) {
    renderedHeadings.add(line);

    drawBlank();

    drawLine(
      line,
      fontBold,
      13,
      COLORS.primary
    );

    continue;
  }

  // SUB SECTION HEADINGS
  // Example:
  // 1. PLATFORM AS MARKETPLACE — INDEPENDENT TECHNOLOGY PROVIDER
  // 2. PARTNER ELIGIBILITY & REPRESENTATIONS
  if (
    /^\d+\.\s+[A-Z]/.test(line) &&
    !renderedHeadings.has(line)
  ) {
    renderedHeadings.add(line);

    drawBlank();

    drawLine(
      line,
      fontBold,
      11,
      COLORS.primary
    );

    continue;
  }

  // Separators
  if (/^[━─\-]{3,}/.test(line)) {
    drawLine(
      '-'.repeat(85),
      font,
      8,
      COLORS.border
    );
    continue;
  }

  // Normal text
  const wrapped = wrapText(line, maxCharsPerLine);

  for (const wl of wrapped) {
    drawLine(
      wl,
      font,
      10,
      COLORS.secondaryText
    );
  }
}

  // --- Final signature footer ---
  if (y < margin + lineHeight * 8) nextPage();
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= lineHeight;
  drawLine(
    `Signed: ${typedSignature}`,
    fontBold,
    12,
    COLORS.primary
  );
  drawLine(`Date: ${signedAt}`);
  drawLine(`IP: ${ipAddress}`);
  drawLine(`UA: ${userAgent.substring(0, 80)}`);
  drawLine(
    `Electronically signed under E-SIGN Act 15 U.S.C. § 7001`,
    font,
    8,
    rgb(0.4, 0.4, 0.4)
  );

  // Footer on last page
  page.drawText(
    toWinAnsi(`Electronically signed under E-SIGN Act 15 U.S.C. SS 7001 - MicroStay Partner Agreement ${AGREEMENT_VERSION}`),
    { x: margin, y: 20, size: 7, font, color: rgb(0.5, 0.5, 0.5) }
  );

  return pdfDoc.save();
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('agreement-sign:' + ip, 5, 10 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  const auth = await requireVerifiedVendor(req);
  if (auth.error) return auth.error;
  const { vendor, serviceClient: svc }: { vendor: any; serviceClient: AnySupabaseClient; error: null } = auth as any;

  try {
    const body = await req.json();
    const {
      typed_signature,
      scroll_completed,
      document_viewed_at,
      arbitration_acknowledged,
      class_action_waiver_acknowledged,
      client_ip,
    } = body ?? {};

    // Validate required fields
    if (!typed_signature || typeof typed_signature !== 'string' || !typed_signature.trim()) {
      return NextResponse.json({ error: 'Typed signature is required.' }, { status: 400 });
    }
    if (!arbitration_acknowledged || !class_action_waiver_acknowledged) {
      return NextResponse.json(
        { error: 'Both arbitration and class action waiver acknowledgements are required.' },
        { status: 400 }
      );
    }
    if (!scroll_completed) {
      return NextResponse.json(
        { error: 'You must scroll through and read the entire agreement.' },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get('user-agent') || '';
    const rawIp = client_ip || getIP(req);
    // Only store if it looks like a real IP; otherwise store null
    const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]{3,39}$/;
    const ipAddress = IP_REGEX.test(rawIp) ? rawIp : null;
    const signedAt = new Date().toISOString();

    const agreementHash = await computeAgreementHash();

    // Check for duplicate signature — return existing details so frontend can advance
    const { data: existing } = await svc
      .from('agreement_signatures')
      .select('id, signed_pdf_path, signed_pdf_url')
      .eq('vendor_id', vendor.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: 'Agreement already signed for this account.',
          signatureId: existing.id,
          signedPdfUrl: await mintSignedAgreementUrl(svc, existing),
        },
        { status: 409 }
      );
    }

    // Fetch Exhibit A data
    const { data: propData } = await svc
      .from('vendor_properties')
      .select('*')
      .eq('vendor_id', vendor.id)
      .maybeSingle();

    // Generate PDF
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const pdfBytes = await generateSignedPDF({
      agreementText: AGREEMENT_TEXT,
      agreementHash,
      typedSignature: escapeStr(typed_signature),
      signedAt,
      ipAddress,
      userAgent,
      vendorEmail: vendor.email,
      exhibitA: propData ?? {},
    });

    // Upload PDF to Supabase Storage (private bucket; we store the path and
    // generate signed URLs on demand — see lib/signed-pdf.ts).
    const signedPdfPath = `${vendor.id}/${Date.now()}_agreement_v2.pdf`;
    const { error: uploadErr } = await svc.storage
      .from('signed-agreements')
      .upload(signedPdfPath, pdfBytes, { contentType: 'application/pdf' });

    if (uploadErr) {
      console.error('PDF upload error:', uploadErr.message);
    }

    // Insert immutable signature record
    const { data: sigRecord, error: sigErr } = await svc
      .from('agreement_signatures')
      .insert({
        vendor_id: vendor.id,
        agreement_version: AGREEMENT_VERSION,
        agreement_text_hash: agreementHash,
        typed_signature: escapeStr(typed_signature),
        signed_at: signedAt,
        ip_address: ipAddress,
        user_agent: userAgent,
        scroll_completed: !!scroll_completed,
        document_viewed_at: document_viewed_at || null,
        arbitration_acknowledged: !!arbitration_acknowledged,
        class_action_waiver_acknowledged: !!class_action_waiver_acknowledged,
        signed_pdf_path: uploadErr ? null : signedPdfPath,
      })
      .select('id, signed_pdf_path')
      .single();

    if (sigErr) {
      throw new Error(`Signature insert failed: ${sigErr.message}`);
    }
    

    return NextResponse.json({
      success: true,
      signatureId: sigRecord.id,
      signedPdfUrl: await mintSignedAgreementUrl(svc, sigRecord),
    });
  } catch (err: any) {
    console.error('Sign agreement error:', err);
    return NextResponse.json({ error: 'Failed to sign agreement' }, { status: 500 });
  }
}
