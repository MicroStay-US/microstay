'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download } from 'lucide-react';

interface PartnerAgreementProps {
  onAccept: () => void;
  accepted: boolean;
}

export default function PartnerAgreement({ onAccept, accepted }: PartnerAgreementProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [tempAccepted, setTempAccepted] = useState(accepted);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const scrolledToBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <= 20;
    if (scrolledToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (tempAccepted) {
      onAccept();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          MicroStay Partner Agreement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            Please read the entire agreement below before accepting
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/MicroStay_Final_Agreement.docx', '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        <ScrollArea className="h-[400px] border rounded-lg p-6" onScroll={handleScroll}>
          <div className="prose prose-sm max-w-none space-y-4">
            <h2 className="text-xl font-bold text-center">MICROSTAY PARTNER AGREEMENT</h2>

            <p className="text-center text-sm text-gray-600">
              Last Updated: January 2026
            </p>

            <h3 className="text-lg font-semibold mt-6">1. AGREEMENT TO TERMS</h3>
            <p>
              This Partner Agreement ("Agreement") is entered into between MicroStay.us ("MicroStay", "we", "us", or "our")
              and the property owner or authorized representative ("Partner", "you", or "your") who operates a motel or
              lodging facility listed on the MicroStay platform.
            </p>
            <p>
              By signing this Agreement, you agree to be bound by these terms and conditions for the provision of hourly
              motel booking services through the MicroStay platform.
            </p>

            <h3 className="text-lg font-semibold mt-6">2. SERVICE DESCRIPTION</h3>
            <p>
              MicroStay operates a digital platform that connects travelers with motels offering flexible hourly booking
              options. As a Partner, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>List your property on the MicroStay platform</li>
              <li>Provide accurate information about your property, including photos, amenities, and location</li>
              <li>Honor all bookings made through the platform</li>
              <li>Maintain your property to advertised standards</li>
              <li>Provide excellent customer service to MicroStay users</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">3. PAYMENT TERMS & PLATFORM FEES</h3>
            <h4 className="font-semibold mt-4">3.1 Payment Collection</h4>
            <p>
              Partners collect payment directly from customers at check-in. MicroStay does not process customer payments
              on your behalf. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Collecting the full booking amount from customers</li>
              <li>Accepting standard payment methods (cash, credit cards)</li>
              <li>Providing receipts to customers</li>
              <li>Managing refunds or disputes with customers directly</li>
            </ul>

            <h4 className="font-semibold mt-4">3.2 Platform Fees</h4>
            <p>
              For use of the MicroStay platform, Partners pay a monthly platform fee calculated as follows:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg my-4">
              <p className="font-semibold">Platform Fee = 12% of gross booking revenue</p>
              <p className="text-sm text-gray-600 mt-2">
                Example: For a $60 booking, the platform fee is ($60 × 0.12) = $7.2
              </p>
            </div>

            <h4 className="font-semibold mt-4">3.3 Monthly Billing Cycle</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>1st of month:</strong> MicroStay automatically generates an invoice for the previous month's bookings</li>
              <li><strong>Invoice details:</strong> Total bookings, gross revenue collected, and platform fees due</li>
              <li><strong>Due date:</strong> Payment is due within 7 days of invoice date</li>
              <li><strong>5th of month:</strong> Payment reminder sent if invoice remains unpaid</li>
              <li><strong>7th of month:</strong> Properties automatically disabled if payment not received</li>
            </ul>

            <h4 className="font-semibold mt-4">3.4 Payment Methods</h4>
            <p>Partners must pay monthly platform fees via:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Bank transfer / ACH</li>
              <li>Check (payable to MicroStay.us)</li>
              <li>Other payment methods as agreed in writing</li>
            </ul>

            <h4 className="font-semibold mt-4">3.5 Reactivation After Non-Payment</h4>
            <p>
              Properties disabled due to non-payment will be reactivated within 24 hours of payment confirmation and
              admin verification.
            </p>

            <h3 className="text-lg font-semibold mt-6">4. PROPERTY STANDARDS</h3>
            <p>Partners must maintain the following standards:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Clean, safe, and well-maintained rooms</li>
              <li>Working amenities as advertised</li>
              <li>Compliance with local health and safety regulations</li>
              <li>Valid business license and permits</li>
              <li>Adequate insurance coverage</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">5. BOOKING MANAGEMENT</h3>
            <h4 className="font-semibold mt-4">5.1 Check-in Process</h4>
            <p>Partners must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Honor all confirmed bookings</li>
              <li>Check guests in within 15 minutes of arrival</li>
              <li>Verify booking details through the MicroStay platform</li>
              <li>Collect payment directly from customers</li>
              <li>Mark bookings as "checked in" or "no-show" in the system</li>
            </ul>

            <h4 className="font-semibold mt-4">5.2 Cancellations</h4>
            <p>
              Partners may cancel bookings only in emergency situations (e.g., property damage, safety concerns).
              Frequent cancellations may result in account suspension.
            </p>

            <h3 className="text-lg font-semibold mt-6">6. DATA AND PRIVACY</h3>
            <p>Partners agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Protect customer information in accordance with privacy laws</li>
              <li>Use customer data only for booking fulfillment</li>
              <li>Not share customer information with third parties</li>
              <li>Report any data breaches to MicroStay immediately</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">7. INTELLECTUAL PROPERTY</h3>
            <p>
              Partners grant MicroStay a non-exclusive license to use property photos, descriptions, and branding
              materials for marketing purposes on the platform.
            </p>

            <h3 className="text-lg font-semibold mt-6">8. TERM AND TERMINATION</h3>
            <h4 className="font-semibold mt-4">8.1 Term</h4>
            <p>
              This Agreement begins upon approval of your Partner application and continues until terminated by either party.
            </p>

            <h4 className="font-semibold mt-4">8.2 Termination by Partner</h4>
            <p>
              Partners may terminate this Agreement with 30 days written notice. All outstanding platform fees must be
              paid before termination is effective.
            </p>

            <h4 className="font-semibold mt-4">8.3 Termination by MicroStay</h4>
            <p>MicroStay may terminate this Agreement immediately for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violation of Agreement terms</li>
              <li>Repeated non-payment</li>
              <li>Poor customer reviews or complaints</li>
              <li>Fraudulent activity</li>
              <li>Failure to maintain property standards</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">9. LIABILITY AND INDEMNIFICATION</h3>
            <p>
              Partners agree to indemnify and hold harmless MicroStay from any claims, damages, or expenses arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Property conditions or maintenance issues</li>
              <li>Customer injuries or damages at the property</li>
              <li>Partner's violation of laws or regulations</li>
              <li>Partner's breach of this Agreement</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">10. DISPUTE RESOLUTION</h3>
            <p>
              Any disputes arising from this Agreement shall be resolved through binding arbitration in accordance with
              the rules of the American Arbitration Association.
            </p>

            <h3 className="text-lg font-semibold mt-6">11. AMENDMENTS</h3>
            <p>
              MicroStay reserves the right to modify this Agreement with 30 days notice. Continued use of the platform
              after modifications constitutes acceptance of the updated terms.
            </p>

            <h3 className="text-lg font-semibold mt-6">12. CONTACT INFORMATION</h3>
            <div className="bg-gray-50 p-4 rounded-lg my-4">
              <p><strong>MicroStay.us</strong></p>
              <p className="mt-2">All Support: support@microstay.us</p>
            </div>

            <div className="border-t pt-6 mt-8 text-center text-sm text-gray-600">
              <p>By accepting this agreement, you confirm that you have read, understood, and agree to be bound by all terms and conditions.</p>
            </div>
          </div>
        </ScrollArea>

        {!hasScrolledToBottom && (
          <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded border border-yellow-200 space-y-2">
            <p>Please scroll to the bottom of the agreement to enable the accept checkbox</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHasScrolledToBottom(true)}
              className="text-xs"
            >
              I have read the entire agreement
            </Button>
          </div>
        )}

        <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border">
          <Checkbox
            id="agreement-accept"
            checked={tempAccepted}
            onCheckedChange={(checked) => setTempAccepted(checked as boolean)}
            disabled={!hasScrolledToBottom}
            className="mt-1"
          />
          <div className="flex-1">
            <Label
              htmlFor="agreement-accept"
              className={`text-sm leading-relaxed ${!hasScrolledToBottom ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              I have read and agree to the MicroStay Partner Agreement. I understand the monthly billing
              structure (12% of gross revenue) and agree to pay invoices within 7 days. I confirm
              that I have the authority to enter into this agreement on behalf of my business.
            </Label>
          </div>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!tempAccepted || !hasScrolledToBottom}
          className="w-full"
          size="lg"
        >
          Accept Agreement & Continue
        </Button>
      </CardContent>
    </Card>
  );
}
