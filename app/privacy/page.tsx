import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | MicroStay',
  description: 'How MicroStay collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'April 8, 2026';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-ms-text to-ms-orange py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-white/80">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 prose prose-gray prose-headings:text-gray-900 prose-a:text-orange-600">

        <p className="text-gray-600 text-lg">
          MICROSTAY HOLDINGS LLC d/b/a MicroStay.us ("MicroStay," "we," "us," or "our") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information
          when you use our website at <strong>microstay.us</strong> and our related services.
        </p>

        <h2>1. Information We Collect</h2>
        <h3>Information You Provide</h3>
        <ul>
          <li><strong>Account registration:</strong> name, email address, phone number, and password.</li>
          <li><strong>Bookings:</strong> guest name, contact information, check-in/check-out time, booking reference, selected property, selected room/time window, and booking status. MicroStay does not collect or store guest card payment information for pay-at-property bookings</li>
          <li><strong>Vendor applications:</strong> business name, address, owner details, tax information, and supporting documents.</li>
          <li><strong>Communications:</strong> messages you send through our platform or to our support team.</li>
        </ul>

        <h3>Information Collected Automatically</h3>
        <ul>
          <li>IP address, browser type, device type, and operating system.</li>
          <li>Pages visited, time spent, referring URLs, and click-stream data.</li>
          <li>Cookies and similar tracking technologies (see Section 6).</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li><strong>For Customers:</strong> Process and confirm booking information (customers pay the motel directly).</li>
          <li><strong>For Vendors:</strong> Process platform commission payments through Stripe.</li>
          <li>Create and manage your account.</li>
          <li>Communicate booking confirmations, receipts, and support responses.</li>
          <li>Send marketing communications (only with your consent, and you may opt out at any time).</li>
          <li>Detect fraud, abuse, and security threats.</li>
          <li>Comply with legal obligations.</li>
          <li>Improve our platform and develop new features.</li>
        </ul>

        <h2>3. Sharing Your Information</h2>
        <p>We do <strong>not</strong> sell your personal information. We may share it with:</p>
        <ul>
          <li><strong>Property vendors:</strong> your first name, booking details, and check-in code are shared with the motel/property you book.</li>
          <li><strong>Payment processors:</strong> Stripe processes payments; their privacy policy applies to payment data.</li>
          <li><strong>Service providers:</strong> email delivery (Resend), error monitoring (Sentry), analytics — all bound by confidentiality agreements.</li>
          <li><strong>Law enforcement:</strong> when required by law or valid legal process.</li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active, plus 7 years for financial
          records (as required by U.S. tax law). You may request deletion of your account and associated
          {/* data at any time by emailing <a href="mailto:privacy@microstay.us">privacy@microstay.us</a>. */}
        </p>

        <h2>5. Your Rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate data.</li>
          <li>Request deletion ("right to be forgotten").</li>
          <li>Object to or restrict processing.</li>
          <li>Data portability.</li>
          <li>Withdraw consent at any time (this does not affect prior lawful processing).</li>
        </ul>
        {/* <p>
          To exercise these rights, contact us at{' '}
          <a href="mailto:privacy@microstay.us">privacy@microstay.us</a>.
        </p> */}

        <h2>6. Cookies</h2>
        <p>We use the following types of cookies:</p>
        <ul>
          <li><strong>Essential:</strong> authentication session tokens — required for the platform to function.</li>
          <li><strong>Analytics:</strong> aggregate, anonymized usage data to improve the product.</li>
        </ul>
        <p>
          You can control cookies through your browser settings. Disabling essential cookies will
          prevent you from logging in.
        </p>

        <h2>7. Security</h2>
        <p>
          We implement industry-standard safeguards including TLS encryption in transit, encrypted
          storage at rest via Supabase (hosted on AWS), row-level security policies, and regular
          security audits. No method of transmission is 100% secure; we cannot guarantee absolute security.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          MicroStay is not directed to children under 18. We do not knowingly collect data from minors.
          If you believe we have done so inadvertently, please contact us immediately.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this policy periodically. When we do, we will revise the "last updated" date at
          the top and, for material changes, notify you via email or a prominent banner on the site.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          Questions about this policy? Reach us at:<br />
          <strong>MICROSTAY HOLDINGS LLC d/b/a MicroStay.us</strong><br />
          {/* Email: <a href="mailto:privacy@microstay.us">privacy@microstay.us</a><br /> */}
          Support: <a href="mailto:support@microstay.us">support@microstay.us</a>
        </p>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium">
            ← Back to MicroStay
          </Link>
        </div>
      </div>
    </div>
  );
}
