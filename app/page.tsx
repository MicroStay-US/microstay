'use client';
// import "./globals.css";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import useLocation from "@/hooks/useLocation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Clock, Shield, Award, Map as MapIcon, CheckCircle2, CalendarDays, LogIn } from 'lucide-react';
import { getDistance } from "@/lib/getDistance";
// export function Home() {
//   const [hotels, setHotels] = useState([]);
// const [loading, setLoading] = useState(true);
//   const [location, setLocation] = useState<{
//     lat: number;
//     lng: number;
//   } | null>(null);

//   useEffect(() => {
//     async function loadNearbyHotels(lat: number, lng: number) {
//   const res = await fetch("/api/motels/nearby", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       latitude: lat,
//       longitude: lng,
//     }),
//   });

//   const data = await res.json();

//   setHotels(data.hotels);
//   setLoading(false);
// }
//     if (!navigator.geolocation) return;

//     navigator.geolocation.getCurrentPosition(
//       (position) => {
//         setLocation({
//           lat: position.coords.latitude,
//           lng: position.coords.longitude,
//         });
//         console.log("position",position)
//       },
//       (error) => {
//         console.log(error);
//       }
//     );
//   }, []);
//    return (
//   <div>
//     {loading && <p>Loading...</p>}

//     {hotels.map((hotel: any) => (
//       <div key={hotel.id}>
//         <h3>{hotel.business_name}</h3>
//         <p>{hotel.city}</p>
//       </div>
//     ))}
//   </div>
// );
// }
// export  function Home() {



//   if (loading) {
//     return <p>Getting your location...</p>;
//   }

  
//   return (
//     <div>

//       <h1>Nearby Hotels</h1>

//       <p>City : {location?.city}</p>

//       <p>State : {location?.state}</p>

//       <p>Latitude : {location?.latitude}</p>

//       <p>Longitude : {location?.longitude}</p>

//     </div>
//   );
  
// }

export default function HomePage() {
  
  // const { location, loading } = useLocation();
    const { location, loading } = useLocation();

useEffect(() => {
  if (!location) return;

  // Set city & state automatically
  setCity(location.city || "");
  setState(location.state || "");

  // Optional: show in the "Where?" button
  setSelectedLocation(
    `${location.city}, ${location.state}`
  );

  // Fetch nearby motels
  fetch(`/api/motels?lat=${location.latitude}&lng=${location.longitude}`)
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
    });

  console.log(location);

}, [location]);

  const router = useRouter();
  const [searchType, setSearchType] = useState<'nearby' | 'city'>('nearby');
  const [viewType, setViewType] = useState<'list' | 'map'>('list');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().split('T')[0];
  });
  const [roomType, setRoomType] = useState('');
  const [bedType, setBedType] = useState('');
  const [smokingPreference, setSmokingPreference] = useState('');

  // Dynamic location data from DB
  const [availableLocations, setAvailableLocations] = useState<{ city: string; state: string }[]>([]);
  const [uniqueStates, setUniqueStates] = useState<string[]>([]);
  const [citiesForState, setCitiesForState] = useState<string[]>([]);
  const [popularCities, setPopularCities] = useState<{ city: string; state: string; count: number }[]>([]);
  const [dates, setDates] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  
  const filteredLocations = availableLocations.filter((location) =>
    `${location.city}, ${location.state}`
      .toLowerCase()
      .includes(locationSearch.toLowerCase())
  );
  const locationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        locationRef.current &&
        !locationRef.current.contains(e.target as Node)
      ) {
        setLocationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const calendarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setCalendarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  useEffect(() => {
    // Listen for Supabase auth events (especially PASSWORD_RECOVERY).
    // This catches resets triggered from the Supabase Dashboard or when redirect params fail.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/admin/reset-password');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    async function loadLocations() {
      const { data } = await supabase.from('properties').select('city, state').eq('status', 'active');
      if (data) {
        const uniqueLocations = Array.from(
        new Map(
          data.map(item => [
            `${item.city}-${item.state}`,
            {
              city: item.city,
              state: item.state
            }
          ])
        ).values()
      );
  
      // console.log(uniqueLocations);
        const locations = data.map(d => ({ city: (d.city || '').trim(), state: (d.state || '').trim() })).filter(d => d.city && d.state);
        setAvailableLocations(uniqueLocations);
        const states = Array.from(new Set(locations.map(l => l.state))).sort();
        setUniqueStates(states);

        // Compute popular cities (top 6 by property count)
        const cityMap = new Map<string, { city: string; state: string; count: number }>();
        for (const l of locations) {
          const key = `${l.city}|${l.state}`;
          if (cityMap.has(key)) cityMap.get(key)!.count++;
          else cityMap.set(key, { city: l.city, state: l.state, count: 1 });
        }
        const sorted = Array.from(cityMap.values()).sort((a, b) => b.count - a.count).slice(0, 6);
        setPopularCities(sorted);
      }
    }
    loadLocations();
  }, []);

  useEffect(() => {
    // This cascading effect is ONLY for the City/State tab's State->City dropdowns.
    // Do NOT run it when searchType='nearby' — that would wipe the city picked from the dropdown.
    if (searchType !== 'city') return;
    if (state) {
      const cities = Array.from(new Set(availableLocations.filter(l => l.state === state).map(l => l.city))).sort();
      setCitiesForState(cities);
      if (!cities.includes(city)) setCity('');
    } else {
      setCitiesForState([]);
      setCity('');
    }
  }, [state, availableLocations, searchType]); // searchType guard prevents wiping nearby picks

  // const handleSearch = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   const params = new URLSearchParams();
  //   params.set('searchType', searchType);
  //   if (viewType === 'map') params.set('view', 'map');
  //   if (searchType === 'city') {
  //     if (city) params.set('city', city);
  //     if (state) params.set('state', state);
  //   }
  //   if (date) params.set('date', date);
  //   if (roomType) params.set('roomType', roomType);
  //   if (bedType) params.set('bedType', bedType);
  //   if (smokingPreference) params.set('smoking', smokingPreference);

  //   router.push(`/search?${params.toString()}`);
  // };
