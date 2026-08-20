import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Safety & Security | MicroStay',
  description: 'Safety & Security for MicroStay.',
};

export default function SafetySecurityPage() {
  const lastUpdated = 'August 19, 2026';

  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black text-foreground transition-colors duration-300">
      {/* Header */}
      <div className="bg-orange-300 dark:bg-gradient-to-tl dark:from-black dark:to-ms-orange dark:via-black py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-ms-orange dark:text-white">
          <h1 className="text-4xl font-bold mb-3">Safety & Security</h1>
          {lastUpdated && <p className="text-orange-900 dark:text-white/40">Last updated: {lastUpdated}</p>}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700 dark:text-gray-300 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-ms-text dark:[&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-ms-text dark:[&>h3]:text-gray-100 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_a]:text-ms-orange hover:[&_a]:text-ms-orange-hover [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white">
        <p>MicroStay seeks to maintain a responsible lodging marketplace connecting guests with independently operated participating properties.</p>
        <p>Safety is a shared responsibility among MicroStay, participating properties, guests, and appropriate public authorities.</p>
        <h2>1. Emergencies</h2>
        <p>MicroStay is not an emergency service.</p>
        <p>If you believe that you or another person is in immediate danger, experiencing a medical emergency, witnessing a crime in progress, or facing another urgent safety situation:</p>
        <p>Call 911 or the appropriate local emergency authority immediately.</p>
        <p>Guests should also notify property management or onsite staff when appropriate.</p>
        <p>Do not wait for an email response from MicroStay in an emergency.</p>
        <h2>2. Participating Property Responsibility</h2>
        <p>Each participating hotel, motel, or lodging property is independently operated.</p>
        <p>The participating property is responsible for the safety and operation of its physical premises, including as applicable:</p>
        <ul><li>guestrooms;</li><li>door locks;</li><li>entrances;</li><li>exits;</li><li>fire and life-safety equipment;</li><li>smoke alarms;</li><li>carbon monoxide devices;</li><li>electrical systems;</li><li>plumbing;</li><li>housekeeping;</li><li>maintenance;</li><li>common areas;</li><li>parking areas under its control;</li><li>onsite employees;</li><li>security procedures; and</li><li>emergency procedures.</li></ul>
        <p>MicroStay does not own, operate, staff, maintain, or physically control participating properties.</p>
        <h2>3. No Physical-Safety Certification</h2>
        <p>MicroStay's publication of a property on the Platform should not be interpreted as a guarantee, certification, or representation that:</p>
        <ul><li>a property is free from all safety hazards;</li><li>every room has been physically inspected by MicroStay;</li><li>every employee has been independently screened by MicroStay;</li><li>every guest has been background checked;</li><li>crime cannot occur at a property; or</li><li>a property will remain free of every maintenance or operational problem.</li></ul>
        <p>Participating properties are contractually responsible for maintaining lawful and reasonably safe lodging operations.</p>
        <h2>4. Guest Responsibilities</h2>
        <p>Guests should use reasonable care during their stay.</p>
        <p>Guests should:</p>
        <ul><li>follow lawful property rules;</li><li>secure doors and windows where appropriate;</li><li>protect room keys and access credentials;</li><li>safeguard valuables;</li><li>avoid sharing reservation credentials with unauthorized persons;</li><li>promptly notify property staff of unsafe conditions;</li><li>comply with occupancy restrictions; and</li><li>follow lawful emergency instructions.</li></ul>
        <h2>5. Prohibited Conduct</h2>
        <p>The MicroStay Platform and participating properties may not knowingly be used to facilitate unlawful or dangerous conduct.</p>
        <p>Prohibited conduct includes, as applicable:</p>
        <ul><li>human trafficking;</li><li>commercial sexual exploitation;</li><li>exploitation of minors;</li><li>violence;</li><li>credible threats of violence;</li><li>theft;</li><li>fraud;</li><li>unlawful drug activity;</li><li>intentional property damage;</li><li>harassment;</li><li>unlawful surveillance;</li><li>unauthorized access to another person's room;</li><li>misuse of guest information; or</li><li>other unlawful activity.</li></ul>
        <h2>6. Human Trafficking and Exploitation</h2>
        <p>MicroStay does not tolerate use of the Platform to facilitate human trafficking or exploitation.</p>
        <p>Participating properties are responsible for complying with applicable human-trafficking prevention, employee-training, posting, reporting, and response requirements.</p>
        <p>California law requires qualifying hotel and motel employers to provide human-trafficking awareness training to employees likely to interact with potential victims.</p>
        <p>MicroStay may suspend, restrict, or terminate a property or user account when reasonably credible information indicates serious unlawful activity or a material safety concern.</p>
        <h2>7. Identification Requirements</h2>
        <p>The primary guest checking in under a MicroStay reservation must be at least 18 years old and must present valid, unexpired government-issued photo identification.</p>
        <p>A participating property may require a higher lawful minimum age.</p>
        <p>The property is responsible for physically verifying identification during check-in.</p>
        <p>MicroStay does not remotely certify a guest's identity merely because a reservation exists.</p>
        <h2>8. Reporting a Non-Emergency Safety Concern</h2>
        <p>A non-emergency safety issue relating to a participating property may be reported to:</p>
        <p>support@microstay.us</p>
        <p>Subject: Safety Concern</p>
        <p>Please provide, where available:</p>
        <ul><li>reservation number;</li><li>property name;</li><li>date;</li><li>description of the issue; and</li><li>relevant supporting information.</li></ul>
        <p>Do not send unnecessary copies of government identification or complete payment-card information.</p>
        <h2>9. Reporting Criminal Conduct</h2>
        <p>MicroStay does not replace law enforcement.</p>
        <p>A person who believes a crime has occurred should contact the appropriate law-enforcement agency.</p>
        <p>MicroStay may preserve and disclose relevant information when legally required or reasonably necessary to respond to lawful legal process, protect safety, prevent fraud, or comply with applicable law.</p>
        <h2>10. Property Complaints</h2>
        <p>MicroStay may review credible complaints concerning matters such as:</p>
        <ul><li>serious safety deficiencies;</li><li>fraud;</li><li>unlawful activity;</li><li>property misrepresentation;</li><li>repeated inability to honor reservations;</li><li>discrimination;</li><li>misuse of guest information; or</li><li>licensing concerns.</li></ul>
        <p>Depending on the circumstances, MicroStay may:</p>
        <ul><li>request additional information;</li><li>contact the participating property;</li><li>restrict bookings;</li><li>temporarily suspend a listing; or</li><li>terminate participation.</li></ul>
        <p>MicroStay's ability to investigate a complaint does not create an obligation to continuously monitor every property or guest.</p>
        <h2>11. Cybersecurity and Account Security</h2>
        <p>MicroStay uses reasonable administrative and technical measures intended to protect the Platform and information processed by MicroStay.</p>
        <p>Users should:</p>
        <ul><li>protect account credentials;</li><li>use secure email accounts;</li><li>avoid sharing one-time authentication codes;</li><li>report suspected account compromise;</li><li>and avoid providing sensitive information to individuals falsely claiming to represent MicroStay.</li></ul>
        <p>Suspected account-security issues may be reported to:</p>
        <p>support@microstay.us</p>
        <h2>12. Privacy</h2>
        <p>MicroStay's handling of personal information is described in the MicroStay Privacy Policy.</p>
        <p>Participating properties independently handle information they collect during physical check-in and the guest's stay.</p>
        <h2>13. Contact</h2>
        <h2>MICROSTAY HOLDINGS LLC</h2>
        <p>d/b/a MicroStay.us</p>
        <p>Email: support@microstay.us</p>
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
