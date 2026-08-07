'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, Zap, DollarSign, Users,
  Building2, Eye, Check, X, Flag, RefreshCw, TrendingUp,
  Filter, ChevronDown, Timer, MapPin, ShieldAlert, Activity,
  ArrowUpRight, Flame, Radio
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatHour } from '@/lib/vendor-types';
import { format, subDays } from 'date-fns';
import { useRBAC } from '@/contexts/RBACContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  booking_ref: string;
  booking_date: string;
  guest_name: string;
  guest_phone?: string;
  gross_amount: number;
  status: string;
  created_at: string;
  vendor_id?: string;
  property?: { name: string; city?: string };
  slot?: { start_hour: string | number; end_hour: string | number };
}

interface OpsAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  message: string;
  entity?: string;
  time: string;
  bookingId?: string;
}

interface CityDemand {
  city: string;
  count: number;
  revenue: number;
  trend: number;
}

interface VendorRiskMap {
  [vendorId: string]: 'low' | 'medium' | 'high';
}

interface SystemStats {
  activeBookings: number;
  slaBreaches: number;
  atRisk: number;
  activeVendors: number;
  revenueToday: number;
}

// ─── MSUS Gross ──────────────────────────────────────────────────────────────

function calcMsusGross(booking: Booking, now?: number): number {
  if (booking.status === 'checked_in') return (booking.gross_amount || 0) * 0.12;
  if (booking.status === 'no_show') return 0;
  if (booking.status === 'owner_cancel') return 0;
  // Pending past 48h SLA deadline → counts as successful booking
  if (booking.status === 'pending' && now != null) {
    const deadline = getSlaDeadline(booking);
    if (now > deadline) return (booking.gross_amount || 0) * 0.12;
  }
  return 0;
}

// ─── SLA Helpers ─────────────────────────────────────────────────────────────

const SLA_HOURS = 48;

function getSlaDeadline(booking: Booking): number {
  const d = new Date(booking.booking_date + 'T12:00:00');
  if (booking.slot?.end_hour != null) {
    const raw = String(booking.slot.end_hour);
    d.setHours(parseInt(raw.includes(':') ? raw.split(':')[0] : raw, 10), 0, 0, 0);
  }
  return d.getTime() + SLA_HOURS * 3600000;
}

function getSlaRemaining(booking: Booking, now: number): number {
  return getSlaDeadline(booking) - now;
}

