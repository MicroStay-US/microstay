'use client';

import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { MapPin, Wifi, Coffee, Tv, Car, Map, List, Search as SearchIcon, Star, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

const MapWrapper = dynamic(() => import('@/components/search/MapWrapper'), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-[600px] bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
      <span className="text-gray-500 font-medium">Loading map...</span>
    </div>
  )
});

type PropertyWithSlots = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  smoking_allowed?: boolean;
  description: string;
  amenities: string[];
  photos: string[];
  phone: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  star_rating?: number;
  vd_time_slots: {
    id: string;
    room_type: string;
    price_per_room: number;
    is_active: boolean;
    bed_type: string;
    duration_hours: number;
    start_hour: number;
    end_hour: number;
  }[];
};

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialView = searchParams.get('view') === 'map' ? 'map' : 'list';
  const [viewMode, setViewMode] = useState<'list' | 'map'>(initialView);
  
  const [properties, setProperties] = useState<PropertyWithSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Search Bar State
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [date, setDate] = useState(() => {
    const defaultDate = searchParams.get('date');
    if (defaultDate) return defaultDate;
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().split('T')[0];
  });
  const [time, setTime] = useState(searchParams.get('time') || '12:00');
  
  const roomType = searchParams.get('roomType') || '';
  const bedType = searchParams.get('bedType') || '';
  const smokingParam = searchParams.get('smoking') || '';
  // searchType='nearby' + no city => GPS search
  // searchType='nearby' + city in URL => city was picked from nearby dropdown, treat as city search
  // searchType='city' => normal city/state search
  const rawSearchType = searchParams.get('searchType') || 'city';
  const urlCity = searchParams.get('city') || '';
  const urlState = searchParams.get('state') || '';
  // If nearby tab but user picked a specific city, treat as city search
  const searchType = (rawSearchType === 'nearby' && urlCity) ? 'city' : rawSearchType;

  // Filters State
  const [priceRanges, setPriceRanges] = useState<string[]>([]);
  const [amenityFilters, setAmenityFilters] = useState<string[]>([]);
  const [smokingFilter, setSmokingFilter] = useState(false);
  const [priceSort, setPriceSort] = useState<'low' | 'high' | ''>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (searchType === 'nearby') {
      // Pure GPS — no city in URL
      getUserLocation();
    } else {
      fetchProperties();
    }
  }, [searchParams.get('city'), searchParams.get('state'), searchParams.get('date'),
    searchType, roomType, smokingFilter, priceSort, selectedTags]); // Rely on URL shifts

  const handleTopSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set('searchType', 'city');
    params.set('city', city);
    params.set('date', date);
    params.set('time', time);
    router.push(`/search?${params.toString()}`);
  };

  const getUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          fetchPropertiesByLocation(loc);
        },
        (error) => {
          console.error('Error getting location:', error);
          fetchProperties();
        }
      );
    } else {
      fetchProperties();
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchPropertiesByLocation = async (location: { lat: number; lng: number }) => {
    setLoading(true);
    try {
      const searchDate = searchParams.get('date') || date;
      // let query = supabase
      //       .from('properties')
      //       .select(`*, vd_time_slots(*)`)
      //       .eq('status', 'active');
      let query = supabase
          .from('properties')
          .select(`
              *,
              vendors!inner (
                  id,
                  status
              ),
              vd_time_slots(*)
          `)
          .eq('status', 'active')
          .eq('vendors.status', 'active');
            if (smokingFilter) {
                  query = query.eq('smoking_allowed', true);
            }

          const { data, error } = await query;
          console.log("Vendor Filter Result", data);
console.log("Count =", data?.length);
      // const { data, error } = await supabase
      //   .from('properties')
      //   .select(`*, vd_time_slots(*)`)
      //   .eq('status', 'active');
      if (error) throw error;

      // Fetch date-specific windows for the selected date
      const { data: dateWinData } = await supabase
        .from('vd_date_windows')
        .select('*')
        .eq('override_date', searchDate);

      const dateWinByProp: Record<string, any[]> = {};
      (dateWinData || []).forEach((w: any) => {
        if (!dateWinByProp[w.property_id]) dateWinByProp[w.property_id] = [];
        dateWinByProp[w.property_id].push(w);
      });

      const dataWithCoords = (data || [])
        .filter((p: any) => p.latitude != null && p.longitude != null)
        .map((property: any) => {
          const dw = dateWinByProp[property.id];
          return {
            ...(dw && dw.length > 0 ? { ...property, vd_time_slots: dw } : property),
            distance: calculateDistance(location.lat, location.lng, parseFloat(property.latitude), parseFloat(property.longitude)),
          };
        })
        .sort((a: any, b: any) => a.distance - b.distance);

      let filteredData = dataWithCoords.slice(0, 20);
      if (smokingParam === 'smoking') {
        filteredData = filteredData.filter(
          (property: any) => property.smoking_allowed === true
        );
      }

      if (smokingParam === 'non-smoking') {
        filteredData = filteredData.filter(
          (property: any) => property.smoking_allowed !== true
        );
      }
      // if (roomType) {
      //   filteredData = filteredData.filter((property: any) =>
      //     property.vd_time_slots?.some((slot: any) => slot.bed_type?.toLowerCase().includes(roomType.toLowerCase().split(' ')[0]) && slot.is_active)
      //   );
      // }
            if (roomType) {
          filteredData = filteredData.filter((property: any) =>
            property.vd_time_slots?.some(
              (slot: any) =>
                slot.room_type?.toLowerCase() === roomType.toLowerCase() &&
                slot.is_active
            )
          );
        }
        if (bedType) {
          filteredData = filteredData.filter((property: any) =>
            property.vd_time_slots?.some(
              (slot: any) =>
                slot.bed_type?.toLowerCase() === bedType.toLowerCase() &&
                slot.is_active
            )
          );
        }
      // if (priceSort === 'low') {
      //   filteredData.sort((a: any, b: any) => {
      //     const aPrice =
      //       a.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

      //     const bPrice =
      //       b.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

      //     return aPrice - bPrice;
      //   });
      // }

      // if (priceSort === 'high') {
      //   filteredData.sort((a: any, b: any) => {
      //     const aPrice =
      //       a.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

      //     const bPrice =
      //       b.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

      //     return bPrice - aPrice;
      //   });
      // }
      if (priceSort === 'low') {
      filteredData = [...filteredData].sort((a, b) => {
        const aPrice =
          a.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

        const bPrice =
          b.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

        return aPrice - bPrice;
      });
    }

    if (priceSort === 'high') {
      filteredData = [...filteredData].sort((a, b) => {
        const aPrice =
          a.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

        const bPrice =
          b.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

        return bPrice - aPrice;
      });
    }
      if (selectedTags.includes('couple')) {
        filteredData = filteredData.filter(
          (property: any) => property.couple_friendly === true
        );
      }

      if (selectedTags.includes('localId')) {
        filteredData = filteredData.filter(
          (property: any) => property.local_id_accepted === true
        );
      }
      setProperties(filteredData as PropertyWithSlots[]);
    } catch (error) {
      console.error('Location search error:', error);
      fetchProperties();
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const searchDate = searchParams.get('date') || date;
      let query = supabase
          .from('properties')
          .select(`
              *,
              vendors!inner (
                  id,
                  status
              ),
              vd_time_slots(*)
          `)
          .eq('status', 'active')
          .eq('vendors.status', 'active');
      if (smokingFilter) {
        query = query.eq('smoking_allowed', true);
      }
      // Filter by city from URL
      const urlCity = searchParams.get('city') || '';
      if (urlCity && urlCity.toLowerCase() !== 'all') {
        query = query.ilike('city', `%${urlCity}%`);
      }
      // Filter by state from URL
      const urlState = searchParams.get('state') || '';
      if (urlState && urlState.toLowerCase() !== 'all') {
        query = query.ilike('state', `%${urlState}%`);
      }
      let { data, error } = await query;
      console.log('City filter:', urlCity, '| State filter:', urlState);
      console.log('Properties Returned:', data?.length);
      if (error) throw error;

      // Fetch date-specific windows for the selected date
      const { data: dateWinData } = await supabase
        .from('vd_date_windows')
        .select('*')
        .eq('override_date', searchDate);

      // Group by property_id for quick lookup
      const dateWinByProp: Record<string, any[]> = {};
      (dateWinData || []).forEach((w: any) => {
        if (!dateWinByProp[w.property_id]) dateWinByProp[w.property_id] = [];
        dateWinByProp[w.property_id].push(w);
      });

      // Replace vd_time_slots with date windows where they exist for this date
      // if (smokingFilter) {
      //   data = (data || []).filter(
      //     (property: any) => property.smoking_allowed === true
      //   );
      // }
      // let filteredData: any[] = (data || []).map((property: any) => {
      //   if (smokingParam === 'smoking') {
      //     filteredData = filteredData.filter(
      //       (property: any) => property.smoking_allowed === true
      //     );
      //   }

      //   if (smokingParam === 'non-smoking') {
      //     filteredData = filteredData.filter(
      //       (property: any) => property.smoking_allowed !== true
      //     );
      //   }
      //   const dw = dateWinByProp[property.id];
      //   return dw && dw.length > 0 ? { ...property, vd_time_slots: dw } : property;
      // });
      let filteredData: any[] = (data || []).map((property: any) => {
        
          const dw = dateWinByProp[property.id];

          return dw && dw.length > 0
            ? { ...property, vd_time_slots: dw }
            : property;
        });
        console.log("After map:", filteredData.length);
        // Smoking Filter
        if (smokingParam === 'smoking') {
          filteredData = filteredData.filter(
            (property: any) => property.smoking_allowed === true
          );
        }
        

        if (smokingParam === 'non-smoking') {
          filteredData = filteredData.filter(
            (property: any) => property.smoking_allowed !== true
          );
        }
      // if (roomType) {
      //   filteredData = filteredData.filter((property: any) =>
      //     property.vd_time_slots?.some((slot: any) => slot.bed_type?.toLowerCase().includes(roomType.toLowerCase().split(' ')[0]) && slot.is_active)
      //   );
      // }
      if (roomType) {
          filteredData = filteredData.filter((property: any) =>
            property.vd_time_slots?.some(
              (slot: any) =>
                slot.room_type?.toLowerCase() === roomType.toLowerCase() &&
                slot.is_active
            )
          );
        }
        if (bedType) {
          filteredData = filteredData.filter((property: any) =>
            property.vd_time_slots?.some(
              (slot: any) =>
                slot.bed_type?.toLowerCase() === bedType.toLowerCase() &&
                slot.is_active
            )
          );
        }
      // if (priceSort === 'low') {
      //   filteredData.sort((a: any, b: any) => {
      //     const aPrice =
      //       a.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

      //     const bPrice =
      //       b.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

      //     return aPrice - bPrice;
      //   });
      // }

      // if (priceSort === 'high') {
      //   filteredData.sort((a: any, b: any) => {
      //     const aPrice =
      //       a.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

      //     const bPrice =
      //       b.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

      //     return bPrice - aPrice;
      //   });
      // }
      if (priceSort === 'low') {
        filteredData = [...filteredData].sort((a, b) => {
          const aPrice =
            a.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

          const bPrice =
            b.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

          return aPrice - bPrice;
        });
      }

      if (priceSort === 'high') {
        filteredData = [...filteredData].sort((a, b) => {
          const aPrice =
            a.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

          const bPrice =
            b.vd_time_slots?.find((s: any) => s.is_active)?.price_per_room || 0;

          return bPrice - aPrice;
        });
      }
      if (selectedTags.includes('couple')) {
        filteredData = filteredData.filter(
          (property: any) => property.couple_friendly === true
        );
      }

      if (selectedTags.includes('localId')) {
        filteredData = filteredData.filter(
          (property: any) => property.local_id_accepted === true
        );
      }
      setProperties(filteredData as PropertyWithSlots[]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAmenityIcon = (amenity: string) => {
    const icons: { [key: string]: any } = { wifi: Wifi, parking: Car, breakfast: Coffee, tv: Tv };
    const IconComponent = icons[amenity.toLowerCase()] || CheckCircle2;
    return <IconComponent className="h-3 w-3" />;
  };

  // Extract unique sorted time slots for a property to display pricing columns
  const fmtHour = (h: number) => {
    const hr = h % 24;
    const suffix = hr < 12 ? 'AM' : 'PM';
    const display = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    return `${display}${suffix}`;
  };

  const getActiveSlots = (slots: any[]) => {
    if (!Array.isArray(slots) || !slots.length) return [];
    return slots.filter(s => s.is_active).sort((a, b) => a.start_hour - b.start_hour);
  };

  const toggleTag = (tag: string) => {
  setSelectedTags((prev) =>
    prev.includes(tag)
      ? prev.filter((t) => t !== tag)
      : [...prev, tag]
  );
};
  const handleBookDirectly = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/motel/${propertyId}?date=${date}`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50  dark:bg-black/40 flex flex-col font-sans">
      
      {/* 1. Sticky Unified Search Header (Brevistay Style) */}
      <div className="dark:bg-slate-900 dark:border-b dark:border-slate-950 sticky top-0 z-40 shadow-lg shadow-ms-orange-light dark:shSearchadow-black">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <form onSubmit={handleTopSearch} className="flex flex-col  md:flex-row items-center gap-2 md:gap-4 bg-white/10 p-2 rounded-xl border border-white/20 backdrop-blur-md dark:bg-slate-950/20">
            
            <div className="flex-1 w-full relative ">
              <label className="absolute  left-3 text-[10px] font-bold text-ms-orange uppercase tracking-wider dark:bg-slate-900 px-1">Where?</label><br></br>
              <Input 
                type="text" 
                value={city} 
                onChange={(e) => setCity(e.target.value)}
                placeholder="City, Property, API" 
                className="w-full  h-10 pt-4 border-none shadow-inner rounded-lg text-gray-900 font-bold focus-visible:ring-2 focus-visible:ring-ms-orange"
              />
            </div>
            
            <div className="flex-1 w-full relative">
              <label className="absolute  left-3 text-[10px] font-bold text-ms-orange uppercase tracking-wider dark:bg-slate-900 px-1">When?</label><br></br>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                className="w-full  h-10 pt-4 border-none shadow-inner rounded-lg text-gray-900 font-bold focus-visible:ring-2 focus-visible:ring-ms-orange"
                required
              />
            </div>

            <Button type="submit" className="w-full relative top-3 md:w-auto h-10 px-8 bg-ms-orange hover:bg-ms-orange-hover text-white font-black hover:scale-[1.02] transition-transform rounded-lg shadow-md active:scale-95">
              <SearchIcon className="w-5 h-5 mr-2" /> Search
            </Button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 font-bold text-xl animate-pulse flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-ms-orange-border border-t-transparent rounded-full animate-spin"></div>
            Searching Properties...
          </div>
        </div>
      ) : (
        <div className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full flex flex-col lg:flex-row gap-6">
          
          {/* 2. Left Sidebar Filters */}
          <div className="w-full lg:w-[280px] flex-shrink-0 space-y-6">
            
            {/* Dynamic Tags Area */}
            <div className=" bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-transparent flex justify-between items-center dark:bg-black/50 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-sm">Popular Tags</h3>
                {/* <span className="text-xs font-bold text-ms-orange cursor-pointer hover:underline">Clear</span> */}
                <button
                type="button"
                onClick={() => setSelectedTags([])}
                className="text-xs font-bold text-ms-orange hover:underline"
              >
                Clear
              </button>
              </div>
              <div className="p-5 flex flex-wrap gap-2">

                  <Badge
                    variant="outline"
                    onClick={() => toggleTag('couple')}
                    className={`cursor-pointer p-2 font-semibold shadow-sm ${
                      selectedTags.includes('couple')
                        ? 'border-ms-orange-border bg-ms-orange-light text-ms-orange dark:bg-ms-orange dark:text-white dark:border-transparent'
                        : 'border-gray-200 text-gray-600 dark:hover:bg-slate-900'
                    }`}
                  >
                    Couple Friendly
                  </Badge>

                  <Badge
                    variant="outline"
                    onClick={() => toggleTag('payAtHotel')}
                    className={`cursor-pointer p-2 font-semibold shadow-sm ${
                      selectedTags.includes('payAtHotel')
                        ? 'border-ms-orange-border bg-ms-orange-light text-ms-orange dark:bg-ms-orange dark:text-white dark:border-transparent'
                        : 'border-gray-200 text-gray-600 dark:hover:bg-slate-900'
                    }`}
                  >
                    Pay At Hotel
                  </Badge>

                  <Badge
                    variant="outline"
                    onClick={() => toggleTag('localId')}
                    className={`cursor-pointer p-2 font-semibold shadow-sm ${
                      selectedTags.includes('localId')
                        ? 'border-ms-orange-border bg-ms-orange-light text-ms-orange dark:bg-ms-orange dark:text-white dark:border-transparent'
                        : 'border-gray-200 text-gray-600 dark:hover:bg-slate-900'
                    }`}
                  >
                    Local ID Accepted
                  </Badge>

                </div>
            </div>

            {/* Price Filter Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-transparent flex justify-between items-center dark:bg-black/50 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-sm">Price</h3>
                {/* <span className="text-xs font-bold text-ms-orange cursor-pointer hover:underline">Clear</span> */}
                <button
                  type="button"
                  onClick={() => setPriceSort('')}
                  className="text-xs font-bold text-ms-orange hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="p-5">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Sort By Price</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox
                          checked={priceSort === 'low'}
                          onCheckedChange={(checked) => {
                            setPriceSort(checked ? 'low' : '');
                          }}
                          
                        />
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 dark:text-white/50 dark:group-hover:text-ms-orange-light">Low to High</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox
                            checked={priceSort === 'high'}
                            onCheckedChange={(checked) => {
                              setPriceSort(checked ? 'high' : '');
                            }}
                          />
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 dark:text-white/50 dark:group-hover:text-ms-orange-light">High to Low</span>
                  </label>
                </div>
              </div>
            </div>
            {/*smoking filter area */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-transparent flex justify-between items-center dark:bg-black/50 bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 text-sm">
                    Property Preferences
                  </h3>
                </div>

                <div className="p-5 dark:group-hover:text-white">
                  <label className="flex items-center gap-3 cursor-pointer group ">
                  <input
                      type="checkbox"
                      checked={smokingFilter}
                      onChange={(e) => {
                        console.log("Changed:", e.target.checked);
                        setSmokingFilter(e.target.checked);
                      }}
                    />

                    <span className="text-sm font-semibold text-gray-700 dark:text-white/50 dark:hover:text-inherit">
                      Smoking Allowed
                    </span>
                  </label>
                </div>
              </div>
            {/* Ratings Filter Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hidden md:block">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-transparent flex justify-between items-center dark:bg-black/50 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-sm">Customer Ratings</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-4 gap-2">
                  {['3.0+', '3.5+', '4.0+', '4.5+'].map(rating => (
                    <div key={rating} className=" border border-ms-orange-border bg-ms-orange-light rounded-md py-2 flex flex-row items-center justify-center cursor-pointer hover:bg-ms-orange-light transition-colors shadow-sm dark:bg-ms-orange gap-1 dark:hover:bg-orange-500/60">
                      <span className="text-xs font-black text-ms-orange dark:text-white">{rating}</span>
                      <Star className="w-3 h-3 text-ms-orange fill-ms-orange mt-0.5 dark:text-white dark:fill-white" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* 3. Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Results Title & View Toggles */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 dark:border-black">
              <div className="flex-1">
                <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <div className="w-2 h-6 bg-ms-orange rounded-full"></div>
                  Showing {properties.length} {properties.length === 1 ? 'Motel' : 'Motels'}
                  {rawSearchType === 'nearby' && !urlCity ? ' Near You' : ''}
                  {urlCity ? ` in ${urlCity}${urlState ? ', ' + urlState : ''}` : ''}
                  {!urlCity && rawSearchType !== 'nearby' ? '' : ''}
                </h1>
                {rawSearchType === 'nearby' && !urlCity && <p className="text-sm text-gray-500 font-medium ml-4 mt-1">Within a 20-mile radius</p>}
                {urlCity && <p className="text-sm text-gray-500 font-medium ml-4 mt-1">{urlState ? `${urlCity}, ${urlState}` : urlCity} · Hourly stays available</p>}
              </div>
              
              {properties.length > 0 && (
                <div className="flex bg-gray-100 dark:bg-transparent p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center px-4 py-2 rounded-l-md transition-all text-sm font-bold ${viewMode === 'list' ? 'bg-white text-ms-orange shadow-sm dark:bg-black/30' : 'text-gray-500 hover:text-gray-700 dark:bg-zinc-500'}`}
                  >
                    <List className="w-4 h-4 mr-2" /> List
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center px-4 py-2 rounded-r-md transition-all text-sm font-bold ${viewMode === 'map' ? 'bg-white text-ms-orange shadow-sm dark:bg-black/30' : 'text-gray-500 hover:text-gray-700 dark:bg-zinc-500'}`}
                  >
                    <Map className="w-4 h-4 mr-2" /> Map
                  </button>
                </div>
              )}
            </div>

            {/* Results Body */}
            {properties.length === 0 ? (
              <Card className="border-gray-200 bg-white shadow-sm overflow-hidden">
                <CardContent className="p-16 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <SearchIcon className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">No properties found</h3>
                  <p className="text-gray-500 font-medium mb-8 max-w-md mx-auto">We couldn't find any Hourly Hotels matching your exact criteria in this location for the selected date.</p>
                  <Button onClick={() => router.push('/')} className="bg-ms-orange hover:bg-ms-orange-hover text-white shadow-md font-bold px-8 h-12">
                    Clear Filters & Search Again
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === 'map' ? (
              <div className="w-full h-[400px] md:h-[700px] rounded-xl overflow-hidden shadow-sm border border-gray-200">
                <MapWrapper motels={properties} userLocation={userLocation} dateStr={date} />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {properties.map((property) => {
                  const isPhotosArray = Array.isArray(property.photos);
                  const photos = isPhotosArray && property.photos.length > 0 ? property.photos : [
                    "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800"
                  ];
                  
                  // For the side side-strip thumbnails we need 3 photos.
                  const sidePhotos = [
                    photos[1] || photos[0],
                    photos[2] || photos[0],
                    photos[3] || photos[0]
                  ];

                  const activeSlots = getActiveSlots(property.vd_time_slots);

                  return (
                    <Card
                      key={property.id}
                      className="group flex flex-col sm:flex-row overflow-hidden border-gray-200 hover:border-ms-orange-border hover:shadow-xl transition-all duration-300 cursor-pointer dark:bg-black/30"
                      onClick={() => router.push(`/motel/${property.id}?date=${date}`)}
                    >
                      {/* Left: Image Gallery (Horizontal split) */}
                      <div className="flex w-full sm:w-[320px] lg:w-[380px] h-[240px] flex-shrink-0">
                        {/* Main Huge Image */}
                        <div 
                          className="flex-1 h-full bg-cover bg-center relative"
                          style={{ backgroundImage: `url(${photos[0]})` }}
                        >
                          <div className="absolute top-3 left-3 bg-white/95 dark:bg-black/60 backdrop-blur font-black text-[10px] uppercase tracking-widest text-ms-orange px-2.5 py-1.5 rounded-md shadow-lg flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-ms-teal animate-pulse"></span> Instant Book
                          </div>
                          
                          {/* Carousel Arrows (Visual only for now) */}
                          <div className="absolute inset-y-0 left-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-black/60"><ChevronLeft className="w-5 h-5" /></div>
                          </div>
                          <div className="absolute inset-y-0 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-black/60"><ChevronRight className="w-5 h-5" /></div>
                          </div>
                        </div>
                        {/* 3 Vertical Thumbnail Strip */}
                        <div className="w-[80px] h-full hidden md:flex flex-col gap-1 pr-1 py-1 pl-1 bg-gray-100">
                          {sidePhotos.map((p, i) => (
                            <div key={i} className="flex-1 bg-cover bg-center rounded-sm hover:opacity-80 transition-opacity cursor-pointer relative" style={{ backgroundImage: `url(${p})` }}>
                              {i === 2 && isPhotosArray && property.photos.length > 4 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold rounded-sm">+{property.photos.length - 4}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Center: Details */}
                      <div className="flex-1 p-5 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="secondary" className="bg-ms-orange-light text-ms-orange hover:bg-ms-orange-light border-none rounded text-[10px] font-black tracking-wider uppercase px-2 shadow-sm dark:bg-black/5 dark:text-ms-orange-light">Premium</Badge>
                              {property.distance && <span className="text-xs font-bold text-gray-400 flex items-center"><MapPin className="w-3 h-3 mr-0.5" />{property.distance.toFixed(1)} mi</span>}
                            </div>
                            <h3 className="text-xl lg:text-2xl font-black leading-tight text-ms-orange transition-colors line-clamp-1">{property.name}</h3>
                          </div>
                          
                          <div className="hidden lg:flex items-center gap-1.5 bg-green-50 dark:bg-green-500 px-2 py-1 rounded border border-green-100 dark:border-transparent">
                            <span className="font-bold text-green-700 dark:text-white text-sm">{property?.star_rating || '4.5'}</span>
                            <Star className="w-3 h-3 fill-green-500 dark:text-white dark:fill-white  text-green-500" />
                          </div>
                        </div>

                        <div className="text-sm font-medium text-gray-500 mb-4 line-clamp-1 flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 text-gray-400" />
                          {property.address}, {property.city}
                        </div>

                        {/* Badges mimicking Brevistay Rules */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100 dark:bg-black dark:border-transparent"><CheckCircle2 className="w-3 h-3 text-ms-teal" /> Couple Friendly</span>
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100 dark:bg-black dark:border-transparent"><CheckCircle2 className="w-3 h-3 text-ms-teal" /> Accepts Local ID</span>
                            {property.smoking_allowed && (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100  dark:bg-black dark:border-transparent">
                                🚬 Smoking Allowed
                              </span>
                            )}
                        </div>

                        {/* Amenities Line */}
                        {Array.isArray(property.amenities) && property.amenities.length > 0 && (
                          <div className="flex items-center gap-3 text-gray-400 mb-auto mt-2">
                            {property.amenities.slice(0, 5).map((amenity, idx) => (
                              <div key={idx} className="flex items-center gap-1 tooltip-trigger">
                                {getAmenityIcon(amenity)}
                              </div>
                            ))}
                            {property.amenities.length > 5 && <span className="text-xs font-bold text-gray-500">+{property.amenities.length - 5} more</span>}
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-black hidden sm:flex w-full">
                          {/* Time Window Price Tiles */}
                          {activeSlots.length === 0 ? (
                            <span className="text-sm font-medium text-gray-500">No active time windows</span>
                          ) : (
                            <div className="flex w-full gap-3 overflow-x-auto pb-1 scrollbar-hide">
                              {activeSlots.slice(0, 3).map((slot) => (
                                <div
                                  key={slot.id}
                                  className="flex-1 min-w-[110px] border border-gray-200 rounded-lg p-2.5 flex flex-col items-center justify-center bg-gray-50 hover:bg-ms-orange-light hover:border-ms-orange-border transition-colors cursor-pointer group/price shadow-sm dark:bg-black"
                                  onClick={(e) => handleBookDirectly(property.id, e)}
                                >
                                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 group-hover/price:text-ms-orange transition-colors whitespace-nowrap dark:group-hover:text-white/40">
                                    {fmtHour(slot.start_hour)} – {fmtHour(slot.end_hour)}
                                  </span>
                                  <span className="text-lg font-black text-gray-900 group-hover/price:text-ms-orange transition-colors">${slot.price_per_room}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Explicit Total Container (Optional, we integrated it into bottom center) */}
                      {/* For very large screens, we could move prices right, but bottom center matches Brevistay better on mid-screens. Let's add a clear Book Now indicator on the right side for emphasis */}
                      <div className="hidden lg:flex flex-col items-center justify-center w-[160px] border-l border-gray-100 bg-gray-50/50 p-5 dark:bg-black/30 dark:border-transparent">
                         <div className="w-12 h-12  rounded-full shadow-sm flex items-center justify-center mb-3 dark:group-hover:bg-slate-900">
                           <ChevronRight className="w-6 h-6 text-ms-orange group-hover:text-ms-orange transition-colors " />
                         </div>
                         <span className="text-sm font-bold text-gray-900 text-center dark:text-white/50">View Room<br/>Options</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-700 py-12 px-4 shadow-inner"><div className="text-center font-bold text-gray-500 dark:text-white">Loading Search...</div></div>}>
      <SearchContent />
    </Suspense>
  );
}
