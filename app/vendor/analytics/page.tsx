'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartBar as BarChart3, TrendingUp, TriangleAlert as AlertTriangle, DollarSign } from 'lucide-react';

export default function VendorAnalyticsPage() {
  const router = useRouter();
  const { vendor, role } = useVendor();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'front_desk') {
      router.push('/vendor/dashboard');
    }
  }, [role, router]);

  const loadAnalytics = useCallback(async () => {
    if (!vendor || role !== 'super_vendor') return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: bookings } = await supabase
      .from('vd_bookings')
      .select('*')
      .eq('vendor_id', vendor.id)
      .gte('booking_date', monthStart)
      .lte('booking_date', monthEnd);

    const all = bookings || [];
    const checkedIn = all.filter((b) => b.status === 'checked_in');
    const noShows = all.filter((b) => b.status === 'no_show');
    const ownerCancels = all.filter((b) => b.status === 'owner_cancel');
    const actioned = checkedIn.length + noShows.length + ownerCancels.length;

    const grossRevenue = checkedIn.reduce((s, b) => s + Number(b.gross_amount), 0);
    const totalFees = checkedIn.reduce((s, b) => s + Number(b.platform_total_fee || 0), 0);
    const penalties = ownerCancels.reduce((s, b) => s + Number(b.penalty_fee || 0), 0);
    const netRevenue = checkedIn.reduce((s, b) => s + Number(b.vendor_net || 0), 0);
    const checkInRate = actioned > 0 ? (checkedIn.length / actioned) * 100 : 0;
    const cancelRate = actioned > 0 ? (ownerCancels.length / actioned) * 100 : 0;

    setStats({
      grossRevenue, totalFees, penalties, netRevenue, checkInRate, cancelRate,
      totalBookings: all.length, checkedInCount: checkedIn.length, noShowCount: noShows.length, cancelCount: ownerCancels.length,
      actioned,
    });
    setLoading(false);
  }, [vendor, role]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  if (role === 'front_desk') return null;

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="h-8 bg-slate-300 dark:bg-slate-800 rounded w-64 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-28 dark:bg-slate-800 bg-slate-300  rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalBookings === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <BarChart3 className="w-16 h-16 dark:text-slate-600 text-black  mx-auto" />
          <h2 className="text-xl font-semibold dark:text-white text-black ">No Analytics Data Yet</h2>
          <p className="dark:text-slate-400 text-black max-w-sm">Complete your first check-in to see analytics here.</p>
        </div>
      </div>
    );
  }

  const cancelRateColor = stats.cancelRate >= 30 ? 'text-rose-400' : stats.cancelRate >= 20 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="p-6 md:p-8 space-y-6 ">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold dark:text-white">Revenue Intelligence</h1>
        <p className="text-slate-400 mt-1">Month to Date Performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="Gross Revenue" value={`$${stats.grossRevenue.toFixed(2)}`} color="text-amber-400" icon={DollarSign} />
        <KPICard label="MicroStay Fees" value={`$${stats.totalFees.toFixed(2)}`} color="text-rose-400" icon={DollarSign} />
        <KPICard label="Penalties" value={`$${stats.penalties.toFixed(2)}`} color="text-rose-400" icon={AlertTriangle} />
        <KPICard label="Your Net" value={`$${stats.netRevenue.toFixed(2)}`} color="text-emerald-400" icon={TrendingUp} />
        <KPICard label="Check-In Rate" value={`${stats.checkInRate.toFixed(1)}%`} color="text-emerald-400" icon={BarChart3} />
        <KPICard label="Cancel Rate" value={`${stats.cancelRate.toFixed(1)}%`} color={cancelRateColor} icon={AlertTriangle} />
      </div>

      <div className="bg-blue-300 dark:bg-[#111827] dark:border dark:border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold dark:text-white mb-4">Cancellation Rate Gauge</h3>
        <div className="flex items-center justify-center ">
          <div className="relative w-72 h-48 bg-slate-900 rounded-md">
            <svg viewBox="0 0 200 100" className="w-full h-full ">
              <path d="M 10 95 A 90 90 0 0 1 190 95" fill="none" stroke="#1E293B" strokeWidth="16" strokeLinecap="round" />
              <path d="M 10 95 A 90 90 0 0 1 70 15" fill="none" stroke="#10B981" strokeWidth="16" strokeLinecap="round" />
              <path d="M 70 15 A 90 90 0 0 1 130 15" fill="none" stroke="#F59E0B" strokeWidth="16" strokeLinecap="round" />
              <path d="M 130 15 A 90 90 0 0 1 190 95" fill="none" stroke="#F43F5E" strokeWidth="16" strokeLinecap="round" />
              <text x="100" y="80" textAnchor="middle" className="fill-white text-3xl font-bold font-mono ">
                {stats.cancelRate.toFixed(1)}%
              </text>
              <text x="100" y="95" textAnchor="middle" className="fill-slate-400 text-xs ">
                {stats.cancelRate >= 30 ? 'FLAGGED' : stats.cancelRate >= 20 ? 'WARNING' : 'HEALTHY'}
              </text>
            </svg>
          </div>
        </div>
        {stats.cancelRate < 30 && stats.actioned > 0 && (
          <p className="text-center text-sm dark:text-slate-400 mt-4 text-black">
            {Math.ceil((0.3 * stats.actioned - stats.cancelCount) / (1 - 0.3))} more cancellations until flag
          </p>
        )}
        {stats.cancelRate >= 30 && (
          <p className="text-center text-sm dark:text-rose-400 mt-4 text-black">
            Need {Math.ceil((stats.cancelCount - 0.3 * stats.actioned) / 0.3)} more check-ins to clear flag
          </p>
        )}
      </div>

      <div className="dark:bg-[#111827] bg-blue-300/70  dark:border dark:border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold dark:text-white  mb-4">Booking Breakdown</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold font-mono text-white">{stats.totalBookings}</p>
            <p className="text-xs dark:text-slate-400 ">Total</p>
          </div>
          <div>
            <p className="text-3xl font-bold font-mono dark:text-emerald-400 text-emerald-800/70">{stats.checkedInCount}</p>
            <p className="text-xs dark:text-slate-400">Checked In</p>
          </div>
          <div>
            <p className="text-3xl font-bold font-mono dark:text-slate-400 text-slate-700/40">{stats.noShowCount}</p>
            <p className="text-xs dark:text-slate-400">No-Shows</p>
          </div>
          <div>
            <p className="text-3xl font-bold font-mono text-rose-400">{stats.cancelCount}</p>
            <p className="text-xs dark:text-slate-400">Owner Cancels</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <div className="dark:bg-[#111827] bg-teal-200/40 dark:border dark:border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}
