import { Metadata } from 'next';
import { Suspense } from 'react';
import TermsOfServiceContent from './TermsOfServiceContent';

export const metadata: Metadata = {
  title: 'Terms of Service & Policies | MicroStay',
  description: 'Read the Terms of Service, Cancellation Policy, Accessibility Policy, Safety Guidelines, and California Property Requirements for MicroStay.',
};

export default function TermsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100/50 dark:bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ms-orange"></div>
        </div>
      }
    >
      <TermsOfServiceContent />
    </Suspense>
  );
}
