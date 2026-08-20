import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Accessibility Policy | MicroStay',
  description: 'Accessibility Policy for MicroStay.',
};

export default function AccessibilityPolicyPage() {
  const lastUpdated = 'August 19, 2026';

  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black text-foreground transition-colors duration-300">
      {/* Header */}
      <div className="bg-orange-300 dark:bg-gradient-to-tl dark:from-black dark:to-ms-orange dark:via-black py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-ms-orange dark:text-white">
          <h1 className="text-4xl font-bold mb-3">Accessibility Policy</h1>
          {lastUpdated && <p className="text-orange-900 dark:text-white/40">Last updated: {lastUpdated}</p>}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700 dark:text-gray-300 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-ms-text dark:[&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-ms-text dark:[&>h3]:text-gray-100 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_a]:text-ms-orange hover:[&_a]:text-ms-orange-hover [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white">
        <p>MICROSTAY HOLDINGS LLC d/b/a MicroStay.us is committed to providing users with meaningful access to the MicroStay Platform, including individuals with disabilities.</p>
        <p>We seek to improve the accessibility and usability of MicroStay.us as our Platform develops.</p>
        <h2>1. Our Accessibility Commitment</h2>
        <p>MicroStay seeks to design and operate its website and reservation functionality so that users with different abilities and assistive technologies can access important information and services.</p>
        <p>Our accessibility efforts may include:</p>
        <ul><li>keyboard navigation;</li><li>meaningful page structure;</li><li>accessible form labels;</li><li>text alternatives for important images;</li><li>readable text and contrast;</li><li>clear error messages;</li><li>compatibility improvements for screen readers;</li><li>scalable page content; and</li><li>accessible reservation workflows.</li></ul>
        <p>Accessibility is an ongoing process, and technology standards, browsers, devices, and assistive technologies may change over time.</p>
        <h2>2. Accessibility Standard</h2>
        <p>MicroStay uses recognized web-accessibility practices as a design and development reference, including relevant principles of the Web Content Accessibility Guidelines.</p>
        <p>This statement is not intended as a representation that every page, feature, third-party integration, or piece of content will be free from every accessibility issue at all times.</p>
        <p>MicroStay will make reasonable efforts to identify and address reported accessibility barriers.</p>
        <h2>3. Assistance Using MicroStay</h2>
        <p>If you experience difficulty accessing or using any part of MicroStay.us, please contact:</p>
        <p>support@microstay.us</p>
        <p>Subject: Accessibility Assistance</p>
        <p>When possible, please tell us:</p>
        <ul><li>the page or feature involved;</li><li>what you were trying to accomplish;</li><li>the device and browser being used; and</li><li>the type of assistive technology being used, if relevant.</li></ul>
        <p>Do not send medical documentation unless specifically requested and legally appropriate.</p>
        <p>We will make reasonable efforts to provide the information or service through an accessible alternative where appropriate.</p>
        <h2>4. Participating Properties</h2>
        <p>Hotels, motels, and lodging properties available through MicroStay are independently owned and operated.</p>
        <p>Each participating property is independently responsible for complying with accessibility laws applicable to its physical premises, guestrooms, facilities, policies, services, and operations.</p>
        <p>MicroStay does not own, construct, operate, or physically control participating properties.</p>
        <p>Hotels and motels are generally places of public accommodation subject to applicable federal accessibility requirements, and California businesses are also subject to state civil-rights requirements including the Unruh Civil Rights Act.</p>
        <h2>5. Accessible Room Information</h2>
        <p>A participating property may provide MicroStay with information concerning:</p>
        <ul><li>accessible guestrooms;</li><li>accessible bathrooms;</li><li>accessible entrances;</li><li>accessible parking;</li><li>elevators;</li><li>mobility-accessible features;</li><li>hearing-accessible features; and</li><li>other accessibility information.</li></ul>
        <p>MicroStay may display this information to assist users.</p>
        <p>Because this information is supplied or maintained by the participating property, guests requiring a specific accessibility feature should confirm that feature with the property when necessary before arrival.</p>
        <p>MicroStay does not independently certify the physical accessibility of every property or guestroom.</p>
        <h2>6. Reasonable Accommodations</h2>
        <p>Participating properties are responsible for handling requests for reasonable modifications and accommodations required in connection with their physical lodging services.</p>
        <p>Guests with specific accommodation needs may contact the participating property directly.</p>
        <p>MicroStay may assist with reservation-related information but does not control the physical property.</p>
        <h2>7. Service Animals</h2>
        <p>Participating properties must comply with applicable laws governing service animals.</p>
        <p>Where required by the Americans with Disabilities Act, an individual with a disability using a service animal must be permitted access to areas where guests are normally permitted.</p>
        <p>A service animal may not be restricted solely to designated "pet-friendly" guestrooms.</p>
        <p>A hotel may not impose a pet or cleaning fee merely because a guest uses a service animal, although the property may charge for actual damage caused by a service animal on the same basis it would charge other guests for damage.</p>
        <h2>8. Service Animals and Pet Policies</h2>
        <p>Property pet policies and service-animal obligations are different.</p>
        <p>A property's:</p>
        <ul><li>pet prohibition;</li><li>pet deposit;</li><li>pet fee; or</li><li>pet-room restriction</li></ul>
        <p>does not automatically apply to a qualifying service animal where applicable law provides otherwise.</p>
        <h2>9. Nondiscrimination</h2>
        <p>MicroStay does not intend to deny Platform services unlawfully because of disability.</p>
        <p>Participating properties are also required to comply with applicable nondiscrimination and public-accommodation laws.</p>
        <p>California's Unruh Civil Rights Act requires covered businesses, including hotels and motels, to provide full and equal access without prohibited discrimination.</p>
        <h2>10. Third-Party Content</h2>
        <p>MicroStay may use third-party services or integrations.</p>
        <p>Although MicroStay seeks to select and operate technology responsibly, some third-party content or functionality may present accessibility limitations outside MicroStay's direct control.</p>
        <p>If you encounter an accessibility issue involving third-party functionality used through MicroStay, please notify us.</p>
        <h2>11. Feedback</h2>
        <p>Accessibility feedback is welcome.</p>
        <p>Contact:</p>
        <h2>MICROSTAY HOLDINGS LLC</h2>
        <p>d/b/a MicroStay.us</p>
        <p>Email: support@microstay.us</p>
        <p>Subject: Accessibility Feedback</p>
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
