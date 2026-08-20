import os

base_dir = r"c:\Users\navth\merging\microstay\app"

def create_page(path, title, date, content):
    full_path = os.path.join(base_dir, path, "page.tsx")
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    content_html = ""
    for line in content.strip().split('\n'):
        line = line.strip()
        if not line:
            continue
        if line.isupper() and len(line) > 10:
            content_html += f'        <h2>{line}</h2>\n'
        elif line.startswith(tuple(str(i)+'.' for i in range(1, 100))):
            content_html += f'        <h2>{line}</h2>\n'
        elif line.startswith('•'):
            content_html += f'        <ul><li>{line[1:].strip()}</li></ul>\n'
        else:
            content_html += f'        <p>{line}</p>\n'
    
    # fix ul/li grouping
    content_html = content_html.replace('</ul>\n        <ul>', '')

    jsx = f"""import {{ Metadata }} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {{
  title: '{title} | MicroStay',
  description: '{title} for MicroStay.',
}};

export default function {title.replace(' ', '').replace('&', '')}Page() {{
  const lastUpdated = '{date}';

  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black text-foreground transition-colors duration-300">
      {{/* Header */}}
      <div className="bg-orange-300 dark:bg-gradient-to-tl dark:from-black dark:to-ms-orange dark:via-black py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-ms-orange dark:text-white">
          <h1 className="text-4xl font-bold mb-3">{title}</h1>
          {{lastUpdated && <p className="text-orange-900 dark:text-white/40">Last updated: {{lastUpdated}}</p>}}
        </div>
      </div>

      {{/* Content */}}
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700 dark:text-gray-300 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-ms-text dark:[&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-ms-text dark:[&>h3]:text-gray-100 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_a]:text-ms-orange hover:[&_a]:text-ms-orange-hover [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white">
{content_html}
        <div className="mt-12 pt-8 border-t flex justify-between border-gray-200 dark:border-gray-800 text-start">
          <Link href="/" className="text-ms-orange hover:text-ms-orange-hover transition-colors font-medium">
            &larr; Back to MicroStay
          </Link>
        </div>
      </div>
    </div>
  );
}}
"""
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(jsx)

