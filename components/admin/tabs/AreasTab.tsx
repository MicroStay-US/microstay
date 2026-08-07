'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, TrendingUp, Navigation } from 'lucide-react';

export function AreasTab() {
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAreas() {
      // In a real implementation this would aggregate locations with bounding boxes.
      const { data } = await supabase.from('properties').select('city, state, status');
      
      const aggregation: Record<string, { city: string, state: string, live: number, pending: number }> = {};
      
      (data || []).forEach(p => {
        const key = `${p.city}, ${p.state}`;
        if (!aggregation[key]) {
          aggregation[key] = { city: p.city || 'Unknown', state: p.state || 'Unknown', live: 0, pending: 0 };
        }
        if (p.status === 'active') aggregation[key].live++;
        else aggregation[key].pending++;
      });
      
      setAreas(Object.values(aggregation).sort((a,b) => b.live - a.live));
      setLoading(false);
    }
    loadAreas();
  }, []);

  if (loading) return <div className="h-64 bg-gray-200 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Expansion Zones Analytics</h2>
          <p className="text-gray-500 font-medium text-sm mt-1">Geographical breakdown of platform supply.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center h-80">
          <Navigation className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">Live Heatmap Coming Soon</h3>
          <p className="text-gray-500 font-medium text-sm max-w-sm mt-2">The interactive Google Maps integration mapping properties worldwide is currently under construction for Phase 4.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-900">Top Performing Markets</h3>
          </div>
          <div className="overflow-x-auto h-64 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 sticky top-0">
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Region</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Live Supply</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Onboarding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {areas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-gray-500 font-medium">No active markets yet.</td>
                  </tr>
                ) : (
                  areas.map((a, i) => (
                    <tr key={i} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                          <MapPin className="w-4 h-4 text-ms-orange" />
                          {a.city}, {a.state}
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded text-sm">{a.live} Listed</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <span className="font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded text-sm">{a.pending} Pending</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
