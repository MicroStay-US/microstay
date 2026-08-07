import { NextResponse } from 'next/server';
import { AGREEMENT_TEXT, AGREEMENT_VERSION, AGREEMENT_SECTIONS, computeAgreementHash } from '@/lib/agreement-text';

export async function GET() {
  const hash = await computeAgreementHash();
  return NextResponse.json({
    version: AGREEMENT_VERSION,
    text: AGREEMENT_TEXT,
    hash,
    sections: AGREEMENT_SECTIONS,
  });
}
