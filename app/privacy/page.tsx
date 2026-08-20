import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | MicroStay',
  description: 'Privacy Policy for MicroStay.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'August 19, 2026';

  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black text-foreground transition-colors duration-300">
      {/* Header */}
      <div className="bg-orange-300 dark:bg-gradient-to-tl dark:from-black dark:to-ms-orange dark:via-black py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-ms-orange dark:text-white">
          <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
          {lastUpdated && <p className="text-orange-900 dark:text-white/40">Last updated: {lastUpdated}</p>}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700 dark:text-gray-300 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-ms-orange dark:[&>h2]:text-ms-orange [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-ms-text dark:[&>h3]:text-gray-100 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_a]:text-ms-orange hover:[&_a]:text-ms-orange-hover [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white">
        <p>This Privacy Policy explains how MICROSTAY HOLDINGS LLC, doing business as MicroStay.us ("MicroStay," "we," "us," or "our") collects, uses, discloses, retains, and protects personal information when individuals access or use MicroStay.us, create an account, make or manage reservations, communicate with us, or otherwise interact with services operated by MicroStay.</p>
        <p>By using MicroStay, you acknowledge the information practices described in this Privacy Policy.</p>
        <h2>1. Scope of This Privacy Policy</h2>
        <p>This Privacy Policy applies to personal information processed by MicroStay in connection with:</p>
        <ul><li>MicroStay.us;</li><li>MicroStay user accounts;</li><li>reservation functionality;</li><li>customer support;</li><li>emails and communications;</li><li>MicroStay-related technology services; and</li><li>other services operated by MicroStay.</li></ul>
        <p>This Privacy Policy does not govern information independently collected by a participating hotel, motel, or lodging property.</p>
        <p>Participating properties are independent businesses and may maintain their own privacy policies and information-handling practices.</p>
        <h2>2. MicroStay's Role</h2>
        <p>MicroStay operates an online lodging discovery and reservation technology marketplace.</p>
        <p>MicroStay connects guests with independently operated lodging properties.</p>
        <p>Under MicroStay's standard booking model:</p>
        <ul><li>the participating property provides the lodging accommodation;</li><li>the guest pays the participating property directly;</li><li>MicroStay does not ordinarily collect the guest's lodging payment; and</li><li>the participating property independently handles onsite check-in and payment processing.</li></ul>
        <h2>3. Information We May Collect</h2>
        <p>Depending on how you interact with MicroStay, we may collect the following categories of information.</p>
        <p>Account and Contact Information</p>
        <p>This may include:</p>
        <ul><li>full name;</li><li>email address;</li><li>telephone number;</li><li>account identifier;</li><li>authentication information; and</li><li>communication preferences.</li></ul>
        <p>Reservation Information</p>
        <p>This may include:</p>
        <ul><li>reservation number;</li><li>selected property;</li><li>reservation date;</li><li>selected stay window;</li><li>expected check-in time;</li><li>expected checkout time;</li><li>room or accommodation type;</li><li>number of guests;</li><li>reservation status;</li><li>cancellation status;</li><li>No-Show status;</li><li>requests submitted with a reservation; and</li><li>communications relating to the reservation.</li></ul>
        <p>Device and Technical Information</p>
        <p>When you access MicroStay, we or our authorized technology providers may automatically collect information such as:</p>
        <ul><li>IP address;</li><li>browser type;</li><li>device type;</li><li>operating system;</li><li>language settings;</li><li>referring page;</li><li>pages viewed;</li><li>session information;</li><li>login activity;</li><li>date and time of access;</li><li>application activity;</li><li>diagnostic information;</li><li>security logs; and</li><li>technical error information.</li></ul>
        <p>Location Information</p>
        <p>We may infer your approximate geographic location from information such as your IP address.</p>
        <p>If MicroStay offers a feature that accesses precise device location, device permission will be requested where required.</p>
        <p>Communications</p>
        <p>If you communicate with MicroStay, we may retain:</p>
        <ul><li>emails;</li><li>customer-support inquiries;</li><li>forms;</li><li>complaints;</li><li>feedback;</li><li>reservation-related communications; and</li><li>related communication metadata.</li></ul>
        <p>Security and Fraud Information</p>
        <p>We may process information reasonably necessary to:</p>
        <ul><li>authenticate users;</li><li>protect accounts;</li><li>detect fraudulent reservations;</li><li>prevent unauthorized access;</li><li>investigate suspicious activity;</li><li>protect Platform security;</li><li>prevent misuse;</li><li>enforce our Terms of Service; and</li><li>protect MicroStay, users, and participating properties.</li></ul>
        <h2>4. Government-Issued Identification</h2>
        <p>Participating properties may require guests to present valid government-issued photo identification at check-in.</p>
        <p>The participating property is responsible for physically verifying guest identification.</p>
        <p>MicroStay does not ordinarily require guests to upload copies of driver's licenses, passports, or similar identification documents through MicroStay.</p>
        <p>Guests should not voluntarily send copies of sensitive identification documents to MicroStay unless MicroStay specifically requests limited information for a legitimate verification, fraud, security, legal, or compliance purpose.</p>
        <h2>5. Payment Information</h2>
        <p>Under MicroStay's standard pay-at-property model, guests pay the participating lodging property directly.</p>
        <p>MicroStay therefore does not ordinarily collect or process the guest's lodging payment-card information.</p>
        <p>Participating properties may independently collect payment information in accordance with their own payment practices.</p>
        <p>MicroStay may separately use third-party payment processors for transactions between MicroStay and participating business partners.</p>
        <p>If MicroStay introduces guest payment processing in the future, this Privacy Policy or an appropriate supplemental notice may be updated.</p>
        <h2>6. How We Collect Information</h2>
        <p>MicroStay may collect information:</p>
        <ul><li>directly from you;</li><li>when you create an account;</li><li>when you make a reservation;</li><li>when you communicate with MicroStay;</li><li>automatically through your device;</li><li>from participating properties in connection with reservations;</li><li>from authorized service providers;</li><li>from fraud-prevention or security providers; and</li><li>from other lawful sources necessary to operate the Platform.</li></ul>
        <h2>7. How We Use Information</h2>
        <p>MicroStay may use personal information to:</p>
        <ul><li>create and maintain user accounts;</li><li>authenticate users;</li><li>process reservation requests;</li><li>transmit reservation information to participating properties;</li><li>provide reservation confirmations;</li><li>manage reservations;</li><li>facilitate reservation communications;</li><li>provide customer service;</li><li>respond to inquiries;</li><li>provide technical support;</li><li>maintain Platform security;</li><li>prevent fraud and abuse;</li><li>investigate suspicious activity;</li><li>troubleshoot technical problems;</li><li>improve MicroStay services;</li><li>understand Platform performance;</li><li>maintain business records;</li><li>maintain reservation history;</li><li>resolve disputes;</li><li>enforce our Terms of Service;</li><li>comply with legal requirements;</li><li>respond to lawful governmental requests;</li><li>establish or defend legal claims; and</li><li>protect the rights and safety of MicroStay, guests, participating properties, and others.</li></ul>
        <h2>8. Information Shared With Participating Properties</h2>
        <p>When you make a reservation, MicroStay may provide the participating property with information reasonably necessary to fulfill that reservation.</p>
        <p>This may include:</p>
        <ul><li>guest name;</li><li>contact information;</li><li>reservation number;</li><li>reservation date;</li><li>stay period;</li><li>room category;</li><li>number of guests;</li><li>booking status;</li><li>relevant guest requests; and</li><li>other information reasonably necessary to fulfill the reservation.</li></ul>
        <p>Participating properties may independently collect additional information when you arrive at the property.</p>
        <p>Information independently collected by a property is subject to that property's policies and applicable law.</p>
        <h2>9. Service Providers</h2>
        <p>MicroStay may use third-party service providers to support its operations.</p>
        <p>These providers may assist with functions such as:</p>
        <ul><li>website hosting;</li><li>cloud infrastructure;</li><li>databases;</li><li>account authentication;</li><li>email delivery;</li><li>communications;</li><li>cybersecurity;</li><li>fraud prevention;</li><li>analytics;</li><li>diagnostics;</li><li>error monitoring;</li><li>customer support; and</li><li>payment processing relating to applicable business transactions.</li></ul>
        <p>Service providers may receive information reasonably necessary to perform services for MicroStay.</p>
        <h2>10. Legal and Safety Disclosures</h2>
        <p>MicroStay may disclose information when reasonably necessary to:</p>
        <ul><li>comply with applicable law;</li><li>respond to a subpoena;</li><li>respond to a court order;</li><li>respond to a warrant;</li><li>respond to another lawful governmental request;</li><li>investigate suspected fraud;</li><li>investigate cybersecurity incidents;</li><li>enforce MicroStay agreements;</li><li>protect MicroStay's legal rights;</li><li>protect the safety of users or others;</li><li>investigate suspected unlawful activity; or</li><li>establish, exercise, or defend legal claims.</li></ul>
        <h2>11. Business Transactions</h2>
        <p>If MicroStay is involved in a merger, acquisition, financing, restructuring, sale of assets, bankruptcy, or similar business transaction, personal information may be transferred or disclosed in connection with that transaction subject to applicable law.</p>
        <h2>12. Sale and Sharing of Personal Information</h2>
        <p>MicroStay does not currently sell personal information for monetary consideration.</p>
        <p>MicroStay does not authorize participating properties to receive MicroStay reservation information for the purpose of selling guest personal information.</p>
        <p>Certain privacy laws define "sale" or "sharing" more broadly than an exchange of information for money.</p>
        <p>If MicroStay engages in activities that qualify as selling or sharing personal information under applicable law, MicroStay will provide applicable disclosures and opt-out mechanisms.</p>
        <h2>13. Cookies and Similar Technologies</h2>
        <p>MicroStay and authorized service providers may use technologies such as:</p>
        <ul><li>cookies;</li><li>local storage;</li><li>pixels;</li><li>software development kits;</li><li>authentication tokens; and</li><li>similar technologies.</li></ul>
        <p>These technologies may be used for:</p>
        <ul><li>maintaining user sessions;</li><li>authentication;</li><li>remembering preferences;</li><li>website functionality;</li><li>security;</li><li>fraud prevention;</li><li>analytics;</li><li>diagnostic monitoring; and</li><li>improving Platform performance.</li></ul>
        <p>Where consent is legally required, MicroStay will provide appropriate consent controls.</p>
        <p>You may also be able to manage cookies through your browser settings.</p>
        <p>Disabling certain cookies may affect Platform functionality.</p>
        <h2>14. Analytics</h2>
        <p>MicroStay may use analytics technologies to better understand how users interact with the Platform.</p>
        <p>Analytics information may include:</p>
        <ul><li>pages viewed;</li><li>session duration;</li><li>device information;</li><li>referral information;</li><li>general location;</li><li>browser information;</li><li>website interactions; and</li><li>technical performance.</li></ul>
        <p>Analytics information may be aggregated or de-identified where appropriate.</p>
        <h2>15. Data Retention</h2>
        <p>MicroStay retains personal information for as long as reasonably necessary to fulfill legitimate operational, contractual, security, fraud-prevention, accounting, dispute-resolution, and legal purposes.</p>
        <p>Retention periods may depend on:</p>
        <ul><li>the type of information;</li><li>account status;</li><li>reservation activity;</li><li>fraud-prevention needs;</li><li>cybersecurity needs;</li><li>contractual obligations;</li><li>disputes;</li><li>legal claims; and</li><li>applicable record-retention requirements.</li></ul>
        <p>When information is no longer reasonably required, MicroStay may delete, anonymize, de-identify, or securely dispose of it.</p>
        <h2>16. Information Security</h2>
        <p>MicroStay uses reasonable administrative, organizational, and technical safeguards intended to protect personal information against:</p>
        <ul><li>unauthorized access;</li><li>unauthorized disclosure;</li><li>alteration;</li><li>misuse;</li><li>destruction; and</li><li>loss.</li></ul>
        <p>However, no Internet service, computer system, network, database, or electronic transmission can be guaranteed to be completely secure.</p>
        <p>Users are responsible for safeguarding their account credentials.</p>
        <p>If you suspect unauthorized access to your MicroStay account, contact:</p>
        <p>support@microstay.us</p>
        <h2>17. Children</h2>
        <p>MicroStay's reservation services are designed for adults.</p>
        <p>A person making a reservation through MicroStay must be at least 18 years old.</p>
        <p>Participating properties may require a higher minimum check-in age.</p>
        <p>MicroStay is not directed to children under 13 and does not knowingly operate services designed to collect personal information from children under 13.</p>
        <p>If we discover that personal information was collected from a child in violation of applicable law, we will take reasonable steps to address the information.</p>
        <h2>18. Privacy Rights</h2>
        <p>Depending on where you reside and applicable law, you may have rights concerning your personal information.</p>
        <p>These rights may include the right to:</p>
        <ul><li>request access to personal information;</li><li>request information concerning how personal information is used;</li><li>request correction;</li><li>request deletion;</li><li>request a portable copy of certain information;</li><li>opt out of certain selling or sharing;</li><li>limit certain uses of sensitive personal information;</li><li>withdraw consent where applicable; and</li><li>appeal certain privacy-request decisions where applicable.</li></ul>
        <p>Not every privacy right applies in every jurisdiction or in every circumstance.</p>
        <p>MicroStay will process legally valid requests in accordance with applicable law.</p>
        <h2>19. California Privacy Rights</h2>
        <p>California residents may have privacy rights under applicable California privacy laws.</p>
        <p>Depending on whether applicable statutory requirements are met, those rights may include the right to:</p>
        <ul><li>know what personal information is collected;</li><li>request access;</li><li>request deletion;</li><li>request correction;</li><li>obtain information regarding certain disclosures;</li><li>opt out of qualifying sale or sharing;</li><li>limit certain qualifying uses of sensitive personal information; and</li><li>exercise applicable privacy rights without unlawful discrimination.</li></ul>
        <p>Nothing in this Privacy Policy limits rights provided under applicable law.</p>
        <h2>20. Global Privacy Control</h2>
        <p>Where MicroStay is legally required to recognize an applicable opt-out preference signal, such as Global Privacy Control, MicroStay will process qualifying signals as required by applicable law.</p>
        <h2>21. Submitting a Privacy Request</h2>
        <p>To submit a privacy request, contact:</p>
        <p>Email: support@microstay.us</p>
        <p>Subject: Privacy Request</p>
        <p>Please provide enough information for MicroStay to identify and reasonably verify the request.</p>
        <p>MicroStay may request additional information where reasonably necessary to verify identity or prevent unauthorized disclosure.</p>
        <h2>22. Authorized Agents</h2>
        <p>Where applicable law permits a consumer to use an authorized agent to submit a privacy request, MicroStay may require reasonable evidence that the agent is authorized to act for the consumer.</p>
        <p>MicroStay may also take reasonable steps to verify the consumer's identity where permitted.</p>
        <h2>23. Third-Party Websites</h2>
        <p>MicroStay may contain links to participating properties or other third-party websites.</p>
        <p>MicroStay does not control the privacy practices of independent third parties.</p>
        <p>A third party's collection and use of your information is governed by its own privacy policy and applicable law.</p>
        <h2>24. Changes to This Privacy Policy</h2>
        <p>MicroStay may update this Privacy Policy from time to time.</p>
        <p>The most recent version will identify the date on which it was last updated.</p>
        <p>If a change materially affects how MicroStay uses personal information, additional notice or consent will be provided when legally required.</p>
        <h2>25. Contact Us</h2>
        <p>For questions, requests, or concerns regarding this Privacy Policy or MicroStay's privacy practices:</p>
        <p className="font-bold text-ms-orange">MICROSTAY HOLDINGS LLC d/b/a MicroStay.us</p>
        <p>Email: support@microstay.us</p>
        <p>Subject: Privacy Inquiry</p>

        <div className="mt-12 pt-8 border-t flex justify-between border-gray-200 dark:border-gray-800 text-start">
          <Link href="/" className="text-ms-orange hover:text-ms-orange-hover transition-colors font-medium">
            &larr; Back to MicroStay
          </Link>
        </div>
      </div>
    </div>
  );
}
