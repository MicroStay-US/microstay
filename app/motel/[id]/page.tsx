'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MapPin, Phone, Clock, Wifi, Coffee, Tv, Car, Star, CheckCircle2, ChevronRight, ChevronLeft, Info, ShieldCheck } from 'lucide-react';

function fmtHour(h: number) {
  const hr = h % 24;
  const suffix = hr < 12 ? 'AM' : 'PM';
  const display = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${display}${suffix}`;
}

type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  description: string;
  amenities: string[];
  photos: string[];
  phone: string;
  star_rating?: number;
};

type VDSlot = {
  id: string;
  room_type: string;
  bed_type: string;
  smoking_type: string;
  price_per_room: number;
  start_hour: number;
  end_hour: number;
  max_rooms: number;
  is_active: boolean;
  duration_hours: number;
};

function PropertyDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [slots, setSlots] = useState<{ slot: VDSlot, available: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedDate, setSelectedDate] = useState(() => {
    const defaultDate = searchParams.get('date');
    if (defaultDate) return defaultDate;
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().split('T')[0];
  });
  
  const [selectedTime, setSelectedTime] = useState(searchParams.get('time') || '12:00');

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Gallery Processing Setup
  const isPhotosArray = property ? Array.isArray(property.photos) : false;
  let galleryPhotos = isPhotosArray && property!.photos.length > 0 ? property!.photos : [
    "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ];
  while (galleryPhotos.length < 5) {
    galleryPhotos.push(galleryPhotos[0]); 
  }

  const openLightbox = (index: number) => { setLightboxIndex(index); setLightboxOpen(true); };
  const prevPhoto = () => setLightboxIndex(i => (i - 1 + galleryPhotos.length) % galleryPhotos.length);
  const nextPhoto = () => setLightboxIndex(i => (i + 1) % galleryPhotos.length);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, galleryPhotos.length]);

  useEffect(() => {
    fetchPropertyDetails();
  }, [params.id, selectedDate]);

  const fetchPropertyDetails = async () => {
    setLoading(true);
    try {
      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();

      if (propError) throw propError;
      setProperty(propData as any);
      if (!propData) return;

      // Check date-specific windows first — if set, they fully replace defaults for this date
      // const { data: dateWinData } = await supabase
      //   .from('vd_date_windows')
      //   .select('*')
      //   .eq('property_id', params.id)
      //   .eq('override_date', selectedDate)
      //   .eq('is_active', true)
      //   .order('start_hour', { ascending: true });

      // let slotsData: VDSlot[] = [];
      // if (dateWinData && dateWinData.length > 0) {
      //   slotsData = dateWinData as unknown as VDSlot[];
      // } else {
      //   const { data: defaultSlots, error: slotsError } = await supabase
      //     .from('vd_time_slots')
      //     .select('*')
      //     .eq('property_id', params.id)
      //     .eq('is_active', true)
      //     .order('duration_hours', { ascending: true });
      //   if (slotsError) throw slotsError;
      //   slotsData = defaultSlots || [];
      // }
      // Load date-specific slots
      const { data: dateSlots } = await supabase
        .from("vd_date_windows")
        .select("*")
        .eq("property_id", params.id)
        .eq("override_date", selectedDate)
        .eq("is_active", true);

      // Load default slots
      const { data: defaultSlots, error: slotsError } = await supabase
        .from("vd_time_slots")
        .select("*")
        .eq("property_id", params.id)
        .eq("is_active", true);

      if (slotsError) throw slotsError;

      let slotsData = [];
      if (dateSlots && dateSlots.length > 0) {
        slotsData = dateSlots.sort((a: any, b: any) => a.start_hour - b.start_hour);
      } else {
        slotsData = (defaultSlots || []).sort((a: any, b: any) => a.start_hour - b.start_hour);
      }

      const { data: bookingsData } = await supabase
        .from('vd_bookings')
        .select('slot_id, rooms_booked')
        .eq('property_id', params.id)
        .eq('booking_date', selectedDate)
        .neq('status', 'owner_cancel')
        .neq('status', 'no_show');

      const now = new Date();
      const tzOffsetMs = now.getTimezoneOffset() * 60000;
      const todayLocal = new Date(now.getTime() - tzOffsetMs).toISOString().split('T')[0];
      const currentHour = now.getHours();

      const mappedSlots = slotsData.filter((slot: VDSlot) => {
        if (selectedDate === todayLocal) {
          let effectiveEnd = slot.end_hour;
          if (effectiveEnd <= slot.start_hour) {
            effectiveEnd += 24; // Handle slots that cross midnight
          }
          // The slot is still bookable if its end time is strictly in the future relative to the current hour
          return effectiveEnd > currentHour;
        } else if (selectedDate < todayLocal) {
          return false; // Hide all slots for past dates
        }
        return true; // Show all slots for future dates
      }).map((slot: VDSlot) => {
        const slotBookings = (bookingsData || []).filter(b => b.slot_id === slot.id);
        const bookedCount = slotBookings.reduce((sum, b) => sum + (b.rooms_booked || 1), 0);
        return { slot, available: bookedCount < slot.max_rooms };
      });

      setSlots(mappedSlots);
      console.log("Slots from DB:", slotsData);
console.log("Mapped Slots:", mappedSlots);
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAmenityIcon = (amenity: string) => {
    const icons: { [key: string]: any } = { wifi: Wifi, parking: Car, breakfast: Coffee, tv: Tv };
    const IconComponent = icons[amenity.toLowerCase()] || CheckCircle2;
    return <IconComponent className="h-4 w-4" />;
  };

  const handleBookSlot = (slotId: string, price: number) => {
    router.push(`/book/${slotId}?propertyId=${params.id}&date=${selectedDate}&price=${price}`);
    // comment router.push to stop the booking to be happened
  };

  const smoothScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-300/40 dark:bg-slate-700 flex items-center justify-center">
        <div className="text-slate-900 font-bold text-xl dark:text-white animate-pulse flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-ms-orange-border border-t-transparent rounded-full animate-spin"></div>
          Loading Property Details...
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-orange-300/40 py-12 px-4 shadow-inner">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-24 h-24 bg-orange-300/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-2xl font-black mb-6 text-gray-900">Property not found</p>
          <Button onClick={() => router.push('/search')} className="bg-ms-orange hover:bg-ms-orange-hover text-white font-bold h-12 px-8">Return to Search</Button>
        </div>
      </div>
    );
  }

  // Gallery Processing is handled at the top level for rules of hooks

  // Room Grouping
  const groupedRooms = slots.reduce((acc, { slot, available }) => {
    const roomName = `${slot.room_type} (${slot.bed_type || 'Standard'}) - ${slot.smoking_type === 'smoking' ? 'Smoking' : 'Non-Smoking'}`;
    if (!acc[roomName]) acc[roomName] = [];
    acc[roomName].push({ slot, available });
    return acc;
  }, {} as Record<string, { slot: VDSlot, available: boolean }[]>);

  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black/50 font-sans pb-24">
      {/* 1. Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2 text-sm font-semibold text-gray-500 flex items-center gap-2">
        <span className="cursor-pointer hover:text-ms-orange transition-colors" onClick={() => router.push('/search')}>Home</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="cursor-pointer hover:text-ms-orange transition-colors" onClick={() => router.push(`/search?city=${property.city}`)}>{property.city} Hotels</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 line-clamp-1">{property.name}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        
        {/* 2. Asymmetrical Hero Gallery */}
        <div className="w-full flex flex-col md:flex-row gap-2 h-[300px] md:h-[450px] mb-8 rounded-2xl overflow-hidden shadow-md">
          {/* Main Huge Left Image */}
          <div 
            onClick={() => openLightbox(0)}
            className="flex-1 h-full bg-cover bg-center cursor-pointer hover:opacity-95 transition-opacity"
            style={{ backgroundImage: `url(${galleryPhotos[0]})` }}
          />
          {/* Right 2x2 Thumbnail Grid */}
          <div className="hidden md:flex w-[400px] flex-col gap-2">
            <div className="flex-1 flex gap-2">
              <div onClick={() => openLightbox(1)} className="flex-1 bg-cover bg-center cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundImage: `url(${galleryPhotos[1]})` }} />
              <div onClick={() => openLightbox(2)} className="flex-1 bg-cover bg-center cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundImage: `url(${galleryPhotos[2]})` }} />
            </div>
            <div className="flex-1 flex gap-2">
              <div onClick={() => openLightbox(3)} className="flex-1 bg-cover bg-center cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundImage: `url(${galleryPhotos[3]})` }} />
              <div onClick={() => openLightbox(0)} className="flex-1 bg-cover bg-center relative cursor-pointer group" style={{ backgroundImage: `url(${galleryPhotos[4]})` }}>
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/60 transition-colors flex items-center justify-center text-white font-bold tracking-wide">
                  View All Photos
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Sticky Tab Navigation */}
        <div className="sticky top-0 z-30 bg-orange-400/50 shadow-sm border-b border-gray-200 mb-8 rounded-xl px-4 flex gap-8 overflow-x-auto justify-evenly scrollbar-hide">
          {['Basic Info', 'Facilities', 'Room Options', 'Policies'].map((tab) => (
            <div 
              key={tab} 
              onClick={() => smoothScrollTo(tab.toLowerCase().replace(' ','-'))}
              className="py-4 font-bold text-gray-600 hover:text-ms-orange hover:border-ms-orange-border border-b-2 border-transparent cursor-pointer whitespace-nowrap transition-colors"
            >
              {tab}
            </div>
          ))}
        </div>

        {/* 4. Main Body Content (Two Columns Layout) */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"> */}
        <div className="grid grid-cols-1 gap-8 items-start">
          
          {/* LEFT: Information & Rooms */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* --- Basic Info Section --- */}
            <div id="basic-info" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-ms-orange-light text-ms-orange hover:bg-ms-orange-light font-bold uppercase tracking-wider text-[10px] dark:bg-black dark:text-ms-orange-light p-2.5">Premium Collection</Badge>
                <div className="flex items-center bg-ms-teal-light text-ms-teal px-2 py-0.5 rounded text-xs font-bold border border-ms-teal-border dark:bg-green-600 dark:border-transparent dark:text-white">
                  {property.star_rating || '4.5'} <Star className="w-3 h-3 ml-1 fill-ms-teal text-ms-teal dark:text-white dark:fill-white" />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight dark:text-ms-orange">{property.name}</h1>
              <div className="flex items-center text-gray-500 font-medium">
                <MapPin className="w-5 h-5 mr-1.5 text-gray-400" />
                {property.address}, {property.city}, {property.state}
              </div>

              {/* Action Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-green-100 dark:bg-green-700 dark:text-white dark:border-transparent">
                  <CheckCircle2 className="w-4 h-4" /> Couple Friendly
                </div>
                <div className="bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-gray-200 dark:bg-green-700 dark:text-white dark:border-transparent">
                  <CheckCircle2 className="w-4 h-4 text-ms-teal dark:text-white" /> Accepts Local ID
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed mt-4 pt-4 border-t border-gray-100 dark:border-zinc-600">
                {property.description || "Welcome to our premium Hourly Motel. Experience maximum comfort at unbelievable prices by paying exactly for the time you need. We provide 24/7 front desk support and seamless check-in processes for verified guests."}
              </p>
            </div>

            {/* --- Facilities Section --- */}
            {Array.isArray(property.amenities) && property.amenities.length > 0 && (
              <div id="facilities" className="scroll-mt-24">
                <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Coffee className="text-ms-orange" /> Facilities & Amenities
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 p-6  dark:border-black rounded-xl shadow-sm border border-gray-100">
                  {property.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-ms-orange-light flex items-center justify-center text-ms-orange dark:text-white dark:bg-ms-orange">
                        {getAmenityIcon(amenity)}
                      </div>
                      <span className="font-bold text-gray-700 capitalize">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Room Options (Pricing Buttons) --- */}
            <div id="room-options" className="scroll-mt-24">
              <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <ShieldCheck className="text-ms-orange" /> Room Options
              </h3>
              
              <div className="space-y-6">
                {Object.keys(groupedRooms).length === 0 ? (
                  <Card className="border-gray-200 shadow-sm bg-orange-300/40 dark:bg-transparent dark:border-transparent">
                    <CardContent className="p-12 text-center text-gray-500 dark:text-red-600 animate-pulse font-medium">
                      No window inventory available for the selected date. Please try another day.
                    </CardContent>
                  </Card>
                ) : (
                  Object.entries(groupedRooms).map(([roomName, roomSlots]) => (
                    <Card key={roomName} className="border border-gray-200 shadow-sm overflow-hidden bg-orange-400/40 hover:border-ms-orange-border transition-colors">
                      {/* Room Header Area */}
                      <div className="bg-gray-50/50 dark:bg-black/60 dark:border-transparent p-5 border-b border-gray-100 flex items-start justify-between">
                        <div>
                          <h4 className="text-xl font-black text-gray-900 mb-1">{roomName}</h4>
                          <p className="text-xs font-bold text-ms-teal uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Available for Instant Booking
                          </p>
                        </div>
                      </div>

                      {/* Room Pricing Options Area */}
                      {roomSlots.map(({ slot, available }) => (
                      <div className="p-5 cursor-pointer" key={slot.id} onClick={() => handleBookSlot(slot.id, slot.price_per_room)}>
                         {/* <div>
                          <h4 className="text-xl font-black text-gray-900 mb-1">{slot.slot_label}</h4>
                          </div> */}
                        <h5 className="text-sm font-bold text-gray-500 mb-4 tracking-wide">SELECT YOUR TIME WINDOW</h5>
                        <div className="flex flex-wrap gap-4">
                            <button
                              key={slot.id}
                              disabled={!available}
                              onClick={() => handleBookSlot(slot.id, slot.price_per_room)}
                              className={`
                                relative flex flex-col justify-center px-6 py-4 rounded-xl border-2 transition-all min-w-[160px]
                                ${available 
                                  ? 'border-gray-200 bg-white hover:border-ms-orange-border hover:shadow-ms-orange-light hover:shadow-lg hover:-translate-y-1 cursor-pointer dark:bg-black dark:hover:text-white dark:hover:bg-ms-orange'
                                  : 'border-gray-100 bg-gray-50  dark:bg-black dark:border-transparent opacity-60 cursor-not-allowed'}
                              `}
                            >
                              {/* Background hover effect */}
                              <div className="absolute inset-0 bg-ms-orange-light dark:bg-ms-orange  transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom -z-10"></div>
                              
                              <div className="flex justify-between items-center w-full mb-1">
                                <span className={`text-sm font-black uppercase tracking-wider ${available ? 'text-gray-600 group-hover:text-ms-orange' : 'text-gray-400'}`}>
                                  {fmtHour(slot.start_hour)} – {fmtHour(slot.end_hour)}
                                </span>
                              </div>
                              <div className={`text-2xl font-black ${available ? 'text-gray-900 group-hover:text-ms-orange' : 'text-gray-400 opacity-20'} text-left`}>
                                ${slot.price_per_room}
                              </div>
                              <div className={`text-xs mt-1 ${available ? 'text-gray-400' : 'text-gray-300'}`}>
                                {slot.duration_hours}h window
                              </div>
                              
                              {!available && (
                                <div className="absolute inset-0 bg-gray-50/80 flex items-center justify-center backdrop-blur-[1px]">
                                  <span className="text-rose-600 font-black text-sm uppercase tracking-widest border-2 border-rose-600 px-2 py-1 transform -rotate-12 bg-white">Sold Out</span>
                                </div>
                              )}
                              {available && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ChevronRight className="w-5 h-5 text-ms-orange" />
                                </div>
                              )}
                            </button>
                        </div>
                      </div>
                          ))}
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* --- Policies --- */}
            <div id="policies" className="scroll-mt-24 pt-4">
              <h3 className="text-2xl font-black text-gray-900 mb-6">Property Policies</h3>
              <div className="bg-ms-orange-light border border-ms-orange-border rounded-xl p-6 text-ms-orange dark:bg-black dark:border-transparent">
                <ul className="space-y-4 font-medium text-sm">
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-ms-orange mt-1.5 flex-shrink-0"></span>
                    Guest checking in must be at least 18 years of age and present a valid government-issued photo ID.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-ms-orange mt-1.5 flex-shrink-0"></span>
                    Customers can pay entirely at the front desk. No upfront platform charges apply today!
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-ms-orange mt-1.5 flex-shrink-0"></span>
                    <p>Contact the property directly at <strong>{property.phone}</strong> if you anticipate being late for your check-in window.</p>
                    
                  </li>
                </ul>
              </div>
            </div>

          </div>

          {/* RIGHT: Sticky Booking Summary Panel */}
     

        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl bg-black border-none p-0 outline-none">
          <div className="relative flex items-center justify-center min-h-[60vh] bg-black">
            {/* Current photo */}
            <img src={galleryPhotos[lightboxIndex]} alt="Motel Gallery" className="max-h-[80vh] max-w-full object-contain" />

            {/* Prev arrow */}
            <button onClick={prevPhoto} className="absolute left-4 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            {/* Next arrow */}
            <button onClick={nextPhoto} className="absolute right-4 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors">
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Counter */}
            <div className="absolute bottom-4 bg-black/60 px-3 py-1 rounded-full text-white text-sm font-bold">
              {lightboxIndex + 1} / {galleryPhotos.length}
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="flex gap-2 p-3 overflow-x-auto bg-black/90 scrollbar-hide">
            {galleryPhotos.map((photo, i) => (
              <img 
                key={i} 
                src={photo} 
                onClick={() => setLightboxIndex(i)}
                alt={`Thumbnail ${i + 1}`}
                className={`h-16 w-24 object-cover cursor-pointer rounded transition-all ${i === lightboxIndex ? 'ring-2 ring-ms-orange opacity-100' : 'opacity-50 hover:opacity-100'}`}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MotelDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 py-12 px-4 shadow-inner"><div className="text-center font-bold text-gray-500">Loading Property...</div></div>}>
      <PropertyDetailContent />
    </Suspense>
  );
}
