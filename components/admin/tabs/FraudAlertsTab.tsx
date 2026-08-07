'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShieldAlert, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, Flag, UserX, Zap, TrendingDown,
} from 'lucide-react';

type BookingRaw = {
  id: string;
  guest_email: string;
  guest_name: string;
  booking_date: string;
  status: string;
  gross_amount: number;
  created_at: string;
  property: { name: string; vendor_id: string }[] | null;
};

type Booking = {
  id: string;
  guest_email: string;
  guest_name: string;
  booking_date: string;
  status: string;
  gross_amount: number;
  created_at: string;
  property?: { name: string; vendor_id: string };
};

type RiskLevel = 'High' | 'Medium';

type AlertRow = {
  email: string;
  name: string;
  metric: string;
  riskLevel: RiskLevel;
  bookingCount: number;
  lastSeen: string;
  vendorId?: string;
};

type Category = 'noshow' | 'cancels' | 'velocity' | 'vendors';

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
      level === 'High'
        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-700/40 dark:text-white dark:border-transparent'
        : 'bg-amber-50 text-amber-700 border-amber-200dark:bg-amber-700/40 dark:text-white dark:border-transparent'
    }`}>
      {level === 'High' ? '🔴 High' : '🟡 Medium'}
    </span>
  );
}

const categoryMeta: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  noshow:   { label: 'No-Show Abusers',      icon: <UserX className="w-5 h-5" />,        color: 'text-rose-600' },
  cancels:  { label: 'Repeat Cancellations', icon: <TrendingDown className="w-5 h-5" />,  color: 'text-amber-600' },
  velocity: { label: 'Velocity Anomalies',   icon: <Zap className="w-5 h-5" />,           color: 'text-blue-600' },
  vendors:  { label: 'High Penalty Vendors', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-purple-600' },
};

export function FraudAlertsTab() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Category | null>(null);
  const [flagging, setFlagging] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: e } = await supabase
      .from('vd_bookings')
      .select('id, guest_email, guest_name, booking_date, status, gross_amount, created_at, property:properties(name, vendor_id)')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (e) setError(e.message);
    else {
      // Normalize: PostgREST returns property as array from the join, flatten to single object
      const normalized: Booking[] = (data as BookingRaw[] || []).map(b => ({
        ...b,
        property: Array.isArray(b.property) ? b.property[0] : (b.property ?? undefined),
      }));
      setBookings(normalized);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Compute fraud signals client-side ────────────────────────────────────
  const { noShowAlerts, cancelAlerts, velocityAlerts, vendorAlerts } = useMemo(() => {
    // Group by guest_email
    const guestMap = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = b.guest_email?.toLowerCase() || 'unknown';
      if (!guestMap.has(key)) guestMap.set(key, []);
      guestMap.get(key)!.push(b);
    }

    // 1. No-show abusers: no_show / total > 0.3 AND total >= 3
    const noShowAlerts: AlertRow[] = [];
    Array.from(guestMap.entries()).forEach(([email, bks]) => {
      const total = bks.length;
      const noShows = bks.filter(b => b.status === 'no_show').length;
      if (total >= 3 && noShows / total > 0.3) {
        const rate = noShows / total;
        noShowAlerts.push({
          email,
          name: bks[0].guest_name || email,
          metric: `${noShows}/${total} no-shows (${Math.round(rate * 100)}%)`,
          riskLevel: rate > 0.5 ? 'High' : 'Medium',
          bookingCount: total,
          lastSeen: bks.slice().sort((a, b) => b.booking_date.localeCompare(a.booking_date))[0].booking_date,
        });
      }
    });
    noShowAlerts.sort((a, b) => b.bookingCount - a.bookingCount);

    // 2. Repeat cancellations: owner_cancel >= 2
    const cancelAlerts: AlertRow[] = [];
    Array.from(guestMap.entries()).forEach(([email, bks]) => {
      const ownerCancels = bks.filter(b => b.status === 'owner_cancel').length;
      const guestCancels = bks.filter(b => b.status === 'guest_cancel').length;
      const totalCancels = ownerCancels + guestCancels;
      if (totalCancels >= 2) {
        cancelAlerts.push({
          email,
          name: bks[0].guest_name || email,
          metric: `${totalCancels} cancellation${totalCancels !== 1 ? 's' : ''}`,
          riskLevel: totalCancels >= 4 ? 'High' : 'Medium',
          bookingCount: bks.length,
          lastSeen: bks.slice().sort((a, b) => b.booking_date.localeCompare(a.booking_date))[0].booking_date,
        });
      }
    });
    cancelAlerts.sort((a, b) => b.bookingCount - a.bookingCount);

    // 3. Velocity: same email, same booking_date, count >= 3
    const velocityAlerts: AlertRow[] = [];
    const velocityMap = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = `${b.guest_email?.toLowerCase()}|${b.booking_date}`;
      if (!velocityMap.has(key)) velocityMap.set(key, []);
      velocityMap.get(key)!.push(b);
    }
    const seenEmails = new Set<string>();
    Array.from(velocityMap.entries()).forEach(([key, bks]) => {
      if (bks.length >= 3) {
        const [email, date] = key.split('|');
        if (!seenEmails.has(email)) {
          seenEmails.add(email);
          velocityAlerts.push({
            email,
            name: bks[0].guest_name || email,
            metric: `${bks.length} bookings on ${date}`,
            riskLevel: bks.length >= 5 ? 'High' : 'Medium',
            bookingCount: bks.length,
            lastSeen: date,
          });
        }
      }
    });

    // 4. High penalty vendors: owner_cancel >= 3 in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const vendorCancelMap = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (b.status === 'owner_cancel' && b.booking_date >= thirtyDaysAgo) {
        const vid = b.property?.vendor_id;
        if (vid) {
          if (!vendorCancelMap.has(vid)) vendorCancelMap.set(vid, []);
          vendorCancelMap.get(vid)!.push(b);
        }
      }
    }
    const vendorAlerts: AlertRow[] = [];
    Array.from(vendorCancelMap.entries()).forEach(([vid, bks]) => {
      if (bks.length >= 3) {
        vendorAlerts.push({
          email: vid,
          name: bks[0].property?.name || vid.slice(0, 8),
          metric: `${bks.length} owner cancels in 30 days`,
          riskLevel: bks.length >= 5 ? 'High' : 'Medium',
          bookingCount: bks.length,
          lastSeen: bks.slice().sort((a, b) => b.booking_date.localeCompare(a.booking_date))[0].booking_date,
          vendorId: vid,
        });
      }
    });
    vendorAlerts.sort((a, b) => b.bookingCount - a.bookingCount);

    return { noShowAlerts, cancelAlerts, velocityAlerts, vendorAlerts };
  }, [bookings]);

  const alertsByCat: Record<Category, AlertRow[]> = {
    noshow: noShowAlerts,
    cancels: cancelAlerts,
    velocity: velocityAlerts,
    vendors: vendorAlerts,
  };

  const flagGuest = async (email: string) => {
    setFlagging(prev => ({ ...prev, [email]: true }));
    const { data: profiles } = await supabase.from('profiles').select('id').eq('email', email).limit(1);
    if (profiles && profiles.length > 0) {
      await supabase.from('profiles').update({ flagged: true }).eq('id', profiles[0].id);
    }
    setFlagging(prev => ({ ...prev, [email]: false }));
  };

  if (loading) return <div className="h-64 bg-zinc-200 dark:bg-gray-700 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" /> Fraud Alerts
          </h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">Automated detection of suspicious booking patterns.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="text-zinc-700 font-bold border-zinc-300 gap-2 dark:border-transparent dark:text-white/50 dark:hover:text-white">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <Alert className="bg-rose-50 border-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-800 font-bold ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(categoryMeta) as Category[]).map(cat => {
          const meta = categoryMeta[cat];
          const count = alertsByCat[cat].length;
          return (
            <button
              key={cat}
              onClick={() => setExpanded(expanded === cat ? null : cat)}
              className={`bg-white  border rounded-xl p-4 shadow-sm text-left transition-all hover:shadow-md ${
                expanded === cat ? 'border-ms-orange-border ring-2 ring-ms-orange/30' : 'border-zinc-200'
              }`}
            >
              <div className={`mb-2 ${meta.color}`}>{meta.icon}</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{meta.label}</p>
              <p className={`text-3xl font-black mt-1 ${count > 0 ? 'text-rose-600' : 'text-zinc-300'}`}>{count}</p>
              <p className="text-xs text-zinc-400 mt-1">{count === 0 ? 'No alerts' : `${count} alert${count !== 1 ? 's' : ''}`}</p>
            </button>
          );
        })}
      </div>

      {/* Alert lists */}
      {(Object.keys(categoryMeta) as Category[]).map(cat => {
        const meta = categoryMeta[cat];
        const alerts = alertsByCat[cat];
        const isOpen = expanded === cat;

        return (
          <div key={cat} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <button
              className="w-full px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between hover:bg-zinc-100/50 transition-colors dark:bg-slate-900 dark:border-transparent"
              onClick={() => setExpanded(isOpen ? null : cat)}
            >
              <div className="flex items-center gap-3">
                <span className={meta.color}>{meta.icon}</span>
                <div className="text-left">
                  <h3 className="font-bold text-zinc-900">{meta.label}</h3>
                  <p className="text-xs text-zinc-500 font-medium">{alerts.length} alert{alerts.length !== 1 ? 's' : ''} detected</p>
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
            </button>

            {isOpen && (
              alerts.length === 0 ? (
                <div className="p-10 text-center">
                  <ShieldAlert className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium text-sm">No alerts in this category</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-none">
                  <div className="hidden sm:grid grid-cols-12 px-6 py-3 dark:bg-transparent/40 dark:border-slate-700 bg-zinc-50/60 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                    <span className="col-span-4">Guest / Vendor</span>
                    <span className="col-span-3">Metric</span>
                    <span className="col-span-2 text-center">Risk</span>
                    <span className="col-span-2 text-center">Bookings</span>
                    <span className="col-span-1"></span>
                  </div>
                  {alerts.map((alert, i) => (
                    <div key={`${alert.email}-${i}`} className="px-6 py-4 flex flex-wrap sm:grid sm:grid-cols-12 gap-3 sm:gap-0 items-center hover:bg-zinc-50/60 transition-colors dark:hover:bg-transparent/10">
                      <div className="col-span-4 min-w-0">
                        <div className="font-bold text-zinc-900 text-sm truncate dark:text-ms-orange">{alert.name}</div>
                        <div className="text-xs text-zinc-400 font-medium truncate">{cat !== 'vendors' ? alert.email : `Vendor ID: ${alert.email.slice(0, 8)}...`}</div>
                        <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
                          Last: {alert.lastSeen ? new Date(alert.lastSeen + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </div>
                      </div>
                      <div className="col-span-3 text-sm font-bold text-zinc-700">{alert.metric}</div>
                      <div className="col-span-2 flex justify-center">
                        <RiskBadge level={alert.riskLevel} />
                      </div>
                      <div className="col-span-2 text-center font-black text-zinc-700">{alert.bookingCount}</div>
                      <div className="col-span-1 flex justify-end">
                        {cat !== 'vendors' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={flagging[alert.email]}
                            onClick={() => flagGuest(alert.email)}
                            className="h-8 text-[10px] font-black uppercase tracking-widest border border-amber-200 text-amber-700 hover:bg-amber-50 gap-1 dark:border-transparent dark:hover:bg-transparent/30"
                          >
                            {flagging[alert.email]
                              ? <RefreshCw className="w-3 h-3 animate-spin" />
                              : <><Flag className="w-3 h-3" /> Flag</>
                            }
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
