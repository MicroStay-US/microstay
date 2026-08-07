'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import type { BlockedDate } from '@/lib/vendor-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarOff, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function VendorBlockedDatesPage() {
  const { vendor, selectedPropertyId } = useVendor();
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [reason, setReason] = useState('');

  const loadBlocked = useCallback(async () => {
    if (!vendor || !selectedPropertyId) { setLoading(false); return; }
    const { data } = await supabase
      .from('blocked_dates').select('*')
      .eq('property_id', selectedPropertyId).eq('vendor_id', vendor.id)
      .order('blocked_date', { ascending: true });
    setBlockedDates((data || []) as BlockedDate[]);
    setLoading(false);
  }, [vendor, selectedPropertyId]);

  useEffect(() => { loadBlocked(); }, [loadBlocked]);

  const blockedSet = new Set(blockedDates.map((b) => b.blocked_date));

  const toggleDate = async (dateStr: string) => {
    if (!vendor || !selectedPropertyId) return;
    if (blockedSet.has(dateStr)) {
      await supabase.from('blocked_dates').delete()
        .eq('property_id', selectedPropertyId).eq('vendor_id', vendor.id).eq('blocked_date', dateStr);
    } else {
      await supabase.from('blocked_dates').insert({
        property_id: selectedPropertyId, vendor_id: vendor.id,
        blocked_date: dateStr, reason: reason || '',
      });
    }
    loadBlocked();
  };

  const removeBlocked = async (id: string) => {
    await supabase.from('blocked_dates').delete().eq('id', id);
    loadBlocked();
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateStr(new Date());

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        <div className="h-8 bg-slate-800 rounded w-48 animate-pulse" />
        <div className="h-96 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!selectedPropertyId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <CalendarOff className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-xl font-semibold text-white">No Property Selected</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Blocked Dates</h1>
        <p className="text-slate-400 mt-1">Block dates to deactivate your property. Click a date to toggle.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-[#111827] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="text-lg font-semibold text-white">{MONTH_NAMES[month]} {year}</h3>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronRight className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isBlocked = blockedSet.has(dateStr);
              const isToday = dateStr === today;
              const isPast = dateStr < today;

              return (
                <button
                  key={i}
                  onClick={() => !isPast && toggleDate(dateStr)}
                  disabled={isPast}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
                    isBlocked
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 hover:bg-rose-500/40'
                      : isToday
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : isPast
                          ? 'text-slate-600 cursor-not-allowed'
                          : 'text-slate-300 hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50" /><span>Blocked</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-cyan-500/20 border border-cyan-500/30" /><span>Today</span></div>
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Block Reason (optional)</h3>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Renovation, holiday, etc."
              className="bg-slate-800 border-slate-700 text-white text-sm" />
            <p className="text-xs text-slate-500">This note will be saved with newly blocked dates.</p>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Blocked Dates ({blockedDates.length})</h3>
            {blockedDates.length === 0 ? (
              <p className="text-xs text-slate-500">No dates blocked yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {blockedDates.map((bd) => (
                  <div key={bd.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm text-white font-mono">{bd.blocked_date}</span>
                      {bd.reason && <p className="text-xs text-slate-500 mt-0.5">{bd.reason}</p>}
                    </div>
                    <button onClick={() => removeBlocked(bd.id)} className="text-slate-500 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