privacy_content = """This Privacy Policy explains how MICROSTAY HOLDINGS LLC, doing business as MicroStay.us ("MicroStay," "we," "us," or "our") collects, uses, discloses, retains, and protects personal information when individuals access or use MicroStay.us, create an account, make or manage reservations, communicate with us, or otherwise interact with services operated by MicroStay.
By using MicroStay, you acknowledge the information practices described in this Privacy Policy.
1. Scope of This Privacy Policy
This Privacy Policy applies to personal information processed by MicroStay in connection with:
• MicroStay.us;
• MicroStay user accounts;
• reservation functionality;
• customer support;
• emails and communications;
• MicroStay-related technology services;
• other services operated by MicroStay.
This Privacy Policy does not govern information independently collected by a participating hotel, motel, or lodging property.
Participating properties are independent businesses and may maintain their own privacy policies and information-handling practices.
2. MicroStay's Role
MicroStay operates an online lodging discovery and reservation technology marketplace.
MicroStay connects guests with independently operated lodging properties.
Under MicroStay's standard booking model:
• the participating property provides the lodging accommodation;
• the guest pays the participating property directly;
• MicroStay does not ordinarily collect the guest's lodging payment; and
• the participating property independently handles onsite check-in and payment processing.
3. Information We May Collect
Depending on how you interact with MicroStay, we may collect the following categories of information.
Account and Contact Information
This may include:
• full name;
• email address;
• telephone number;
• account identifier;
• authentication information; and
• communication preferences.
Reservation Information
This may include:
• reservation number;
• selected property;
• reservation date;
• selected stay window;
• expected check-in time;
• expected checkout time;
• room or accommodation type;
• number of guests;
• reservation status;
• cancellation status;
• No-Show status;
• requests submitted with a reservation; and
• communications relating to the reservation.
Device and Technical Information
When you access MicroStay, we or our authorized technology providers may automatically collect information such as:
• IP address;
• browser type;
• device type;
• operating system;
• language settings;
• referring page;
• pages viewed;
• session information;
• login activity;
• date and time of access;
• application activity;
• diagnostic information;
• security logs; and
• technical error information.
Location Information
We may infer your approximate geographic location from information such as your IP address.
If MicroStay offers a feature that accesses precise device location, device permission will be requested where required.
Communications
If you communicate with MicroStay, we may retain:
• emails;
• customer-support inquiries;
• forms;
• complaints;
• feedback;
• reservation-related communications; and
• related communication metadata.
Security and Fraud Information
We may process information reasonably necessary to:
• authenticate users;
• protect accounts;
• detect fraudulent reservations;
• prevent unauthorized access;
• investigate suspicious activity;
• protect Platform security;
• prevent misuse;
• enforce our Terms of Service; and
• protect MicroStay, users, and participating properties.
4. Government-Issued Identification
Participating properties may require guests to present valid government-issued photo identification at check-in.
The participating property is responsible for physically verifying guest identification.
MicroStay does not ordinarily require guests to upload copies of driver's licenses, passports, or similar identification documents through MicroStay.
Guests should not voluntarily send copies of sensitive identification documents to MicroStay unless MicroStay specifically requests limited information for a legitimate verification, fraud, security, legal, or compliance purpose.
5. Payment Information
Under MicroStay's standard pay-at-property model, guests pay the participating lodging property directly.
MicroStay therefore does not ordinarily collect or process the guest's lodging payment-card information.
Participating properties may independently collect payment information in accordance with their own payment practices.
MicroStay may separately use third-party payment processors for transactions between MicroStay and participating business partners.
If MicroStay introduces guest payment processing in the future, this Privacy Policy or an appropriate supplemental notice may be updated.
6. How We Collect Information
MicroStay may collect information:
• directly from you;
• when you create an account;
• when you make a reservation;
• when you communicate with MicroStay;
• automatically through your device;
• from participating properties in connection with reservations;
• from authorized service providers;
• from fraud-prevention or security providers; and
• from other lawful sources necessary to operate the Platform.
7. How We Use Information
MicroStay may use personal information to:
• create and maintain user accounts;
• authenticate users;
• process reservation requests;
• transmit reservation information to participating properties;
• provide reservation confirmations;
• manage reservations;
• facilitate reservation communications;
• provide customer service;
• respond to inquiries;
• provide technical support;
• maintain Platform security;
• prevent fraud and abuse;
• investigate suspicious activity;
• troubleshoot technical problems;
• improve MicroStay services;
• understand Platform performance;
• maintain business records;
• maintain reservation history;
• resolve disputes;
• enforce our Terms of Service;
• comply with legal requirements;
• respond to lawful governmental requests;
• establish or defend legal claims; and
• protect the rights and safety of MicroStay, guests, participating properties, and others.
8. Information Shared With Participating Properties
When you make a reservation, MicroStay may provide the participating property with information reasonably necessary to fulfill that reservation.
This may include:
• guest name;
• contact information;
• reservation number;
• reservation date;
• stay period;
• room category;
• number of guests;
• booking status;
• relevant guest requests; and
• other information reasonably necessary to fulfill the reservation.
Participating properties may independently collect additional information when you arrive at the property.
Information independently collected by a property is subject to that property's policies and applicable law.
9. Service Providers
MicroStay may use third-party service providers to support its operations.
These providers may assist with functions such as:
• website hosting;
• cloud infrastructure;
• databases;
• account authentication;
• email delivery;
• communications;
• cybersecurity;
• fraud prevention;
• analytics;
• diagnostics;
• error monitoring;
• customer support; and
• payment processing relating to applicable business transactions.
Service providers may receive information reasonably necessary to perform services for MicroStay.
10. Legal and Safety Disclosures
MicroStay may disclose information when reasonably necessary to:
• comply with applicable law;
• respond to a subpoena;
• respond to a court order;
• respond to a warrant;
• respond to another lawful governmental request;
• investigate suspected fraud;
• investigate cybersecurity incidents;
• enforce MicroStay agreements;
• protect MicroStay's legal rights;
• protect the safety of users or others;
• investigate suspected unlawful activity; or
• establish, exercise, or defend legal claims.
11. Business Transactions
If MicroStay is involved in a merger, acquisition, financing, restructuring, sale of assets, bankruptcy, or similar business transaction, personal information may be transferred or disclosed in connection with that transaction subject to applicable law.
12. Sale and Sharing of Personal Information
MicroStay does not currently sell personal information for monetary consideration.
MicroStay does not authorize participating properties to receive MicroStay reservation information for the purpose of selling guest personal information.
Certain privacy laws define "sale" or "sharing" more broadly than an exchange of information for money.
If MicroStay engages in activities that qualify as selling or sharing personal information under applicable law, MicroStay will provide applicable disclosures and opt-out mechanisms.
13. Cookies and Similar Technologies
MicroStay and authorized service providers may use technologies such as:
• cookies;
• local storage;
• pixels;
• software development kits;
• authentication tokens; and
• similar technologies.
These technologies may be used for:
• maintaining user sessions;
• authentication;
• remembering preferences;
• website functionality;
• security;
• fraud prevention;
• analytics;
• diagnostic monitoring; and
• improving Platform performance.
Where consent is legally required, MicroStay will provide appropriate consent controls.
You may also be able to manage cookies through your browser settings.
Disabling certain cookies may affect Platform functionality.
14. Analytics
MicroStay may use analytics technologies to better understand how users interact with the Platform.
Analytics information may include:
• pages viewed;
• session duration;
• device information;
• referral information;
• general location;
• browser information;
• website interactions; and
• technical performance.
Analytics information may be aggregated or de-identified where appropriate.
15. Data Retention
MicroStay retains personal information for as long as reasonably necessary to fulfill legitimate operational, contractual, security, fraud-prevention, accounting, dispute-resolution, and legal purposes.
Retention periods may depend on:
• the type of information;
• account status;
• reservation activity;
• fraud-prevention needs;
• cybersecurity needs;
• contractual obligations;
• disputes;
• legal claims; and
• applicable record-retention requirements.
When information is no longer reasonably required, MicroStay may delete, anonymize, de-identify, or securely dispose of it.
16. Information Security
MicroStay uses reasonable administrative, organizational, and technical safeguards intended to protect personal information against:
• unauthorized access;
• unauthorized disclosure;
• alteration;
• misuse;
• destruction; and
• loss.
However, no Internet service, computer system, network, database, or electronic transmission can be guaranteed to be completely secure.
Users are responsible for safeguarding their account credentials.
If you suspect unauthorized access to your MicroStay account, contact:
support@microstay.us
17. Children
MicroStay's reservation services are designed for adults.
A person making a reservation through MicroStay must be at least 18 years old.
Participating properties may require a higher minimum check-in age.
MicroStay is not directed to children under 13 and does not knowingly operate services designed to collect personal information from children under 13.
If we discover that personal information was collected from a child in violation of applicable law, we will take reasonable steps to address the information.
18. Privacy Rights
Depending on where you reside and applicable law, you may have rights concerning your personal information.
These rights may include the right to:
• request access to personal information;
• request information concerning how personal information is used;
• request correction;
• request deletion;
• request a portable copy of certain information;
• opt out of certain selling or sharing;
• limit certain uses of sensitive personal information;
• withdraw consent where applicable; and
• appeal certain privacy-request decisions where applicable.
Not every privacy right applies in every jurisdiction or in every circumstance.
MicroStay will process legally valid requests in accordance with applicable law.
19. California Privacy Rights
California residents may have privacy rights under applicable California privacy laws.
Depending on whether applicable statutory requirements are met, those rights may include the right to:
• know what personal information is collected;
• request access;
• request deletion;
• request correction;
• obtain information regarding certain disclosures;
• opt out of qualifying sale or sharing;
• limit certain qualifying uses of sensitive personal information; and
• exercise applicable privacy rights without unlawful discrimination.
Nothing in this Privacy Policy limits rights provided under applicable law.
20. Global Privacy Control
Where MicroStay is legally required to recognize an applicable opt-out preference signal, such as Global Privacy Control, MicroStay will process qualifying signals as required by applicable law.
21. Submitting a Privacy Request
To submit a privacy request, contact:
Email: support@microstay.us
Subject: Privacy Request
Please provide enough information for MicroStay to identify and reasonably verify the request.
MicroStay may request additional information where reasonably necessary to verify identity or prevent unauthorized disclosure.
22. Authorized Agents
Where applicable law permits a consumer to use an authorized agent to submit a privacy request, MicroStay may require reasonable evidence that the agent is authorized to act for the consumer.
MicroStay may also take reasonable steps to verify the consumer's identity where permitted.
23. Third-Party Websites
MicroStay may contain links to participating properties or other third-party websites.
MicroStay does not control the privacy practices of independent third parties.
A third party's collection and use of your information is governed by its own privacy policy and applicable law.
24. Changes to This Privacy Policy
MicroStay may update this Privacy Policy from time to time.
The most recent version will identify the date on which it was last updated.
If a change materially affects how MicroStay uses personal information, additional notice or consent will be provided when legally required.
25. Contact Us
For questions, requests, or concerns regarding this Privacy Policy or MicroStay's privacy practices:
MICROSTAY HOLDINGS LLC d/b/a MicroStay.us
Email: support@microstay.us
Subject: Privacy Inquiry"""

create_page("privacy", "Privacy Policy", "August 19, 2026", privacy_content)
