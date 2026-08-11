'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Clock, Phone, Calendar, Search, CheckCircle2, DoorOpen, UserX, Ban } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:      { label: 'Confirmed – Awaiting Check-In', color: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-white dark:bg-amber-700/70 dark:border-transparent',   icon: <DoorOpen className="w-5 h-5" /> },
  checked_in:   { label: 'Checked In',                   color: 'text-ms-teal bg-ms-teal-light border-ms-teal-border dark:text-white dark:bg-teal-800/40 dark:border-transparent', icon: <CheckCircle2 className="w-5 h-5" /> },
  no_show:      { label: 'No Show',                      color: 'text-gray-600 bg-gray-50 border-gray-200 dark:text-white dark:bg-gray-900/40 dark:border-transparent',       icon: <UserX className="w-5 h-5" /> },
  owner_cancel: { label: 'Cancelled by Property',        color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-700/40 dark:text-white dark:border-transparent',       icon: <Ban className="w-5 h-5" /> },
  customer_cancel: { label: 'Cancelled by You',          color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-700/40 dark:text-white dark:border-transparent',       icon: <Ban className="w-5 h-5" /> },
};

export default function CheckBookingPage() {
  const [bookingRef, setBookingRef] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [booking, setBooking] = useState<any>(null); //  here try to change null to any other datatype  //
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState('');

  // const handleSearch = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError('');
  //   setBooking(null);

  //   try {
  //     const { data, error: searchError } = await supabase
  //       .from('vd_bookings')
  //       .select(`
  //         *,
  //         property:properties(name, address, city, phone),
  //         slot:vd_time_slots(start_hour, end_hour, room_type, bed_type)
  //       `)
  //       .eq('booking_ref', bookingRef.toUpperCase().trim())
  //       .ilike('guest_email', guestEmail.trim())
  //       .maybeSingle();

  //     if (searchError) throw searchError;

  //     if (!data) {
  //       setError('Booking not found. Please check your reference number and email address.');
  //     } else {
  //       setBooking(data);
  //     }
  //   } catch (err: any) {
  //     setError(err.message || 'Error searching for booking');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setBooking(null);//  here try to change null toany other datatype bcz its hardlycoded //
  

  try {
    const { data, error: searchError } = await supabase
      .from('vd_bookings')
      .select(`
        *,
        property:properties(name,address,city,phone)
      `)
      .eq('booking_ref', bookingRef.toUpperCase().trim())
      .eq('guest_email', guestEmail.trim().toLowerCase())
      // .ilike('guest_email', guestEmail.trim())
      .maybeSingle();
    //   const {
    //   data: { user }
    // } = await supabase.auth.getUser();

    // console.log("Current User:", user);
    //  console.log('Booking Ref Entered:', bookingRef);
    // console.log('Email Entered:', guestEmail);
    // console.log('Bookings:', data);
    // console.log('Search Error:', searchError);
    if (searchError) throw searchError;

    if (!data) {
      setError(
        'Booking not found. Please check your reference number and email address.'
      );
      return;
    }

    let slotData = null;

    // Check vd_time_slots
    const { data: timeSlot } = await supabase
      .from('vd_time_slots')
      .select('start_hour,end_hour,room_type,bed_type')
      .eq('id', data.slot_id)
      .maybeSingle();

    if (timeSlot) {
      slotData = timeSlot;
    } else {
      // Check vd_date_windows
      const { data: dateWindow } = await supabase
        .from('vd_date_windows')
        .select('start_hour,end_hour')
        .eq('id', data.slot_id)
        .maybeSingle();

      if (dateWindow) {
        slotData = {
          ...dateWindow,
          room_type: 'Room',
          bed_type: 'Standard',
        };
      }
    }

    setBooking({
      ...data,
      slot: slotData,
    });
  } catch (err: any) {
    setError(err.message || 'Error searching for booking');
  } finally {
    setLoading(false);
  }
};

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  const statusInfo = booking ? (statusConfig[booking.status] || { label: booking.status, color: 'text-gray-700 bg-gray-50 border-gray-200', icon: null }) : null;

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel your booking? This action cannot be undone.')) return;
    
    setCancelLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef, guestEmail }),
      });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Failed to cancel booking');
      
      // Update local state to show cancelled status
      setBooking({ ...booking, status: 'Customer Cancel' });
      alert('Booking cancelled successfully.');
    } catch (err: any) {
      setError(err.message || 'Error cancelling booking');
    } finally {
      setCancelLoading(false);
    }
  };

  // Check if current time is before boarding time
  let canCancel = false;
  if (booking && booking.status === 'pending') {
    try {
      const [year, month, day] = booking.booking_date.split('-').map(Number);
      const startHour = booking.slot?.start_hour || 14;
      const boardingTime = new Date(year, month - 1, day, startHour, 0, 0);
      if (new Date() < boardingTime) {
        canCancel = true;
      }
    } catch (e) {
      // safe fallback
    }
  }

  return (
    <div className="min-h-screen flex flex-col   items-center justify-center py-12 px-4 bg-orange-300/40  dark:bg-gradient-to-b dark:from-black dark:via-slate-900 dark:to-black">
      <div className=" flex  flex-col max-w-2xl mx-auto ">
        <div className="text-center mb-10  ">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Check Your Booking</h1>
          <p className="text-gray-500 mt-2 font-medium">Enter your booking reference and email to see your reservation details.</p>
        </div>

        <Card className="shadow-xl border-gray-200 mb-8 max-w-[1200px]">
          <CardHeader className="border-b flex flex-col items-center border-gray-100 dark:border-black pb-4">
            <CardTitle className="text-lg font-bold text-gray-900">Booking Lookup</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="bg-rose-50 border-rose-200 dark:bg-rose-700/40 dark:border-transparent">
                  <AlertDescription className="font-medium text-rose-800 dark:text-white/70">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="bookingRef" className="text-xs font-bold text-gray-600 uppercase tracking-wider">Booking Reference</Label>
                <Input
                  id="bookingRef"
                  type="text"
                  placeholder="MS-2026-XXXXX"
                  className="h-12 font-mono font-bold bg-gray-50 dark:bg-black border-gray-200"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestEmail" className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email Address Used at Booking</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  placeholder="your@email.com"
                  className="h-12 bg-gray-50 border-gray-200 dark:bg-black dark:border-transparent"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full h-12 bg-ms-orange hover:bg-ms-orange-hover text-white font-bold" disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Searching...' : 'Find My Booking'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {booking && statusInfo && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border font-bold ${statusInfo.color}`}>
              {statusInfo.icon}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Booking Status</p>
                <p className="text-lg font-black">{statusInfo.label}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Ref #</p>
                <p className="font-mono font-black">{booking.booking_ref}</p>
              </div>
            </div>

            {/* Details */}
            <Card className="shadow-lg border-gray-200 dark:border-transparent ">
              <CardHeader className="border-b border-gray-100  dark:border-black pb-4">
                <CardTitle className="text-base font-bold text-gray-900">Reservation Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-ms-orange mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-ms-orange">{booking.property?.name}</p>
                    <p className="text-gray-500 text-sm">{booking.property?.address}, {booking.property?.city}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-ms-orange mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">
                      {new Date(booking.booking_date).toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {booking.slot && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-ms-orange mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900">
                        {formatHour(booking.slot.start_hour)} – {formatHour(booking.slot.end_hour)}
                      </p>
                      <p className="text-gray-500 text-sm capitalize">{booking.slot.room_type} · {booking.slot.bed_type}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-ms-orange mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Property Contact</p>
                    <a href={`tel:${booking.property?.phone}`} className="font-bold text-zinc-800 hover:underline">
                      {booking.property?.phone || 'Contact via support'}
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-600 flex justify-between items-center">
                  <span className="font-bold text-gray-700">Total to Pay at Front Desk</span>
                  <span className="text-2xl font-black text-ms-teal">${Number(booking.gross_amount).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-ms-orange-light border-ms-orange-border dark:bg-slate-900 dark:border-transparent">
              <CardContent className="p-5">
                <p className="text-sm text-ms-orange font-medium">
                  <strong>What to bring:</strong> A valid photo ID and your booking reference <strong>{booking.booking_ref}</strong>. Payment is due at the front desk on arrival.
                </p>
              </CardContent>
            </Card>

            {canCancel && (
              <div className="pt-4 text-center">
                <Button 
                  variant="destructive" 
                  onClick={handleCancelBooking} 
                  disabled={cancelLoading}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold border border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:hover:bg-rose-900/60 dark:border-transparent"
                >
                  {cancelLoading ? 'Cancelling...' : 'Cancel Booking'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
