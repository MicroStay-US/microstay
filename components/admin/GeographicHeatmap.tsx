'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Map popular cities to rough coordinates for the heatmap UI demo
const cityCoordinates: Record<string, [number, number]> = {
  'New York': [40.7128, -74.0060],
  'Los Angeles': [34.0522, -118.2437],
  'Chicago': [41.8781, -87.6298],
  'Houston': [29.7604, -95.3698],
  'Phoenix': [33.4484, -112.0740],
  'Philadelphia': [39.9526, -75.1652],
  'San Antonio': [29.4241, -98.4936],
  'San Diego': [32.7157, -117.1611],
  'Dallas': [32.7767, -96.7970],
  'San Jose': [37.3382, -121.8863],
  'Austin': [30.2672, -97.7431],
  'Jacksonville': [30.3322, -81.6557],
  'Fort Worth': [32.7555, -97.3308],
  'Columbus': [39.9612, -82.9988],
  'San Francisco': [37.7749, -122.4194],
  'Charlotte': [35.2271, -80.8431],
  'Indianapolis': [39.7684, -86.1581],
  'Seattle': [47.6062, -122.3321],
  'Denver': [39.7392, -104.9903],
  'Washington': [38.9072, -77.0369]
};

export default function GeographicHeatmap() {
  const [nodes, setNodes] = useState<any[]>([]);

  useEffect(() => {
    async function loadLocations() {
      // Fetch properties to aggregate by city
      const { data: properties } = await supabase.from('properties').select('city, state, status');
      
      const cityCount = new Map<string, number>();
      
      if (properties) {
        properties.forEach(p => {
          if (p.status !== 'active') return;
          const key = p.city;
          cityCount.set(key, (cityCount.get(key) || 0) + 1);
        });
      }
      
      const mapNodes: any[] = [];
      const usedKeys = new Set<string>();

      // Generate exact nodes for cities we have coordinates for
      cityCount.forEach((count, city) => {
        if (cityCoordinates[city]) {
          mapNodes.push({
            city,
            coordinates: cityCoordinates[city],
            properties: count,
            demandScore: count > 3 ? 98 : count > 1 ? 85 : 65
          });
          usedKeys.add(city);
        }
      });

      // Add deterministic expansion targets (mock future growth hubs without properties)
      Object.entries(cityCoordinates).slice(0, 10).forEach(([city, coords]) => {
        if (!usedKeys.has(city)) {
          mapNodes.push({
            city,
            coordinates: coords,
            properties: 0,
            demandScore: Math.floor(Math.random() * 40) + 50 // High demand, 0 supply
          });
        }
      });

      setNodes(mapNodes);
    }
    loadLocations();
  }, []);

  // CartoDB Dark Matter tile layer matches the zinc-900 admin theme
  return (
    <div className="h-[500px] w-full bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
      <MapContainer 
        center={[39.8283, -98.5795]} 
        zoom={4} 
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {nodes.map((node, idx) => (
          <CircleMarker
            key={idx}
            center={node.coordinates}
            radius={Math.max(6, node.demandScore / 6)}
            fillOpacity={node.properties === 0 ? 0.3 : 0.7}
            fillColor={node.properties === 0 ? '#f59e0b' : '#f97316'}
            color={node.properties === 0 ? '#f59e0b' : '#f97316'}
            weight={1}
            stroke={true}
          >
            <Popup className="custom-popup">
              <div className="p-1">
                <p className="font-black text-xs uppercase tracking-widest text-zinc-900 mb-1">{node.city}</p>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-600">Active Supply: <span className="text-zinc-900 font-black">{node.properties}</span></span>
                  <span className="text-[10px] font-bold text-zinc-600">Demand Score: <span className="text-orange-600 font-black">{node.demandScore}/100</span></span>
                  {node.properties === 0 && (
                    <span className="text-[9px] uppercase tracking-widest font-black text-rose-600 mt-1">Expansion Target</span>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
