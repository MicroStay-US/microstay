'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Mail } from 'lucide-react';

export default function WaitingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md">
            <CheckCircle2 className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Application Submitted</h1>
          <p className="text-gray-500 font-medium">Thank you for applying to partner with MicroStay.us.</p>
        </div>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white ring-1 ring-gray-100">
          <CardContent className="p-8 space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 items-start">
              <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 mb-1">Status: Pending Review</h3>
                <p className="text-sm text-amber-700 font-medium leading-relaxed">
                  Your application and agreement have been safely received. Our compliance team will review your property details. Please wait 24-48 hours for approval.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center gap-3 text-gray-600 font-medium mb-2">
                <Mail className="w-4 h-4 text-gray-400" /> Keep an eye on your inbox
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                If approved, we will email you the official activation link. You will then use the password you created to access your Vendor Dashboard.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button onClick={() => router.push('/')} className="h-14 text-lg font-bold bg-gray-900 hover:bg-black text-white w-full rounded-xl">
            Return to Website
          </Button>
          <Button onClick={() => router.push('/vendor/login')} variant="outline" className="h-14 font-bold text-gray-600 bg-white border-none shadow-sm hover:text-gray-900 w-full rounded-xl">
            Vendor Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
