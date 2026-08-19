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
              <div className="max-w-3xl mx-auto text-gray-700 dark:text-gray-300 space-y-6 [&>h2]:text-3xl [&>h2]:font-black [&>h2]:text-ms-text dark:[&>h2]:text-white [&>h2]:mb-2 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-ms-text dark:[&>h3]:text-gray-100 [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:leading-relaxed [&>p]:text-slate-600 dark:[&>p]:text-slate-300 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_a]:text-ms-orange hover:[&_a]:text-ms-orange-hover [&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-white">
                
                {/* 1. GENERAL TERMS OF SERVICE */}
                {activeTab === "terms" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Terms of Service</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>

                    <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-8">
                      Welcome to MicroStay. By accessing or using our platform at <strong>microstay.us</strong>,
                      you agree to be bound by these Terms of Services. Please read them carefully.
                    </p>

                    <h3>1. Acceptance of Terms</h3>
                    <p>
                      By creating an account or making a booking, you represent that you are at least 18 years old
                      and have the legal capacity to enter into a binding contract. If you do not agree to these
                      Terms, do not use MicroStay.
                    </p>

                    <h3>2. Description of Service</h3>
                    <p>
                      MicroStay is an online marketplace that connects guests with motel and lodging properties
                      offering hourly or short-duration room rentals ("MicroStays"). MicroStay is a technology
                      platform only — we do not own, operate, or manage any of the listed properties.
                    </p>

                    <h3>3. User Accounts</h3>
                    <ul>
                      <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                      <li>You must notify us immediately of any unauthorized account access.</li>
                      <li>You may not share your account with others or create accounts on behalf of third parties.</li>
                      <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
                    </ul>

                    <h3>4. Bookings and Payments</h3>
                    <ul>
                      <li>All bookings are subject to property availability and vendor confirmation.</li>
                      <li>Prices are displayed in US Dollars.</li>
                      <li><strong>Customer Payments:</strong> Customers do not pay MicroStay a booking, service, or platform fee. Customers pay the property directly at check-in. MicroStay does not collect guest payments, does not hold guest funds, and does not process refunds.</li>
                      <li> Vendors are responsible for collecting guest payment, honoring confirmed bookings, and applying their own cancellation/no-show policies.</li>
                      <li>
                        <strong>Cancellations:</strong> Cancellation and refund policies vary by property. The
                        policy applicable to your booking is displayed before checkout. MicroStay is not responsible
                        for vendor-level cancellation policies.
                      </li>
                      <li>No-shows may result in forfeiture of the full booking amount.</li>
                    </ul>

                    <h3>5. Guest Conduct</h3>
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

                    <h3>6. Vendor Terms</h3>
                    <p>
                      Property vendors are bound by a separate Partner Agreement signed during onboarding. Key points:
                    </p>
                    <ul>
                      <li>Vendors must ensure their listings are accurate, complete, and up to date.</li>
                      <li>Vendors must honor confirmed bookings.</li>
                      <li>Vendors may not circumvent the platform to arrange direct payments with guests for stays
                          found through MicroStay.</li>
                    </ul>

                    <h3>7. Intellectual Property</h3>
                    <p>
                      The MicroStay name, logo, and all platform content (excluding user-generated content) are owned
                      by MICROSTAY HOLDINGS LLC and protected by U.S. and international copyright and trademark laws. You may
                      not reproduce, distribute, or create derivative works without our prior written consent.
                    </p>

                    <h3>8. Disclaimer of Warranties</h3>
                    <p>
                      THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                      IMPLIED. MICROSTAY DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
                      FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
                    </p>

                    <h3>9. Limitation of Liability</h3>
                    <p>
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, MICROSTAY SHALL NOT BE LIABLE FOR ANY INDIRECT,
                      INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS OR DATA,
                      ARISING FROM YOUR USE OF THE PLATFORM, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                      OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO MICROSTAY
                      IN THE 12 MONTHS PRECEDING THE CLAIM.
                    </p>

                    <h3>10. Indemnification</h3>
                    <p>
                      You agree to indemnify and hold harmless MicroStay, its officers, directors, employees, and
                      agents from any claims, damages, or expenses (including reasonable attorney's fees) arising
                      from your use of the platform, your violation of these Terms, or your violation of any rights
                      of another party.
                    </p>

                    <h3>11. Governing Law and Disputes</h3>
                    <p>
                      These Terms are governed by the laws of the State of California, without regard to conflict-of-law
                      principles. Any disputes shall be resolved through binding arbitration under the rules of the
                      American Arbitration Association, except that either party may seek injunctive relief in any
                      court of competent jurisdiction.
                    </p>

                    <h3>12. Changes to Terms</h3>
                    <p>
                      We may modify these Terms at any time. Continued use of the platform after changes are posted
                      constitutes your acceptance of the revised Terms. We will provide notice of material changes
                      via email or a banner on the site.
                    </p>

                    <h3>13. Contact</h3>
                    <p>
                      Questions about these Terms?<br />
                      <strong>MICROSTAY HOLDINGS LLC</strong><br />
                      Support: <a href="mailto:support@microstay.us">support@microstay.us</a>
                    </p>
                  </div>
                )}

                {/* 2. CANCELLATION POLICY */}
                {activeTab === "cancellation" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Cancellation Policy</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>

                    <h3>1. California SB 644 Statutory Right of Cancellation</h3>
                    <p>
                      In accordance with California Senate Bill 644 (SB 644), which took effect on July 1, 2024, guests booking accommodations located in the State of California are entitled to specific cancellation rights:
                    </p>
                    <ul>
                      <li><strong>24-Hour Cooling-Off Period:</strong> You may cancel any confirmed reservation for a lodging property in California without penalty for a full refund within 24 hours of receiving confirmation of the booking.</li>
                      <li><strong>72-Hour Lead Time Requirement:</strong> This statutory right to a penalty-free cancellation applies only if the reservation was made at least 72 hours before the scheduled check-in time.</li>
                      <li><strong>Full Refund Processing:</strong> If you cancel a qualifying reservation within this 24-hour window, the lodging vendor must issue a full refund to your original form of payment within 30 days of the cancellation. This includes all optional service fees.</li>
                    </ul>

                    <h3>2. Property-Level Cancellation Policies</h3>
                    <p>
                      For bookings that do not meet the criteria of California SB 644 (such as reservations made less than 72 hours before check-in or cancellations requested after the 24-hour cooling-off period):
                    </p>
                    <ul>
                      <li>Cancellation, modification, and refund terms are determined solely by the individual lodging property/vendor's local policies.</li>
                      <li>The specific cancellation terms applicable to your booking are clearly displayed on the checkout page before you finalize your reservation.</li>
                      <li>MicroStay is a technology platform and is not responsible for, nor can it override, property-specific cancellation or no-show policies.</li>
                    </ul>

                    <h3>3. Payment and Refunds</h3>
                    <p>
                      Since guests pay lodging properties directly at check-in (MicroStay does not collect guest payments, hold guest funds, or charge service fees to guests), all refunds and charge resolutions are handled directly by the lodging property.
                    </p>

                    <h3>4. No-Show Policies</h3>
                    <p>
                      If you fail to arrive for your reservation at the scheduled check-in time without completing a valid cancellation under the property’s policy, the vendor may treat the reservation as a &quot;no-show.&quot; No-shows may result in being charged the full booking amount in accordance with the vendor's policy.
                    </p>
                  </div>
                )}

                {/* 3. ACCESSIBILITY POLICY */}
                {activeTab === "accessibility" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Accessibility Policy</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>

                    <h3>1. Our Commitment to Accessibility</h3>
                    <p>
                      MicroStay is committed to promoting digital accessibility and ensuring our platform is usable by all individuals, including those with disabilities. We strive to provide a positive user experience and equal access to our lodging marketplace in compliance with Title III of the Americans with Disabilities Act (ADA) and California's Unruh Civil Rights Act (Cal. Civ. Code § 51).
                    </p>

                    <h3>2. Digital Platform Accessibility (WCAG 2.1 AA)</h3>
                    <p>
                      We actively work to align our website and booking platform with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. Our accessibility efforts include:
                    </p>
                    <ul>
                      <li>Supporting screen reader compatibility and keyboard-only navigation.</li>
                      <li>Maintaining appropriate color contrast and text scaling options.</li>
                      <li>Providing alternative text for non-text content where appropriate.</li>
                    </ul>
                    <p>
                      If you experience difficulty accessing any part of our platform, please email us at <a href="mailto:support@microstay.us">support@microstay.us</a>. We will make all reasonable efforts to address the issue and assist you in completing your booking.
                    </p>

                    <h3>3. Physical Property Accessibility Disclosures</h3>
                    <p>
                      To assist guests with physical, mobility, visual, or hearing disabilities, MicroStay requires all property vendors listing on our platform to disclose the accessibility features of their facilities and guest rooms:
                    </p>
                    <ul>
                      <li><strong>Detailed Disclosures:</strong> Vendors must specify if they offer ADA-compliant rooms, wheelchair-accessible paths of travel, roll-in showers, grab bars, visual alarms, and other accessibility features.</li>
                      <li><strong>Informed Choice:</strong> These property-specific details are displayed on each property listing to help guests determine if the accommodation fits their personal needs.</li>
                      <li><strong>Vendor Compliance:</strong> Lodging properties are public accommodations and are legally required under federal and state law to maintain accessible facilities and honor accessible room reservations.</li>
                    </ul>

                    <h3>4. Service Animals</h3>
                    <p>
                      In accordance with the ADA and California law, property partners must accommodate service animals (defined as dogs or miniature horses trained to perform work or tasks for a person with a disability). Lodging vendors may not charge additional pet fees, deposits, or deny access to guests accompanied by service animals.
                    </p>
                  </div>
                )}

                {/* 4. SAFETY & SECURITY */}
                {activeTab === "safety" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Safety &amp; Security Policy</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>

                    <h3>1. Safety Standards Overview</h3>
                    <p>
                      The safety and security of guests, property partners, and staff are paramount at MicroStay. We expect all users to interact respectfully and maintain high safety standards on all listed properties.
                    </p>

                    <h3>2. Emergency Response</h3>
                    <p>
                      <strong>In an Emergency:</strong> If you face an immediate threat to life, health, or safety, or witness an active crime, you must immediately call <strong>911</strong> or contact local law enforcement or emergency services.
                    </p>
                    <p>
                      For non-emergency safety concerns or to report violations of our community guidelines, please contact our support team at <a href="mailto:support@microstay.us">support@microstay.us</a>.
                    </p>

                    <h3>3. Prohibited Conduct</h3>
                    <p>
                      The following behaviors and items are strictly prohibited at all MicroStay properties:
                    </p>
                    <ul>
                      <li><strong>Illegal Activities:</strong> Engagement in any unlawful act, including drug use, commercial sex work, or human trafficking.</li>
                      <li><strong>Weapons and Hazards:</strong> Carrying, storing, or using firearms, explosives, or hazardous materials on property premises.</li>
                      <li><strong>Violence and Harassment:</strong> Engaging in physical violence, threats, intimidation, verbal abuse, or harassment toward guests, hosts, or property staff.</li>
                      <li><strong>Property Damage:</strong> Intentional destruction, theft, or vandalism of lodging premises or guest belongings.</li>
                    </ul>

                    <h3>4. Guest and Partner Responsibilities</h3>
                    <ul>
                      <li><strong>Guests:</strong> You must comply with all property-specific safety guidelines, check-out instructions, noise curfews, and maximum occupancy limits.</li>
                      <li><strong>Lodging Partners:</strong> Vendors must ensure guest rooms have secure, functioning locks, clear emergency egress, visible fire extinguishers, working smoke and carbon monoxide detectors, and well-lit common areas.</li>
                    </ul>
                  </div>
                )}

                {/* 5. CALIFORNIA PROPERTY REQUIREMENTS */}
                {activeTab === "california" && (
                  <div>
                    <h2 className="text-3xl font-bold mb-2">California Property Requirements</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {lastUpdated}
                    </p>

                    <h3>1. Carbon Monoxide and Smoke Detector Compliance</h3>
                    <p>
                      Pursuant to the California Carbon Monoxide Poisoning Prevention Act (California Health &amp; Safety Code &sect; 17926 et seq.), all lodging and residential rental properties operating in California must install and maintain working carbon monoxide detectors:
                    </p>
                    <ul>
                      <li>Detectors must be installed in the immediate vicinity of all sleeping areas and on every level of the dwelling.</li>
                      <li>Working smoke detectors are required in each bedroom and on all levels of the property.</li>
                      <li>Property partners are responsible for testing and maintaining these units regularly.</li>
                    </ul>

                    <h3>2. Rate Transparency and Fee Disclosures (SB 478 / AB 537)</h3>
                    <p>
                      In compliance with California's &quot;Honest Pricing Act&quot; (Senate Bill 478) and Assembly Bill 537, lodging properties in California must display clear and transparent pricing:
                    </p>
                    <ul>
                      <li><strong>All-Inclusive Rates:</strong> The rate displayed to guests on our platform before booking must include all mandatory fees, charges, and surcharges (such as cleaning fees or resort fees).</li>
                      <li><strong>Taxes:</strong> Government-imposed transient occupancy taxes, tourism fees, and sales taxes are excluded from the initial mandatory rate display but are clearly itemized prior to final confirmation.</li>
                    </ul>

                    <h3>3. Proposition 65 Safe Drinking Water Warning</h3>
                    <p>
                      The California Safe Drinking Water and Toxic Enforcement Act of 1986 (Proposition 65) requires businesses to warn guests about exposures to chemicals known to cause cancer, birth defects, or other reproductive harm:
                    </p>
                    <ul>
                      <li>Lodging premises in California may contain materials or expose visitors to substances (such as secondhand smoke, exhaust, or common cleaning products) covered by Proposition 65.</li>
                      <li>Properties must post clear, compliant warning notices on site where applicable.</li>
                    </ul>

                    <h3>4. Human Trafficking Awareness (Cal. Civ. Code &sect; 52.6)</h3>
                    <p>
                      California motels, hotels, and lodging properties are required by law to train their employees to recognize the signs of human trafficking and post mandatory informational notices in visible areas near check-in desks and employee breakrooms.
                    </p>

                    <h3>5. Local Municipal Ordinances</h3>
                    <p>
                      Property partners operating short-term rentals (STR) or lodging in California must comply with all local county or city ordinances. This includes maintaining active business licenses, obtaining short-term rental permits, respecting local noise rules, and collecting and remitting Transient Occupancy Taxes (TOT).
                    </p>
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
