import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cancellation Policy | MicroStay',
  description: 'Cancellation Policy for MicroStay.',
};

export default function CancellationPolicyPage() {
  const lastUpdated = 'August 19, 2026';

  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black text-foreground transition-colors duration-300">
      {/* Header */}
      <div className="bg-orange-300 dark:bg-gradient-to-tl dark:from-black dark:to-ms-orange dark:via-black py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-ms-orange dark:text-white">
          <h1 className="text-4xl font-bold mb-3">Cancellation Policy</h1>
          {lastUpdated && <p className="text-orange-900 dark:text-white/40">Last updated: {lastUpdated}</p>}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700 dark:text-gray-300 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-ms-text dark:[&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-ms-text dark:[&>h3]:text-gray-100 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_a]:text-ms-orange hover:[&_a]:text-ms-orange-hover [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white">
        <p>This Cancellation Policy applies to reservations made through MicroStay.us, operated by MICROSTAY HOLDINGS LLC d/b/a MicroStay.us ("MicroStay," "we," "us," or "our").</p>
        <p>MicroStay connects guests with independently owned and operated hotels, motels, and other participating lodging properties.</p>
        <p>Under MicroStay's standard model, guests pay the participating property directly. MicroStay does not ordinarily collect or hold the guest's lodging payment.</p>
        <h2>1. Review Cancellation Terms Before Booking</h2>
        <p>Cancellation terms may vary depending on:</p>
        <ul><li>the participating property;</li><li>reservation date;</li><li>selected stay period;</li><li>time remaining before check-in;</li><li>room or rate selected; and</li><li>applicable law.</li></ul>
        <p>Any property-specific cancellation terms displayed during the reservation process form part of the reservation.</p>
        <p>Guests should review those terms before confirming a reservation.</p>
        <h2>2. California 24-Hour Cancellation Right</h2>
        <p>For a reservation for hotel accommodation located in California, California law provides a penalty-free cancellation period of at least 24 hours after the reservation is confirmed when the reservation was made 72 hours or more before the scheduled time of check-in.</p>
        <p>If your reservation qualifies for this statutory cancellation right, you may cancel the reservation during the applicable period without a cancellation penalty.</p>
        <p>If a qualifying reservation is cancelled within this statutory period and money was previously paid, applicable California law requires qualifying amounts to be refunded to the original form of payment within the legally required period.</p>
        <p>Because MicroStay's standard model is pay-at-property, MicroStay ordinarily does not possess lodging funds to refund. If a participating property independently collected an advance payment or qualifying deposit, that property is responsible for processing any refund it is legally required to provide.</p>
        <h2>3. Reservations Made Less Than 72 Hours Before Check-In</h2>
        <p>The California statutory 24-hour cancellation period described above does not automatically apply when a reservation is made less than 72 hours before the scheduled check-in time.</p>
        <p>For those reservations, the cancellation terms disclosed for the reservation and applicable law control.</p>
        <p>This is particularly relevant to same-day, next-day, hourly, daytime, and other short-notice MicroStay reservations.</p>
        <h2>4. How to Cancel</h2>
        <p>Where cancellation functionality is available through MicroStay, guests should cancel using the cancellation option provided in:</p>
        <ul><li>their MicroStay account;</li><li>reservation details page;</li><li>reservation confirmation; or</li><li>another cancellation method made available by MicroStay.</li></ul>
        <p>If online cancellation is unavailable because of a technical problem, contact:</p>
        <p>support@microstay.us</p>
        <p>Include:</p>
        <ul><li>reservation number;</li><li>guest name;</li><li>property name; and</li><li>reservation date.</li></ul>
        <h2>5. Cancellation Confirmation</h2>
        <p>A cancellation is considered completed when MicroStay displays or sends a cancellation confirmation or when the participating property otherwise confirms a valid cancellation.</p>
        <p>Guests should retain the cancellation confirmation for their records.</p>
        <h2>6. Property-Specific Cancellation Terms</h2>
        <p>Outside any non-waivable cancellation right required by law, participating properties may establish lawful cancellation conditions.</p>
        <p>Any cancellation penalty or restriction must be disclosed as required by applicable law before the guest confirms the reservation.</p>
        <p>A participating property may not impose an undisclosed mandatory cancellation charge that conflicts with the reservation terms or applicable law.</p>
        <h2>7. MicroStay Cancellation Fees</h2>
        <p>Under MicroStay's current standard model, MicroStay does not charge guests a separate MicroStay cancellation fee.</p>
        <p>A participating property may have its own lawful cancellation or No-Show policy when properly disclosed during booking.</p>
        <h2>8. No-Shows</h2>
        <p>A reservation may be classified as a No-Show when the guest:</p>
        <ul><li>does not arrive during the permitted check-in period;</li><li>does not properly cancel the reservation; or</li><li>otherwise fails to use the reservation.</li></ul>
        <p>Consequences of a No-Show are governed by the disclosed reservation terms, the participating property's lawful policies, and applicable law.</p>
        <h2>9. Failure to Satisfy Check-In Requirements</h2>
        <p>A participating property may refuse check-in if the primary guest:</p>
        <ul><li>cannot present required government-issued photo identification;</li><li>is below the applicable minimum check-in age;</li><li>presents identification reasonably believed to be invalid or fraudulent;</li><li>materially violates lawful property rules; or</li><li>otherwise fails applicable lawful check-in requirements.</li></ul>
        <p>A refusal of check-in resulting from the guest's failure to satisfy properly disclosed requirements is not necessarily considered a property cancellation.</p>
        <p>Any financial consequence is subject to the applicable reservation terms and law.</p>
        <h2>10. Property Cancellation</h2>
        <p>A participating property may occasionally be unable to honor a reservation because of circumstances such as:</p>
        <ul><li>room or inventory errors;</li><li>maintenance problems;</li><li>safety concerns;</li><li>government restrictions;</li><li>emergency conditions;</li><li>property closure;</li><li>technology failures; or</li><li>circumstances outside reasonable control.</li></ul>
        <p>Where MicroStay becomes aware that a confirmed reservation cannot be honored, MicroStay may attempt to notify the guest.</p>
        <p>Where reasonably possible, MicroStay may also assist the guest in locating another participating property.</p>
        <p>MicroStay does not guarantee that an alternative room, property, stay window, location, or equivalent price will be available.</p>
        <h2>11. Refunds of Property-Collected Payments</h2>
        <p>MicroStay does not ordinarily collect guest lodging payments.</p>
        <p>If a participating property collected money directly from the guest, refunds relating to that payment are ordinarily processed by the participating property.</p>
        <p>MicroStay may assist by confirming information contained in the MicroStay reservation record but cannot refund funds that MicroStay never received or controlled.</p>
        <p>Nothing in this section limits a refund right provided by applicable law.</p>
        <h2>12. Reservation Changes</h2>
        <p>Requests to change:</p>
        <ul><li>date;</li><li>stay window;</li><li>guest information;</li><li>room type; or</li><li>participating property</li></ul>
        <p>are subject to availability and applicable property policies.</p>
        <p>A requested change is not effective until confirmed.</p>
        <h2>13. Contact</h2>
        <p>Questions regarding a MicroStay cancellation may be submitted to:</p>
        <h2>MICROSTAY HOLDINGS LLC</h2>
        <p>d/b/a MicroStay.us</p>
        <p>Email: support@microstay.us</p>
        <p>Subject: Reservation Cancellation</p>
        <p>Website: MicroStay.us</p>

        <div className="mt-12 pt-8 border-t flex justify-between border-gray-200 dark:border-gray-800 text-start">
          <Link href="/" className="text-ms-orange hover:text-ms-orange-hover transition-colors font-medium">
            &larr; Back to MicroStay
          </Link>
        </div>
      </div>
    </div>
  );
}
