'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Fix default Leaflet marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

type Property = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
};

interface MapInnerProps {
  properties: Property[];
}

export default function MapInner({ properties }: MapInnerProps) {
  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ height: '500px', width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {properties.map(p => (
        <Marker key={p.id} position={[p.latitude, p.longitude]}>
          <Popup>
            <div style={{ minWidth: '160px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: '#111' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                {p.city}, {p.state}
              </div>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: p.status === 'active' ? '#d1fae5' : '#fee2e2',
                color: p.status === 'active' ? '#065f46' : '#991b1b',
                border: `1px solid ${p.status === 'active' ? '#a7f3d0' : '#fca5a5'}`,
              }}>
                {p.status}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
