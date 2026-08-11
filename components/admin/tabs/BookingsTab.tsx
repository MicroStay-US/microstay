'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, DoorOpen, CheckCircle2, UserX, Ban, Clock, Zap, Building2, MapPin, X } from 'lucide-react';
import { formatHour } from '@/lib/vendor-types';

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:      { label: 'PENDING',    cls: 'bg-[#FFF7E6] text-[#A16207] border-[#EACC79] dark:bg-transparent dark:shadow-md dark:shadow-amber-400 dark:border-transparent',   icon: <DoorOpen    className="w-3 h-3 mr-1" /> },
  checked_in:   { label: 'CHECKED IN', cls: 'bg-[#EAF7F0] text-[#1F7A4D] border-[#A3D9BF] dark:bg-transparent dark:shadow-md dark:shadow-green-400 dark:border-transparent', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
  no_show:      { label: 'NO-SHOW',    cls: 'bg-[#F3EEE7] text-[#536072] border-[#DDD1C3] dark:bg-transparent dark:shadow-md dark:shadow-zinc-400 dark:border-transparent',     icon: <UserX className="w-3 h-3 mr-1" /> },
  owner_cancel: { label: 'CANCELLED',  cls: 'bg-[#FDECEC] text-[#B42318] border-[#F5B7B1] dark:bg-transparent dark:shadow-md dark:shadow-slate-400 dark:border-transparent',      icon: <Ban  className="w-3 h-3 mr-1" /> },
  customer_cancel: { label: 'CANCELLED',  cls: 'bg-[#FDECEC] text-[#B42318] border-[#F5B7B1] dark:bg-transparent dark:shadow-md dark:shadow-red-400 dark:border-transparent',      icon: <Ban  className="w-3 h-3 mr-1" /> },
};

function todayStr() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}
function offsetDateStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

