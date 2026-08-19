'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download } from 'lucide-react';
import { AGREEMENT_TEXT } from '@/lib/agreement-text';

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
            onClick={() => window.open('/microstay-partneragreement.pdf', '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        <ScrollArea className="h-[400px] border rounded-lg p-6" onScroll={handleScroll}>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap font-sans text-gray-800">
            {AGREEMENT_TEXT.split('\n').map((line, idx) => {
              const isHeading =
                line.trim() === 'MICROSTAY PARTNER AGREEMENT' ||
                line.trim() === 'PARTNER INFORMATION' ||
                line.trim() === 'MICROSTAY' ||
                /^\d+\.\s+[A-Z0-9\s\-'/]+$/.test(line.trim());

              if (isHeading) {
                return (
                  <span key={idx} className="text-ms-orange font-bold block mt-6 mb-2">
                    {line}
                  </span>
                );
              }
              return (
                <span key={idx}>
                  {line}
                  {'\n'}
                </span>
              );
            })}
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
              structure (12% commission) and agree to pay invoices on the 1st of each month. I confirm
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
