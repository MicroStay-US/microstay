'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { RefreshCw, MapPin, Building2, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MapComponent = dynamic(() => import('@/components/admin/MapInner'), { ssr: false });

type Property = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
};

export function MapViewTab() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: e } = await supabase
      .from('properties')
      .select('id, name, city, state, status, latitude, longitude, address')
      .order('name', { ascending: true });
    if (e) setError(e.message);
    else setProperties(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const withCoords = properties.filter(p => p.latitude != null && p.longitude != null) as (Property & { latitude: number; longitude: number })[];
  const withoutCoords = properties.filter(p => p.latitude == null || p.longitude == null);

  const totalCount  = properties.length;
  const activeCount = properties.filter(p => p.status === 'active').length;
  const offlineCount = properties.filter(p => p.status !== 'active').length;

  if (loading) return <div className="h-64 bg-zinc-200 dark:bg-slate-700 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Property Map</h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">Geographic overview of all properties on the platform.</p>
        </div>
        <Button variant="outline" onClick={load} className="text-zinc-700 font-bold dark:bg-slate-800 dark:border-transparent dark:hover:bg-slate-700 dark:text-white/40 dark:hover:text-white border-zinc-300 gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {error && (
        <Alert className="bg-rose-50 border-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-800 font-bold ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-zinc-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total</p>
          </div>
          <p className="text-2xl font-black text-zinc-900">{totalCount}</p>
          <p className="text-xs text-zinc-400 mt-1">all properties</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active</p>
          </div>
          <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
          <p className="text-xs text-zinc-400 mt-1">live on platform</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <WifiOff className="w-4 h-4 text-zinc-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Offline</p>
          </div>
          <p className="text-2xl font-black text-zinc-600">{offlineCount}</p>
          <p className="text-xs text-zinc-400 mt-1">inactive / pending</p>
        </div>
        <div className={`border rounded-xl p-4 shadow-sm ${withoutCoords.length > 0 ? 'bg-amber-50 border-amber-200 dark:bg-slate-900 dark:border-transparent' : 'bg-white border-zinc-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className={`w-4 h-4 ${withoutCoords.length > 0 ? 'text-amber-500' : 'text-zinc-400'}`} />
            <p className={`text-[10px] font-black uppercase tracking-widest ${withoutCoords.length > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>No Coords</p>
          </div>
          <p className={`text-2xl font-black ${withoutCoords.length > 0 ? 'text-amber-700' : 'text-zinc-900'}`}>{withoutCoords.length}</p>
          <p className="text-xs text-zinc-400 mt-1">missing coordinates</p>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:bg-slate-950 dark:border-transparent bg-zinc-50/50 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-zinc-400" />
          <h3 className="font-bold text-zinc-900">Live Property Map</h3>
          <span className="ml-auto text-xs font-bold text-zinc-400">{withCoords.length} pin{withCoords.length !== 1 ? 's' : ''} displayed</span>
        </div>
        <div className="p-4">
          {withCoords.length === 0 ? (
            <div className="h-[500px] bg-zinc-50 rounded-xl border dark:border-transparent border-zinc-200 flex flex-col items-center justify-center gap-3">
              <MapPin className="w-12 h-12 text-zinc-300" />
              <p className="text-zinc-500 font-medium text-sm">No properties with coordinates found.</p>
            </div>
          ) : (
            <MapComponent properties={withCoords} />
          )}
        </div>
      </div>

      {/* Properties without coordinates */}
      {withoutCoords.length > 0 && (
        <div className="bg-white border dark:border-transparent  border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-transparent bg-amber-50/60 dark:bg-slate-950 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-zinc-900">Properties Missing Coordinates ({withoutCoords.length})</h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-black">
            {withoutCoords.map(p => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-zinc-900 text-sm">{p.name}</div>
                  <div className="text-xs text-zinc-500 font-medium mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {p.address || 'No address'} · {p.city}, {p.state}
                  </div>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                  p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-600/40 dark:text-white dark:border-transparent' : 'dark:bg-emerald-600/40 dark:text-white dark:border-transparent bg-zinc-100 text-zinc-500 border-zinc-200'
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
