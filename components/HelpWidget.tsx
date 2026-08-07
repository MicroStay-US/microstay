'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleHelp as HelpCircle, Mail, X } from 'lucide-react';

type HelpWidgetProps = {
  userType?: 'customer' | 'vendor';
};

export default function HelpWidget({ userType = 'customer' }: HelpWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const supportEmail = 'support@microstay.us';
  const supportTitle = userType === 'vendor' ? 'Partner Support' : 'Customer Support';

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-80 shadow-2xl z-50 animate-in slide-in-from-bottom-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {supportTitle}
            </CardTitle>
            <CardDescription>We're here to help!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Need Assistance?</h4>
              <p className="text-sm text-gray-600 mb-3">
                {userType === 'vendor'
                  ? 'Contact our partner support team for help with your account, properties, or bookings.'
                  : 'Contact our support team for help with bookings, cancellations, or general inquiries.'}
              </p>
              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Mail className="h-4 w-4" />
                {supportEmail}
              </a>
            </div>

            {userType === 'customer' && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Quick Links</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/check-booking" className="text-blue-600 hover:text-blue-700">
                      Check Your Booking
                    </a>
                  </li>
                  <li>
                    <a href="/search" className="text-blue-600 hover:text-blue-700">
                      Find Motels
                    </a>
                  </li>
                </ul>
              </div>
            )}

            {userType === 'vendor' && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Resources</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Manage your properties and bookings</li>
                  <li>• Add team members (up to 3)</li>
                  <li>• Track revenue and performance</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
