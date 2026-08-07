'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';

const createCustomIcon = (price: number) => {
  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative group cursor-pointer">
        <div class="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold py-1 px-3 rounded-full shadow-lg border-2 border-white scale-100 group-hover:scale-110 transition-transform flex items-center justify-center">
          $${price}
        </div>
        <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-orange-600 absolute -bottom-2 left-1/2 -translate-x-1/2 drop-shadow-md"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

interface MapProps {
  motels: any[];
  userLocation?: { lat: number; lng: number } | null;
  dateStr?: string;
}

export default function SearchMapWrapper({ motels, userLocation, dateStr }: MapProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fix leaflet marker icon issues in Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
        <span className="text-gray-500 font-medium">Loading map...</span>
      </div>
    );
  }

  // Determine starting view
  let defaultCenter: [number, number] = [39.8283, -98.5795]; // US Center
  let defaultZoom = 4;

  if (motels.length > 0) {
    // Center on the first motel if available
    const firstMotel = motels.find(m => m.latitude && m.longitude);
    if (firstMotel) {
      defaultCenter = [parseFloat(firstMotel.latitude), parseFloat(firstMotel.longitude)];
      defaultZoom = 10;
    }
  }

  if (userLocation) {
    defaultCenter = [userLocation.lat, userLocation.lng];
    defaultZoom = 11;
  }

  const getMinPrice = (slots: any[]) => {
    if (!Array.isArray(slots) || !slots.length) return 0;
    const activeSlots = slots.filter(s => s.is_active);
    if (!activeSlots.length) return 0;
    return Math.min(...activeSlots.map((s) => s.price_per_room));
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-orange-200 relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater center={defaultCenter} zoom={defaultZoom} />

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              className: 'user-location-icon',
              html: `
                <div class="relative flex h-6 w-6">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-6 w-6 bg-blue-500 border-2 border-white shadow-md"></span>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <span className="font-semibold">You are here</span>
            </Popup>
          </Marker>
        )}

        {motels.map((motel) => {
          if (!motel.latitude || !motel.longitude) return null;
          
          const price = getMinPrice(motel.vd_time_slots);
          
          return (
            <Marker
              key={motel.id}
              position={[parseFloat(motel.latitude), parseFloat(motel.longitude)]}
              icon={createCustomIcon(price)}
            >
              <Popup className="motel-popup min-w-[200px]" closeButton={false}>
                <div className="p-1">
                  <div 
                    className="h-24 bg-cover bg-center rounded-t-lg mb-2 -mx-1 -mt-1"
                    style={{
                      backgroundImage: Array.isArray(motel.photos) && motel.photos.length > 0 
                        ? `url(${motel.photos[0]})` 
                        : "linear-gradient(rgba(249, 115, 22, 0.6), rgba(251, 146, 60, 0.6))"
                    }}
                  />
                  <h3 className="font-bold text-gray-900 leading-tight mb-1">{motel.name}</h3>
                  <div className="flex items-center text-gray-500 text-xs mb-2">
                    <MapPin className="h-3 w-3 mr-1" />
                    {motel.city}, {motel.state}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-bold text-orange-600 text-lg">${price}<span className="text-xs text-gray-500 font-normal">/hr</span></span>
                    <Button 
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600 h-7 text-xs px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/motel/${motel.id}?date=${dateStr}`);
                      }}
                    >
                      Book
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
