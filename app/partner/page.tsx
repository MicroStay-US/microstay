'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, CircleCheck as CheckCircle, Clock, DollarSign, FileText, Camera, Users } from 'lucide-react';

export default function PartnerPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen  py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Partner with <strong className='text-ms-orange'>MicroStay</strong></h1>
          <p className="text-xl text-gray-600 mb-6">
            Join America's fastest-growing hourly motel booking platform
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            List your motel on MicroStay and reach thousands of customers looking for
            flexible, short-term accommodations. Simple process, transparent pricing, and
            full control over your availability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <DollarSign className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Earn More Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Fill empty rooms with hourly bookings. Simple transparent pricing with
                12% per booking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Flexible Time Slots</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Set up to 10 customizable time windows. Control your availability and
                pricing for each slot.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Reach More Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Connect with travelers, remote workers, and anyone needing flexible
                accommodations.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Complete the Partnership Application</h3>
                  <p className="text-gray-600">
                    Click the button below to fill out our comprehensive signup form. You'll need:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                    <li>Business name and license document</li>
                    <li>Motel details (name, address, location)</li>
                    <li>Point of contact information</li>
                    <li>Minimum 6 high-quality motel photos</li>
                    <li>Signed partnership agreement</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Wait for Approval (24-48 Hours)</h3>
                  <p className="text-gray-600">
                    Our team will review your application. You'll receive an email notification
                    once approved or if we need additional information.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Access Your Partner Dashboard</h3>
                  <p className="text-gray-600">
                    Once approved, you'll receive login credentials to access your partner portal
                    where you can:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                    <li>Set up 10 customizable time windows (minimum 3 hours each)</li>
                    <li>Manage pricing and availability</li>
                    <li>Block specific dates</li>
                    <li>Track bookings and revenue</li>
                    <li>Confirm check-ins and manage no-shows</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Start Accepting Bookings</h3>
                  <p className="text-gray-600">
                    Your motel will be live on MicroStay.us. Customers can instantly book available
                    time slots, and you'll receive notifications for each reservation.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:bg-slate-800 dark:border-transparent">
          <CardHeader>
            <CardTitle>Important Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>All time windows must be minimum 3 hours (legal requirement)</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Booking actions (check-in/no-show/cancel) must be updated within 48 hours</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Late updates incur a 12% of booking value</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Monthly platform fee: 12% of gross booking revenue</span>
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            size="lg"
            className="text-lg px-12 py-6 dark:bg-gradient-to-r dark:from-ms-orange dark:to-ms-teal dark:hover:scale-105 dark:active:sclae-95"
            onClick={() => router.push('/partner-signup')}
          >
            Start Your Application
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Already a partner? <a href="/vendor/login" className="text-blue-600 hover:underline">Sign in to Vendor Portal</a>
          </p>
        </div>
      </div>
    </div>
  );
}
