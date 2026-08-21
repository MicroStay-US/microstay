'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Search, Building2, MapPin, Mail, WifiOff, Wifi } from 'lucide-react';

export function MotelsTab() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/properties');
      const json = await res.json();
      setProperties(json.data || []);
    } catch (e) {
      console.error(e);
      setProperties([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const toggleStatus = async (e: React.MouseEvent, propertyId: string, currentStatus: string) => {
    e.stopPropagation();
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setToggling(propertyId);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: newStatus } : p));
      }
    } finally {
      setToggling(null);
    }
  };

  const filtered = properties.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name?.toLowerCase().includes(s) || p.city?.toLowerCase().includes(s) || p.state?.toLowerCase().includes(s);
  });

  if (loading) return <div className="h-64 bg-zinc-200 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Platform Properties</h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">Directory of all live motels and hotels operating on MicroStay.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or location..." className="pl-9 h-10 w-64 bg-white border-zinc-200 text-sm font-medium shadow-sm transition-all focus:ring-2 focus:ring-zinc-900" />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Property</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((p) => {
                const ownerName = p.vendor?.owner_name || p.vendor?.business_name || 'Pending Setup';
                return (
                  <tr 
                    key={p.id} 
                    onClick={() => router.push(`/admin/properties/${p.id}`)}
                    className="hover:bg-zinc-50/80 transition-colors bg-white cursor-pointer group"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-zinc-400 group-hover:text-ms-orange transition-colors" /> 
                        {p.name}
                      </div>
                      <div className="text-xs text-zinc-500 font-medium mt-1 truncate max-w-[200px]">{p.address}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-800">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 group-hover:text-ms-orange transition-colors" />
                        {p.city}, {p.state} {p.zip_code}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-zinc-900">{ownerName}</div>
                      <div className="text-xs text-zinc-500 font-medium flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3 text-zinc-400" /> {p.vendor?.email || p.email || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {p.status === 'active' ? 'LIVE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                      <button
                        disabled={toggling === p.id}
                        onClick={(e) => toggleStatus(e, p.id, p.status)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          toggling === p.id
                            ? 'opacity-50 cursor-not-allowed bg-zinc-100 text-zinc-400 border-zinc-200'
                            : p.status === 'active'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                        }`}
                      >
                        {toggling === p.id
                          ? '...'
                          : p.status === 'active'
                            ? <><WifiOff className="w-3.5 h-3.5" /> Take Offline</>
                            : <><Wifi className="w-3.5 h-3.5" /> Go Live</>
                        }
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-zinc-300 mb-3" />
                    <p className="text-zinc-500 font-medium">No properties match your exact search criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