const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();

  const params = new URLSearchParams();
  params.set('view', viewType);
  // Use the DayPicker date if set, otherwise fall back to the date string
  params.set('date', dates ? dates.toLocaleDateString('en-CA') : date);
  if (roomType) params.set('roomType', roomType);
  if (bedType) params.set('bedType', bedType);
  if (smokingPreference) params.set('smokingPreference', smokingPreference);

  if (city && state) {
    // A specific city+state has been chosen (from either tab)
    params.set('searchType', 'city');
    params.set('city', city);
    params.set('state', state);
  } else if (city) {
    // City only (no state) — still do city search
    params.set('searchType', 'city');
    params.set('city', city);
  } else {
    // No city at all — pure GPS nearby search
    params.set('searchType', 'nearby');
  }

  router.push(`/search?${params.toString()}`);
};
  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black">
      <section
        className="relative py-32 px-4 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1920')",
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-white/30 dark:bg-gradient-radial dark:from-white/20 dark:to-black/50 dark:via-slate-800/20"></div>

        <div className="max-w-full my-10 relative ">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-zinc-600 dark:text-gray-900 drop-shadow-sm">
              Hotels by the Hour, Made Simple
            </h1>
            <p className="text-xl md:text-2xl text-zinc-600 dark:text-gray-800 mb-8 font-medium">
              ✓ No booking fees ✓ Pay at the hotel ✓ Flexible hourly stays
            </p>
          </div>

          <Card className="max-w-5xl mx-auto shadow-2xl rounded-3xl border-white dark:border-none glossy-card  ">
            {/* Top Tabs */}
            <div className="flex bg-white/80 border-b dark:border-none border-gray-100   backdrop-blur-sm ">
              <button
                type="button"
                onClick={() => setSearchType('nearby')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-colors ${searchType === 'nearby' ? 'bg-ms-orange-light dark:bg-ms-orange dark:text-white dark:border-tra text-ms-orange border-b-2 border-ms-orange-border' : 'text-gray-600 dark:bg-black/90 dark:text-white hover:bg-gray-50 bg-slate-300 dark:hover:bg-black/80'}`}
              >
                <MapPin className="w-4 h-4" /> Nearby Me
              </button>
              <button
                type="button"
                onClick={() => setSearchType('city')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-colors ${searchType === 'city' ? 'bg-ms-orange-light dark:bg-ms-orange dark:text-white dark:border-tra text-ms-orange border-b-2 border-ms-orange-border' : 'text-gray-600 dark:bg-black/90 dark:text-white hover:bg-gray-50 bg-slate-300 dark:hover:bg-black/80'}`}
              >
                <Search className="w-4 h-4" /> City / State Search
              </button>
            </div>

            <CardContent className="p-8  dark:bg-black backdrop-blur-md ">
              <form onSubmit={handleSearch} className="space-y-6">

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-10 items-center w-full md:w-auto">
                  {searchType === 'city' && (
                    <div className="flex flex-col md:flex-row items-center gap-5 w-full md:w-auto">
                        <div className="flex items-center w-full border rounded-md md:w-auto">
                        <label className="text-xs font-bold text-white  uppercase tracking-wider mr-2 md:mr-0 bg-ms-orange p-3 rounded-md w-25">State </label>
                        <Select value={state} onValueChange={setState}>
                          <SelectTrigger className="h-10 w-full md:w-32 font-medium text-gray-900 border-transparent">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {uniqueStates.length === 0 && <div className="p-2 text-sm text-gray-500 dark:text-white">Loading states...</div>}
                            {uniqueStates.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select></div>

                      
                        <div className="flex items-center  w-full md:w-auto border rounded-md">
                          <label className="text-xs font-bold text-white  uppercase tracking-wider mr-2 md:mr-0 bg-ms-orange p-3 rounded-md w-25">City </label>
                        <Select value={city} onValueChange={setCity} disabled={!state || citiesForState.length === 0}>
                          <SelectTrigger className="h-10 w-full md:w-32 font-medium text-gray-900 border-transparent">
                            <SelectValue placeholder={state ? "Select city" : "Select state first"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {citiesForState.map(c => (
                              <SelectItem key={c}  value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        </div>
                      
                    </div>
                  )}

                  {/* <div className=" flex flex-row text-center items-center space-y-2 h-12 w-72 gap-2 pl-3 pr-3 m-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-end ">
                      <MapPin className="h-5 w-10" />
                      <p>Where?</p>
                      </label>
                      
                  </div> */}
                  {searchType === 'nearby' && (
                    <>
                      <div className="flex flex-row items-center h-12 w-full md:w-80 gap-2 border md:border-t md:border-r md:border-b rounded-lg border-black/40 dark:border-white/20">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-ms-orange dark:bg-ms-orange rounded-md p-2  flex items-center h-full border-ms-orange">
                      <MapPin className="h-5 w-5 md:w-10 text-ms-orange-light" />
                      <p className="text-ms-orange-light hidden md:block">Where</p>
                      </label>
                      
                  <div ref={locationRef} className="relative w-full md:w-72">
                    <button
                      type="button"
                      onClick={() => setLocationOpen((prev) => !prev)}
                      className="w-full h-12 rounded-lg flex justify-start items-center text-left px-2"
                    >
                      <span className="truncate w-full">{selectedLocation || `${city} ${state}` }</span>
                    </button>

                    {locationOpen && (
                      <div className="absolute top-12 left-0 w-full bg-white rounded-xl shadow-xl z-50">

                        <Input
                          placeholder="Search..."
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          className="m-2 w-[calc(100%-16px)]"
                        />

                            <button 
                              className="w-full text-left px-4 py-3 hover:bg-gray-100 font-semibold text-ms-orange"
                              onClick={() => {
                                // Pure GPS nearby — clear any picked city
                                setSelectedLocation(`${city} ${state}`);
                                setCity('');
                                setState('');
                                setLocationOpen(false);
                              }}
                            >
                            {selectedLocation || `${city}  ${state}` }

                            </button>
                        <div className="max-h-64 overflow-y-auto">
                          {filteredLocations.map((location) => (
                            <button
                              key={`${location.city}-${location.state}`}
                              className="w-full text-left px-4 py-3 hover:bg-gray-100"
                              onClick={() => {
                                setSelectedLocation(
                                  `${location.city}, ${location.state}`
                                );
                                setCity(location.city);
                                setState(location.state);
                                setLocationOpen(false);
                              }}
                            >
                              {location.city}, {location.state}
                            </button>
                          ))}

                        </div>

                      </div>
                    )}

                  </div>
                  </div> 

                    </>
                  )}</div>
                    <div className="flex flex-row items-center h-12 w-full md:w-72 gap-2 border md:border-t md:border-r md:border-b rounded-lg border-black/40 dark:border-white/20 mt-4 md:mt-0">
                    <label className="text-xs font-bold bg-ms-orange  dark:bg-ms-orange rounded-md p-2  uppercase tracking-wider flex items-center h-full">
                      <CalendarDays className="h-5 w-5 md:w-10 text-ms-orange-light mr-1" />
                      <p className="text-ms-orange-light hidden md:block">When</p>
                    </label>
                    {/* <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                      className="h-12 dark:focus:border-none font-medium text-gray-900"
                      required
                    /> */}
                    <div
                      ref={calendarRef}
                      className="relative w-full"
                    >

                      <button
                        type="button"
                        onClick={() => setCalendarOpen(!calendarOpen)}
                        className="w-full h-12 rounded-lg flex font-semibold text-left justify-start md:justify-center items-center px-2 md:px-0"
                      >
                        {dates
                          ? dates.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                          : "Select Date"}
                      </button>

                      {calendarOpen && (

                        <div className="absolute top-14 left-0 md:-left-20 lg:-left-10 z-50 rounded-2xl bg-white shadow-lg shadow-slate-800/40 h-[420px] w-[310px] sm:w-[370px] p-4 sm:p-5">
                          <div className=" relative flex  gap-3 mb-5 overflow-hidden">

                            <Button
                              variant="outline"
                              onClick={() => {
                                setDates(new Date());
                                setCalendarOpen(false);
                              }}
                            >
                              Today
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);

                                setDates(tomorrow);
                                setCalendarOpen(false);
                              }}
                            >
                              Tomorrow
                            </Button>

                            <DayPicker
                            style={{color:"orangered"}}
                              className="relative
                                rounded-3xl
                                top-7
                                left-[-225px]
                                p-6
                                z-50"
                              mode="single"
                              captionLayout="dropdown"
                              selected={dates}
                              onSelect={(d) => {
                                setDates(d);
                                setCalendarOpen(false);
                              }}
                              disabled={{ before: new Date() }}
                            />
                          </div>

                        </div>

                      )}

                    </div>
                  </div>

                  



                  {searchType === 'nearby' && (
                    <>
                      {/* <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">State</label>
                        <Select value={state} onValueChange={setState}>
                          <SelectTrigger className="h-12   font-medium text-gray-900">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {uniqueStates.length === 0 && <div className="p-2 text-sm text-gray-500 dark:text-white">Loading states...</div>}
                            {uniqueStates.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div> */}

                      {/* <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">City</label>
                        <Select value={city} onValueChange={setCity} disabled={!state || citiesForState.length === 0}>
                          <SelectTrigger className="h-12   font-medium text-gray-900">
                            <SelectValue placeholder={state ? "Select city" : "Select state first"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {citiesForState.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div> */}
                    </>
                  )}

                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t dark:border-black border-gray-100">
                  <Button
                    type="submit"
                    onClick={() => setViewType('list')}
                    className="flex-1 h-12 bg-gradient-to-r from-ms-orange to-ms-orange hover:from-ms-orange-hover hover:to-ms-orange-hover text-white font-bold text-lg shadow-md"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    List View
                  </Button>
                  <Button
                    type="submit"
                    onClick={() => setViewType('map')}
                    className="flex-1 h-12 bg-gray-900 hover:bg-black dark:hover:bg-zinc-900 dark:bg-slate-900 text-white font-bold text-lg shadow-md"
                  >
                    <MapIcon className="mr-2 h-5 w-5" />
                    Map View
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-20 px-4 dark:bg-gradient-to-t dark:from-ms-orange ">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            Why Choose MicroStay?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-2xl transition dark:border-transparent border-gray-100 group">
              <CardContent className="p-8">
                <div className="bg-gradient-to-br from-ms-orange to-ms-orange w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shine-effect">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Flexible Hours</h3>
                <p className="text-gray-600 font-medium leading-relaxed">
                  Book by the hour, not the night. Perfect for layovers, rest breaks, or quick getaways.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-2xl transition dark:border-transparent border-gray-100 group">
              <CardContent className="p-8">
                <div className="bg-gradient-to-br from-ms-orange to-ms-orange w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shine-effect">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Safe & Secure</h3>
                <p className="text-gray-600 font-medium leading-relaxed">
                  All properties verified. Secure booking process with instant confirmation directly from the vendor.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-2xl transition dark:border-transparent border-gray-100 group">
              <CardContent className="p-8">
                <div className="bg-gradient-to-br from-ms-orange to-ms-orange w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shine-effect">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Best Prices</h3>
                <p className="text-gray-600 font-medium leading-relaxed">
                  No hidden platform fees for guests. Pay only for the window you need. Save up to 70% vs full-day rates.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-4 dark:bg-ms-orange" id="how-it-works">
        <div className="max-w-7xl mx-auto dark:bg-slate-950 py-2.5 rounded-lg ">
          <div className="text-center mb-14 mt-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500 text-lg font-medium">Book a room under 2 minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative px-4 md:px-0">

            {[
              { step: '01', icon: Search, title: 'Search', desc: 'Enter your city or tap "Nearby" to find available motels for your date.' },
              { step: '02', icon: CalendarDays, title: 'Book', desc: 'Pick your time window, choose a room, and confirm with your name and phone.' },
              { step: '03', icon: LogIn, title: 'Check In', desc: 'Show your confirmation code at the front desk — no app or account needed.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative z-10 flex flex-col items-center text-center group mb-10 mx-auto max-w-xs bg-ms-orange-light pt-5 rounded-lg">
                <div className="w-20 h-20 rounded-2xl dark:bg-gradient-to-br dark:from-ms-orange dark:border-transparent dark:shadow-md dark:group-hover:shadow-ms-orange dark:to-ms-orange border-2 border-ms-orange-border flex items-center justify-center mb-5 group-hover:border-ms-orange-border group-hover:shadow-lg group-hover:shadow-ms-orange-light transition-all ">
                  <Icon className="w-8 h-8 text-ms-orange dark:text-white" />
                </div>
                <span className="text-[11px] font-black tracking-widest text-ms-orange uppercase mb-1">Step {step}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed max-w-xs pl-5 pr-5 mb-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Cities ── */}
      {popularCities.length > 0 && (
        <section className="py-20 px-4  dark:bg-gradient-to-b dark:from-ms-orange  ">
          <div className="flex  flex-col max-w-7xl mx-auto dark:bg-slate-950 rounded-lg">
            <div className="text-center mb-10 mt-10 ">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Popular Cities</h2>
              <p className="text-gray-500 text-lg font-medium">Hourly stays available in these locations</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mx-4 md:mx-10 mb-10">
              {popularCities.map(({ city, state, count }) => {
                const initials = city.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                const gradients = [
                  'from-ms-orange to-rose-500',
                  'from-blue-400 to-indigo-500',
                  'from-emerald-400 to-teal-500',
                  'from-violet-400 to-purple-500',
                  'from-amber-400 to-ms-orange',
                  'from-sky-400 to-blue-500',
                ];
                const grad = gradients[(city.charCodeAt(0) + city.length) % gradients.length];
                return (
                  <button
                    key={`${city}-${state}`}
                    onClick={() => {
                      const params = new URLSearchParams({ searchType: 'city', city, state, date });
                      router.push(`/search?${params.toString()}`);
                    }}
                    className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-transparent bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-200 text-left p-5 flex items-center gap-4"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                      <span className="text-white font-black text-sm">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate">{city}</div>
                      <div className="text-sm text-gray-500 font-medium">{state}</div>
                      <div className="text-xs text-ms-orange font-bold mt-0.5">{count} {count === 1 ? 'property' : 'properties'}</div>
                    </div>
                    <MapPin className="w-4 h-4 text-gray-300 group-hover:text-ms-orange transition-colors ml-auto flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section
        className="py-24 px-4 relative bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1920')",
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/70 to-gray-900/80"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-white tracking-tight">
            List Your Property
          </h2>
          <p className="text-xl text-gray-200 mb-10 font-medium shadow-sm">
            Join our network of trusted partners and start earning high margins from your unused windows.
          </p>
          <Button
            size="lg"
            onClick={() => router.push('/partner')}
            className="text-lg px-8 h-14 bg-gradient-to-r from-ms-orange to-ms-orange hover:from-ms-orange-hover hover:to-ms-orange-hover text-white shadow-xl shine-effect font-bold border border-ms-orange-border active:scale-95 hover:scale-105"
          >
            Become a Partner
          </Button>
        </div>
      </section>

    </div>
  );
}
