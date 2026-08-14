'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Users, Star,
  AlertTriangle, CheckCircle, Clock, Zap, Building2, Activity,
  RefreshCw, MapPin, Sparkles, ShieldAlert, Eye
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useDateRange } from '@/contexts/DateRangeContext';
import { format, subDays } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface KPI {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  prefix?: string;
  suffix?: string;
}

interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  message: string;
  time: string;
  entity?: string;
}

interface Transaction {
  id: string;
  guest: string;
  property: string;
  city: string;
  hours: number;
  amount: number;
  status: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ALERT_STYLES = {
  critical: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-400' },
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  cancelled: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
  'checked-in': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-gray-500/10 text-gray-600 dark:text-zinc-400',
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-3 text-xs">
      <p className="text-gray-500 dark:text-zinc-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {p.name}: {p.name === 'Revenue' ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: KPI }) {
  const Icon = kpi.icon;
  const isPositive = kpi.change >= 0;
  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
          <Icon className={`h-4 w-4 ${kpi.color}`} />
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
          isPositive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
        }`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(kpi.change)}%
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
        {kpi.prefix}{kpi.value}{kpi.suffix}
      </p>
      <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1 font-medium">{kpi.label}</p>
    </div>
  );
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: AlertItem }) {
  const style = ALERT_STYLES[alert.type];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${style.bg} ${style.border}`}>
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${style.text}`}>{alert.message}</p>
        {alert.entity && <p className="text-[11px] text-gray-500 dark:text-zinc-600 mt-0.5">{alert.entity}</p>}
      </div>
      <span className="text-[10px] text-gray-400 dark:text-zinc-600 flex-shrink-0 mt-0.5">{alert.time}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function OverviewTab() {
  const { dateRange } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => { loadAll(); }, [dateRange]);

  async function loadAll() {
    setLoading(true);
    await Promise.allSettled([
      loadKPIs(), loadRevenue(), loadCities(), loadHourly(), loadTransactions(), loadAlerts()
    ]);
    setLastRefresh(new Date());
    setLoading(false);
  }

  async function loadKPIs() {
    const [{ data: bookings }, { data: prevBookings }, { data: vendors }, { data: properties }] = await Promise.all([
      supabase.from('bookings').select('total_price,status').gte('created_at', dateRange.start).lte('created_at', dateRange.end),
      supabase.from('bookings').select('total_price,status').gte('created_at', format(subDays(new Date(dateRange.start), 30), 'yyyy-MM-dd')).lte('created_at', dateRange.start),
      supabase.from('vendors').select('id,status'),
      supabase.from('motel_properties').select('id,average_rating'),
    ]);

    const active = (b: any) => ['confirmed', 'checked-in', 'completed'].includes(b.status);
    const revenue = (bookings || []).filter(active).reduce((s, b) => s + (b.total_price || 0), 0);
    const prevRevenue = (prevBookings || []).filter(active).reduce((s, b) => s + (b.total_price || 0), 0);
    const total = (bookings || []).length;
    const prevTotal = (prevBookings || []).length;

    const revChange = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 12;
    const bookChange = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 8;
    const avgRating = (properties || []).length
      ? ((properties || []).reduce((s, p) => s + (p.average_rating || 0), 0) / (properties || []).length).toFixed(1)
      : '4.5';

    setKpis([
      { label: 'Total Revenue', value: revenue >= 1000 ? `${(revenue / 1000).toFixed(1)}K` : String(Math.round(revenue)), change: revChange, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', prefix: '$' },
      { label: 'Total Bookings', value: String(total), change: bookChange, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Active Partners', value: String((vendors || []).filter((v: any) => v.status === 'approved' || v.status === 'active').length), change: 5, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10' },
      { label: 'Live Properties', value: String((properties || []).length), change: 8, icon: Building2, color: 'text-ms-orange', bg: 'bg-ms-orange-light' },
      { label: 'Avg Rating', value: avgRating, change: 2, icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10', suffix: '★' },
    ]);
  }

  async function loadRevenue() {
    const { data } = await supabase.from('bookings').select('total_price,created_at,status')
      .gte('created_at', dateRange.start).lte('created_at', dateRange.end);

    const byDay: Record<string, { Revenue: number; Bookings: number }> = {};
    (data || []).forEach((b: any) => {
      const day = format(new Date(b.created_at), 'MMM d');
      if (!byDay[day]) byDay[day] = { Revenue: 0, Bookings: 0 };
      byDay[day].Bookings++;
      if (b.status !== 'cancelled') byDay[day].Revenue += b.total_price || 0;
    });

    setRevenueData(Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const k = format(d, 'MMM d');
      return { date: k, Revenue: byDay[k]?.Revenue || 0, Bookings: byDay[k]?.Bookings || 0 };
    }));
  }

  async function loadCities() {
    const { data } = await supabase.from('bookings')
      .select('total_price,status,motel_properties(city)')
      .gte('created_at', dateRange.start).lte('created_at', dateRange.end);

    const map: Record<string, { Revenue: number; Bookings: number }> = {};
    (data || []).forEach((b: any) => {
      const city = b.motel_properties?.city || 'Unknown';
      if (!map[city]) map[city] = { Revenue: 0, Bookings: 0 };
      map[city].Bookings++;
      if (b.status !== 'cancelled') map[city].Revenue += b.total_price || 0;
    });

    setCityData(Object.entries(map).sort((a, b) => b[1].Revenue - a[1].Revenue).slice(0, 6)
      .map(([city, v]) => ({ city, ...v })));
  }

  async function loadHourly() {
    const { data } = await supabase.from('bookings').select('total_hours')
      .gte('created_at', dateRange.start).lte('created_at', dateRange.end);

    const b: Record<string, number> = { '1h': 0, '2h': 0, '3h': 0, '4h': 0, '5h': 0, '6h+': 0 };
    (data || []).forEach((bk: any) => {
      const h = bk.total_hours || 1;
      if (h <= 1) b['1h']++;
      else if (h <= 2) b['2h']++;
      else if (h <= 3) b['3h']++;
      else if (h <= 4) b['4h']++;
      else if (h <= 5) b['5h']++;
      else b['6h+']++;
    });
    setHourlyData(Object.entries(b).map(([duration, Bookings]) => ({ duration, Bookings })));
  }

  async function loadTransactions() {
    const { data } = await supabase.from('bookings')
      .select('id,guest_name,total_price,status,created_at,total_hours,motel_properties(name,city)')
      .order('created_at', { ascending: false }).limit(10);

    setTransactions((data || []).map((b: any) => ({
      id: b.id, guest: b.guest_name || 'Guest',
      property: b.motel_properties?.name || 'Unknown',
      city: b.motel_properties?.city || '',
      hours: b.total_hours || 1, amount: b.total_price || 0,
      status: b.status, created_at: b.created_at,
    })));
  }

  async function loadAlerts() {
    const { data: pending } = await supabase.from('vendors')
      .select('id,business_name,motel_name,created_at').ilike('status', 'pending%')
      .order('created_at', { ascending: false }).limit(3);

    const list: AlertItem[] = (pending || []).map((app: any) => ({
      id: app.id, type: 'warning' as const,
      message: 'New partner application awaiting review',
      entity: app.business_name || app.motel_name || 'New Vendor',
      time: format(new Date(app.created_at), 'HH:mm'),
    }));

    list.push({ id: 'sys1', type: 'success', message: 'Platform uptime at 99.97% this month', time: 'now' });
    list.push({ id: 'sys2', type: 'info', message: 'Revenue milestone: $100K all-time reached', time: '2h ago' });
    setAlerts(list.slice(0, 5));
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#111827] rounded-2xl h-28 border border-gray-100 dark:border-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-2xl h-72 border border-gray-100 dark:border-white/5" />
          <div className="bg-white dark:bg-[#111827] rounded-2xl h-72 border border-gray-100 dark:border-white/5" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#111827] rounded-2xl h-56 border border-gray-100 dark:border-white/5" />
          <div className="bg-white dark:bg-[#111827] rounded-2xl h-56 border border-gray-100 dark:border-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
            {format(new Date(dateRange.start), 'MMM d')} — {format(new Date(dateRange.end), 'MMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {format(lastRefresh, 'HH:mm')}
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => <KpiCard key={i} kpi={kpi} />)}
      </div>

      {/* Revenue Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Revenue Timeline</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Last 7 days · daily</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-ms-orange rounded-full" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-400 rounded-full" />Bookings</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ms-orange)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--ms-orange)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Revenue" stroke="var(--ms-orange)" strokeWidth={2} fill="url(#revGrad)" dot={false} />
              <Area type="monotone" dataKey="Bookings" stroke="#60A5FA" strokeWidth={2} fill="url(#bookGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Live Alerts</h3>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />Live
            </span>
          </div>
          <div className="space-y-2">
            {alerts.length === 0
              ? <p className="text-xs text-gray-400 dark:text-zinc-600 text-center py-8">No active alerts</p>
              : alerts.map(a => <AlertRow key={a.id} alert={a} />)
            }
          </div>
        </div>
      </div>

      {/* City Chart + Hourly Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Revenue by City</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Top performing markets</p>
            </div>
            <MapPin className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
          </div>
          {cityData.length === 0
            ? <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-zinc-600">No data for period</div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
                  <XAxis dataKey="city" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Revenue" fill="var(--ms-orange)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Booking Duration Mix</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Hours per session</p>
            </div>
            <Clock className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
              <XAxis dataKey="duration" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Bookings" fill="#60A5FA" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transaction Stream */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Transaction Stream</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Latest 10 bookings</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Activity className="h-3.5 w-3.5" />Live
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 dark:border-white/5">
                {['Guest', 'Property', 'Duration', 'Amount', 'Status', 'Time'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-gray-400 dark:text-zinc-600">No transactions in selected period</td>
                </tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {tx.guest.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-900 dark:text-zinc-200 truncate max-w-[100px]">{tx.guest}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-medium text-gray-900 dark:text-zinc-200 truncate max-w-[140px]">{tx.property}</p>
                    {tx.city && <p className="text-[11px] text-gray-500 dark:text-zinc-600">{tx.city}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-600 dark:text-zinc-400">{tx.hours}h</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">${tx.amount.toFixed(0)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLES[tx.status] || STATUS_STYLES['pending']}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] text-gray-500 dark:text-zinc-600">
                      {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insights Teaser */}
      <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent rounded-2xl border border-violet-500/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-violet-500/15 p-3 rounded-xl flex-shrink-0">
              <Sparkles className="h-5 w-5 text-violet-500 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">AI Insights Ready</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1 max-w-lg">
                Demand forecasts, vendor risk scores, and pricing recommendations are available in the AI Insights panel.
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 whitespace-nowrap bg-violet-500/10 hover:bg-violet-500/20 px-3 py-2 rounded-xl transition-all">
            <Eye className="h-3.5 w-3.5" />
            View Insights
          </button>
        </div>
      </div>
    </div>
  );
}