export function BookingsTab() {
  const [bookings, setBookings]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [autoResolved, setAutoResolved] = useState(0);

  // ── Filters — default to today ───────────────────────────────────────────
  const [search,      setSearch]      = useState('');
  const [motelFilter, setMotelFilter] = useState('');
  const [zipFilter,   setZipFilter]   = useState('');
  const [dateFrom,    setDateFrom]    = useState(todayStr);
  const [dateTo,      setDateTo]      = useState(todayStr);

  const loadBookings = useCallback(async () => {
    setLoading(true);

    // Fetch via server API route (service role) — bypasses client-side auth/RLS issues
    let rows: any[] = [];
    try {
      const res = await fetch('/api/admin/bookings');
      if (res.ok) {
        const json = await res.json();
        rows = json.data || [];
      } else {
        console.error('Admin bookings API error:', res.status);
      }
    } catch (err) {
      console.error('BookingsTab fetch error:', err);
    }

    const now = new Date();
    let autoResolvedCount = 0;

    const processed = rows.map(b => {
      const slot = b.slot || null;
      let slaStatus = 'Resolved';
      let isActiveSLA = false;
      let activeStatus = b.status;
      let isAutoTriggered = false;

      const bookDate = new Date(b.booking_date + 'T12:00:00');
      if (slot?.end_hour) {
        bookDate.setHours(Number(slot.end_hour));
      }

      if (activeStatus === 'pending') {
        const diffHours = (now.getTime() - bookDate.getTime()) / 3_600_000;
        if (diffHours >= 48) {
          activeStatus    = 'checked_in';
          slaStatus       = 'Auto-Resolved';
          isAutoTriggered = true;
          autoResolvedCount++;
          supabase.from('vd_bookings').update({ status: 'checked_in' }).eq('id', b.id).then();
        } else if (diffHours > 0) {
          slaStatus    = `T-Minus ${Math.max(0, Math.floor(48 - diffHours))}h`;
          isActiveSLA  = true;
        } else {
          slaStatus = 'Future';
        }
      }

      return { ...b, slot, status: activeStatus, slaStatus, isActiveSLA, isAutoTriggered };
    });

    setAutoResolved(autoResolvedCount);
    setBookings(processed);
    setLoading(false);
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // ── Derived option lists ──────────────────────────────────────────────────
  const motelOptions = useMemo(() => {
    return Array.from(new Set(bookings.map(b => b.property?.name).filter(Boolean))).sort() as string[];
  }, [bookings]);

  const zipOptions = useMemo(() => {
    return Array.from(new Set(bookings.map(b => b.property?.zip).filter(Boolean))).sort() as string[];
  }, [bookings]);

  // ── Quick filters ─────────────────────────────────────────────────────────
  const applyNext30 = () => { setDateFrom(todayStr()); setDateTo(offsetDateStr(30)); setMotelFilter(''); setZipFilter(''); setSearch(''); };
  const clearAll    = () => { setSearch(''); setMotelFilter(''); setZipFilter(''); setDateFrom(''); setDateTo(''); };
  const hasFilter   = search || motelFilter || zipFilter || dateFrom || dateTo;

  // ── Client-side filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => bookings.filter(b => {
    if (search) {
      const s = search.toLowerCase();
      const hit = b.guest_name?.toLowerCase().includes(s)
        || b.booking_ref?.toLowerCase().includes(s)
        || b.property?.name?.toLowerCase().includes(s)
        || b.guest_email?.toLowerCase().includes(s);
      if (!hit) return false;
    }
    if (motelFilter && b.property?.name !== motelFilter) return false;
    if (zipFilter   && b.property?.zip  !== zipFilter)   return false;
    if (dateFrom    && b.booking_date   <  dateFrom)     return false;
    if (dateTo      && b.booking_date   >  dateTo)       return false;
    return true;
  }), [bookings, search, motelFilter, zipFilter, dateFrom, dateTo]);

  // ── Summary totals for filtered rows ─────────────────────────────────────
  const totalGross    = filtered.reduce((s, b) => s + Number(b.gross_amount       || 0), 0);
  const totalPlatform = filtered.reduce((s, b) => b.status === 'checked_in' ? s + Number(b.platform_total_fee ?? (Number(b.gross_amount) * 0.12)) : s, 0);

  if (loading) return(
    <>
    <div className='h-20 w-[450px] bg-[#E7DED2] dark:bg-gray-600 animate-pulse rounded-xl'></div>
    <div className="h-64 bg-[#E7DED2] dark:bg-gray-600 animate-pulse rounded-xl"></div>
    <div className="h-64 bg-[#E7DED2] dark:bg-gray-600 animate-pulse rounded-xl"></div>
    </>
  )

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-semibold text-ms-text tracking-tight dark:text-ms-orange">Global Transaction Stream</h2>
        <p className="text-ms-admin-muted text-sm mt-1">Live view of all reservations with automated 48-Hour SLA processing.</p>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white border border-[#DDD1C3] dark:border-transparent rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Text search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ms-admin-muted" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Guest, ref, motel…"
              className="pl-9 h-10 bg-[#F8F6F2] border-[#DDD1C3] dark:bg-transparent text-sm font-medium text-ms-text placeholder-[#A1AABA] focus:ring-ms-orange/30 focus:border-ms-orange-border" />
          </div>

          {/* Motel dropdown */}
          <div className="relative min-w-[180px]">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ms-admin-muted pointer-events-none dark:text-white" />
            <select
              value={motelFilter}
              onChange={e => setMotelFilter(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-md border border-[#DDD1C3] bg-[#F8F6F2] dark:bg-zinc-500 dark:border-transparent dark:text-white text-sm font-medium text-[#536072] appearance-none focus:outline-none focus:ring-1 focus:ring-ms-orange/30"
            >
              <option value="">All Motels</option>
              {motelOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Zip dropdown */}
          <div className="relative min-w-[140px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ms-admin-muted dark:text-white pointer-events-none" />
            <select
              value={zipFilter}
              onChange={e => setZipFilter(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-md border dark:text-white dark:bg-ms-orange dark:border-transparent border-[#DDD1C3] bg-[#F8F6F2] text-sm font-medium text-[#536072] appearance-none focus:outline-none focus:ring-1 focus:ring-ms-orange/30"
            >
              <option value="">All Zip Codes</option>
              {zipOptions.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          {/* Date from */}
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <span className="text-xs font-semibold text-ms-admin-muted whitespace-nowrap">From</span>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="h-10 bg-[#F8F6F2] border-[#DDD1C3] text-sm font-medium text-ms-text focus:ring-ms-orange/30 dark:bg-transparent dark:text-white " />
          </div>

          {/* Date to */}
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <span className="text-xs font-semibold text-ms-admin-muted whitespace-nowrap">To</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="h-10 bg-[#F8F6F2] border-[#DDD1C3] text-sm font-medium text-ms-text focus:ring-ms-orange/30 dark:bg-transparent dark:text-white" />
          </div>

          {/* Quick: Next 30 Days */}
          <Button onClick={applyNext30} variant="outline"
            className="h-10 px-4 text-xs font-semibold uppercase tracking-wider border-[#E8D5A8] text-[#8C5A14] bg-[#FBF4E8] hover:bg-[#F5E9D0] whitespace-nowrap dark:bg-transparent/40 dark:text-white dark:hover:bg-slate-800 dark:hover:text-white">
            Next 30 Days
          </Button>

          {/* Clear */}
          {hasFilter && (
            <Button onClick={clearAll} variant="ghost"
              className="h-10 px-3 text-ms-admin-muted hover:text-[#536072] hover:bg-[#F1EBE3] dark:hover:bg-slate-600 dark:hover:text-black">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Active filter summary */}
        {hasFilter && (
          <div className="flex flex-wrap gap-2 pt-1">
            {motelFilter && <span className="bg-[#FBF4E8] text-[#8C5A14] border border-[#E8D5A8] text-[11px] font-semibold px-2 py-0.5 rounded-full">{motelFilter}</span>}
            {zipFilter   && <span className="bg-[#EAF1FF] text-[#1D4ED8] border border-[#93C5FD] text-[11px] font-semibold px-2 py-0.5 rounded-full">ZIP {zipFilter}</span>}
            {(dateFrom || dateTo) && (
              <span className="bg-[#F3EEE7] text-[#536072] border border-[#DDD1C3] text-[11px] font-semibold px-2 py-0.5 rounded-full dark:bg-transparent/40 dark:text-ms-orange dark:border-transparent">
                {dateFrom || '…'} → {dateTo || '…'}
              </span>
            )}
            <span className="text-[11px] font-semibold text-ms-admin-muted">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[#DDD1C3] dark:border-transparent rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
        {autoResolved > 0 && (
          <div className="bg-[#FBF4E8] border-b border-[#E8D5A8] dark:bg-slate-900 p-3 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-ms-orange animate-pulse" />
            <span className="text-sm font-semibold text-[#8C5A14]">SLA Engine auto-resolved {autoResolved} pending reservations.</span>
          </div>
        )}

        <div className="px-5 py-4 border-b border-[#E7DED2] dark:bg-slate-800 dark:border-gray-900 bg-[#F8F6F2] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-ms-admin-muted dark:text-ms-orange" />
          <h3 className="font-semibold text-ms-text dark:text-ms-orange">
            {filtered.length} Booking{filtered.length !== 1 ? 's' : ''}
            {dateFrom === dateTo && dateFrom === todayStr()
              ? <span className="ml-2 text-xs font-semibold text-ms-orange bg-[#FBF4E8] dark:bg-slate-700 dark:text-red-500/30 border border-[#E8D5A8] px-2 py-0.5 rounded-full dark:border-transparent">Today</span>
              : (dateFrom || dateTo) && <span className="ml-2 text-xs font-semibold text-[#536072] bg-[#F3EEE7] border border-[#DDD1C3] px-2 py-0.5 rounded-full dark:bg-slate-700 dark:text-white dark:border-transparent">{dateFrom || '…'} → {dateTo || '…'}</span>
            }
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F6F2] border-b border-[#E7DED2] dark:bg-slate-900 dark:border-transparent">
                <th className="px-6 py-4 text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest">Ref# & Date</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest">Property / ZIP</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest">Guest Account</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest text-right">Gross Flow</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest text-right">Platform Earned</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest text-center">Engine Status</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest text-right">48h SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE1] dark:divide-zinc-800 dark:bg-gray-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-ms-admin-muted dark:text-white text-sm">
                    No bookings match the current filters.
                  </td>
                </tr>
              ) : filtered.map(b => {
                const badge    = statusConfig[b.status] || statusConfig.pending;
                const slot     = b.slot;
                const earned   = b.status === 'checked_in'
                  ? (b.platform_total_fee != null ? Number(b.platform_total_fee) : Number(b.gross_amount) * 0.12)
                  : null;
                const isFuture = b.booking_date >= todayStr();
                return (
                  <tr key={b.id} className={`hover:bg-[#F8F6F2] transition-colors ${isFuture ? 'dark:hover:bg-slate-800 bg-[#F5F8FF] dark:bg-red-950/40' : 'bg-white dark:hover:bg-slate-800'}`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-ms-orange mb-0.5">{b.booking_ref}</div>
                      <div className="text-sm font-semibold text-ms-text dark:text-ms-orange-light">
                        {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {isFuture && (
                        <span className="text-[9px] font-semibold text-[#1D4ED8] uppercase tracking-widest bg-[#EAF1FF] border border-[#93C5FD] px-1.5 py-0.5 rounded mt-0.5 inline-block dark:bg-transparent dark:border-transparent animate-pulse">Upcoming</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-semibold text-ms-text dark:text-ms-orange">{b.property?.name || 'Legacy Record'}</div>
                      <div className="text-xs text-ms-admin-muted font-medium mt-0.5 flex items-center gap-1">
                        {b.property?.zip && <><MapPin className="w-3 h-3" />{b.property.zip}</>}
                        {b.property?.city && <span className="text-ms-admin-muted">· {b.property.city}</span>}
                      </div>
                      <div className="text-xs text-ms-admin-muted font-medium mt-0.5">
                        {slot ? `${formatHour(slot.start_hour)} – ${formatHour(slot.end_hour)}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="font-semibold text-sm text-ms-text dark:text-ms-orange">{b.guest_name}</div>
                      <div className="text-xs text-ms-admin-muted font-medium mt-1">{b.guest_phone || '-'}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <span className="font-bold text-ms-text text-lg dark:text-ms-orange-hover">${Number(b.gross_amount).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      {earned != null ? (
                        <>
                          <span className="font-bold text-[#1F7A4D] text-base">${earned.toFixed(2)}</span>
                          <div className="text-[10px] text-ms-admin-muted font-medium mt-0.5">12%</div>
                        </>
                      ) : (
                        <span className="text-ms-admin-muted font-medium text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-widest border ${badge.cls}`}>
                        {badge.icon}{badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      {b.isAutoTriggered ? (
                        <div className="flex justify-end items-center gap-1.5 text-xs font-semibold text-ms-orange uppercase tracking-widest">
                          <Zap className="w-3.5 h-3.5" /> Auto-Resolved
                        </div>
                      ) : b.isActiveSLA ? (
                        <div className="flex justify-end items-center gap-1.5 text-xs font-semibold text-[#A16207] uppercase tracking-widest bg-[#FFF7E6] dark:bg-slate-800 dark:border-transparent px-2.5 py-1 rounded border border-[#EACC79]">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> {b.slaStatus}
                        </div>
                      ) : (
                        <div className="text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest">{b.slaStatus}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Totals Footer ── */}
        <div className="border-t border-[#DDD1C3] dark:border-transparent bg-[#F8F6F2] dark:bg-slate-800 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs font-semibold text-ms-admin-muted uppercase tracking-widest">
            {filtered.length} booking{filtered.length !== 1 ? 's' : ''} · {dateFrom === dateTo && dateFrom === todayStr() ? "Today's Summary" : "Filtered Summary"}
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest mb-0.5">Total Gross Revenue</div>
              <div className="text-2xl font-bold text-ms-text dark:text-ms-orange">${totalGross.toFixed(2)}</div>
            </div>
            <div className="w-px h-10 bg-[#DDD1C3]" />
            <div className="text-right">
              <div className="text-[10px] font-semibold text-ms-admin-muted uppercase tracking-widest mb-0.5">MicroStay Earned</div>
              <div className="text-2xl font-bold text-[#1F7A4D]">${totalPlatform.toFixed(2)}</div>
              <div className="text-[10px] text-ms-admin-muted font-medium">12% per booking</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