function getSlaStatus(remaining: number): 'ok' | 'warning' | 'critical' | 'breached' {
  if (remaining <= 0) return 'breached';
  if (remaining <= 2 * 3600000) return 'critical';
  if (remaining <= 6 * 3600000) return 'warning';
  return 'ok';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'BREACHED';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-[#FFF7E6] dark:bg-transparent dark:border-transparent text-[#A16207] border-[#EACC79]' },
  checked_in: { label: 'Checked In', cls: 'bg-[#EAF7F0] dark:bg-transparent dark:border-transparent text-[#1F7A4D] border-[#A3D9BF]' },
  no_show: { label: 'No-Show', cls: 'bg-[#FDECEC] dark:bg-transparent dark:border-transparent text-[#B42318] border-[#F5B7B1]' },
  owner_cancel: { label: 'Cancelled', cls: 'bg-[#F3EEE7] dark:bg-transparent dark:border-transparent text-[#536072] border-[#DDD1C3]' },
  guest_cancel: { label: 'Cancelled', cls: 'bg-[#F3EEE7] dark:bg-transparent dark:border-transparent text-[#536072] border-[#DDD1C3]' },
};

const ALERT_CFG = {
  critical: { dot: 'bg-[#B42318]', bg: 'border-[#F5B7B1] bg-[#FDECEC] dark:bg-red-950/40 dark:border-red-500', text: 'text-[#B42318] dark:text-red-800', label: 'CRITICAL' },
  warning: { dot: 'bg-[#A16207]', bg: 'border-[#EACC79] dark:bg-amber-950/40 dark:border-amber-500 bg-[#FFF7E6]', text: 'text-[#A16207] dark:text-amber-800', label: 'WARN' },
  info: { dot: 'bg-[#1D4ED8]', bg: 'border-[#93C5FD] bg-[#EAF1FF] dark:bg-blue-950/40 dark:border-blue-500', text: 'text-[#1D4ED8] dark:text-blue-800', label: 'INFO' },
  success: { dot: 'bg-[#1F7A4D]', bg: 'border-[#A3D9BF] bg-[#EAF7F0] dark:bg-green-950/40 dark:border-green-500', text: 'text-[#1F7A4D] text-green-800', label: 'OK' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatTile({ label, value, color, icon: Icon, glow }: {
  label: string; value: string | number; color: string; icon: React.ElementType; glow: string;
}) {
  return (
    <div className={`flex-1 min-w-0 bg-white border ${glow} rounded-xl px-4 py-3 flex items-center gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)]`}>
      <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-ms-text leading-none dark:text-ms-orange-light">{value}</div>
        <div className="text-[10px] text-ms-admin-muted font-semibold uppercase tracking-wider mt-0.5 truncate">{label}</div>
      </div>
    </div>
  );
}

function AlertRow({ alert, onView, onResolve }: { alert: OpsAlert; onView?: (id: string) => void; onResolve?: (id: string) => void }) {
  const cfg = ALERT_CFG[alert.severity];
  return (
    <div className={`border rounded-lg p-2.5 ${cfg.bg}`}>
      <div className="flex items-start gap-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
            <span className="text-[9px] text-ms-admin-muted">{alert.time}</span>
          </div>
          <p className="text-[11px] text-[#536072] leading-tight">{alert.message}</p>
          {alert.entity && <p className="text-[10px] text-ms-admin-muted mt-0.5 truncate">{alert.entity}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2 ml-3.5">
        {alert.bookingId && (
          <button
            onClick={() => onView?.(alert.bookingId!)}
            className="text-[10px] text-[#536072] hover:text-ms-text bg-white/60 hover:bg-white px-2 py-0.5 rounded border border-[#DDD1C3] transition-colors dark:bg-slate-500 dark:text-white dark:border-transparent"
          >
            View
          </button>
        )}
        <button
          onClick={() => onResolve?.(alert.id)}
          className="text-[10px] text-ms-admin-muted hover:text-[#1F7A4D] bg-white/40 hover:bg-[#EAF7F0] px-2 py-0.5 rounded border border-[#DDD1C3] hover:border-[#A3D9BF] transition-colors dark:bg-zinc-400 dark:text-black dark:border-transparent"
        >
          Resolve
        </button>
      </div>
    </div>
  );
}

function SlaTimer({ booking, now }: { booking: Booking; now: number }) {
  if (booking.status !== 'pending') {
    return <span className="text-[10px] text-ms-admin-muted font-mono">N/A</span>;
  }
  const remaining = getSlaRemaining(booking, now);
  const status = getSlaStatus(remaining);
  const text = formatCountdown(remaining);

  return (
    <span className={`font-mono text-[11px] font-bold ${
      status === 'breached' ? 'text-[#B42318] animate-pulse' :
      status === 'critical' ? 'text-[#B42318]' :
      status === 'warning' ? 'text-[#A16207]' :
      'text-ms-admin-muted'
    }`}>
      {text}
    </span>
  );
}

function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' | undefined }) {
  if (!risk) return <span className="text-[10px] text-ms-admin-muted">—</span>;
  const cfg = {
    low: 'bg-[#EDF5EF] text-[#46614E] border-[#C8DEC9] dark:bg-emerald-500 dark:border-transparent dark:text-white',
    medium: 'bg-[#FFF7E6] text-[#A16207] border-[#EACC79] dark:bg-amber-500 dark:border-transparent dark:text-white',
    high: 'bg-[#FDECEC] text-[#B42318] border-[#F5B7B1] dark:bg-red-500 dark:border-transparent dark:text-white',
  }[risk];
  return (
    <span className={`text-[9px] font-semibold uppercase border px-1.5 py-0.5 rounded ${cfg}`}>
      {risk}
    </span>
  );
}

function BookingDetailModal({ booking, onClose, onAction }: {
  booking: Booking; onClose: () => void;
  onAction: (id: string, action: 'confirm' | 'cancel') => void;
}) {
  const { can } = useRBAC();
  const status = STATUS_CFG[booking.status] || STATUS_CFG.pending;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white border dark:border-transparent border-[#DDD1C3] rounded-2xl p-6 w-[480px] max-w-[95vw] shadow-2xl shadow-black/10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] text-ms-admin-muted uppercase tracking-widest font-semibold">Booking Detail</p>
            <h2 className="text-lg font-bold text-ms-text mt-0.5 font-mono dark:text-ms-orange">{booking.booking_ref}</h2>
          </div>
          <button onClick={onClose} className="text-ms-admin-muted hover:text-ms-text p-1.5 rounded-lg dark:hover:bg-transparent hover:bg-[#F1EBE3] transition-colors dark:hover:text-white">
            <X className="h-4 w-4 " />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Guest', value: booking.guest_name },
            { label: 'Phone', value: booking.guest_phone || '—' },
            { label: 'Property', value: booking.property?.name || '—' },
            { label: 'City', value: booking.property?.city || '—' },
            { label: 'Date', value: format(new Date(booking.booking_date + 'T12:00:00'), 'MMM d, yyyy') },
            { label: 'Time', value: booking.slot ? `${formatHour(Number(booking.slot.start_hour))} → ${formatHour(Number(booking.slot.end_hour))}` : '—' },
            { label: 'Amount', value: `$${Number(booking.gross_amount).toFixed(2)}` },
            { label: 'Status', value: STATUS_CFG[booking.status]?.label || booking.status },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#F8F6F2] dark:bg-slate-700 dark:border-none border border-[#E7DED2] rounded-lg p-3">
              <p className="text-[9px] text-ms-admin-muted uppercase tracking-widest font-semibold dark:text-white">{label}</p>
              <p className="text-sm text-ms-text font-semibold mt-0.5 dark:text-ms-orange">{value}</p>
            </div>
          ))}
        </div>

        {booking.status === 'pending' && can('manageBookings') && (
          <div className="flex gap-2">
            <button
              onClick={() => { onAction(booking.id, 'confirm'); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 bg-[#EAF7F0] dark:bg-transparent dark:border-green-500 hover:bg-[#D4F0E5] text-[#1F7A4D] text-xs font-semibold py-2.5 rounded-xl border border-[#A3D9BF] transition-colors dark:hover:bg-green-600 dark:hover:text-white dark:hover:border-transparent "
            >
              <Check className="h-4 w-4" /> Confirm Check-In
            </button>
            <button
              onClick={() => { onAction(booking.id, 'cancel'); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FDECEC] hover:bg-[#FAD9D9] text-[#B42318] text-xs font-semibold py-2.5 rounded-xl border border-[#F5B7B1] transition-colors dark:bg-red-800 dark:text-white dark:hover:border-transparent dark:hover:bg-red-900 dark:border-transparent"
            >
              <X className="h-4 w-4" /> Cancel Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SortKey = 'time' | 'sla' | 'amount' | 'city';
type FilterStatus = 'all' | 'pending' | 'checked_in' | 'cancelled' | 'no_show';

export function CommandCenterTab() {
  const { can } = useRBAC();
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [stats, setStats] = useState<SystemStats>({ activeBookings: 0, slaBreaches: 0, atRisk: 0, activeVendors: 0, revenueToday: 0 });
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendorRisks, setVendorRisks] = useState<VendorRiskMap>({});
  const [cityDemand, setCityDemand] = useState<CityDemand[]>([]);
  const [aiInsights, setAiInsights] = useState<Array<{ text: string; action: string; type: string }>>([]);

  const [sortKey, setSortKey] = useState<SortKey>('sla');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // 1-second tick for countdown timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 30-second auto-refresh
  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 30000);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadAll = useCallback(async () => {
    await Promise.allSettled([
      loadBookingsAndStats(),
      loadVendors(),
    ]);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  async function loadBookingsAndStats() {
    // Note: slot:vd_time_slots join is omitted — the FK from vd_bookings.slrot_id
    // to vd_time_slots was dropped to support both time-slot and date-window IDs.
    // SLA deadline falls back to noon (12:00) when slot end_hour is unavailable.
    const { data } = await supabase
      .from('vd_bookings')
      .select('id, booking_ref, booking_date, guest_name, guest_phone, gross_amount, status, created_at, vendor_id, property:properties(name, city)')
      .order('created_at', { ascending: false })
      .limit(80);

    const rows = (data || []) as unknown as Booking[];
    setBookings(rows);

    const n = Date.now();
    const today = format(new Date(), 'yyyy-MM-dd');

    const active = rows.filter(b => b.status === 'checked_in').length;
    const todayRows = rows.filter(b => b.booking_date?.startsWith(today));
    const todayRevenue = todayRows.reduce((s, b) => s + (b.gross_amount || 0), 0);

    const pending = rows.filter(b => b.status === 'pending');
    const breaches = pending.filter(b => getSlaRemaining(b, n) <= 0).length;
    const atRisk = pending.filter(b => { const r = getSlaRemaining(b, n); return r > 0 && r <= 6 * 3600000; }).length;

    setStats({ activeBookings: active, slaBreaches: breaches, atRisk, activeVendors: 0, revenueToday: todayRevenue });

    // City demand
    const cityMap: Record<string, { count: number; revenue: number }> = {};
    todayRows.forEach(b => {
      const city = (b.property as any)?.city || 'Unknown';
      if (!cityMap[city]) cityMap[city] = { count: 0, revenue: 0 };
      cityMap[city].count++;
      cityMap[city].revenue += b.gross_amount || 0;
    });
    const cityList = Object.entries(cityMap)
      .map(([city, v]) => ({ city, ...v, trend: Math.floor(Math.random() * 40) - 10 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    setCityDemand(cityList);

    // Alerts
    const generated: OpsAlert[] = [];

    // SLA breach alerts
    const breachRows = pending.filter(b => getSlaRemaining(b, n) <= 0).slice(0, 3);
    breachRows.forEach(b => {
      generated.push({
        id: `breach-${b.id}`,
        severity: 'critical',
        message: `${b.booking_ref} SLA window expired — auto-confirm required`,
        entity: b.property ? `${(b.property as any).name} · ${b.guest_name}` : b.guest_name,
        time: format(new Date(b.booking_date + 'T12:00:00'), 'MMM d'),
        bookingId: b.id,
      });
    });

    // At-risk alerts
    const atRiskRows = pending.filter(b => { const r = getSlaRemaining(b, n); return r > 0 && r <= 2 * 3600000; }).slice(0, 2);
    atRiskRows.forEach(b => {
      const rem = getSlaRemaining(b, n);
      generated.push({
        id: `atrisk-${b.id}`,
        severity: 'warning',
        message: `${b.booking_ref} SLA expiring in ${formatCountdown(rem)}`,
        entity: b.property ? (b.property as any).name : '—',
        time: formatCountdown(rem),
        bookingId: b.id,
      });
    });

    // Vendor applications
    const { data: apps } = await supabase.from('vendors').select('id, business_name, motel_name, created_at').ilike('status', 'pending%').limit(3);
    (apps || []).forEach((a: any) => {
      generated.push({
        id: `app-${a.id}`,
        severity: 'info',
        message: 'New vendor application pending review',
        entity: a.business_name || a.motel_name || 'New Vendor',
        time: format(new Date(a.created_at), 'HH:mm'),
      });
    });

    // Demand spike info
    cityList.slice(0, 2).forEach(c => {
      if (c.count >= 3) {
        generated.push({
          id: `demand-${c.city}`,
          severity: 'success',
          message: `High demand surge in ${c.city} today`,
          entity: `${c.count} bookings · $${c.revenue.toFixed(0)} revenue`,
          time: 'now',
        });
      }
    });

    setAlerts(generated.slice(0, 8));

    // AI Insights
    setAiInsights([
      cityList[0] ? { text: `Increase pricing in ${cityList[0].city} — demand is up ${cityList[0].count} bookings today`, action: 'Apply', type: 'pricing' } : null,
      breaches > 0 ? { text: `${breaches} SLA breach${breaches > 1 ? 'es' : ''} require immediate manual confirmation`, action: 'Resolve', type: 'ops' } : null,
      { text: 'Weekend surge predicted: pre-approve 5+ vendors to handle load', action: 'Investigate', type: 'forecast' },
    ].filter(Boolean) as any[]);
  }

  async function loadVendors() {
    const { data: vendors } = await supabase.from('vendors').select('id, status');
    const active = (vendors || []).filter((v: any) => v.status === 'approved').length;
    setStats(prev => ({ ...prev, activeVendors: active }));

    // Compute vendor risk from recent bookings
    const { data: recent } = await supabase
      .from('vd_bookings')
      .select('vendor_id, status')
      .gte('created_at', format(subDays(new Date(), 90), 'yyyy-MM-dd'));

    const riskMap: VendorRiskMap = {};
    const byVendor: Record<string, { total: number; cancels: number }> = {};
    (recent || []).forEach((b: any) => {
      if (!b.vendor_id) return;
      if (!byVendor[b.vendor_id]) byVendor[b.vendor_id] = { total: 0, cancels: 0 };
      byVendor[b.vendor_id].total++;
      if (b.status === 'owner_cancel' || b.status === 'guest_cancel') byVendor[b.vendor_id].cancels++;
    });
    Object.entries(byVendor).forEach(([vid, v]) => {
      const rate = v.total > 0 ? v.cancels / v.total : 0;
      riskMap[vid] = rate > 0.3 ? 'high' : rate > 0.15 ? 'medium' : 'low';
    });
    setVendorRisks(riskMap);
  }

  async function handleBookingAction(id: string, action: 'confirm' | 'cancel') {
    const newStatus = action === 'confirm' ? 'checked_in' : 'owner_cancel';
    const { error } = await supabase.from('vd_bookings').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      showToast(action === 'confirm' ? 'Check-in confirmed' : 'Booking cancelled');
    }
  }

  // Computed booking list
  const displayedBookings = useMemo(() => {
    let rows = [...bookings];
    if (filterStatus !== 'all') {
      if (filterStatus === 'cancelled') {
        rows = rows.filter(b => b.status === 'owner_cancel' || b.status === 'guest_cancel');
      } else {
        rows = rows.filter(b => b.status === filterStatus);
      }
    }
    rows.sort((a, b) => {
      if (sortKey === 'sla') {
        const ra = a.status === 'pending' ? getSlaRemaining(a, now) : Infinity;
        const rb = b.status === 'pending' ? getSlaRemaining(b, now) : Infinity;
        return ra - rb;
      }
      if (sortKey === 'amount') return (b.gross_amount || 0) - (a.gross_amount || 0);
      if (sortKey === 'city') return ((b.property as any)?.city || '').localeCompare((a.property as any)?.city || '');
      return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
    });
    return rows.slice(0, 40);
  }, [bookings, filterStatus, sortKey, now]);

  // ─── Skeleton ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 h-16 bg-[#E7DED2] dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 h-96">
          <div className="bg-[#E7DED2] dark:bg-gray-700 rounded-xl" />
          <div className="col-span-2 bg-[#E7DED2] dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3 text-ms-text">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1F7A4D] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl shadow-black/10 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onAction={handleBookingAction}
        />
      )}

      {/* ── Section 1: Status Strip ──────────────────────────────── */}
      <div className="flex gap-2">
        <StatTile
          label="Active Bookings"
          value={stats.activeBookings}
          icon={Activity}
          color="bg-[#EAF7F0] dark:bg-black text-[#1F7A4D]"
          glow="border-[#DDD1C3] dark:border-none"
        />
        <StatTile
          label="SLA Breaches"
          value={stats.slaBreaches}
          icon={ShieldAlert}
          color={stats.slaBreaches > 0 ? "bg-[#FDECEC] dark:bg-black text-[#B42318]" : "bg-[#F3EEE7] dark:bg-black text-ms-admin-muted"}
          glow={stats.slaBreaches > 0 ? "border-[#F5B7B1] dark:border-none" : "border-[#DDD1C3] dark:border-none"}
        />
        <StatTile
          label="At-Risk (<6h)"
          value={stats.atRisk}
          icon={Timer}
          color={stats.atRisk > 0 ? "bg-[#FFF7E6] dark:bg-slate-500 text-[#A16207]" : "bg-[#F3EEE7] dark:bg-black text-ms-admin-muted"}
          glow={stats.atRisk > 0 ? "border-[#EACC79] dark:border-none" : "border-[#DDD1C3] dark:border-none"}
        />
        <StatTile
          label="Active Vendors"
          value={stats.activeVendors}
          icon={Building2}
          color="bg-[#EAF1FF] dark:bg-black text-[#1D4ED8]"
          glow="border-[#DDD1C3] dark:border-none"
        />
        <StatTile
          label="Revenue Today"
          value={`$${stats.revenueToday >= 1000 ? (stats.revenueToday / 1000).toFixed(1) + 'K' : stats.revenueToday.toFixed(0)}`}
          icon={DollarSign}
          color="bg-[#FBF4E8] dark:bg-black text-ms-orange"
          glow="border-[#E8D5A8] dark:border-none"
        />
      </div>

      {/* ── Section 2+3: Alert Feed + Booking Grid ───────────────── */}
      <div className="grid grid-cols-12 gap-3" style={{ height: '480px' }}>
        {/* Alert Feed */}
        <div className="col-span-3 bg-white dark:bg-slate-900 border border-[#DDD1C3] dark:border-none rounded-xl flex flex-col overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E7DED2] dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-[#B42318] animate-pulse" />
              <span className="text-xs font-semibold text-ms-text uppercase tracking-wider dark:text-ms-admin-text">Alert Feed</span>
            </div>
            <span className="text-[10px] text-ms-admin-muted">Auto-refresh 30s</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {alerts.filter(a => !dismissedAlerts.has(a.id)).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <CheckCircle2 className="h-8 w-8 text-[#A3D9BF] dark:bg-transparent  mb-2" />
                <p className="text-xs text-ms-admin-muted dark:text-green-500">All clear — no active alerts</p>
              </div>
            ) : (
              alerts.filter(a => !dismissedAlerts.has(a.id)).map(a => (
                <AlertRow
                  key={a.id}
                  alert={a}
                  onView={id => {
                    const booking = bookings.find(b => b.id === id);
                    if (booking) setSelectedBooking(booking);
                  }}
                  onResolve={id => setDismissedAlerts(prev => { const next = new Set(prev); next.add(id); return next; })}
                />
              ))
            )}
          </div>
        </div>

        {/* Live Booking Grid */}
        <div className="col-span-9 bg-white dark:border-transparent border border-[#DDD1C3] rounded-xl flex flex-col overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          {/* Grid header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b dark:border-none border-[#E7DED2] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-ms-orange" />
              <span className="text-xs font-semibold text-ms-text uppercase tracking-wider dark:text-ms-orange">Live Booking Grid</span>
              <span className="text-[10px] text-ms-admin-muted">{displayedBookings.length} rows</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                className="text-[10px] bg-[#F8F6F2] border border-[#DDD1C3] text-[#536072] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B7791F]/30 dark:bg-slate-900 dark:border-transparent dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="checked_in">Checked In</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No-Show</option>
              </select>
              {/* Sort */}
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="text-[10px] bg-[#F8F6F2] border border-[#DDD1C3] text-[#536072] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B7791F]/30 dark:bg-slate-900 dark:border-transparent dark:text-white"
              >
                <option value="sla">Sort: SLA Urgency</option>
                <option value="time">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="city">Sort: City</option>
              </select>
              <button
                onClick={loadAll}
                className="text-ms-admin-muted hover:text-[#536072] p-1 rounded hover:bg-[#F1EBE3] transition-colors dark:hover:bg-black dark:hover:text-white dark:text-white"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 bg-[#F8F6F2] dark:bg-slate-950 z-10">
                <tr>
                  {['Ref #', 'Date · Time', 'Property · City', 'Guest', 'Amount', 'MSUS Gross', 'Status', 'SLA Timer', 'Risk', ''].map(h => (
                    <th key={h} className="px-2.5 py-2 text-[9px] font-semibold text-ms-admin-muted uppercase tracking-widest whitespace-nowrap border-b dark:border-none border-[#E7DED2]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-xs text-ms-admin-muted dark:bg-slate-800 dark:text-white">No bookings found</td>
                  </tr>
                ) : (
                  displayedBookings.map(b => {
                    const slaRem = b.status === 'pending' ? getSlaRemaining(b, now) : null;
                    const slaSt = slaRem != null ? getSlaStatus(slaRem) : null;
                    const isUrgent = slaSt === 'critical' || slaSt === 'breached';
                    const risk = b.vendor_id ? vendorRisks[b.vendor_id] : undefined;
                    const statusCfg = STATUS_CFG[b.status] || STATUS_CFG.pending;
                    const prop = b.property as any;

                    return (
                      <tr
                        key={b.id}
                        className={`border-b dark:border-none border-[#F0EAE1] dark:hover:bg-slate-900 transition-colors hover:bg-[#F8F6F2] ${
                          isUrgent ? 'bg-[#FEF9F9] dark:bg-yellow-900/40' : ''
                        }`}
                      >
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-semibold text-ms-orange">{b.booking_ref}</span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <div className="text-[11px] text-ms-text dark:text-white/30 font-medium">
                            {format(new Date(b.booking_date + 'T12:00:00'), 'MMM d')}
                          </div>
                          {b.slot && (
                            <div className="text-[10px] text-ms-admin-muted">
                              {formatHour(Number(b.slot.start_hour))}→{formatHour(Number(b.slot.end_hour))}
                            </div>
                          )}
                        </td>
                        <td className="px-2.5 py-2 max-w-[130px]">
                          <div className="text-[11px] text-ms-text font-medium truncate dark:text-ms-orange">{prop?.name || '—'}</div>
                          {prop?.city && <div className="text-[10px] text-ms-admin-muted">{prop.city}</div>}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className="text-[11px] text-[#536072] dark:text-ms-orange-light">{b.guest_name}</span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className="text-[11px] font-bold text-ms-text dark:text-ms-teal-light">${Number(b.gross_amount).toFixed(0)}</span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {(() => {
                            const msus = calcMsusGross(b, now);
                            if (b.status === 'no_show') return <span className="text-[11px] text-ms-admin-muted dark:text-red-500 font-mono">$0</span>;
                            if (b.status === 'owner_cancel') return <span className="text-[11px] font-semibold text-ms-orange font-mono dark:text-zinc-500">12%</span>;
                            if (msus > 0) return <span className="text-[11px] font-bold text-[#1F7A4D] font-mono">${msus.toFixed(2)}</span>;
                            return <span className="text-[10px] text-ms-admin-muted">—</span>;
                          })()}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className={`text-[9px] font-semibold uppercase border px-1.5 py-0.5 rounded ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <SlaTimer booking={b} now={now} />
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <RiskBadge risk={risk} />
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-1 text-ms-admin-muted hover:text-[#1D4ED8] hover:bg-[#EAF1FF] rounded transition-colors dark:hover:bg-slate-950"
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[#F3EEE7] dark:bg-black/90 z-10">
                <tr className="border-t border-[#DDD1C3]">
                  <td colSpan={5} className="px-2.5 py-2 text-[9px] font-semibold text-ms-admin-muted uppercase tracking-widest">
                    Today&apos;s MSUS Gross Total
                  </td>
                  <td className="px-2.5 py-2 whitespace-nowrap">
                    {(() => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      const total = bookings
                        .filter(b => b.booking_date?.startsWith(today))
                        .reduce((sum, b) => sum + calcMsusGross(b, now), 0);
                      return (
                        <span className="text-[12px] font-bold text-[#1F7A4D] font-mono">
                          ${total.toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── Section 4+5: City Demand + SLA Mini Panel ────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* City Demand */}
        <div className="bg-white border border-[#DDD1C3] dark:border-transparent rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-3.5 w-3.5 text-ms-orange" />
            <span className="text-xs font-semibold text-ms-text uppercase tracking-wider dark:text-ms-orange">City Demand · Today</span>
          </div>
          {cityDemand.length === 0 ? (
            <p className="text-xs text-ms-admin-muted text-center py-6">No bookings today</p>
          ) : (
            <div className="space-y-2">
              {cityDemand.map((c, i) => (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="text-[10px] text-ms-admin-muted w-3 font-semibold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-ms-text truncate dark:text-ms-orange-light">{c.city}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold ${c.trend >= 0 ? 'text-[#1F7A4D]' : 'text-[#B42318]'}`}>
                          {c.trend >= 0 ? '+' : ''}{c.trend}%
                        </span>
                        <span className="text-[10px] text-ms-admin-muted">{c.count} bk</span>
                      </div>
                    </div>
                    <div className="h-1 bg-[#E7DED2] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ms-orange rounded-full transition-all"
                        style={{ width: `${Math.min(100, (c.count / Math.max(1, cityDemand[0]?.count)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-ms-admin-muted font-mono w-14 text-right">${c.revenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SLA Mini Panel */}
        <div className="bg-white border border-[#DDD1C3] rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="h-3.5 w-3.5 text-[#A16207]" />
            <span className="text-xs font-semibold text-ms-text uppercase tracking-wider dark:text-ms-orange-light">SLA Expiring Soon</span>
            {stats.slaBreaches > 0 && (
              <span className="text-[9px] bg-[#FDECEC] dark:bg-transparent dark:border-transparent text-[#B42318] border border-[#F5B7B1] px-1.5 py-0.5 rounded font-semibold">
                {stats.slaBreaches} BREACHED
              </span>
            )}
          </div>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
            {bookings
              .filter(b => b.status === 'pending')
              .map(b => ({ b, rem: getSlaRemaining(b, now) }))
              .sort((a, b) => a.rem - b.rem)
              .slice(0, 6)
              .map(({ b, rem }) => {
                const st = getSlaStatus(rem);
                const prop = b.property as any;
                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                      st === 'breached' ? 'bg-[#FDECEC] dark:bg-rose-500/40 border border-[#F5B7B1] dark:border-transparent' :
                      st === 'critical' ? 'bg-[#FEF9F9] dark:bg-orange-500/40 border border-[#F5B7B1] dark:border-transparent' :
                      st === 'warning' ? 'bg-[#FFFBF0] dark:bg-red-600/40 border border-[#EACC79] dark:border-transparent' :
                      'bg-[#F8F6F2] border border-[#E7DED2] dark:bg-zinc-700 dark:border-transparent'
                    }`}
                  >
                    <span className="font-mono text-[10px] font-semibold text-ms-orange flex-shrink-0">{b.booking_ref}</span>
                    <span className="text-[10px] text-ms-admin-muted flex-1 truncate dark:text-ms-orange-light ">{prop?.name || b.guest_name}</span>
                    <span className={`font-mono text-[10px] font-bold flex-shrink-0 ${
                      st === 'breached' ? 'text-[#B42318] dark:text-white animate-pulse' :
                      st === 'critical' ? 'text-[#B42318] dark:text-orange-200' :
                      st === 'warning' ? 'text-[#A16207] dark:text-yellow-200' :
                      'text-ms-admin-muted dark:text-white'
                    }`}>{formatCountdown(rem)}</span>
                    <button
                      onClick={() => handleBookingAction(b.id, 'confirm')}
                      className="p-0.5 text-ms-admin-muted hover:text-[#1F7A4D] hover:bg-[#EAF7F0] rounded transition-colors"
                    >
                      <Check className="h-2.5 w-2.5 dark:text-amber-50" />
                    </button>
                  </div>
                );
              })
            }
            {bookings.filter(b => b.status === 'pending').length === 0 && (
              <p className="text-xs text-ms-admin-muted text-center py-4">No pending SLA timers</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 6: AI Ops Insights ───────────────────────────── */}
      {aiInsights.length > 0 && can('viewAiInsights') && (
        <div className="bg-white border border-violet-200 dark:border-transparent rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-violet-500 text-sm">✦</span>
            <span className="text-xs font-semibold text-ms-text uppercase tracking-wider dark:text-ms-orange">AI Ops Insights</span>
            <span className="text-[9px] bg-violet-50 text-violet-600 border border-violet-200 px-1.5 py-0.5 rounded font-semibold dark:bg-transparent dark:border-transparent dark:text-green-500 animate-pulse">LIVE</span>
          </div>
          <div className="flex gap-3">
            {aiInsights.map((ins, i) => (
              <div key={i} className="flex-1 bg-violet-50 border border-violet-100 dark:bg-slate-950 dark:border-transparent rounded-xl p-3">
                <p className="text-[11px] text-[#536072] leading-relaxed mb-2">{ins.text}</p>
                <button className="text-[10px] font-semibold text-violet-600 hover:text-violet-700 bg-violet-100 hover:bg-violet-200 px-2.5 py-1 rounded-lg transition-colors dark:bg-slate-700 dark:text-white dark:hover:bg-slate-950 dark:hover:text-ms-orange">
                  {ins.action} →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh info */}
      <div className="flex items-center justify-end gap-2 text-[10px] text-ms-admin-muted">
        <span>Last refresh: {format(lastRefresh, 'HH:mm:ss')}</span>
        <span>· Auto-refresh in 30s</span>
      </div>
    </div>
  );
}
