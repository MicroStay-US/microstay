'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Clock, DollarSign, Shield, Calendar, Zap } from 'lucide-react';

function BookingContent() {
  const params = useParams(); // slot_id
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth(); // Wait, they can book unauthenticated too, right?

  const [propertyDetails, setPropertyDetails] = useState<any>(null);
  const [timeSlot, setTimeSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const propertyId = searchParams.get('propertyId');
  const dateStr = searchParams.get('date');
  // NOTE: do NOT trust ?price= from URL — grossAmount is always re-fetched server-side

  useEffect(() => {
    fetchBookingDetails();
  }, [params.id]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      // Check default slots first
      const { data: slotData } = await supabase
        .from('vd_time_slots')
        .select(`*, properties ( * )`)
        .eq('id', params.id)
        .maybeSingle();

      if (slotData) {
        setTimeSlot(slotData);
        setPropertyDetails(slotData.properties);
      } else {
        // Fall back to date-specific window
        const { data: dwData } = await supabase
          .from('vd_date_windows')
          .select(`*, properties:property_id ( * )`)
          .eq('id', params.id)
          .maybeSingle();

        if (dwData) {
          setTimeSlot(dwData);
          setPropertyDetails((dwData as any).properties);
        }
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBooking(true);
    setError('');

    try {
      // Always use server-fetched price — never use URL params
      const grossAmount = Number(timeSlot.price_per_room || 0);

      // Server-side atomic booking — prevents double-booking via DB advisory lock
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: params.id,
          propertyId,
          vendorId: propertyDetails.vendor_id,
          guestName,
          guestEmail: guestEmail || user?.email || '',
          guestPhone,
          dateStr,
          grossAmount,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Failed to create booking');
        setBooking(false);
        return;
      }

      const { bookingId, bookingRef } = result;
      const newBooking = { id: bookingId };

      const timeWindowStr = `${formatHour(timeSlot.start_hour)} – ${formatHour(timeSlot.end_hour)}`;
      const bookingDateStr = new Date((dateStr || '') + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
      });

      // 5. Fire asynchronous notification to the vendor
      fetch('/api/notify/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorEmail: propertyDetails?.vendor?.email || propertyDetails?.email,
          vendorId: propertyDetails?.vendor_id || propertyDetails?.vendor?.id,
          propertyId: propertyDetails?.id,
          guestName,
          bookingRef,
          checkInTime: timeWindowStr,
          roomsBooked: 1,
          price: grossAmount,
        })
      }).catch(console.error);

      // 6. Fire confirmation email to the guest
      const guestEmailAddr = guestEmail || user?.email || '';
      if (guestEmailAddr) {
        fetch('/api/notify/guest-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestEmail: guestEmailAddr,
            guestName,
            bookingRef,
            propertyName: propertyDetails.name,
            propertyAddress: propertyDetails.address || '',
            propertyCity: propertyDetails.city || '',
            propertyPhone: propertyDetails.phone || '',
            checkInTime: timeWindowStr,
            bookingDate: bookingDateStr,
            roomType: `${timeSlot.room_type || ''} ${timeSlot.bed_type || ''}`.trim(),
            price: grossAmount,
          })
        }).catch(console.error);
      }

      // 7. Fire notification email to Admin
      fetch('/api/notify/admin-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          guestEmail: guestEmailAddr,
          propertyName: propertyDetails.name,
          bookingRef,
          checkInTime: timeWindowStr,
          roomsBooked: 1,
          price: grossAmount,
        })
      }).catch(console.error);

      // Navigate to confirmation with the generated UUID, not the reference string
      router.push(`/booking-confirmation?bookingId=${newBooking.id}`);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      setError(error.message || 'Failed to create booking');
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-300/40 dark:bg-black py-12 px-4 shadow-inner">
        <div className="max-w-3xl mx-auto text-center font-bold text-gray-500 dark:text-white">Loading checkout...</div>
      </div>
    );
  }

  if (!timeSlot || !propertyDetails) {
    return (
      <div className="min-h-screen bg-orange-300/40 py-12 px-4 shadow-inner">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl mb-6 font-bold text-gray-800">Booking details not found</p>
          <Button onClick={() => router.push('/search')} className="bg-orange-600 hover:bg-orange-700 text-white shadow-md font-bold">Back to Motels</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black/60 py-12 px-4 shadow-inner">
      <div className="max-w-4xl mx-auto">
        
        <h1 className="text-3xl font-black mb-6 text-gray-900 tracking-tight">Complete Your Reservation</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <Card className="border-gray-200 shadow-xl overflow-hidden pt-0">
              <div className="dark:bg-gray-900 bg-orange-400/40 p-6 flex items-center gap-4 text-white">
                 <div className="bg-orange-500 w-12 h-12 flex items-center justify-center rounded-xl shadow-inner">
                   <Clock className="w-6 h-6 text-white" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-black dark:text-white uppercase tracking-wider mb-0.5">Time Window</p>
                   <p className="text-xl font-black text-ms-orange tracking-tight">{formatHour(timeSlot.start_hour)} - {formatHour(timeSlot.end_hour)}</p>
                 </div>
              </div>
              <CardContent className="p-8 space-y-6 bg-orange-600/40 dark:bg-transparent">
                <div className="flex items-start gap-3 pb-6 border-b dark:border-black border-gray-100">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-lg text-gray-900 dark:text-ms-orange">{propertyDetails.name}</p>
                    <p className="text-gray-500 font-medium">{propertyDetails.address}, {propertyDetails.city}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pb-6 border-b dark:border-black border-gray-100">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900">
                      {new Date((dateStr || '') + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-gray-500 font-medium capitalize mt-1">
                      {timeSlot.room_type} Room • {timeSlot.bed_type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <div>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-1">Total Rate</p>
                    <p className="font-black text-3xl text-emerald-600">${timeSlot.price_per_room}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

             <Card className="bg-orange-500/50 border-orange-200 dark:border-transparent dark:bg-black/50 shadow-sm">
              <CardContent className="p-6 flex items-start gap-4">
                 <Zap className="w-6 h-6 text-orange-600 dark:fill-orange-600 flex-shrink-0" />
                 <div>
                   <h4 className="font-bold text-orange-700 mb-1">Instant Confirmation</h4>
                   <p className="text-sm text-orange-800/70 font-medium leading-relaxed">Your booking will be immediately reserved at the property. No upfront payment required; pay directly at the front desk upon arrival.</p>
                 </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-gray-200 dark:border-transparent shadow-xl overflow-hidden">
              <CardHeader className="bg-orange-400/40 dark:bg-gray-900 border-b border-gray-100 dark:border-black p-8 pb-6 border-transparent">
                <CardTitle className="text-xl font-bold text-gray-900">Guest Information</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-6 bg-orange-600/40 dark:bg-transparent">
                <form onSubmit={handleBooking} className="space-y-6">
                  {error && (
                    <Alert variant="destructive" className="bg-rose-50 dark:bg-rose-700/40 dark:text-white dark:border-transparent border-rose-200 text-rose-800">
                      <AlertDescription className="font-bold">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2.5">
                    <Label htmlFor="guestName" className="text-xs font-bold text-gray-600 uppercase tracking-wider">Full Name *</Label>
                    <Input
                      id="guestName"
                      type="text"
                      placeholder="Jane Doe"
                      className="bg-gray-50 dark:bg-black dark:text-white border-gray-200 h-12 font-medium"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                  
                   <div className="space-y-2.5">
                    <Label htmlFor="guestEmail" className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email Address *</Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      placeholder="jane@example.com"
                      className="bg-gray-50 dark:bg-black dark:text-white border-gray-200 h-12 font-medium"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="guestPhone" className="text-xs font-bold text-gray-600 uppercase tracking-wider">Mobile Phone *</Label>
                    <Input
                      id="guestPhone"
                      type="tel"
                      placeholder="(555) 555-5555"
                      className="bg-gray-50 dark:bg-black dark:text-white border-gray-200 h-12 font-medium"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex flex-col gap-3">
                    <Button type="submit" className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 text-white font-black text-lg shadow-lg" disabled={booking}>
                      {booking ? 'Reserving...' : 'Confirm Reservation'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 h-12"
                      onClick={() => router.back()}
                      disabled={booking}
                    >
                      Go Back
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-700 py-12 px-4 shadow-inner"><div className="max-w-3xl mx-auto text-center font-bold text-gray-500 dark:text-zinc-200">Loading checkout...</div></div>}>
      <BookingContent />
    </Suspense>
  );
}
