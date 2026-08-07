import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | MicroStay',
  description: 'Terms and conditions for using the MicroStay hourly booking platform.',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'April 8, 2026';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-ms-text to-ms-orange py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
          <p className="text-white/80">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 prose prose-gray prose-headings:text-gray-900 prose-a:text-orange-600">

        <p className="text-gray-600 text-lg">
          Welcome to MicroStay. By accessing or using our platform at <strong>microstay.us</strong>,
          you agree to be bound by these Terms of Service. Please read them carefully.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or making a booking, you represent that you are at least 18 years old
          and have the legal capacity to enter into a binding contract. If you do not agree to these
          Terms, do not use MicroStay.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          MicroStay is an online marketplace that connects guests with motel and lodging properties
          offering hourly or short-duration room rentals ("MicroStays"). MicroStay is a technology
          platform only — we do not own, operate, or manage any of the listed properties.
        </p>

        <h2>3. User Accounts</h2>
        <ul>
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You must notify us immediately of any unauthorized account access.</li>
          <li>You may not share your account with others or create accounts on behalf of third parties.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
        </ul>

        <h2>4. Bookings and Payments</h2>
        <ul>
          <li>All bookings are subject to property availability and vendor confirmation.</li>
          <li>Prices are displayed in US Dollars and include applicable platform fees.</li>
          <li>Payment is processed at the time of booking via our payment processor (Stripe).</li>
          <li>
            <strong>Cancellations:</strong> Cancellation and refund policies vary by property. The
            policy applicable to your booking is displayed before checkout. MicroStay is not responsible
            for vendor-level cancellation policies.
          </li>
          <li>No-shows may result in forfeiture of the full booking amount.</li>
        </ul>

        <h2>5. Guest Conduct</h2>
        <p>As a guest, you agree to:</p>
        <ul>
          <li>Use booked rooms only for their intended lawful purpose.</li>
          <li>Comply with all property rules and local laws.</li>
          <li>Vacate the property by the scheduled check-out time.</li>
          <li>Not engage in illegal activities, disruptive behavior, or cause damage to the property.</li>
          <li>Not exceed the maximum occupancy for the booked room.</li>
        </ul>
        <p>
          Violations may result in immediate removal, account suspension, and you may be held liable for
          any damages caused.
        </p>

        <h2>6. Vendor Terms</h2>
        <p>
          Property vendors are bound by a separate Partner Agreement signed during onboarding. Key points:
        </p>
        <ul>
          <li>Vendors must ensure their listings are accurate, complete, and up to date.</li>
          <li>Vendors must honor confirmed bookings.</li>
          <li>MicroStay charges a platform fee per completed booking as detailed in the Partner Agreement.</li>
          <li>Vendors may not circumvent the platform to arrange direct payments with guests for stays
              found through MicroStay.</li>
        </ul>

        <h2>7. Intellectual Property</h2>
        <p>
          The MicroStay name, logo, and all platform content (excluding user-generated content) are owned
          by MicroStay, Inc. and protected by U.S. and international copyright and trademark laws. You may
          not reproduce, distribute, or create derivative works without our prior written consent.
        </p>

        <h2>8. Disclaimer of Warranties</h2>
        <p>
          THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
          IMPLIED. MICROSTAY DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
          FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, MICROSTAY SHALL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS OR DATA,
          ARISING FROM YOUR USE OF THE PLATFORM, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO MICROSTAY
          IN THE 12 MONTHS PRECEDING THE CLAIM.
        </p>

        <h2>10. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless MicroStay, its officers, directors, employees, and
          agents from any claims, damages, or expenses (including reasonable attorney's fees) arising
          from your use of the platform, your violation of these Terms, or your violation of any rights
          of another party.
        </p>

        <h2>11. Governing Law and Disputes</h2>
        <p>
          These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law
          principles. Any disputes shall be resolved through binding arbitration under the rules of the
          American Arbitration Association, except that either party may seek injunctive relief in any
          court of competent jurisdiction.
        </p>

        <h2>12. Changes to Terms</h2>
        <p>
          We may modify these Terms at any time. Continued use of the platform after changes are posted
          constitutes your acceptance of the revised Terms. We will provide notice of material changes
          via email or a banner on the site.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions about these Terms?<br />
          <strong>MicroStay, Inc.</strong><br />
          {/* Email: <a href="mailto:legal@microstay.us">legal@microstay.us</a><br /> */}
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
