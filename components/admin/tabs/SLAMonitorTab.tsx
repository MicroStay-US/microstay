'use client';

import { useState, useEffect, useCallback } from 'react';
import { Timer, ShieldAlert, CheckCircle2, Zap, RefreshCw, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatHour } from '@/lib/vendor-types';
import { format } from 'date-fns';

// ─── SLA helpers (same logic as CommandCenterTab) ─────────────────────────────

const SLA_HOURS = 48;

function getSlaDeadline(b: any): number {
  const d = new Date(b.booking_date);
  if (b.slot?.end_hour != null) {
    const raw = String(b.slot.end_hour);
    d.setHours(parseInt(raw.includes(':') ? raw.split(':')[0] : raw, 10), 0, 0, 0);
  }
  return d.getTime() + SLA_HOURS * 3600000;
}

function getSlaStatus(rem: number): 'ok' | 'warning' | 'critical' | 'breached' {
  if (rem <= 0) return 'breached';
  if (rem <= 2 * 3600000) return 'critical';
  if (rem <= 6 * 3600000) return 'warning';
  return 'ok';
}

function fmt(ms: number): string {
  if (ms <= 0) return 'BREACHED';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Filter = 'all' | 'expiring' | 'critical' | 'breached';

export function SLAMonitorTab() {
  const [now, setNow] = useState(Date.now());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [autoResolved, setAutoResolved] = useState(0);
  const [toast, setToast] = useState('');

  // 1s tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vd_bookings')
      .select('id, booking_ref, booking_date, guest_name, gross_amount, status, created_at, vendor_id, property:properties(name, city), slot:vd_time_slots(start_hour, end_hour)')
      .eq('status', 'pending')
      .order('booking_date', { ascending: true });

    const rows = data || [];
    const n = Date.now();
    let resolved = 0;

    const processed = rows.map((b: any) => {
      const rem = getSlaDeadline(b) - n;
      if (rem <= 0) {
        // Auto-confirm
        supabase.from('vd_bookings').update({ status: 'checked_in' }).eq('id', b.id).then();
        resolved++;
      }
      return b;
    });

    setAutoResolved(resolved);
    setBookings(processed.filter((b: any) => getSlaDeadline(b) - n > -3600000)); // keep recently breached too
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const handleAction = async (id: string, action: 'confirm' | 'cancel') => {
    const newStatus = action === 'confirm' ? 'checked_in' : 'owner_cancel';
    await supabase.from('vd_bookings').update({ status: newStatus }).eq('id', id);
    setBookings(prev => prev.filter(b => b.id !== id));
    setToast(action === 'confirm' ? '✓ Check-in confirmed' : '✗ Booking cancelled');
    setTimeout(() => setToast(''), 3000);
  };

  const withRem = bookings.map(b => ({ b, rem: getSlaDeadline(b) - now, status: getSlaStatus(getSlaDeadline(b) - now) }));

  const filtered = withRem.filter(({ status }) => {
    if (filter === 'all') return true;
    if (filter === 'expiring') return status === 'warning';
    if (filter === 'critical') return status === 'critical';
    if (filter === 'breached') return status === 'breached';
    return true;
  }).sort((a, b) => a.rem - b.rem);

  const counts = {
    breached: withRem.filter(x => x.status === 'breached').length,
    critical: withRem.filter(x => x.status === 'critical').length,
    warning: withRem.filter(x => x.status === 'warning').length,
    ok: withRem.filter(x => x.status === 'ok').length,
  };

  return (
    <div className="space-y-4 text-zinc-300">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/15 p-2.5 rounded-xl">
            <Timer className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-black dark:text-zinc-100">SLA Monitor</h1>
            <p className="text-[11px] text-zinc-600">48-hour auto-confirm engine · Live countdown</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <RefreshCw className="h-3 w-3" />Refresh
        </button>
      </div>

      {/* Auto-resolved banner */}
      {autoResolved > 0 && (
        <div className="flex items-center gap-2 bg-ms-orange-light border border-ms-orange-border rounded-xl px-4 py-2.5">
          <Zap className="h-4 w-4 text-ms-orange animate-pulse flex-shrink-0" />
          <p className="text-xs font-bold text-ms-orange/80">
            SLA Engine auto-confirmed {autoResolved} booking{autoResolved > 1 ? 's' : ''} (48h rule triggered)
          </p>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Breached', count: counts.breached, color: 'border-red-500/30 bg-red-500/5 text-red-400', f: 'breached' as Filter },
          { label: 'Critical (<2h)', count: counts.critical, color: 'border-red-500/20 bg-red-500/[0.03] text-red-400', f: 'critical' as Filter },
          { label: 'At Risk (<6h)', count: counts.warning, color: 'border-amber-500/20 bg-amber-500/5 text-amber-400', f: 'expiring' as Filter },
          { label: 'On Track', count: counts.ok, color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400', f: 'all' as Filter },
        ].map(({ label, count, color, f }) => (
          <button
            key={label}
            onClick={() => setFilter(filter === f && f !== 'all' ? 'all' : f)}
            className={`border rounded-xl px-4 py-3 text-left transition-all ${color} ${filter === f ? 'ring-1 ring-white/20' : 'opacity-80 hover:opacity-100'}`}
          >
            <div className="text-2xl font-black">{count}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5 opacity-70">{label}</div>
          </button>
        ))}
      </div>

      {/* SLA Table */}
      <div className=" border bg-purple-600/40 dark:bg-ms-admin-surface border-white/[0.05] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 dark:text-amber-400 text-amber-800" />
            <span className="text-xs font-black dark:text-zinc-200 text-amber-800 uppercase tracking-wider">
              {filter === 'all' ? 'All Pending Bookings' : filter === 'breached' ? 'Breached SLAs' : filter === 'critical' ? 'Critical (<2h)' : 'Expiring Soon (<6h)'}
            </span>
            <span className="text-[10px] text-zinc-700">{filtered.length} bookings</span>
          </div>
          {/* Filter pills */}
          <div className="flex items-center gap-1">
            {(['all', 'breached', 'critical', 'expiring'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border transition-colors ${
                  filter === f
                    ? 'dark:bg-ms-orange-light dark:border-ms-orange-border bg- text-ms-orange '
                    : 'border-white/[0.06] text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.04]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-ms-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 ">
            <CheckCircle2 className="h-10 w-10 dark:text-emerald-500/30 mb-2 text-emerald-500" />
            <p className="text-sm text-zinc-700">No bookings in this category</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="dark:bg-ms-admin-bg bg-zinc-300">
              <tr>
                {['Booking Ref', 'Property · City', 'Guest', 'Date', 'Slot', 'Amount', 'SLA Countdown', 'Priority', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2 text-[9px] font-black text-zinc-700 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ b, rem, status }) => {
                const prop = b.property as any;
                const isBreached = status === 'breached';
                const isCritical = status === 'critical';
                return (
                  <tr
                    key={b.id}
                    className={`dark:border-t bg-purple-100/40 dark:bg-transparent dark:border-white/[0.03] dark:hover:bg-white/[0.02] transition-colors ${
                      isBreached ? 'dark:bg-red-500/[0.04]' : isCritical ? 'dark:bg-red-500/[0.02]' : ''
                    }`}
                  >
                    <td className="px-3 py-3">
                      <span className="font-mono text-[11px] font-bold text-ms-orange">{b.booking_ref}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-[11px] dark:text-zinc-300 text-black font-medium ">{prop?.name || '—'}</div>
                      {prop?.city && <div className="text-[10px] text-zinc-600">{prop.city}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] dark:text-zinc-300 text-ms-orange">{b.guest_name}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] dark:text-zinc-400 text-slate-800">{format(new Date(b.booking_date), 'MMM d, yyyy')}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] text-zinc-500">
                        {b.slot ? `${formatHour(Number(b.slot.start_hour))} → ${formatHour(Number(b.slot.end_hour))}` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] font-black dark:text-zinc-200 text-ms-teal">${Number(b.gross_amount).toFixed(0)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {isBreached && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />}
                        {isCritical && <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />}
                        <span className={`font-mono text-[12px] font-black ${
                          isBreached ? 'text-red-400 animate-pulse' :
                          isCritical ? 'text-red-400' :
                          status === 'warning' ? 'text-amber-400' :
                          'text-zinc-500'
                        }`}>
                          {fmt(rem)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[9px] font-black uppercase border px-1.5 py-0.5 rounded ${
                        isBreached ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                        isCritical ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        status === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                      }`}>
                        {isBreached ? 'Breached' : isCritical ? 'Critical' : status === 'warning' ? 'At Risk' : 'OK'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAction(b.id, 'confirm')}
                          className="flex items-center gap-1 text-[10px] font-bold  dark:text-emerald-400 dark:hover:bg-emerald-500/15 border dark:border-emerald-500/25 bg-emerald-400/40 border-transparent text-black/60 px-2 py-1 rounded-lg transition-colors hover:bg-emerald-400"
                        >
                          <Check className="h-2.5 w-2.5" />
                          Confirm
                        </button>
                        <button
                          onClick={() => handleAction(b.id, 'cancel')}
                          className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* SLA Rule explanation */}
      <div className="flex items-start gap-3 dark:bg-ms-admin-surface dark:border bg-purple-300/40 dark:border-white/[0.05] rounded-xl p-4">
        <Zap className="h-4 w-4 text-ms-orange flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold dark:text-zinc-300 mb-1 text-ms-orange">48-Hour Auto-Confirm Rule</p>
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            When a booking's SLA window expires (48 hours from slot end time), the system automatically marks it as Checked In.
            This ensures guests are not left in pending state. Manually confirm or cancel before the timer expires to override.
          </p>
        </div>
      </div>
    </div>
  );
}
