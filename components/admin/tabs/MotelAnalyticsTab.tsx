'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  format, startOfDay, endOfDay, startOfMonth, endOfMonth,
  subMonths, isWithinInterval, parseISO, subDays,
} from 'date-fns';
import {
  TrendingUp, TrendingDown, AlertTriangle, Building2, DollarSign,
  CheckCircle2, XCircle, Award, ShieldAlert, RefreshCw,
  Calendar, BarChart2, Flame, ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawBooking {
  id: string;
  booking_date: string;
  gross_amount: number;
  status: string;
  property?: { id: string; name: string; city: string; state?: string } | null;
}

interface PropertyStats {
  property_id: string;
  name: string;
  city: string;
  state: string;
  total: number;
  checked_in: number;
  no_show: number;
  owner_cancel: number;
  customer_cancel: number;
  revenue: number;
  no_show_rate: number;
  cancel_rate: number;
}

type PeriodKey = 'today' | 'mtd' | 'last_month' | 'last_3m' | 'last_6m' | 'custom';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Today',
  mtd: 'MTD',
  last_month: 'Last Month',
  last_3m: 'Last 3 Months',
  last_6m: 'Last 6 Months',
  custom: 'Custom Range',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodRange(key: PeriodKey, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  switch (key) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) };
    case 'mtd': return { start: startOfMonth(now), end: endOfDay(now) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
    case 'last_3m': return { start: subMonths(now, 3), end: endOfDay(now) };
    case 'last_6m': return { start: subMonths(now, 6), end: endOfDay(now) };
    case 'custom': {
      const s = customStart ? startOfDay(parseISO(customStart)) : subMonths(now, 1);
      const e = customEnd ? endOfDay(parseISO(customEnd)) : endOfDay(now);
      return { start: s, end: e };
    }
  }
}

function computeStats(bookings: RawBooking[], start: Date, end: Date): PropertyStats[] {
  const map = new Map<string, PropertyStats>();

  for (const b of bookings) {
    if (!b.property?.id) continue;
    let d: Date;
    try { d = parseISO(b.booking_date); } catch { continue; }
    if (!isWithinInterval(d, { start, end })) continue;

    const pid = b.property.id;
    if (!map.has(pid)) {
      map.set(pid, {
        property_id: pid,
        name: b.property.name,
        city: b.property.city,
        state: b.property.state || '',
        total: 0, checked_in: 0, no_show: 0, owner_cancel: 0,
        customer_cancel: 0, revenue: 0, no_show_rate: 0, cancel_rate: 0,
      });
    }
    const s = map.get(pid)!;
    s.total++;
    if (b.status === 'checked_in') { s.checked_in++; s.revenue += b.gross_amount || 0; }
    if (b.status === 'no_show') s.no_show++;
    if (b.status === 'owner_cancel') s.owner_cancel++;
    if (b.status === 'customer_cancel') s.customer_cancel++;
  }

  Array.from(map.values()).forEach(s => {
    s.no_show_rate = s.total > 0 ? s.no_show / s.total : 0;
    s.cancel_rate = s.total > 0 ? s.owner_cancel / s.total : 0;
  });

  return Array.from(map.values());
}

function pct(rate: number) {
  return `${(rate * 100).toFixed(0)}%`;
}

