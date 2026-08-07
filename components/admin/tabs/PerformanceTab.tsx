'use client';

import dynamic from 'next/dynamic';
import { Target, MapPin, Activity, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

// Next.js dynamic import strictly required for Leaflet to prevent 'window is not defined' SSR crashes
const LiveMap = dynamic(() => import('@/components/admin/GeographicHeatmap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full bg-ms-admin-bg rounded-xl border border-zinc-800 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-ms-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )
});

export function PerformanceTab() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Geographic Core & Penetration</h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">Live market expansion heatmap and regional demand trajectory.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 overflow-hidden relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-zinc-400" />
              <h3 className="font-bold text-zinc-900">National Heatmap</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-zinc-500"><div className="w-3 h-3 rounded-full bg-ms-orange" /> Live Hubs</span>
              <span className="flex items-center gap-1.5 text-zinc-500"><div className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500" /> Target Markets</span>
            </div>
          </div>
          
          {mounted && <LiveMap />}
        </div>

        <div className="space-y-6">
          <div className="dark:bg-ms-admin-bg dark:border bg-purple-300/40 dark:border-zinc-800 rounded-2xl shadow-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-ms-orange/20 blur-[50px] pointer-events-none" />
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <Target className="w-4 h-4 text-ms-orange" /> Strategic Priorities
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div className="p-4 dark:bg-zinc-800/50 bg-purple-400/40 rounded-xl dark:border dark:border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black dark:text-white  uppercase tracking-wider ">Acquire Tier-1</span>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-800/40 dark:text-rose-400 px-2 py-0.5 rounded ">High Prio</span>
                </div>
                <p className="text-xs font-medium text-zinc-400">Deploy marketing budget to Los Angeles and New York to capture 90+ demand regions lacking inventory.</p>
              </div>
              
              <div className="p-4 dark:bg-zinc-800/50 rounded-xl dark:border bg-purple-300/40 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black dark:text-white uppercase tracking-wider">Optimize Hubs</span>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/20 dark:text-amber-400 text-amber-900 px-2 py-0.5 rounded">Med Prio</span>
                </div>
                <p className="text-xs font-medium text-zinc-400">Analyze pricing conversions in highly saturated active zones before raising commission rates.</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Trajectory
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-zinc-600">Expansion Quota Q4</span>
                  <span className="text-zinc-900">12%</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-ms-orange w-[12%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-zinc-600">Revenue Density</span>
                  <span className="text-zinc-900">84%</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[84%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
