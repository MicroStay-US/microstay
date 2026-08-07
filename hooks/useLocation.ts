"use client";

import { useEffect, useState } from "react";

export default function useLocation() {
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          );

          const data = await response.json();

          const currentLocation = {
            latitude: lat,
            longitude: lng,
            city:
              data.address.city ||
              data.address.town ||
              data.address.village,
            state: data.address.state,
            country: data.address.country,
            address: data.display_name,
          };

          localStorage.setItem(
            "userLocation",
            JSON.stringify(currentLocation)
          );

          setLocation(currentLocation);
        } catch (err) {
          console.log(err);
        }

        setLoading(false);
      },
      (err) => {
        console.log(err);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
      }
    );
  }, []);

  return { location, loading };
}