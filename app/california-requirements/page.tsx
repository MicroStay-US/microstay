import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'California Property Requirements | MicroStay',
  description: 'California Property Requirements for MicroStay.',
};

export default function CaliforniaPropertyRequirementsPage() {
  const lastUpdated = 'August 19, 2026';

  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black text-foreground transition-colors duration-300">
      {/* Header */}
      <div className="bg-orange-300 dark:bg-gradient-to-tl dark:from-black dark:to-ms-orange dark:via-black py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-ms-orange dark:text-white">
          <h1 className="text-4xl font-bold mb-3">California Property Requirements</h1>
          {lastUpdated && <p className="text-orange-900 dark:text-white/40">Last updated: {lastUpdated}</p>}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700 dark:text-gray-300 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-ms-text dark:[&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-ms-text dark:[&>h3]:text-gray-100 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_a]:text-ms-orange hover:[&_a]:text-ms-orange-hover [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white">
        <p>This policy applies to hotels, motels, and other lodging properties located in California that participate or seek to participate on MicroStay.us.</p>
        <p>The requirements below supplement the MicroStay Partner Agreement.</p>
        <p>They are not intended to provide an exhaustive statement of every federal, state, county, municipal, zoning, licensing, fire, building, tax, privacy, accessibility, or lodging requirement applicable to a particular property.</p>
        <p>Each participating property remains independently responsible for determining and complying with the laws applicable to its location and operations.</p>
        <h2>1. Lawful Lodging Operation</h2>
        <p>Every participating California property must be legally authorized to operate as the type of lodging establishment represented on MicroStay.</p>
        <p>The Partner is responsible for maintaining applicable:</p>
        <ul><li>business licenses;</li><li>hotel or motel permits;</li><li>occupancy approvals;</li><li>tax registrations;</li><li>zoning approvals;</li><li>fire and life-safety approvals;</li><li>health or operational permits; and</li><li>other governmental authorizations.</li></ul>
        <h2>2. Short-Duration and Hourly Stays</h2>
        <p>A property must independently determine whether the stay periods it offers through MicroStay are lawful at its specific location.</p>
        <p>This includes:</p>
        <ul><li>hourly stays;</li><li>daytime stays;</li><li>short-duration stays;</li><li>evening stays;</li><li>sub-12-hour stays; and</li><li>other flexible-duration lodging.</li></ul>
        <p>California properties must also review applicable city and county requirements because local rules may impose requirements beyond statewide law.</p>
        <p>MicroStay's activation or publication of a property does not constitute a legal determination that a particular stay duration is lawful at that property.</p>
        <h2>3. Government-Issued Identification</h2>
        <p>Participating properties must perform any identification checks required by applicable law and MicroStay's Partner Agreement.</p>
        <p>For MicroStay reservations, the primary guest must present a valid, unexpired government-issued photo identification document at check-in.</p>
        <p>The participating property is responsible for physically inspecting the identification.</p>
        <h2>4. Minimum Check-In Age</h2>
        <p>MicroStay requires the primary guest to be at least 18 years old.</p>
        <p>A participating property may impose a higher lawful minimum age, including 21 years or older.</p>
        <p>Any higher requirement should be accurately disclosed to MicroStay so that it can be communicated to guests.</p>
        <h2>5. Guest Registers and Recordkeeping</h2>
        <p>A property must maintain guest registers, identification records, lodging records, and other information for the periods required by applicable state and local law.</p>
        <p>Local requirements may impose additional obligations, particularly for short-duration or sub-12-hour rentals.</p>
        <p>Each property is responsible for identifying and complying with those requirements.</p>
        <h2>6. Smoke Alarms</h2>
        <p>Participating properties must install, test, and maintain smoke alarms where required by California law and applicable fire or building codes.</p>
        <p>California law places responsibilities on hotel and motel owners concerning testing and maintaining required smoke alarms.</p>
        <p>MicroStay does not inspect or certify each property's smoke-alarm system.</p>
        <h2>7. Carbon Monoxide Devices</h2>
        <p>Where California law requires carbon monoxide devices, participating properties must install and maintain approved devices.</p>
        <p>California Health and Safety Code §17926 includes existing hotel and motel dwelling units within applicable carbon-monoxide-device requirements where statutory conditions are met.</p>
        <p>The property is responsible for determining the number, location, type, installation, inspection, and maintenance requirements applicable to its premises.</p>
        <h2>8. Fire and Life Safety</h2>
        <p>Each property must comply with applicable:</p>
        <ul><li>fire codes;</li><li>emergency-exit requirements;</li><li>occupancy requirements;</li><li>fire-extinguisher requirements;</li><li>alarm requirements;</li><li>electrical requirements; and</li><li>other applicable life-safety regulations.</li></ul>
        <p>MicroStay does not replace inspection by governmental authorities.</p>
        <h2>9. Human-Trafficking Awareness Training</h2>
        <p>California hotel and motel employers subject to California Government Code §12950.3 must provide legally required human-trafficking awareness training to employees likely to interact or come into contact with potential victims.</p>
        <p>California law requires at least 20 minutes of qualifying training and requires applicable new employees to receive the training within the statutory period.</p>
        <p>Each participating property is responsible for:</p>
        <ul><li>identifying covered employees;</li><li>providing required training;</li><li>maintaining appropriate compliance records; and</li><li>satisfying any additional local or state requirements.</li></ul>
        <h2>10. Human Trafficking and Unlawful Activity</h2>
        <p>Properties must not knowingly allow MicroStay reservations or their premises to facilitate:</p>
        <ul><li>human trafficking;</li><li>commercial sexual exploitation;</li><li>exploitation of minors; or</li><li>other unlawful activity.</li></ul>
        <p>A property must follow applicable laws and lawful reporting or response requirements.</p>
        <h2>11. Accessibility</h2>
        <p>California properties must comply with applicable federal and California accessibility and nondiscrimination laws.</p>
        <p>Hotels and motels are generally places of public accommodation under the ADA, and California's Unruh Civil Rights Act applies to hotels and motels.</p>
        <p>Properties are responsible for:</p>
        <ul><li>accessible guestrooms;</li><li>accessible public areas;</li><li>accessible parking where required;</li><li>reasonable policy modifications;</li><li>effective communication obligations;</li><li>accurate accessibility information; and</li><li>other legally required accommodations.</li></ul>
        <h2>12. Service Animals</h2>
        <p>Participating properties must comply with applicable service-animal laws.</p>
        <p>A qualifying service animal may not be treated as an ordinary pet where federal or state law provides otherwise.</p>
        <p>Hotels may not restrict guests using service animals solely to designated pet rooms or charge a cleaning fee merely because a service animal is present.</p>
        <p>Properties may apply lawful charges for actual damage on the same basis applied to other guests.</p>
        <h2>13. Nondiscrimination</h2>
        <p>Participating properties must provide lodging services in compliance with applicable civil-rights and nondiscrimination laws.</p>
        <p>A property may not unlawfully discriminate because of a protected characteristic.</p>
        <p>California's Unruh Civil Rights Act applies broadly to business establishments, including hotels and motels.</p>
        <h2>14. Pricing and Mandatory Fees</h2>
        <p>Properties must provide MicroStay with complete and accurate pricing information.</p>
        <p>Any mandatory non-government fee or charge that must be paid to obtain the lodging service must be incorporated into the displayed price as required by applicable law.</p>
        <p>A property may not hide a mandatory:</p>
        <ul><li>resort fee;</li><li>service fee;</li><li>facility fee;</li><li>cleaning fee;</li><li>booking fee;</li><li>processing fee;</li><li>mandatory parking fee;</li><li>amenity fee; or</li><li>similar unavoidable charge</li></ul>
        <p>and require the guest to pay it only after arriving.</p>
        <p>California's Honest Pricing Law generally requires advertised prices to include mandatory fees other than qualifying government charges, and the FTC's federal rule for short-term lodging likewise requires upfront disclosure of mandatory charges.</p>
        <h2>15. Government Taxes</h2>
        <p>Government-imposed taxes and qualifying governmental assessments may be displayed separately where permitted by applicable law.</p>
        <p>The property must provide MicroStay with accurate tax information.</p>
        <p>Because MicroStay's standard model is pay-at-property, the participating property is ordinarily responsible for determining, collecting, reporting, and remitting taxes associated with lodging payments it collects, except where applicable law independently imposes an obligation on another party.</p>
        <h2>16. Refundable Deposits</h2>
        <p>Properties may require lawful refundable:</p>
        <ul><li>security deposits;</li><li>incidental deposits; or</li><li>damage deposits.</li></ul>
        <p>Deposit requirements must be accurately disclosed to MicroStay.</p>
        <p>The participating property is responsible for:</p>
        <ul><li>collecting;</li><li>holding;</li><li>documenting;</li><li>deducting from;</li><li>releasing; and</li><li>refunding</li></ul>
        <p>its own deposits in accordance with applicable law.</p>
        <h2>17. Proposition 65</h2>
        <p>A California property is responsible for independently determining whether Proposition 65 requires a warning concerning exposures occurring at its premises.</p>
        <p>Proposition 65 generally requires qualifying businesses to provide a clear and reasonable warning before knowingly and intentionally causing certain exposures to listed chemicals when a warning is legally required.</p>
        <p>California regulations contain specific warning methods for hotel exposures, including warnings provided at registration or check-in in qualifying circumstances.</p>
        <p>MicroStay does not determine whether a particular property requires a Proposition 65 warning.</p>
        <p>Where required, the participating property is responsible for providing the legally appropriate warning.</p>
        <h2>18. Property Condition and Maintenance</h2>
        <p>Properties must maintain guestrooms and common areas in accordance with applicable law and reasonable lodging-industry safety practices.</p>
        <p>This includes responsibility for:</p>
        <ul><li>room locks;</li><li>plumbing;</li><li>electricity;</li><li>sanitation;</li><li>heating and cooling where required;</li><li>structural conditions;</li><li>pest control;</li><li>housekeeping;</li><li>maintenance; and</li><li>other property-controlled conditions.</li></ul>
        <h2>19. Insurance</h2>
        <p>Participating properties must maintain insurance required by applicable law and insurance reasonably appropriate to their lodging operations.</p>
        <p>Additional insurance requirements may be established in the MicroStay Partner Agreement.</p>
        <h2>20. Privacy and Guest Information</h2>
        <p>Properties may use MicroStay guest information only for lawful purposes related to:</p>
        <ul><li>reservation fulfillment;</li><li>check-in;</li><li>guest communication;</li><li>safety;</li><li>fraud prevention; and</li><li>legal compliance.</li></ul>
        <p>Properties may not improperly sell, disclose, misuse, or use MicroStay guest information to intentionally circumvent MicroStay.</p>
        <h2>21. Accurate Property Information</h2>
        <p>Properties must keep information supplied to MicroStay accurate and current.</p>
        <p>This includes:</p>
        <ul><li>property name;</li><li>address;</li><li>room descriptions;</li><li>photographs;</li><li>amenities;</li><li>accessibility information;</li><li>stay periods;</li><li>check-in requirements;</li><li>minimum age;</li><li>deposits;</li><li>rates;</li><li>mandatory charges;</li><li>taxes; and</li><li>property policies.</li></ul>
        <h2>22. Changes in Legal Status</h2>
        <p>A participating property must promptly notify MicroStay if a material license, permit, occupancy approval, governmental authorization, or other legal authority is:</p>
        <ul><li>suspended;</li><li>revoked;</li><li>expired;</li><li>materially restricted; or</li><li>subject to significant enforcement affecting MicroStay reservations.</li></ul>
        <h2>23. MicroStay Compliance Review</h2>
        <p>MicroStay may request reasonable evidence relating to a property's compliance with applicable requirements.</p>
        <p>MicroStay may restrict, suspend, or remove a property when reasonably necessary because of issues including:</p>
        <ul><li>invalid licensing;</li><li>serious safety concerns;</li><li>unlawful activity;</li><li>fraud;</li><li>material property misrepresentation;</li><li>repeated legal violations;</li><li>material pricing violations;</li><li>missing required insurance; or</li><li>governmental closure.</li></ul>
        <h2>24. No Legal Certification by MicroStay</h2>
        <p>Listing, approving, activating, or continuing to display a property on MicroStay does not mean that MicroStay:</p>
        <ul><li>provides legal advice to the property;</li><li>certifies compliance with every applicable law;</li><li>guarantees the property's licenses;</li><li>approves every local stay duration;</li><li>certifies the physical safety of the premises; or</li><li>assumes the property's legal obligations.</li></ul>
        <p>Each participating property remains responsible for its own legal and operational compliance.</p>
        <h2>25. Continuing Compliance</h2>
        <p>Compliance is an ongoing obligation.</p>
        <p>Properties must monitor changes in:</p>
        <ul><li>California law;</li><li>local ordinances;</li><li>zoning requirements;</li><li>lodging regulations;</li><li>pricing rules;</li><li>tax requirements;</li><li>accessibility requirements;</li><li>safety regulations;</li><li>and other rules applicable to the property.</li></ul>
        <h2>MICROSTAY HOLDINGS LLC</h2>
        <p>d/b/a MicroStay.us</p>
        <p>Partner Support: info@microstay.us</p>
        <p>General Support: support@microstay.us</p>
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