function fmtRevenue(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskCard({ stats }: { stats: PropertyStats[] }) {
  const atRisk = stats.filter(s => s.no_show_rate > 0.35 || s.cancel_rate > 0.35);
  return (
    <div className="dark:bg-ms-admin-surface bg-purple-400/30 border border-red-500/20 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 dark:text-red-400 text-red-700" />
        <span className="text-xs font-black dark:text-zinc-200 uppercase tracking-wider text-red-400">At-Risk Motels</span>
        <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
          {atRisk.length > 35 ? '>35%' : `${atRisk.length}`} flagged
        </span>
      </div>
      <p className="text-[10px] text-zinc-600">No-show OR owner-cancel rate &gt;35% in selected period</p>
      {atRisk.length === 0 ? (
        <div className="flex items-center gap-2 py-4 justify-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-500/40" />
          <span className="text-xs text-zinc-700">No motels flagged</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {atRisk.map(s => (
            <div key={s.property_id} className="bg-red-500/[0.06] border border-red-500/15 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold dark:text-zinc-200 text-ms-orange truncate">{s.name}</div>
                  <div className="text-[10px] text-zinc-600">{s.city}{s.state ? `, ${s.state}` : ''}</div>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  {s.no_show_rate > 0.35 && (
                    <span className="text-[9px] font-black bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded">
                      NS {pct(s.no_show_rate)}
                    </span>
                  )}
                  {s.cancel_rate > 0.35 && (
                    <span className="text-[9px] font-black bg-ms-orange-light text-ms-orange border border-ms-orange-border px-1.5 py-0.5 rounded">
                      CX {pct(s.cancel_rate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-1.5 text-[10px] text-zinc-600">
                <span>{s.total} bookings</span>
                <span>{s.no_show} no-show</span>
                <span>{s.owner_cancel} cancelled</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopPerformers({ stats, lastMonthStats }: { stats: PropertyStats[]; lastMonthStats: PropertyStats[] }) {
  const sorted = [...lastMonthStats].sort((a, b) => b.revenue - a.revenue);
  const best = sorted.slice(0, 3);
  const worst = sorted.filter(s => s.total >= 1).sort((a, b) => (a.no_show_rate + a.cancel_rate) - (b.no_show_rate + b.cancel_rate) || a.revenue - b.revenue).slice(-3).reverse();

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Best */}
      <div className="dark:bg-ms-admin-surface dark:border bg-green-400/30 dark:border-emerald-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-4 w-4 dark:text-emerald-400 text-ms-teal" />
          <span className="text-xs font-black dark:text-zinc-200 uppercase tracking-wider text-ms-teal">Best · Last Month</span>
        </div>
        {best.length === 0 ? (
          <p className="text-xs text-zinc-700 py-3 text-center">No data</p>
        ) : (
          <div className="space-y-2">
            {best.map((s, i) => (
              <div key={s.property_id} className="flex items-center gap-2.5">
                <span className={`text-[11px] font-black w-4 text-center ${i === 0 ? 'dark:text-yellow-400 text-ms-orange ' : i === 1 ? 'text-zinc-400' : 'text-amber-700'}`}>
                  #{i + 1}
                </span>
                <div className="flex  flex-col min-w-0">
                  <div className="text-[11px] font-bold dark:text-zinc-200 truncate text-ms-orange">{s.name}</div>
                  <div className="text-[10px] text-zinc-600">{s.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-black text-emerald-400">{fmtRevenue(s.revenue)}</div>
                  <div className="text-[10px] text-zinc-600">{s.checked_in} check-ins</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Worst */}
      <div className="dark:bg-ms-admin-surface dark:border bg-rose-300/40 dark:border-red-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="h-4 w-4 dark:text-red-400 text-rose-500" />
          <span className="text-xs font-black text-rose-500 dark:text-zinc-200 uppercase tracking-wider">Worst · Last Month</span>
        </div>
        {worst.length === 0 ? (
          <p className="text-xs text-zinc-700 py-3 text-center">No data</p>
        ) : (
          <div className="space-y-2">
            {worst.map((s, i) => (
              <div key={s.property_id} className="flex items-center gap-2.5">
                <span className="text-[11px] font-black w-4 text-center text-rose-400 dark:text-red-500/60">
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold dark:text-zinc-200 text-rose-500 truncate">{s.name}</div>
                  <div className="text-[10px] text-zinc-600">{s.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-black text-red-400">{fmtRevenue(s.revenue)}</div>
                  <div className="text-[10px] text-zinc-600">NS {pct(s.no_show_rate)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

type SortCol = 'name' | 'total' | 'checked_in' | 'no_show' | 'owner_cancel' | 'revenue' | 'no_show_rate' | 'cancel_rate';

export function MotelAnalyticsTab() {
  const [allBookings, setAllBookings] = useState<RawBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [period, setPeriod] = useState<PeriodKey>('mtd');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [sortCol, setSortCol] = useState<SortCol>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('vd_bookings')
      .select('id, booking_date, gross_amount, status, property:properties(id, name, city, state)')
      .gte('booking_date', sixMonthsAgo)
      .order('booking_date', { ascending: false });

    setAllBookings((data || []) as unknown as RawBooking[]);
    setLastRefresh(new Date());
    setLoading(false);
  }

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  // Compute period stats
  const { start: pStart, end: pEnd } = useMemo(
    () => getPeriodRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const periodStats = useMemo(() => computeStats(allBookings, pStart, pEnd), [allBookings, pStart, pEnd]);

  // Last month stats for best/worst
  const lastMonthRange = useMemo(() => getPeriodRange('last_month'), []);
  const lastMonthStats = useMemo(
    () => computeStats(allBookings, lastMonthRange.start, lastMonthRange.end),
    [allBookings, lastMonthRange]
  );

  // Filtered + sorted table rows
  const tableRows = useMemo(() => {
    let rows = periodStats.filter(s =>
      !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase())
    );
    rows.sort((a, b) => {
      const va = (a as any)[sortCol];
      const vb = (b as any)[sortCol];
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : (va - vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [periodStats, search, sortCol, sortDir]);

  function SortTh({ col, label }: { col: SortCol; label: string }) {
    const active = sortCol === col;
    return (
      <th
        className="px-3 py-2 text-[9px] font-black text-zinc-700 uppercase tracking-widest whitespace-nowrap border-b border-white/[0.04] cursor-pointer  select-none"
        onClick={() => toggleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          {active && <span className="text-ms-orange">{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </span>
      </th>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-white/5 rounded-xl w-1/3" />
        <div className="grid grid-cols-3 gap-3 h-48">
          {[1, 2, 3].map(i => <div key={i} className="bg-white/5 rounded-xl" />)}
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    );
  }

  const maxMonthStr = format(new Date(), 'yyyy-MM-dd');
  const minMonthStr = format(subMonths(new Date(), 6), 'yyyy-MM-dd');

  return (
    <div className="space-y-4 text-zinc-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black dark:text-white  text-black tracking-tight flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-ms-orange" />
            Motel Performance Analytics
          </h2>
          <p className="text-[11px] text-zinc-600 mt-0.5">Refreshed {format(lastRefresh, 'HH:mm:ss')} · last 6 months of booking data</p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg hover:bg-white/5 text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Risk + Best/Worst ── */}
      <div className="grid grid-cols-3 gap-3">
        <RiskCard stats={periodStats} />
        <div className="col-span-2">
          <TopPerformers stats={periodStats} lastMonthStats={lastMonthStats} />
        </div>
      </div>

      {/* ── Table Section ── */}
      <div className="dark:bg-ms-admin-surface dark:border bg-slate-300/40 dark:border-white/[0.05] rounded-xl overflow-hidden">

        {/* Table controls */}
        <div className="flex items-center justify-between px-4 py-3 dark:border-b dark:border-white/[0.05] gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 dark:text-ms-orange text-orange-400" />
            <span className="text-xs font-black dark:text-zinc-200 uppercase tracking-wider text-orange-500">All Motels</span>
            <span className="text-[10px] text-zinc-700 ml-1">{tableRows.length} properties</span>
          </div>

          {/* Period pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {(['today', 'mtd', 'last_month', 'last_3m', 'last_6m', 'custom'] as PeriodKey[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                  period === p
                    ? 'bg-ms-orange text-white'
                    : 'dark:bg-white/[0.04] dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-white/[0.08] bg-transparent text-zinc-800'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search motel or city…"
            className="text-[11px] dark:bg-white/[0.04] border border-white/[0.07] dark:text-zinc-300 placeholder-zinc-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-ms-orange-border text-black w-44"
          />
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex items-center gap-3 px-4 py-2.5 dark:border-b dark:border-white/[0.05] bg-white/[0.02]">
            <Calendar className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" />
            <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">From</span>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              min={minMonthStr}
              max={maxMonthStr}
              className="text-[11px] dark:bg-white/[0.05] border border-white/[0.08] dark:text-zinc-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-ms-orange-border bg-zinc-300 text-white"
            />
            <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">To</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              min={minMonthStr}
              max={maxMonthStr}
              className="text-[11px] dark:bg-white/[0.05] border border-white/[0.08] dark:text-zinc-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-ms-orange-border bg-zinc-300 text-white"
            />
            <span className="text-[10px] text-zinc-600">(max 6 months back)</span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-auto max-h-[480px]">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead className="sticky top-0 dark:bg-ms-admin-bg bg-zinc-400 z-10">
              <tr>
                <SortTh col="name" label="Property" />
                <th className="px-3 py-2 text-[9px] font-black text-zinc-700 uppercase tracking-widest whitespace-nowrap border-b border-white/[0.04]">City</th>
                <SortTh col="total" label="Bookings" />
                <SortTh col="checked_in" label="Check-ins" />
                <SortTh col="no_show" label="No-Shows" />
                <SortTh col="owner_cancel" label="Motel Cancels" />
                <SortTh col="revenue" label="Revenue" />
                <SortTh col="no_show_rate" label="NS Rate" />
                <SortTh col="cancel_rate" label="Cancel Rate" />
                <th className="px-3 py-2 text-[9px] font-black text-zinc-700 uppercase tracking-widest whitespace-nowrap border-b border-white/[0.04]">Risk</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-xs text-zinc-700 dark:text-white">
                    No bookings found for this period
                  </td>
                </tr>
              ) : (
                tableRows.map(s => {
                  const nsHigh = s.no_show_rate > 0.35;
                  const cxHigh = s.cancel_rate > 0.35;
                  const isAtRisk = nsHigh || cxHigh;
                  return (
                    <tr
                      key={s.property_id}
                      className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${isAtRisk ? 'bg-red-500/[0.03]' : ''}`}
                    >
                      <td className="px-3 py-2.5 max-w-[160px]">
                        <div className="text-[11px] font-bold text-ms-orange dark:text-zinc-200 truncate ">{s.name}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[11px] text-zinc-500">{s.city}{s.state ? `, ${s.state}` : ''}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[12px] font-black dark:text-zinc-100 text-black">{s.total}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[12px] font-black text-emerald-400">{s.checked_in}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-[12px] font-black ${s.no_show > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{s.no_show}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-[12px] font-black ${s.owner_cancel > 0 ? 'text-ms-orange' : 'text-zinc-600'}`}>{s.owner_cancel}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[12px] font-black dark:-zinc-100 text-ms-orange">{fmtRevenue(s.revenue)}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-[11px] font-black ${nsHigh ? 'text-red-400' : s.no_show_rate > 0.2 ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {pct(s.no_show_rate)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-[11px] font-black ${cxHigh ? 'text-ms-orange' : s.cancel_rate > 0.2 ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {pct(s.cancel_rate)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {isAtRisk ? (
                          <span className="flex items-center gap-1 text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-2.5 w-2.5" /> AT RISK
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {tableRows.length > 0 && (
              <tfoot className="sticky bottom-0 dark:bg-ms-admin-bg z-10">
                <tr className="dark:border-t dark:border-white/[0.08]">
                  <td colSpan={2} className="px-3 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                    Totals · {PERIOD_LABELS[period]}
                  </td>
                  <td className="px-3 py-2 text-[11px] font-black text-zinc-200">
                    {tableRows.reduce((s, r) => s + r.total, 0)}
                  </td>
                  <td className="px-3 py-2 text-[11px] font-black text-emerald-400">
                    {tableRows.reduce((s, r) => s + r.checked_in, 0)}
                  </td>
                  <td className="px-3 py-2 text-[11px] font-black text-red-400">
                    {tableRows.reduce((s, r) => s + r.no_show, 0)}
                  </td>
                  <td className="px-3 py-2 text-[11px] font-black text-ms-orange">
                    {tableRows.reduce((s, r) => s + r.owner_cancel, 0)}
                  </td>
                  <td className="px-3 py-2 text-[11px] font-black text-ms-orange dark:text-zinc-100">
                    {fmtRevenue(tableRows.reduce((s, r) => s + r.revenue, 0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
