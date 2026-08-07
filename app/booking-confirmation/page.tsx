'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleCheck as CheckCircle, MapPin, Clock, Phone, Calendar, Shield } from 'lucide-react';

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/booking/${bookingId}`);
      if (!res.ok) {
        setBooking(null);
        return;
      }
      const data = await res.json();
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number | undefined) => {
    if (hour === undefined) return '';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black/30 py-12 px-4 shadow-inner">
        <div className="max-w-3xl mx-auto text-center font-bold text-gray-500 dark:text-white">Retrieving your reservation...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 shadow-inner">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl mb-6 font-bold text-gray-800">Booking not found</p>
          <Button onClick={() => router.push('/')} className="bg-orange-600 hover:bg-orange-700 text-white shadow-md font-bold">Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-black dark:via-orange-400 dark:to-black py-12 px-4 shadow-inner">
      <div className="max-w-3xl mx-auto">
        <Card className="mb-8 border-emerald-200 bg-emerald-50 dark:bg-green-700  dark:border-transparent shadow-md animate-pulse">
          <CardContent className="p-10 text-center">
            <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto mb-6 dark:text-white" />
            <h1 className="text-4xl font-black text-emerald-900 mb-3 tracking-tight dark:text-white">Reservation Confirmed!</h1>
            <p className="text-emerald-700 text-lg font-medium dark:text-white/30">
              Your room is successfully secured at the property.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6 shadow-xl border-gray-200">
          <CardHeader className="bg-gray-900 border-b border-gray-800 py-6">
            <CardTitle className="text-center text-gray-100 uppercase tracking-widest text-sm font-bold">Confirmation Code</CardTitle>
          </CardHeader>
          <CardContent className="p-8 bg-white">
            <p className="text-center text-5xl font-black text-orange-600 tracking-wider font-mono">
              {booking.booking_ref}
            </p>
            <p className="text-center text-sm font-bold text-gray-400 mt-4 uppercase tracking-widest">
              Show this code at the front desk
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-xl border-gray-200 dark:border-transparent overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 p-6 dark:border-black">
            <CardTitle className="text-xl font-bold text-gray-900">Reservation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 bg-white">
            <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-zinc-600/30">
              <MapPin className="h-6 w-6 text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Property</p>
                <p className="font-bold text-lg text-gray-900 mb-0.5">{booking.properties?.name}</p>
                <p className="text-gray-600 font-medium">
                  {booking.properties?.address}, {booking.properties?.city}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-zinc-600/30">
              <Calendar className="h-6 w-6 text-orange-500 mt-0.5" />
              <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                <p className="font-bold text-lg text-gray-900 mb-0.5">
                  {new Date(booking.booking_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-zinc-600/30">
              <Clock className="h-6 w-6 text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Time Window</p>
                <p className="font-bold text-lg text-gray-900 mb-0.5">
                  {formatHour(booking.vd_time_slots?.start_hour)} to {formatHour(booking.vd_time_slots?.end_hour)}
                </p>
                <p className="text-gray-600 font-medium capitalize">
                  {booking.vd_time_slots?.room_type} Room
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-zinc-600/30">
              <Phone className="h-6 w-6 text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Property Contact</p>
                <p className="font-bold text-lg text-gray-900 mb-0.5">{booking.properties?.phone}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 dark:bg-slate-900 dark:border-transparent">
              <div>
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Due at Property</p>
                 <span className="text-sm font-semibold text-gray-600">Pay at front desk</span>
              </div>
              <span className="text-3xl font-black text-emerald-600">
                ${booking.gross_amount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border border-orange-200 dark:bg-black/80 dark:border-transparent">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-bold text-orange-900">What's Next?</h3>
            </div>
            <ul className="space-y-3 text-orange-800 font-medium leading-relaxed">
              <li className="flex gap-3"><span className="font-black text-orange-400">•</span> Please arrive at the check-in time specified above</li>
              <li className="flex gap-3"><span className="font-black text-orange-400">•</span> Bring a valid government-issued ID for verification</li>
              <li className="flex gap-3"><span className="font-black text-orange-400">•</span> Have your booking reference ready: <strong className="font-black text-ms-orange bg-orange-100 px-2 py-0.5 rounded ml-1 dark:bg-zinc-700/30">{booking.booking_ref}</strong></li>
              <li className="flex gap-3"><span className="font-black text-orange-400">•</span> If your plans change, please contact the property directly ahead of time</li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button
            className="flex-1 h-14 bg-gray-900 hover:bg-black text-white font-bold text-lg shadow-lg dark:bg-black dark:hover:bg-zinc-200/20 dark:hover:border-zinc-200 hover:scale-105 active:scale-95"
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-14 font-bold text-gray-700 border-gray-300 hover:bg-gray-100 text-lg shadow-sm hover:scale-105 active:scale-95 dark:bg-ms-orange dark:border-transparent dark:text-white dark:hover:bg-orange-800 "
            onClick={() => router.push('/check-booking')}
          >
            Check Booking Status
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black py-12 px-4 shadow-inner"><div className="max-w-3xl mx-auto text-center font-bold text-gray-500 dark:text-white">Loading confirmation...</div></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
