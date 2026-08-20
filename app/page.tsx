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
import MotelBanner from "./MotelBanner";
import Footer from "@/components/Footer";
import { url } from "node:inspector";
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
    <div className="h-[100dvh] md:h-auto overflow-y-auto md:overflow-visible snap-y snap-mandatory md:snap-none scroll-smooth scrollbar-none bg-orange-300/40 dark:bg-black">
      <section
        className="relative snap-start snap-always h-[calc(100dvh-5rem)] md:h-auto flex flex-col justify-center items-center pt-2 pb-3 px-3 bg-cover bg-center landing-hero-bg overflow-hidden md:overflow-visible md:py-32 md:px-4"
      >
        <div className="absolute inset-0 bg-white/30 dark:bg-gradient-radial dark:from-white/20 dark:to-black/50 dark:via-slate-800/20"></div>

        <div className="max-w-full my-0 relative flex flex-col justify-center items-center w-full md:h-auto">
          <div className="flex flex-col justify-center items-center w-full gap-2 md:gap-10">
            <MotelBanner />
            <div className="text-center mb-0 md:mb-12 flex flex-col justify-center items-center flex-shrink-0">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-bold mb-2 md:mb-6 text-zinc-600 dark:text-gray-900 drop-shadow-sm">
                Hotel Stays That Fit Your Schedule<br />
              </h1>
              <div className="text-xs sm:text-sm md:text-2xl text-zinc-600 dark:text-gray-800 mb-2 md:mb-8 font-medium flex flex-wrap justify-center gap-x-3 gap-y-1">
                <p>✓ No booking fees</p>
                <p className="hidden md:block">•</p>
                <p>✓ Pay Directly at Check-In</p>
                <p className="hidden md:block">•</p>
                <p>✓ Flexible Stay Windows</p>
              </div>
            </div>
          </div>

          <div className="w-full flex-shrink-0">
            <Card className="max-w-5xl mx-auto shadow-2xl rounded-3xl border-white dark:border-none glossy-card w-full  md:w-auto">
            {/* Top Tabs */}
            <div className="flex bg-white/80 border-b dark:border-none border-gray-100   backdrop-blur-sm ">
              <button
                type="button"
                onClick={() => setSearchType('nearby')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 md:py-4 font-bold text-xs md:text-sm transition-colors ${searchType === 'nearby' ? 'bg-ms-orange-light dark:bg-ms-orange dark:text-white dark:border-tra text-ms-orange border-b-2 border-ms-orange-border' : 'text-gray-600 dark:bg-black/90 dark:text-white hover:bg-gray-50 bg-slate-300 dark:hover:bg-black/80'}`}
              >
                <MapPin className="w-3 h-3 md:w-4 md:h-4" /> Near Me
              </button>
              <button
                type="button"
                onClick={() => setSearchType('city')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 md:py-4 font-bold text-xs md:text-sm transition-colors ${searchType === 'city' ? 'bg-ms-orange-light dark:bg-ms-orange dark:text-white dark:border-tra text-ms-orange border-b-2 border-ms-orange-border' : 'text-gray-600 dark:bg-black/90 dark:text-white hover:bg-gray-50 bg-slate-300 dark:hover:bg-black/80'}`}
              >
                <Search className="w-3 h-3 md:w-4 md:h-4" /> City / State Search
              </button>
            </div>

            <CardContent className="p-4 md:p-8 dark:bg-black backdrop-blur-md">
              <form onSubmit={handleSearch} className="space-y-3 md:space-y-6">

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
                                <SelectItem key={c} value={c}>{c}</SelectItem>
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
                              <span className="truncate w-full">{selectedLocation || `${city} ${state}`}</span>
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
                                  {selectedLocation || `${city}  ${state}`}

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
                        <>
                          {/* Mobile: fixed overlay modal */}
                          <div
                            className="fixed inset-0 z-[99] bg-black/40 flex items-center justify-center md:hidden"
                            onClick={() => setCalendarOpen(false)}
                          >
                            <div
                              className="rounded-2xl bg-white shadow-2xl p-3 w-[290px] max-h-[85vh] overflow-y-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex gap-2 mb-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDates(new Date());
                                    setCalendarOpen(false);
                                  }}
                                >
                                  Today
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    setDates(tomorrow);
                                    setCalendarOpen(false);
                                  }}
                                >
                                  Tomorrow
                                </Button>
                              </div>
                              <DayPicker
                                style={{ color: "orangered" }}
                                className="rdp-mobile"
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

                          {/* Desktop: absolute dropdown (unchanged) */}
                          <div className="absolute top-14 left-0 md:-left-20 lg:-left-10 z-50 rounded-2xl bg-white shadow-lg shadow-slate-800/40 h-auto w-[310px] sm:w-[370px] p-4 sm:p-5 hidden md:block">
                            <div className="relative flex gap-3 mb-5">
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
                                style={{ color: "orangered" }}
                                className="relative rounded-3xl top-7 left-[-225px] p-6 z-50"
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
                        </>
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

                <div className="flex flex-row gap-2 pt-3 md:pt-4 border-t dark:border-black border-gray-100 w-full">
                  <Button
                    type="submit"
                    onClick={() => setViewType('list')}
                    className="flex-1 h-10 md:h-12 bg-gradient-to-r from-ms-orange to-ms-orange hover:from-ms-orange-hover hover:to-ms-orange-hover text-white font-bold text-sm md:text-lg shadow-md"
                  >
                    <Search className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
                    List View
                  </Button>
                  <Button
                    type="submit"
                    onClick={() => setViewType('map')}
                    className="flex-1 h-10 md:h-12 bg-gray-900 hover:bg-black dark:hover:bg-zinc-900 dark:bg-slate-900 text-white font-bold text-sm md:text-lg shadow-md"
                  >
                    <MapIcon className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Map View
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          </div>
        </div>
      </section>

      <section className="snap-start snap-always h-[calc(100dvh)] md:h-auto flex flex-col justify-center items-center py-4 px-4 dark:bg-gradient-to-t dark:from-ms-orange dark:to-transparent bg-orange-100/30 md:py-20">
        <div className="max-w-7xl mx-auto w-full flex flex-col justify-center flex-1">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-4 md:mb-12 text-gray-900">
            Why Choose MicroStay?
          </h2>
          <div className="flex flex-col gap-3 w-full flex-1 md:flex-initial md:grid md:grid-cols-3 md:gap-8">
            <Card className="hover:shadow-2xl transition dark:border-transparent border-gray-100 group w-full text-left md:text-center flex-1 md:flex-initial">
              <CardContent className="p-4 sm:p-4 md:p-8 flex flex-row md:flex-col items-center gap-4 md:gap-0 h-full">
                <div className="bg-gradient-to-br from-ms-orange to-ms-orange w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0 mb-0 md:mb-4 group-hover:scale-110 transition-transform shine-effect">
                  <Clock className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <div className="flex flex-col text-left md:text-center">
                  <h3 className="text-base md:text-xl font-bold mb-0.5 md:mb-3 text-gray-900">Flexible Hours</h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 font-medium leading-relaxed">
                    Book by the hours. Perfect for layovers, rest breaks, or quick getaways.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition dark:border-transparent border-gray-100 group w-full text-left md:text-center flex-1 md:flex-initial">
              <CardContent className="p-4 sm:p-4 md:p-8 flex flex-row md:flex-col items-center gap-4 md:gap-0 h-full">
                <div className="bg-gradient-to-br from-ms-orange to-ms-orange w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0 mb-0 md:mb-4 group-hover:scale-110 transition-transform shine-effect">
                  <Shield className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <div className="flex flex-col text-left md:text-center">
                  <h3 className="text-base md:text-xl font-bold mb-0.5 md:mb-3 text-gray-900">Reviewed Partners</h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 font-medium leading-relaxed">
                    All properties verified. Secure booking process with instant confirmation directly from the vendor.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition dark:border-transparent border-gray-100 group w-full text-left md:text-center flex-1 md:flex-initial">
              <CardContent className="p-4 sm:p-4 md:p-8 flex flex-row md:flex-col items-center gap-4 md:gap-0 h-full">
                <div className="bg-gradient-to-br from-ms-orange to-ms-orange w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0 mb-0 md:mb-4 group-hover:scale-110 transition-transform shine-effect">
                  <Award className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <div className="flex flex-col text-left md:text-center">
                  <h3 className="text-base md:text-xl font-bold mb-0.5 md:mb-3 text-gray-900">Transparent Prices</h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 font-medium leading-relaxed">
                    No MicroStay guest booking fee. See the room rate, taxes, and final amount before confirming.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Fold 3: How It Works & Popular Cities ── */}
      <section className="snap-start snap-always h-[calc(100dvh)] md:h-auto flex flex-col justify-center py-4 md:py-20 px-10 dark:bg-ms-orange bg-orange-200/20" id="how-it-works">
        <div className="max-w-7xl mx-auto w-full flex flex-col justify-center gap-24 md:gap-14">

          {/* How It Works */}
          <div>
            <div className="text-center mb-4 md:mb-14">
              <h2 className="text-xl md:text-4xl font-bold text-gray-900 mb-0.5 md:mb-3">How It Works</h2>
              <p className="text-gray-500 text-xs md:text-lg font-medium">Book a room in under 2 minutes</p>
            </div>

            <div className="flex flex-col md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none snap-x snap-mandatory px-2 md:px-0 w-full">
              {[
                { step: '01', icon: Search, title: 'Search', desc: 'Enter your city or tap "Near Me" to find available motels.' },
                { step: '02', icon: CalendarDays, title: 'Book', desc: 'Pick your time window, room, and confirm with your name/phone.' },
                { step: '03', icon: LogIn, title: 'Check In', desc: 'Primary guest must be 18+ and present government photo ID.' },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="flex-shrink-0 w-[75vw] sm:w-[240px] md:w-auto snap-center relative z-10 flex flex-col items-center text-center group bg-ms-orange-light dark:bg-transparent/90 pt-3 pb-2 px-3 rounded-xl border border-orange-100 dark:border-zinc-800">
                  <div className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl dark:bg-gradient-to-br dark:from-ms-orange dark:border-transparent dark:shadow-md dark:group-hover:shadow-ms-orange dark:to-ms-orange border-2 border-ms-orange-border flex items-center justify-center mb-2 md:mb-5 group-hover:border-ms-orange-border group-hover:shadow-lg group-hover:shadow-ms-orange-light transition-all">
                    <Icon className="w-5 h-5 md:w-8 md:h-8 text-ms-orange dark:text-white" />
                  </div>
                  <span className="text-[10px] md:text-[11px] font-black tracking-widest text-ms-orange uppercase mb-0.5">Step {step}</span>
                  <h3 className="text-sm md:text-xl font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed max-w-xs px-2 md:pl-5 md:pr-5 mb-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Cities */}
          {popularCities.length > 0 && (
            <div className="flex flex-col h-[-10dvh] mt-4 md:mt-10 dark:bg-slate-950 rounded-lg">
              <div className="text-center mb-3 md:mb-10">
                <h2 className="text-xl md:text-4xl font-bold text-gray-900 mb-0.5 md:mb-3">Popular Cities</h2>
                <p className="text-gray-500 text-xs md:text-lg font-medium">Hourly stays available in these locations</p>
              </div>

              <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none snap-x snap-mandatory px-2 md:px-0 w-full mb-2 md:mb-10">
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
                      className="flex-shrink-0 w-[60vw] sm:w-[200px] md:w-auto snap-center group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-transparent bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-200 text-left p-3 flex items-center gap-3"
                    >
                      <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                        <span className="text-white font-black text-xs md:text-sm">{initials}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs md:text-base text-gray-900 truncate">{city}</div>
                        <div className="text-[10px] md:text-sm text-gray-500 font-medium">{state}</div>
                        <div className="text-[9px] md:text-xs text-ms-orange font-bold mt-0.5">{count} {count === 1 ? 'property' : 'properties'}</div>
                      </div>
                      <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-300 group-hover:text-ms-orange transition-colors ml-auto flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </section>

      <section
        className="snap-start snap-always h-[calc(100dvh-5rem)] md:h-auto md:min-h-0 flex flex-col justify-center py-4 px-4 relative bg-cover bg-center landing-bottom-bg overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/70 to-gray-900/80 z-0"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 py-6 md:py-16">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-2 md:mb-6 text-white tracking-tight">
            List Your Property
          </h2>
          <p className="text-sm sm:text-base md:text-xl text-gray-200 mb-4 md:mb-10 font-medium shadow-sm">
            Offer property-approved stay windows and earn additional revenue from available rooms.
          </p>
          <Button
            size="lg"
            onClick={() => router.push('/partner')}
            className="text-xs sm:text-sm md:text-lg px-6 md:px-8 h-10 md:h-14 bg-gradient-to-r from-ms-orange to-ms-orange hover:from-ms-orange-hover hover:to-ms-orange-hover text-white shadow-xl shine-effect font-bold border border-ms-orange-border active:scale-95 hover:scale-105"
          >
            Become a Partner
          </Button>
        </div>

        <div className="relative z-10 w-full mt-auto">
          <Footer />
        </div>
      </section>

    </div>
  );
}
