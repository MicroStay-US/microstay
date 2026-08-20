"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Scale,
  Ban,
  Accessibility as AccessibilityIcon,
  Shield,
  MapPin,
  ArrowLeft,
  ChevronRight,
  FileText
} from "lucide-react";

export default function TermsOfServiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabQuery = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (tabQuery) {
      setActiveTab(tabQuery);
    } else {
      setActiveTab(null);
    }
  }, [tabQuery]);

  const handleTabChange = (tab: string | null) => {
    setActiveTab(tab);
    if (tab) {
      router.push(`/terms?tab=${tab}`, { scroll: false });
    } else {
      router.push("/terms", { scroll: false });
    }
    // Scroll to top of content area on change
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const lastUpdated = "April 8, 2026";

  // Tab configurations
  const tabs = [
    {
      id: "terms",
      title: "Terms of Service",
      description: "Platform rules, user accounts, guest conduct, and basic booking conditions.",
      icon: FileText,
      color: "border-blue-500 text-blue-500 bg-blue-500/5",
      accent: "blue"
    },
    {
      id: "cancellation",
      title: "Cancellation Policy",
      description: "24-hour statutory cooling-off refunds under California SB 644 and booking cancel rules.",
      icon: Ban,
      color: "border-rose-500 text-rose-500 bg-rose-500/5",
      accent: "rose"
    },
    {
      id: "accessibility",
      title: "Accessibility Policy",
      description: "ADA and California Unruh Act website compliance, room accessibility, and service animal rules.",
      icon: AccessibilityIcon,
      color: "border-emerald-500 text-emerald-500 bg-emerald-500/5",
      accent: "emerald"
    },
    {
      id: "safety",
      title: "Safety & Security",
      description: "Emergency support procedures, prohibited conduct, and security expectations.",
      icon: Shield,
      color: "border-amber-500 text-amber-500 bg-amber-500/5",
      accent: "amber"
    },
    {
      id: "california",
      title: "California Property Requirements",
      description: "CO and smoke detector laws, Prop 65 warnings, human trafficking awareness, and fee transparency.",
      icon: MapPin,
      color: "border-cyan-500 text-cyan-500 bg-cyan-500/5",
      accent: "cyan"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100/50 dark:bg-black text-foreground transition-colors duration-300">
      {/* Dynamic Header */}
      <div className="bg-orange-300 dark:bg-gradient-to-tl dark:from-black dark:to-ms-orange dark:via-black py-16 px-4 border-b border-orange-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-3 text-ms-orange dark:text-white tracking-tight">
            Policies &amp; Terms Center
          </h1>
          <p className="text-orange-900/80 dark:text-white/60 text-lg max-w-2xl mx-auto">
            Choose a policy below to read. Our platform guidelines and property requirements conform to California and Federal laws.
          </p>
          {activeTab && (
            <div className="mt-6">
              <button
                onClick={() => handleTabChange(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-900 border border-orange-200 dark:border-slate-800 text-orange-950 dark:text-white font-bold hover:bg-orange-50 dark:hover:bg-slate-800 transition shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Directory
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* DIRECTORY VIEW (Grid of Cards) */}
        {!activeTab && (
          <div>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200">
                Select a Policy Document
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Click on any document below to view detailed requirements and policies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <div
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className="group relative flex flex-col justify-between p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-orange-500 dark:hover:border-orange-500 transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer transform hover:-translate-y-1"
                  >
                    <div>
                      <div className={`w-12 h-12 flex items-center justify-center rounded-xl border ${tab.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-ms-orange transition-colors">
                        {tab.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                        {tab.description}
                      </p>
                    </div>
                    <div className="mt-6 flex items-center text-sm font-bold text-ms-orange hover:text-ms-orange-hover">
                      Read Policy
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 text-center text-slate-400 dark:text-slate-500 text-sm">
              <p>MICROSTAY HOLDINGS LLC &copy; {new Date().getFullYear()}. All Rights Reserved.</p>
            </div>
          </div>
        )}

        {/* READER VIEW (Split Screen Layout) */}
        {activeTab && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-4">
              <div className="sticky top-6">
                <button
                  onClick={() => handleTabChange(null)}
                  className="w-full flex items-center gap-2 px-4 py-3 mb-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All Policies Directory
                </button>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2 space-y-1">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 px-3 py-2 uppercase tracking-wider">
                    Documents
                  </p>
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${
                          isActive
                            ? "bg-ms-orange text-white shadow-md shadow-orange-500/20"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <IconComponent className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{tab.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Document Content Display */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm">
              <div className="max-w-3xl mx-auto text-gray-700 dark:text-gray-300 space-y-6 [&_h2]:text-3xl [&_h2]:font-black [&_h2]:text-ms-text dark:[&_h2]:text-white [&_h2]:mb-2 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-ms-orange dark:[&_h3]:text-ms-orange [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_p]:text-slate-600 dark:[&_p]:text-slate-300 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-ms-orange hover:[&_a]:text-ms-orange-hover [&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-white">
                
                {/* 1. GENERAL TERMS OF SERVICE */}
                {activeTab === "terms" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Terms of Service</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>
                    <p>These Terms of Service ("Terms") constitute an agreement between you and MICROSTAY HOLDINGS LLC, doing business as MicroStay.us ("MicroStay," "we," "us," or "our").</p>
                    <p>These Terms govern your access to and use of MicroStay.us, user accounts, reservation functionality, communications, and related services operated by MicroStay (collectively, the "Platform").</p>
                    <p>Please read these Terms carefully before making a reservation or using the Platform.</p>
                    <h3>1. Acceptance of Terms</h3>
                    <p>By creating an account, submitting a reservation after being presented with these Terms, clicking an "I Agree," "Reserve," "Confirm Reservation," or similar acceptance mechanism, or otherwise affirmatively accepting these Terms through the Platform, you agree to be legally bound by them.</p>
                    <p>If you do not agree to these Terms, do not submit a reservation or use Platform functionality requiring acceptance.</p>
                    <h3>2. Eligibility</h3>
                    <p>You must be at least 18 years old and legally capable of entering into a binding agreement to make a reservation through MicroStay.</p>
                    <p>The primary guest checking in must also satisfy the participating property's minimum check-in age.</p>
                    <p>Some participating properties may require guests to be 21 years old or older.</p>
                    <p>Where applicable law or property policy establishes a higher lawful minimum age, the higher age requirement controls.</p>
                    <h3>3. MicroStay Platform</h3>
                    <p>MicroStay operates an online lodging technology, discovery, marketing, and reservation marketplace.</p>
                    <p>MicroStay allows users to discover participating hotels, motels, and other lodging establishments offering lodging periods such as:</p>
                    <ul>
                      <li>daytime stays;</li>
<li>hourly stays;</li>
<li>short-duration stays;</li>
<li>evening stays;</li>
<li>flexible-duration stays; and</li>
<li>other lawful lodging periods offered by participating properties.</li>
                    </ul>
                    <p>MicroStay facilitates the communication of reservation information between guests and participating properties.</p>
                    <h3>4. Independent Lodging Properties</h3>
                    <p>Participating properties are independently owned, operated, managed, or controlled.</p>
                    <p>MicroStay does not own, lease, operate, manage, staff, maintain, or supervise participating properties.</p>
                    <p>The participating property—not MicroStay—provides the actual lodging accommodation.</p>
                    <p>Participating properties are responsible for their own:</p>
                    <ul>
                      <li>property operations;</li>
<li>employees and contractors;</li>
<li>guestrooms;</li>
<li>housekeeping;</li>
<li>maintenance;</li>
<li>security;</li>
<li>onsite check-in;</li>
<li>payment collection;</li>
<li>deposits;</li>
<li>parking;</li>
<li>amenities;</li>
<li>property rules;</li>
<li>accessibility;</li>
<li>licensing;</li>
<li>taxation;</li>
<li>safety; and</li>
<li>legal compliance.</li>
                    </ul>
                    <h3>5. Lodging-Only Service</h3>
                    <p>MicroStay's standard service concerns lodging reservations.</p>
                    <p>MicroStay does not sell or arrange transportation through the standard MicroStay lodging service.</p>
                    <p>This includes air, rail, bus, cruise, rental vehicle, or similar transportation.</p>
                    <h3>6. Property Listings</h3>
                    <p>Participating properties supply information used in their listings.</p>
                    <p>This information may include:</p>
                    <ul>
                      <li>property name;</li>
<li>location;</li>
<li>photographs;</li>
<li>room information;</li>
<li>amenities;</li>
<li>rates;</li>
<li>available stay periods;</li>
<li>applicable taxes;</li>
<li>deposit requirements;</li>
<li>minimum check-in age;</li>
<li>parking information;</li>
<li>accessibility information; and</li>
<li>property policies.</li>
                    </ul>
                    <p>Participating properties are responsible for providing accurate and current information.</p>
                    <p>MicroStay may modify, correct, restrict, or remove information that MicroStay reasonably believes is inaccurate, misleading, unlawful, outdated, or incomplete.</p>
                    <h3>7. Reservation Availability</h3>
                    <p>Displayed inventory is subject to availability.</p>
                    <p>Viewing an available room or stay period does not guarantee that the room will remain available.</p>
                    <p>A reservation is confirmed only when MicroStay provides a valid reservation confirmation or otherwise indicates that the reservation has been successfully accepted.</p>
                    <h3>8. Reservation Information</h3>
                    <p>You agree to provide accurate and complete information when making a reservation.</p>
                    <p>You may not:</p>
                    <ul>
                      <li>impersonate another person;</li>
<li>submit intentionally false information;</li>
<li>make fraudulent reservations;</li>
<li>manipulate Platform systems;</li>
<li>abuse promotions;</li>
<li>interfere with another user's reservation;</li>
<li>use automated systems to misuse the Platform; or</li>
<li>use MicroStay for unlawful purposes.</li>
                    </ul>
                    <h3>9. Primary Guest</h3>
                    <p>The primary guest identified on the reservation should be the individual who checks into the participating property unless the property permits a modification.</p>
                    <p>A property may refuse check-in if it cannot reasonably verify the guest or reservation.</p>
                    <h3>10. Government-Issued Photo Identification</h3>
                    <p>Every primary guest checking in under a MicroStay reservation must present a valid, unexpired government-issued photo identification document.</p>
                    <p>Depending on applicable law and property policy, accepted identification may include:</p>
                    <ul>
                      <li>driver's license;</li>
<li>state-issued identification card;</li>
<li>passport;</li>
<li>military identification; or</li>
<li>another valid government-issued photo identification document accepted by the property.</li>
                    </ul>
                    <p>The participating property physically inspects and verifies the identification.</p>
                    <p>MicroStay does not physically verify identification at the property.</p>
                    <p>A participating property may deny check-in when the guest:</p>
                    <ul>
                      <li>cannot provide required identification;</li>
<li>presents invalid identification;</li>
<li>presents identification reasonably believed to be fraudulent;</li>
<li>does not reasonably match the reservation;</li>
<li>does not satisfy the applicable minimum age; or</li>
<li>otherwise fails lawful check-in requirements.</li>
                    </ul>
                    <h3>11. Minimum Check-In Age</h3>
                    <p>The primary guest must be at least 18 years old.</p>
                    <p>A participating property may establish a higher minimum age, including 21 years or older.</p>
                    <p>The higher requirement controls when properly disclosed or required by applicable law.</p>
                    <h3>12. Pricing</h3>
                    <p>Participating properties determine the lodging rates offered through MicroStay.</p>
                    <p>MicroStay displays pricing information supplied by participating properties.</p>
                    <p>Mandatory non-government charges required to obtain the lodging service must be incorporated into the displayed price where required by applicable law.</p>
                    <p>Participating properties may not impose undisclosed mandatory charges that should legally have been disclosed before booking.</p>
                    <h3>13. Government Taxes and Assessments</h3>
                    <p>Applicable government-imposed taxes and assessments may be displayed separately where permitted by applicable law.</p>
                    <p>Depending on the location of the participating property, these charges may include:</p>
                    <ul>
                      <li>transient occupancy tax;</li>
<li>hotel occupancy tax;</li>
<li>tourism assessments;</li>
<li>lodging taxes; or</li>
<li>similar governmental charges.</li>
                    </ul>
                    <p>Participating properties are responsible for determining, collecting, reporting, and remitting taxes applicable to lodging payments they collect, except to the extent applicable law imposes an obligation directly on another party.</p>
                    <h3>14. Price Display</h3>
                    <p>A reservation may display pricing substantially as follows:</p>
                    <p>Room Rate</p>
                    <p>+ Applicable Government Taxes</p>
                    <p>= Total Amount Due at Property</p>
                    <p>Refundable deposits, optional purchases, incidental charges, and guest-selected services may be disclosed separately where permitted by applicable law.</p>
                    <h3>15. Pay-at-Property Model</h3>
                    <p>Under MicroStay's standard booking model:</p>
                    <ul>
                      <li>Guests pay the participating property directly.</li>
<li>MicroStay does not ordinarily collect or hold the guest's lodging payment.</li>
<li>MicroStay is therefore not ordinarily the merchant processing the guest's lodging payment.</li>
<li>The participating property is responsible for collecting payment and determining the payment methods it accepts.</li>
                    </ul>
                    <h3>16. MicroStay Guest Fees</h3>
                    <p>Under MicroStay's current standard model, MicroStay does not charge guests a separate MicroStay booking fee or service fee.</p>
                    <p>If MicroStay introduces a guest-paid charge in the future, the charge will be disclosed before the guest becomes obligated to pay it as required by applicable law.</p>
                    <h3>17. Deposits</h3>
                    <p>Participating properties may require a refundable:</p>
                    <ul>
                      <li>security deposit;</li>
<li>incidental deposit;</li>
<li>damage deposit; or</li>
<li>similar lawful deposit.</li>
                    </ul>
                    <p>Deposit requirements vary by property.</p>
                    <p>Where known and applicable, the deposit requirement will be disclosed during the reservation process.</p>
                    <p>Unless MicroStay expressly states otherwise, the participating property is solely responsible for:</p>
                    <ul>
                      <li>collecting deposits;</li>
<li>holding deposits;</li>
<li>determining lawful deductions;</li>
<li>releasing deposits;</li>
<li>refunding deposits; and</li>
<li>resolving deposit disputes.</li>
                    </ul>
                    <p>MicroStay does not ordinarily hold property deposits.</p>
                    <h3>18. Payments Collected by Properties</h3>
                    <p>Because lodging payments are ordinarily collected directly by the participating property, disputes concerning:</p>
                    <ul>
                      <li>charges made by the property;</li>
<li>property card transactions;</li>
<li>cash payments;</li>
<li>incidental charges;</li>
<li>deposits;</li>
<li>damage charges;</li>
<li>property refunds; or</li>
<li>payment-card chargebacks</li>
                    </ul>
                    <p>should ordinarily be addressed directly with the participating property and, where appropriate, the guest's payment provider.</p>
                    <p>MicroStay may provide information contained in the MicroStay reservation record but does not control money independently collected by a property.</p>
                    <h3>19. Cancellation</h3>
                    <p>Cancellation rules may vary depending on the participating property, reservation type, and stay period.</p>
                    <p>Applicable cancellation terms displayed during booking form part of the reservation.</p>
                    <p>Guests are responsible for reviewing applicable cancellation information before confirming a reservation.</p>
                    <p>Where MicroStay provides reservation cancellation functionality, guests should use the applicable cancellation mechanism through their account or reservation.</p>
                    <h3>20. No-Shows</h3>
                    <p>A participating property may classify a reservation as a No-Show if the guest fails to arrive within the permitted check-in period and has not properly cancelled.</p>
                    <p>MicroStay does not guarantee that a property will hold a room indefinitely beyond the stated or reasonable check-in period.</p>
                    <h3>21. Property Unable to Honor Reservation</h3>
                    <p>A property may occasionally be unable to honor a confirmed reservation because of circumstances such as:</p>
                    <ul>
                      <li>inventory errors;</li>
<li>room maintenance;</li>
<li>safety issues;</li>
<li>emergency conditions;</li>
<li>government restrictions;</li>
<li>system failures;</li>
<li>duplicate inventory;</li>
<li>property closure; or</li>
<li>circumstances outside reasonable control.</li>
                    </ul>
                    <p>Where MicroStay becomes aware of such a situation, MicroStay may attempt to notify the guest.</p>
                    <p>Where reasonably available, MicroStay may also attempt to help identify another participating property.</p>
                    <p>MicroStay does not guarantee that a replacement property, room, location, rate, or stay period will be available.</p>
                    <h3>22. Property Rules</h3>
                    <p>Guests must comply with lawful rules established by the participating property.</p>
                    <p>Property rules may concern:</p>
                    <ul>
                      <li>smoking;</li>
<li>visitors;</li>
<li>occupancy limits;</li>
<li>pets;</li>
<li>service animals;</li>
<li>parking;</li>
<li>noise;</li>
<li>property access;</li>
<li>identification;</li>
<li>minimum age;</li>
<li>deposits;</li>
<li>prohibited activity; and</li>
<li>room use.</li>
                    </ul>
                    <p>Property rules vary by location.</p>
                    <h3>23. Lawful Use</h3>
                    <p>MicroStay may be used only for lawful lodging purposes.</p>
                    <p>The Platform or a participating property may not be used to facilitate:</p>
                    <ul>
                      <li>human trafficking;</li>
<li>commercial sexual exploitation;</li>
<li>exploitation of minors;</li>
<li>violence;</li>
<li>theft;</li>
<li>fraud;</li>
<li>unlawful controlled-substance activity;</li>
<li>unauthorized surveillance;</li>
<li>harassment;</li>
<li>intentional property damage; or</li>
<li>other unlawful conduct.</li>
                    </ul>
                    <p>MicroStay may restrict or suspend Platform access where there is a reasonable basis to believe the Platform is being used for serious unlawful activity.</p>
                    <p>MicroStay may also preserve records and cooperate with lawful governmental authorities where appropriate.</p>
                    <h3>24. Guest Conduct</h3>
                    <p>Guests are responsible for their own behavior while using the Platform and staying at participating properties.</p>
                    <p>To the extent permitted by applicable law, guests may also be responsible for damage caused by individuals accompanying them.</p>
                    <p>Participating properties may independently pursue lawful charges or remedies for property damage.</p>
                    <h3>25. Accessibility</h3>
                    <p>Participating properties are independently responsible for complying with laws applicable to the accessibility of their physical accommodations.</p>
                    <p>MicroStay may display accessibility information provided by participating properties.</p>
                    <p>Guests who require a particular accessibility feature should review available information and may wish to contact the property directly before arrival.</p>
                    <p>Nothing in these Terms limits rights provided under applicable disability or public-accommodation laws.</p>
                    <h3>26. Privacy</h3>
                    <p>MicroStay's collection and use of personal information is governed by the MicroStay Privacy Policy.</p>
                    <p>Participating properties may independently collect information from guests during check-in or during the stay.</p>
                    <p>The property is independently responsible for information it collects directly.</p>
                    <h3>27. Electronic Communications</h3>
                    <p>By providing contact information to MicroStay, you consent to receive transactional communications reasonably related to your use of the Platform.</p>
                    <p>These communications may include:</p>
                    <ul>
                      <li>reservation confirmations;</li>
<li>reservation updates;</li>
<li>cancellations;</li>
<li>account-security messages;</li>
<li>authentication messages;</li>
<li>support communications;</li>
<li>property communications; and</li>
<li>important service notices.</li>
                    </ul>
                    <p>Marketing communications, if offered, will be handled subject to applicable consent and opt-out requirements.</p>
                    <h3>28. Account Security</h3>
                    <p>If you create a MicroStay account, you are responsible for maintaining the security of your account credentials.</p>
                    <p>You agree to promptly notify MicroStay if you reasonably believe your account has been accessed without authorization.</p>
                    <p>MicroStay may temporarily restrict access where reasonably necessary to investigate:</p>
                    <ul>
                      <li>security incidents;</li>
<li>fraud;</li>
<li>suspicious activity;</li>
<li>account compromise; or</li>
<li>material violations of these Terms.</li>
                    </ul>
                    <h3>29. Prohibited Platform Activity</h3>
                    <p>You may not:</p>
                    <ul>
                      <li>attempt unauthorized access to MicroStay systems;</li>
<li>interfere with Platform security;</li>
<li>introduce malware;</li>
<li>conduct unauthorized vulnerability testing;</li>
<li>scrape or extract Platform data in violation of applicable law or authorization;</li>
<li>manipulate reservation systems;</li>
<li>create fraudulent accounts;</li>
<li>impersonate MicroStay;</li>
<li>misuse another person's information;</li>
<li>circumvent Platform security controls; or</li>
<li>use the Platform in a manner intended to harm MicroStay or others.</li>
                    </ul>
                    <h3>30. Intellectual Property</h3>
                    <p>The MicroStay name, MicroStay.us, software, interfaces, original text, graphics, design elements, logos, databases, and other MicroStay-owned materials are protected by applicable intellectual-property laws.</p>
                    <p>Except as permitted by law or expressly authorized by MicroStay, users may not:</p>
                    <ul>
                      <li>reproduce;</li>
<li>republish;</li>
<li>distribute;</li>
<li>commercially exploit;</li>
<li>modify;</li>
<li>reverse engineer;</li>
<li>copy; or</li>
<li>create derivative works from</li>
                    </ul>
                    <p>MicroStay-owned materials.</p>
                    <p>Property names, trademarks, photographs, and other materials provided by participating properties may belong to those properties or other rights holders.</p>
                    <h3>31. Reviews and User Content</h3>
                    <p>If MicroStay permits users to submit reviews, photographs, feedback, or other content, users remain responsible for the content they provide.</p>
                    <p>Users may not knowingly submit content that is:</p>
                    <ul>
                      <li>false;</li>
<li>fraudulent;</li>
<li>defamatory;</li>
<li>threatening;</li>
<li>discriminatory;</li>
<li>unlawfully invasive of privacy;</li>
<li>infringing; or</li>
<li>otherwise unlawful.</li>
                    </ul>
                    <p>By submitting content intended for publication, you grant MicroStay a non-exclusive, worldwide, royalty-free license to use, host, reproduce, display, and distribute that content in connection with operating, promoting, or improving MicroStay.</p>
                    <h3>32. Platform Availability</h3>
                    <p>MicroStay will use reasonable efforts to operate the Platform but does not guarantee uninterrupted or error-free availability.</p>
                    <p>The Platform may experience interruptions because of:</p>
                    <ul>
                      <li>maintenance;</li>
<li>software failures;</li>
<li>Internet failures;</li>
<li>cybersecurity events;</li>
<li>cloud-provider failures;</li>
<li>telecommunications problems;</li>
<li>third-party outages;</li>
<li>emergencies; or</li>
<li>circumstances outside MicroStay's reasonable control.</li>
                    </ul>
                    <h3>33. Third-Party Providers</h3>
                    <p>MicroStay may use third-party companies to provide technology or operational services.</p>
                    <p>These may include providers of:</p>
                    <ul>
                      <li>hosting;</li>
<li>databases;</li>
<li>authentication;</li>
<li>cybersecurity;</li>
<li>communications;</li>
<li>analytics;</li>
<li>error monitoring;</li>
<li>email delivery;</li>
<li>fraud prevention; and</li>
<li>payment processing.</li>
                    </ul>
                    <p>MicroStay is not responsible for failures caused solely by independent third-party systems outside MicroStay's reasonable control, except where liability cannot legally be excluded.</p>
                    <h3>34. Third-Party Links</h3>
                    <p>MicroStay may provide links to websites or services operated by third parties.</p>
                    <p>MicroStay does not control independent third-party websites.</p>
                    <p>Third-party websites are governed by their own terms and privacy practices.</p>
                    <h3>35. Disclaimer of Warranties</h3>
                    <h2 className="text-3xl font-bold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE MICROSTAY PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE."</h2>
                    <h2 className="text-3xl font-bold mb-2">MICROSTAY DOES NOT GUARANTEE THAT:</h2>
                    <h2 className="text-3xl font-bold mb-2">• THE PLATFORM WILL ALWAYS BE AVAILABLE;</h2>
                    <h2 className="text-3xl font-bold mb-2">• EVERY LISTING WILL ALWAYS BE COMPLETELY ERROR-FREE;</h2>
                    <h2 className="text-3xl font-bold mb-2">• EVERY PROPERTY WILL ALWAYS HAVE AVAILABILITY;</h2>
                    <h2 className="text-3xl font-bold mb-2">• EVERY RESERVATION WILL ALWAYS BE ACCEPTED OR COMPLETED;</h2>
                    <h2 className="text-3xl font-bold mb-2">• EVERY THIRD-PARTY SERVICE WILL OPERATE WITHOUT INTERRUPTION; OR</h2>
                    <h2 className="text-3xl font-bold mb-2">• THE PLATFORM WILL ALWAYS BE FREE FROM TECHNICAL ERRORS.</h2>
                    <p>Nothing in these Terms eliminates warranties or consumer rights that applicable law does not permit MicroStay to exclude.</p>
                    <h3>36. Property Operations</h3>
                    <p>MicroStay does not physically control participating properties.</p>
                    <p>To the maximum extent permitted by law, the participating property is responsible for matters arising from its own physical lodging operations, including:</p>
                    <ul>
                      <li>room conditions;</li>
<li>onsite staff;</li>
<li>housekeeping;</li>
<li>maintenance;</li>
<li>physical security;</li>
<li>premises conditions;</li>
<li>onsite payment processing;</li>
<li>deposits; and</li>
<li>guest interactions occurring at the property.</li>
                    </ul>
                    <p>Nothing in these Terms eliminates liability that applicable law independently imposes directly on MicroStay.</p>
                    <h3>37. Limitation of Liability</h3>
                    <h2 className="text-3xl font-bold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MICROSTAY SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR RELATING TO USE OF THE PLATFORM.</h2>
                    <h2 className="text-3xl font-bold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, MICROSTAY'S AGGREGATE LIABILITY TO A USER ARISING FROM USE OF THE PLATFORM SHALL NOT EXCEED THE GREATER OF:</h2>
                    <h2 className="text-3xl font-bold mb-2">A. $500; OR</h2>
                    <h2 className="text-3xl font-bold mb-2">B. THE AMOUNT THE USER ACTUALLY PAID DIRECTLY TO MICROSTAY FOR THE SERVICE GIVING RISE TO THE CLAIM DURING THE SIX MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</h2>
                    <p>These limitations do not apply where applicable law prohibits limitation or exclusion of liability.</p>
                    <h3>38. Indemnification</h3>
                    <p>To the extent permitted by applicable law, you agree to indemnify and hold MicroStay harmless from third-party claims, losses, liabilities, and reasonable costs resulting from your:</p>
                    <ul>
                      <li>fraudulent use of the Platform;</li>
<li>intentional violation of these Terms;</li>
<li>unlawful activity;</li>
<li>intentional infringement of third-party rights; or</li>
<li>unlawful or intentional misuse of a MicroStay reservation.</li>
                    </ul>
                    <p>This provision does not require you to indemnify MicroStay for liability that applicable law prohibits MicroStay from transferring.</p>
                    <h3>39. Informal Dispute Resolution</h3>
                    <p>Before starting arbitration or another formal proceeding, you and MicroStay agree to make reasonable efforts to resolve the dispute informally.</p>
                    <p>A dispute notice should include:</p>
                    <ul>
                      <li>your full name;</li>
<li>your email address;</li>
<li>reservation number, if applicable;</li>
<li>a description of the dispute; and</li>
<li>the resolution requested.</li>
                    </ul>
                    <p>Send the notice to:</p>
                    <p>support@microstay.us</p>
                    <p>Subject: Notice of Dispute</p>
                    <h3>40. Binding Arbitration</h3>
                    <h2 className="text-3xl font-bold mb-2">PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS CERTAIN LEGAL RIGHTS.</h2>
                    <p>Except where prohibited by applicable law, disputes arising out of or relating to these Terms, use of MicroStay, or the MicroStay Platform that cannot be resolved informally shall be resolved through individual binding arbitration.</p>
                    <p>Arbitration shall be administered by the American Arbitration Association ("AAA") under applicable consumer arbitration rules.</p>
                    <p>The arbitrator may award any individual remedy available under applicable law.</p>
                    <p>Nothing in these Terms is intended to eliminate a right to seek relief that applicable law prohibits MicroStay from waiving.</p>
                    <h3>41. Arbitration Exceptions</h3>
                    <p>Either party may pursue:</p>
                    <ul>
                      <li>an eligible individual claim in small claims court;</li>
<li>temporary or emergency injunctive relief where legally permitted;</li>
<li>claims that applicable law does not permit to be arbitrated; or</li>
<li>other rights that cannot legally be waived.</li>
                    </ul>
                    <h3>42. Class Action Waiver</h3>
                    <p>To the maximum extent permitted by applicable law, covered disputes shall be resolved on an individual basis rather than through a class, collective, consolidated, mass, or representative proceeding.</p>
                    <p>If applicable law determines that a specific portion of this waiver cannot be enforced, that portion shall be treated as required by applicable law without necessarily invalidating the remaining arbitration provisions.</p>
                    <h3>43. Arbitration Opt-Out</h3>
                    <p>You may opt out of the arbitration agreement by sending written notice to MicroStay within 30 days after the date you first accept these Terms.</p>
                    <p>Send your request to:</p>
                    <p>support@microstay.us</p>
                    <p>Subject: Arbitration Opt-Out</p>
                    <p>Your request should include:</p>
                    <ul>
                      <li>your full name;</li>
<li>the email address associated with your MicroStay account;</li>
<li>a statement that you wish to opt out of the arbitration provision; and</li>
<li>the date of your request.</li>
                    </ul>
                    <p>Opting out of arbitration will not by itself prevent you from using MicroStay.</p>
                    <h3>44. Small Claims Court</h3>
                    <p>Either you or MicroStay may bring an eligible individual dispute in a court of competent small-claims jurisdiction instead of arbitration, subject to that court's applicable requirements.</p>
                    <h3>45. Governing Law</h3>
                    <p>Except where federal law or another non-waivable law applies, these Terms are governed by the laws of the State of California, without regard to conflict-of-law principles.</p>
                    <p>Nothing in these Terms deprives a consumer of protections that applicable law does not permit the consumer to waive.</p>
                    <h3>46. Suspension or Termination</h3>
                    <p>MicroStay may suspend, restrict, or terminate Platform access where reasonably necessary because of:</p>
                    <ul>
                      <li>fraud;</li>
<li>account compromise;</li>
<li>abuse;</li>
<li>repeated fraudulent reservations;</li>
<li>harassment;</li>
<li>unlawful activity;</li>
<li>security threats;</li>
<li>manipulation of the Platform;</li>
<li>intentional interference with MicroStay systems; or</li>
<li>material violation of these Terms.</li>
                    </ul>
                    <p>Where reasonably appropriate, MicroStay may provide an opportunity for the user to explain or address the issue.</p>
                    <h3>47. Changes to the Platform</h3>
                    <p>MicroStay may add, modify, restrict, replace, or discontinue Platform features.</p>
                    <p>Changes to Platform functionality do not automatically cancel obligations relating to previously confirmed reservations.</p>
                    <h3>48. Changes to These Terms</h3>
                    <p>MicroStay may update these Terms from time to time.</p>
                    <p>The current version will display the date it became effective or was last updated.</p>
                    <p>Where required by applicable law, MicroStay will provide appropriate notice of material changes.</p>
                    <p>Where renewed affirmative consent is legally required, MicroStay may request users to accept updated Terms.</p>
                    <h3>49. Severability</h3>
                    <p>If a provision of these Terms is determined to be unlawful, invalid, or unenforceable, that provision shall be enforced to the maximum lawful extent or severed where appropriate.</p>
                    <p>The remaining provisions shall continue in effect.</p>
                    <h3>50. No Waiver</h3>
                    <p>Failure by MicroStay to enforce a provision on one occasion does not waive MicroStay's right to enforce that provision later.</p>
                    <h3>51. Assignment</h3>
                    <p>Users may not transfer their MicroStay accounts or obligations under these Terms in a manner that materially affects MicroStay without MicroStay's consent.</p>
                    <p>MicroStay may assign these Terms in connection with:</p>
                    <ul>
                      <li>a merger;</li>
<li>acquisition;</li>
<li>corporate restructuring;</li>
<li>transfer to an affiliate;</li>
<li>financing transaction; or</li>
<li>sale of relevant assets,</li>
                    </ul>
                    <p>subject to applicable law.</p>
                    <h3>52. Entire Agreement</h3>
                    <p>These Terms, the MicroStay Privacy Policy, reservation-specific information displayed during booking, and terms expressly incorporated into a transaction constitute the applicable agreement governing use of the MicroStay Platform.</p>
                    <p>A participating property may separately maintain lawful property-specific policies governing the physical lodging accommodation.</p>
                    <h3>53. Contact</h3>
                    <p>Questions or notices concerning these Terms may be directed to:</p>
                    <p>MICROSTAY HOLDINGS LLC d/b/a MicroStay.us</p>
                    <p>Email: support@microstay.us</p>

                  </div>
                )}

                {/* 2. CANCELLATION POLICY */}
                {activeTab === "cancellation" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Cancellation Policy</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>
                    <p>This Cancellation Policy applies to reservations made through MicroStay.us, operated by MICROSTAY HOLDINGS LLC d/b/a MicroStay.us ("MicroStay," "we," "us," or "our").</p>
                    <p>MicroStay connects guests with independently owned and operated hotels, motels, and other participating lodging properties.</p>
                    <p>Under MicroStay's standard model, guests pay the participating property directly. MicroStay does not ordinarily collect or hold the guest's lodging payment.</p>
                    <h3>1. Review Cancellation Terms Before Booking</h3>
                    <p>Cancellation terms may vary depending on:</p>
                    <ul>
                      <li>the participating property;</li>
<li>reservation date;</li>
<li>selected stay period;</li>
<li>time remaining before check-in;</li>
<li>room or rate selected; and</li>
<li>applicable law.</li>
                    </ul>
                    <p>Any property-specific cancellation terms displayed during the reservation process form part of the reservation.</p>
                    <p>Guests should review those terms before confirming a reservation.</p>
                    <h3>2. California 24-Hour Cancellation Right</h3>
                    <p>For a reservation for hotel accommodation located in California, California law provides a penalty-free cancellation period of at least 24 hours after the reservation is confirmed when the reservation was made 72 hours or more before the scheduled time of check-in.</p>
                    <p>If your reservation qualifies for this statutory cancellation right, you may cancel the reservation during the applicable period without a cancellation penalty.</p>
                    <p>If a qualifying reservation is cancelled within this statutory period and money was previously paid, applicable California law requires qualifying amounts to be refunded to the original form of payment within the legally required period.</p>
                    <p>Because MicroStay's standard model is pay-at-property, MicroStay ordinarily does not possess lodging funds to refund. If a participating property independently collected an advance payment or qualifying deposit, that property is responsible for processing any refund it is legally required to provide.</p>
                    <h3>3. Reservations Made Less Than 72 Hours Before Check-In</h3>
                    <p>The California statutory 24-hour cancellation period described above does not automatically apply when a reservation is made less than 72 hours before the scheduled check-in time.</p>
                    <p>For those reservations, the cancellation terms disclosed for the reservation and applicable law control.</p>
                    <p>This is particularly relevant to same-day, next-day, hourly, daytime, and other short-notice MicroStay reservations.</p>
                    <h3>4. How to Cancel</h3>
                    <p>Where cancellation functionality is available through MicroStay, guests should cancel using the cancellation option provided in:</p>
                    <ul>
                      <li>their MicroStay account;</li>
<li>reservation details page;</li>
<li>reservation confirmation; or</li>
<li>another cancellation method made available by MicroStay.</li>
                    </ul>
                    <p>If online cancellation is unavailable because of a technical problem, contact:</p>
                    <p>support@microstay.us</p>
                    <p>Include:</p>
                    <ul>
                      <li>reservation number;</li>
<li>guest name;</li>
<li>property name; and</li>
<li>reservation date.</li>
                    </ul>
                    <h3>5. Cancellation Confirmation</h3>
                    <p>A cancellation is considered completed when MicroStay displays or sends a cancellation confirmation or when the participating property otherwise confirms a valid cancellation.</p>
                    <p>Guests should retain the cancellation confirmation for their records.</p>
                    <h3>6. Property-Specific Cancellation Terms</h3>
                    <p>Outside any non-waivable cancellation right required by law, participating properties may establish lawful cancellation conditions.</p>
                    <p>Any cancellation penalty or restriction must be disclosed as required by applicable law before the guest confirms the reservation.</p>
                    <p>A participating property may not impose an undisclosed mandatory cancellation charge that conflicts with the reservation terms or applicable law.</p>
                    <h3>7. MicroStay Cancellation Fees</h3>
                    <p>Under MicroStay's current standard model, MicroStay does not charge guests a separate MicroStay cancellation fee.</p>
                    <p>A participating property may have its own lawful cancellation or No-Show policy when properly disclosed during booking.</p>
                    <h3>8. No-Shows</h3>
                    <p>A reservation may be classified as a No-Show when the guest:</p>
                    <ul>
                      <li>does not arrive during the permitted check-in period;</li>
<li>does not properly cancel the reservation; or</li>
<li>otherwise fails to use the reservation.</li>
                    </ul>
                    <p>Consequences of a No-Show are governed by the disclosed reservation terms, the participating property's lawful policies, and applicable law.</p>
                    <h3>9. Failure to Satisfy Check-In Requirements</h3>
                    <p>A participating property may refuse check-in if the primary guest:</p>
                    <ul>
                      <li>cannot present required government-issued photo identification;</li>
<li>is below the applicable minimum check-in age;</li>
<li>presents identification reasonably believed to be invalid or fraudulent;</li>
<li>materially violates lawful property rules; or</li>
<li>otherwise fails applicable lawful check-in requirements.</li>
                    </ul>
                    <p>A refusal of check-in resulting from the guest's failure to satisfy properly disclosed requirements is not necessarily considered a property cancellation.</p>
                    <p>Any financial consequence is subject to the applicable reservation terms and law.</p>
                    <h3>10. Property Cancellation</h3>
                    <p>A participating property may occasionally be unable to honor a reservation because of circumstances such as:</p>
                    <ul>
                      <li>room or inventory errors;</li>
<li>maintenance problems;</li>
<li>safety concerns;</li>
<li>government restrictions;</li>
<li>emergency conditions;</li>
<li>property closure;</li>
<li>technology failures; or</li>
<li>circumstances outside reasonable control.</li>
                    </ul>
                    <p>Where MicroStay becomes aware that a confirmed reservation cannot be honored, MicroStay may attempt to notify the guest.</p>
                    <p>Where reasonably possible, MicroStay may also assist the guest in locating another participating property.</p>
                    <p>MicroStay does not guarantee that an alternative room, property, stay window, location, or equivalent price will be available.</p>
                    <h3>11. Refunds of Property-Collected Payments</h3>
                    <p>MicroStay does not ordinarily collect guest lodging payments.</p>
                    <p>If a participating property collected money directly from the guest, refunds relating to that payment are ordinarily processed by the participating property.</p>
                    <p>MicroStay may assist by confirming information contained in the MicroStay reservation record but cannot refund funds that MicroStay never received or controlled.</p>
                    <p>Nothing in this section limits a refund right provided by applicable law.</p>
                    <h3>12. Reservation Changes</h3>
                    <p>Requests to change:</p>
                    <ul>
                      <li>date;</li>
<li>stay window;</li>
<li>guest information;</li>
<li>room type; or</li>
<li>participating property</li>
                    </ul>
                    <p>are subject to availability and applicable property policies.</p>
                    <p>A requested change is not effective until confirmed.</p>
                    <h3>13. Contact</h3>
                    <p>Questions regarding a MicroStay cancellation may be submitted to:</p>
                    <p className="font-bold text-ms-orange">MICROSTAY HOLDINGS LLC</p>
                    <p>d/b/a MicroStay.us</p>
                    <p>Email: support@microstay.us</p>
                    <p>Subject: Reservation Cancellation</p>
                    <p>Website: MicroStay.us</p>

                  </div>
                )}

                {/* 3. ACCESSIBILITY POLICY */}
                {activeTab === "accessibility" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Accessibility Policy</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>
                    <p>MICROSTAY HOLDINGS LLC d/b/a MicroStay.us is committed to providing users with meaningful access to the MicroStay Platform, including individuals with disabilities.</p>
                    <p>We seek to improve the accessibility and usability of MicroStay.us as our Platform develops.</p>
                    <h3>1. Our Accessibility Commitment</h3>
                    <p>MicroStay seeks to design and operate its website and reservation functionality so that users with different abilities and assistive technologies can access important information and services.</p>
                    <p>Our accessibility efforts may include:</p>
                    <ul>
                      <li>keyboard navigation;</li>
<li>meaningful page structure;</li>
<li>accessible form labels;</li>
<li>text alternatives for important images;</li>
<li>readable text and contrast;</li>
<li>clear error messages;</li>
<li>compatibility improvements for screen readers;</li>
<li>scalable page content; and</li>
<li>accessible reservation workflows.</li>
                    </ul>
                    <p>Accessibility is an ongoing process, and technology standards, browsers, devices, and assistive technologies may change over time.</p>
                    <h3>2. Accessibility Standard</h3>
                    <p>MicroStay uses recognized web-accessibility practices as a design and development reference, including relevant principles of the Web Content Accessibility Guidelines.</p>
                    <p>This statement is not intended as a representation that every page, feature, third-party integration, or piece of content will be free from every accessibility issue at all times.</p>
                    <p>MicroStay will make reasonable efforts to identify and address reported accessibility barriers.</p>
                    <h3>3. Assistance Using MicroStay</h3>
                    <p>If you experience difficulty accessing or using any part of MicroStay.us, please contact:</p>
                    <p>support@microstay.us</p>
                    <p>Subject: Accessibility Assistance</p>
                    <p>When possible, please tell us:</p>
                    <ul>
                      <li>the page or feature involved;</li>
<li>what you were trying to accomplish;</li>
<li>the device and browser being used; and</li>
<li>the type of assistive technology being used, if relevant.</li>
                    </ul>
                    <p>Do not send medical documentation unless specifically requested and legally appropriate.</p>
                    <p>We will make reasonable efforts to provide the information or service through an accessible alternative where appropriate.</p>
                    <h3>4. Participating Properties</h3>
                    <p>Hotels, motels, and lodging properties available through MicroStay are independently owned and operated.</p>
                    <p>Each participating property is independently responsible for complying with accessibility laws applicable to its physical premises, guestrooms, facilities, policies, services, and operations.</p>
                    <p>MicroStay does not own, construct, operate, or physically control participating properties.</p>
                    <p>Hotels and motels are generally places of public accommodation subject to applicable federal accessibility requirements, and California businesses are also subject to state civil-rights requirements including the Unruh Civil Rights Act.</p>
                    <h3>5. Accessible Room Information</h3>
                    <p>A participating property may provide MicroStay with information concerning:</p>
                    <ul>
                      <li>accessible guestrooms;</li>
<li>accessible bathrooms;</li>
<li>accessible entrances;</li>
<li>accessible parking;</li>
<li>elevators;</li>
<li>mobility-accessible features;</li>
<li>hearing-accessible features; and</li>
<li>other accessibility information.</li>
                    </ul>
                    <p>MicroStay may display this information to assist users.</p>
                    <p>Because this information is supplied or maintained by the participating property, guests requiring a specific accessibility feature should confirm that feature with the property when necessary before arrival.</p>
                    <p>MicroStay does not independently certify the physical accessibility of every property or guestroom.</p>
                    <h3>6. Reasonable Accommodations</h3>
                    <p>Participating properties are responsible for handling requests for reasonable modifications and accommodations required in connection with their physical lodging services.</p>
                    <p>Guests with specific accommodation needs may contact the participating property directly.</p>
                    <p>MicroStay may assist with reservation-related information but does not control the physical property.</p>
                    <h3>7. Service Animals</h3>
                    <p>Participating properties must comply with applicable laws governing service animals.</p>
                    <p>Where required by the Americans with Disabilities Act, an individual with a disability using a service animal must be permitted access to areas where guests are normally permitted.</p>
                    <p>A service animal may not be restricted solely to designated "pet-friendly" guestrooms.</p>
                    <p>A hotel may not impose a pet or cleaning fee merely because a guest uses a service animal, although the property may charge for actual damage caused by a service animal on the same basis it would charge other guests for damage.</p>
                    <h3>8. Service Animals and Pet Policies</h3>
                    <p>Property pet policies and service-animal obligations are different.</p>
                    <p>A property's:</p>
                    <ul>
                      <li>pet prohibition;</li>
<li>pet deposit;</li>
<li>pet fee; or</li>
<li>pet-room restriction</li>
                    </ul>
                    <p>does not automatically apply to a qualifying service animal where applicable law provides otherwise.</p>
                    <h3>9. Nondiscrimination</h3>
                    <p>MicroStay does not intend to deny Platform services unlawfully because of disability.</p>
                    <p>Participating properties are also required to comply with applicable nondiscrimination and public-accommodation laws.</p>
                    <p>California's Unruh Civil Rights Act requires covered businesses, including hotels and motels, to provide full and equal access without prohibited discrimination.</p>
                    <h3>10. Third-Party Content</h3>
                    <p>MicroStay may use third-party services or integrations.</p>
                    <p>Although MicroStay seeks to select and operate technology responsibly, some third-party content or functionality may present accessibility limitations outside MicroStay's direct control.</p>
                    <p>If you encounter an accessibility issue involving third-party functionality used through MicroStay, please notify us.</p>
                    <h3>11. Feedback</h3>
                    <p>Accessibility feedback is welcome.</p>
                    <p>Contact:</p>
                    <p className="font-bold text-ms-orange">MICROSTAY HOLDINGS LLC</p>
                    <p>d/b/a MicroStay.us</p>
                    <p>Email: support@microstay.us</p>
                    <p>Subject: Accessibility Feedback</p>
                    <p>Website: MicroStay.us</p>

                  </div>
                )}

                {/* 4. SAFETY & SECURITY */}
                {activeTab === "safety" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Safety &amp; Security Policy</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>
                    <p>MicroStay seeks to maintain a responsible lodging marketplace connecting guests with independently operated participating properties.</p>
                    <p>Safety is a shared responsibility among MicroStay, participating properties, guests, and appropriate public authorities.</p>
                    <h3>1. Emergencies</h3>
                    <p>MicroStay is not an emergency service.</p>
                    <p>If you believe that you or another person is in immediate danger, experiencing a medical emergency, witnessing a crime in progress, or facing another urgent safety situation:</p>
                    <p>Call 911 or the appropriate local emergency authority immediately.</p>
                    <p>Guests should also notify property management or onsite staff when appropriate.</p>
                    <p>Do not wait for an email response from MicroStay in an emergency.</p>
                    <h3>2. Participating Property Responsibility</h3>
                    <p>Each participating hotel, motel, or lodging property is independently operated.</p>
                    <p>The participating property is responsible for the safety and operation of its physical premises, including as applicable:</p>
                    <ul>
                      <li>guestrooms;</li>
<li>door locks;</li>
<li>entrances;</li>
<li>exits;</li>
<li>fire and life-safety equipment;</li>
<li>smoke alarms;</li>
<li>carbon monoxide devices;</li>
<li>electrical systems;</li>
<li>plumbing;</li>
<li>housekeeping;</li>
<li>maintenance;</li>
<li>common areas;</li>
<li>parking areas under its control;</li>
<li>onsite employees;</li>
<li>security procedures; and</li>
<li>emergency procedures.</li>
                    </ul>
                    <p>MicroStay does not own, operate, staff, maintain, or physically control participating properties.</p>
                    <h3>3. No Physical-Safety Certification</h3>
                    <p>MicroStay's publication of a property on the Platform should not be interpreted as a guarantee, certification, or representation that:</p>
                    <ul>
                      <li>a property is free from all safety hazards;</li>
<li>every room has been physically inspected by MicroStay;</li>
<li>every employee has been independently screened by MicroStay;</li>
<li>every guest has been background checked;</li>
<li>crime cannot occur at a property; or</li>
<li>a property will remain free of every maintenance or operational problem.</li>
                    </ul>
                    <p>Participating properties are contractually responsible for maintaining lawful and reasonably safe lodging operations.</p>
                    <h3>4. Guest Responsibilities</h3>
                    <p>Guests should use reasonable care during their stay.</p>
                    <p>Guests should:</p>
                    <ul>
                      <li>follow lawful property rules;</li>
<li>secure doors and windows where appropriate;</li>
<li>protect room keys and access credentials;</li>
<li>safeguard valuables;</li>
<li>avoid sharing reservation credentials with unauthorized persons;</li>
<li>promptly notify property staff of unsafe conditions;</li>
<li>comply with occupancy restrictions; and</li>
<li>follow lawful emergency instructions.</li>
                    </ul>
                    <h3>5. Prohibited Conduct</h3>
                    <p>The MicroStay Platform and participating properties may not knowingly be used to facilitate unlawful or dangerous conduct.</p>
                    <p>Prohibited conduct includes, as applicable:</p>
                    <ul>
                      <li>human trafficking;</li>
<li>commercial sexual exploitation;</li>
<li>exploitation of minors;</li>
<li>violence;</li>
<li>credible threats of violence;</li>
<li>theft;</li>
<li>fraud;</li>
<li>unlawful drug activity;</li>
<li>intentional property damage;</li>
<li>harassment;</li>
<li>unlawful surveillance;</li>
<li>unauthorized access to another person's room;</li>
<li>misuse of guest information; or</li>
<li>other unlawful activity.</li>
                    </ul>
                    <h3>6. Human Trafficking and Exploitation</h3>
                    <p>MicroStay does not tolerate use of the Platform to facilitate human trafficking or exploitation.</p>
                    <p>Participating properties are responsible for complying with applicable human-trafficking prevention, employee-training, posting, reporting, and response requirements.</p>
                    <p>California law requires qualifying hotel and motel employers to provide human-trafficking awareness training to employees likely to interact with potential victims.</p>
                    <p>MicroStay may suspend, restrict, or terminate a property or user account when reasonably credible information indicates serious unlawful activity or a material safety concern.</p>
                    <h3>7. Identification Requirements</h3>
                    <p>The primary guest checking in under a MicroStay reservation must be at least 18 years old and must present valid, unexpired government-issued photo identification.</p>
                    <p>A participating property may require a higher lawful minimum age.</p>
                    <p>The property is responsible for physically verifying identification during check-in.</p>
                    <p>MicroStay does not remotely certify a guest's identity merely because a reservation exists.</p>
                    <h3>8. Reporting a Non-Emergency Safety Concern</h3>
                    <p>A non-emergency safety issue relating to a participating property may be reported to:</p>
                    <p>support@microstay.us</p>
                    <p>Subject: Safety Concern</p>
                    <p>Please provide, where available:</p>
                    <ul>
                      <li>reservation number;</li>
<li>property name;</li>
<li>date;</li>
<li>description of the issue; and</li>
<li>relevant supporting information.</li>
                    </ul>
                    <p>Do not send unnecessary copies of government identification or complete payment-card information.</p>
                    <h3>9. Reporting Criminal Conduct</h3>
                    <p>MicroStay does not replace law enforcement.</p>
                    <p>A person who believes a crime has occurred should contact the appropriate law-enforcement agency.</p>
                    <p>MicroStay may preserve and disclose relevant information when legally required or reasonably necessary to respond to lawful legal process, protect safety, prevent fraud, or comply with applicable law.</p>
                    <h3>10. Property Complaints</h3>
                    <p>MicroStay may review credible complaints concerning matters such as:</p>
                    <ul>
                      <li>serious safety deficiencies;</li>
<li>fraud;</li>
<li>unlawful activity;</li>
<li>property misrepresentation;</li>
<li>repeated inability to honor reservations;</li>
<li>discrimination;</li>
<li>misuse of guest information; or</li>
<li>licensing concerns.</li>
                    </ul>
                    <p>Depending on the circumstances, MicroStay may:</p>
                    <ul>
                      <li>request additional information;</li>
<li>contact the participating property;</li>
<li>restrict bookings;</li>
<li>temporarily suspend a listing; or</li>
<li>terminate participation.</li>
                    </ul>
                    <p>MicroStay's ability to investigate a complaint does not create an obligation to continuously monitor every property or guest.</p>
                    <h3>11. Cybersecurity and Account Security</h3>
                    <p>MicroStay uses reasonable administrative and technical measures intended to protect the Platform and information processed by MicroStay.</p>
                    <p>Users should:</p>
                    <ul>
                      <li>protect account credentials;</li>
<li>use secure email accounts;</li>
<li>avoid sharing one-time authentication codes;</li>
<li>report suspected account compromise;</li>
<li>and avoid providing sensitive information to individuals falsely claiming to represent MicroStay.</li>
                    </ul>
                    <p>Suspected account-security issues may be reported to:</p>
                    <p>support@microstay.us</p>
                    <h3>12. Privacy</h3>
                    <p>MicroStay's handling of personal information is described in the MicroStay Privacy Policy.</p>
                    <p>Participating properties independently handle information they collect during physical check-in and the guest's stay.</p>
                    <h3>13. Contact</h3>
                    <p className="font-bold text-ms-orange">MICROSTAY HOLDINGS LLC</p>
                    <p>d/b/a MicroStay.us</p>
                    <p>Email: support@microstay.us</p>
                    <p>Website: MicroStay.us</p>

                  </div>
                )}

                {/* 5. CALIFORNIA PROPERTY REQUIREMENTS */}
                {activeTab === "california" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">California Property Requirements</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>
                    <p>This policy applies to hotels, motels, and other lodging properties located in California that participate or seek to participate on MicroStay.us.</p>
                    <p>The requirements below supplement the MicroStay Partner Agreement.</p>
                    <p>They are not intended to provide an exhaustive statement of every federal, state, county, municipal, zoning, licensing, fire, building, tax, privacy, accessibility, or lodging requirement applicable to a particular property.</p>
                    <p>Each participating property remains independently responsible for determining and complying with the laws applicable to its location and operations.</p>
                    <h3>1. Lawful Lodging Operation</h3>
                    <p>Every participating California property must be legally authorized to operate as the type of lodging establishment represented on MicroStay.</p>
                    <p>The Partner is responsible for maintaining applicable:</p>
                    <ul>
                      <li>business licenses;</li>
<li>hotel or motel permits;</li>
<li>occupancy approvals;</li>
<li>tax registrations;</li>
<li>zoning approvals;</li>
<li>fire and life-safety approvals;</li>
<li>health or operational permits; and</li>
<li>other governmental authorizations.</li>
                    </ul>
                    <h3>2. Short-Duration and Hourly Stays</h3>
                    <p>A property must independently determine whether the stay periods it offers through MicroStay are lawful at its specific location.</p>
                    <p>This includes:</p>
                    <ul>
                      <li>hourly stays;</li>
<li>daytime stays;</li>
<li>short-duration stays;</li>
<li>evening stays;</li>
<li>sub-12-hour stays; and</li>
<li>other flexible-duration lodging.</li>
                    </ul>
                    <p>California properties must also review applicable city and county requirements because local rules may impose requirements beyond statewide law.</p>
                    <p>MicroStay's activation or publication of a property does not constitute a legal determination that a particular stay duration is lawful at that property.</p>
                    <h3>3. Government-Issued Identification</h3>
                    <p>Participating properties must perform any identification checks required by applicable law and MicroStay's Partner Agreement.</p>
                    <p>For MicroStay reservations, the primary guest must present a valid, unexpired government-issued photo identification document at check-in.</p>
                    <p>The participating property is responsible for physically inspecting the identification.</p>
                    <h3>4. Minimum Check-In Age</h3>
                    <p>MicroStay requires the primary guest to be at least 18 years old.</p>
                    <p>A participating property may impose a higher lawful minimum age, including 21 years or older.</p>
                    <p>Any higher requirement should be accurately disclosed to MicroStay so that it can be communicated to guests.</p>
                    <h3>5. Guest Registers and Recordkeeping</h3>
                    <p>A property must maintain guest registers, identification records, lodging records, and other information for the periods required by applicable state and local law.</p>
                    <p>Local requirements may impose additional obligations, particularly for short-duration or sub-12-hour rentals.</p>
                    <p>Each property is responsible for identifying and complying with those requirements.</p>
                    <h3>6. Smoke Alarms</h3>
                    <p>Participating properties must install, test, and maintain smoke alarms where required by California law and applicable fire or building codes.</p>
                    <p>California law places responsibilities on hotel and motel owners concerning testing and maintaining required smoke alarms.</p>
                    <p>MicroStay does not inspect or certify each property's smoke-alarm system.</p>
                    <h3>7. Carbon Monoxide Devices</h3>
                    <p>Where California law requires carbon monoxide devices, participating properties must install and maintain approved devices.</p>
                    <p>California Health and Safety Code §17926 includes existing hotel and motel dwelling units within applicable carbon-monoxide-device requirements where statutory conditions are met.</p>
                    <p>The property is responsible for determining the number, location, type, installation, inspection, and maintenance requirements applicable to its premises.</p>
                    <h3>8. Fire and Life Safety</h3>
                    <p>Each property must comply with applicable:</p>
                    <ul>
                      <li>fire codes;</li>
<li>emergency-exit requirements;</li>
<li>occupancy requirements;</li>
<li>fire-extinguisher requirements;</li>
<li>alarm requirements;</li>
<li>electrical requirements; and</li>
<li>other applicable life-safety regulations.</li>
                    </ul>
                    <p>MicroStay does not replace inspection by governmental authorities.</p>
                    <h3>9. Human-Trafficking Awareness Training</h3>
                    <p>California hotel and motel employers subject to California Government Code §12950.3 must provide legally required human-trafficking awareness training to employees likely to interact or come into contact with potential victims.</p>
                    <p>California law requires at least 20 minutes of qualifying training and requires applicable new employees to receive the training within the statutory period.</p>
                    <p>Each participating property is responsible for:</p>
                    <ul>
                      <li>identifying covered employees;</li>
<li>providing required training;</li>
<li>maintaining appropriate compliance records; and</li>
<li>satisfying any additional local or state requirements.</li>
                    </ul>
                    <h3>10. Human Trafficking and Unlawful Activity</h3>
                    <p>Properties must not knowingly allow MicroStay reservations or their premises to facilitate:</p>
                    <ul>
                      <li>human trafficking;</li>
<li>commercial sexual exploitation;</li>
<li>exploitation of minors; or</li>
<li>other unlawful activity.</li>
                    </ul>
                    <p>A property must follow applicable laws and lawful reporting or response requirements.</p>
                    <h3>11. Accessibility</h3>
                    <p>California properties must comply with applicable federal and California accessibility and nondiscrimination laws.</p>
                    <p>Hotels and motels are generally places of public accommodation under the ADA, and California's Unruh Civil Rights Act applies to hotels and motels.</p>
                    <p>Properties are responsible for:</p>
                    <ul>
                      <li>accessible guestrooms;</li>
<li>accessible public areas;</li>
<li>accessible parking where required;</li>
<li>reasonable policy modifications;</li>
<li>effective communication obligations;</li>
<li>accurate accessibility information; and</li>
<li>other legally required accommodations.</li>
                    </ul>
                    <h3>12. Service Animals</h3>
                    <p>Participating properties must comply with applicable service-animal laws.</p>
                    <p>A qualifying service animal may not be treated as an ordinary pet where federal or state law provides otherwise.</p>
                    <p>Hotels may not restrict guests using service animals solely to designated pet rooms or charge a cleaning fee merely because a service animal is present.</p>
                    <p>Properties may apply lawful charges for actual damage on the same basis applied to other guests.</p>
                    <h3>13. Nondiscrimination</h3>
                    <p>Participating properties must provide lodging services in compliance with applicable civil-rights and nondiscrimination laws.</p>
                    <p>A property may not unlawfully discriminate because of a protected characteristic.</p>
                    <p>California's Unruh Civil Rights Act applies broadly to business establishments, including hotels and motels.</p>
                    <h3>14. Pricing and Mandatory Fees</h3>
                    <p>Properties must provide MicroStay with complete and accurate pricing information.</p>
                    <p>Any mandatory non-government fee or charge that must be paid to obtain the lodging service must be incorporated into the displayed price as required by applicable law.</p>
                    <p>A property may not hide a mandatory:</p>
                    <ul>
                      <li>resort fee;</li>
<li>service fee;</li>
<li>facility fee;</li>
<li>cleaning fee;</li>
<li>booking fee;</li>
<li>processing fee;</li>
<li>mandatory parking fee;</li>
<li>amenity fee; or</li>
<li>similar unavoidable charge</li>
                    </ul>
                    <p>and require the guest to pay it only after arriving.</p>
                    <p>California's Honest Pricing Law generally requires advertised prices to include mandatory fees other than qualifying government charges, and the FTC's federal rule for short-term lodging likewise requires upfront disclosure of mandatory charges.</p>
                    <h3>15. Government Taxes</h3>
                    <p>Government-imposed taxes and qualifying governmental assessments may be displayed separately where permitted by applicable law.</p>
                    <p>The property must provide MicroStay with accurate tax information.</p>
                    <p>Because MicroStay's standard model is pay-at-property, the participating property is ordinarily responsible for determining, collecting, reporting, and remitting taxes associated with lodging payments it collects, except where applicable law independently imposes an obligation on another party.</p>
                    <h3>16. Refundable Deposits</h3>
                    <p>Properties may require lawful refundable:</p>
                    <ul>
                      <li>security deposits;</li>
<li>incidental deposits; or</li>
<li>damage deposits.</li>
                    </ul>
                    <p>Deposit requirements must be accurately disclosed to MicroStay.</p>
                    <p>The participating property is responsible for:</p>
                    <ul>
                      <li>collecting;</li>
<li>holding;</li>
<li>documenting;</li>
<li>deducting from;</li>
<li>releasing; and</li>
<li>refunding</li>
                    </ul>
                    <p>its own deposits in accordance with applicable law.</p>
                    <h3>17. Proposition 65</h3>
                    <p>A California property is responsible for independently determining whether Proposition 65 requires a warning concerning exposures occurring at its premises.</p>
                    <p>Proposition 65 generally requires qualifying businesses to provide a clear and reasonable warning before knowingly and intentionally causing certain exposures to listed chemicals when a warning is legally required.</p>
                    <p>California regulations contain specific warning methods for hotel exposures, including warnings provided at registration or check-in in qualifying circumstances.</p>
                    <p>MicroStay does not determine whether a particular property requires a Proposition 65 warning.</p>
                    <p>Where required, the participating property is responsible for providing the legally appropriate warning.</p>
                    <h3>18. Property Condition and Maintenance</h3>
                    <p>Properties must maintain guestrooms and common areas in accordance with applicable law and reasonable lodging-industry safety practices.</p>
                    <p>This includes responsibility for:</p>
                    <ul>
                      <li>room locks;</li>
<li>plumbing;</li>
<li>electricity;</li>
<li>sanitation;</li>
<li>heating and cooling where required;</li>
<li>structural conditions;</li>
<li>pest control;</li>
<li>housekeeping;</li>
<li>maintenance; and</li>
<li>other property-controlled conditions.</li>
                    </ul>
                    <h3>19. Insurance</h3>
                    <p>Participating properties must maintain insurance required by applicable law and insurance reasonably appropriate to their lodging operations.</p>
                    <p>Additional insurance requirements may be established in the MicroStay Partner Agreement.</p>
                    <h3>20. Privacy and Guest Information</h3>
                    <p>Properties may use MicroStay guest information only for lawful purposes related to:</p>
                    <ul>
                      <li>reservation fulfillment;</li>
<li>check-in;</li>
<li>guest communication;</li>
<li>safety;</li>
<li>fraud prevention; and</li>
<li>legal compliance.</li>
                    </ul>
                    <p>Properties may not improperly sell, disclose, misuse, or use MicroStay guest information to intentionally circumvent MicroStay.</p>
                    <h3>21. Accurate Property Information</h3>
                    <p>Properties must keep information supplied to MicroStay accurate and current.</p>
                    <p>This includes:</p>
                    <ul>
                      <li>property name;</li>
<li>address;</li>
<li>room descriptions;</li>
<li>photographs;</li>
<li>amenities;</li>
<li>accessibility information;</li>
<li>stay periods;</li>
<li>check-in requirements;</li>
<li>minimum age;</li>
<li>deposits;</li>
<li>rates;</li>
<li>mandatory charges;</li>
<li>taxes; and</li>
<li>property policies.</li>
                    </ul>
                    <h3>22. Changes in Legal Status</h3>
                    <p>A participating property must promptly notify MicroStay if a material license, permit, occupancy approval, governmental authorization, or other legal authority is:</p>
                    <ul>
                      <li>suspended;</li>
<li>revoked;</li>
<li>expired;</li>
<li>materially restricted; or</li>
<li>subject to significant enforcement affecting MicroStay reservations.</li>
                    </ul>
                    <h3>23. MicroStay Compliance Review</h3>
                    <p>MicroStay may request reasonable evidence relating to a property's compliance with applicable requirements.</p>
                    <p>MicroStay may restrict, suspend, or remove a property when reasonably necessary because of issues including:</p>
                    <ul>
                      <li>invalid licensing;</li>
<li>serious safety concerns;</li>
<li>unlawful activity;</li>
<li>fraud;</li>
<li>material property misrepresentation;</li>
<li>repeated legal violations;</li>
<li>material pricing violations;</li>
<li>missing required insurance; or</li>
<li>governmental closure.</li>
                    </ul>
                    <h3>24. No Legal Certification by MicroStay</h3>
                    <p>Listing, approving, activating, or continuing to display a property on MicroStay does not mean that MicroStay:</p>
                    <ul>
                      <li>provides legal advice to the property;</li>
<li>certifies compliance with every applicable law;</li>
<li>guarantees the property's licenses;</li>
<li>approves every local stay duration;</li>
<li>certifies the physical safety of the premises; or</li>
<li>assumes the property's legal obligations.</li>
                    </ul>
                    <p>Each participating property remains responsible for its own legal and operational compliance.</p>
                    <h3>25. Continuing Compliance</h3>
                    <p>Compliance is an ongoing obligation.</p>
                    <p>Properties must monitor changes in:</p>
                    <ul>
                      <li>California law;</li>
<li>local ordinances;</li>
<li>zoning requirements;</li>
<li>lodging regulations;</li>
<li>pricing rules;</li>
<li>tax requirements;</li>
<li>accessibility requirements;</li>
<li>safety regulations;</li>
<li>and other rules applicable to the property.</li>
                    </ul>
                    <p className="font-bold text-ms-orange">MICROSTAY HOLDINGS LLC</p>
                    <p>d/b/a MicroStay.us</p>
                    <p>Partner Support: info@microstay.us</p>
                    <p>General Support: support@microstay.us</p>
                    <p>Website: MicroStay.us</p>

                  </div>
                )}

                <div className="mt-12 pt-8 border-t flex border-gray-200 dark:border-gray-800 justify-between items-center text-sm font-medium">
                  <button
                    onClick={() => handleTabChange(null)}
                    className="text-ms-orange hover:text-ms-orange-hover transition-colors"
                  >
                    &larr; Back to Policies
                  </button>
                  <Link href="/" className="text-ms-orange hover:text-ms-orange-hover transition-colors">
                    Back to Home &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
