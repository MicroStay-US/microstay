'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import type { VdTimeSlot, VdBooking } from '@/lib/vendor-types';
import { formatHour, calculateSlotDuration } from '@/lib/vendor-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus, Clock, CircleAlert as AlertCircle, Trash2, Edit2,
  Save, X, RotateCcw, CalendarDays, ChevronLeft, ChevronRight, Copy,
} from 'lucide-react';
import { format, addDays, isToday, startOfDay } from 'date-fns';

// ── Constants ──────────────────────────────────────────────────────────────────
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

const ROOM_TYPES = [
  { code: '1BNS', label: '1 Bed · Non-Smoking',  icon: '🛏️',  color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-black dark:border-transparent' },
  { code: '1BS',  label: '1 Bed · Smoking',       icon: '🛏️',  color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-black dark:border-transparent' },
  { code: '2BNS', label: '2 Bed · Non-Smoking',   icon: '🛏🛏', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-black dark:border-transparent' },
  { code: '2BS',  label: '2 Bed · Smoking',        icon: '🛏🛏', color: 'bg-ms-orange-light text-ms-orange border-ms-orange-border dark:bg-black dark:border-transparent' },
  { code: '1BEX', label: '1 Bed · Executive',      icon: '⭐',   color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-black dark:border-transparent' },
  { code: '2BEX', label: '2 Bed · Executive',      icon: '⭐⭐',  color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-black dark:border-transparent' },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────────
interface DateWindow {
  id: string;
  property_id: string;
  override_date: string;
  slot_label: string;
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  price_per_room: number;
  max_rooms: number;
  is_active: boolean;
  sort_order: number;
  room_type: string;
  bed_type: string;
  smoking_type: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getRoomType(code: string) {
  return ROOM_TYPES.find(r => r.code === code) || ROOM_TYPES[0];
}

function get14Days(): Date[] {
  return Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i));
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function VendorSlotsPage() {
  const { selectedPropertyId } = useVendor();

  const [slots, setSlots]                         = useState<VdTimeSlot[]>([]);
  const [dateWindows, setDateWindows]             = useState<DateWindow[]>([]);
  const [datesCustomized, setDatesCustomized]     = useState<Set<string>>(new Set());
  const [todayBookings, setTodayBookings]         = useState<VdBooking[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [totalRooms, setTotalRooms] = useState(0);
  const [selectedDate, setSelectedDate]           = useState<string | null>(null);
  const [calPage, setCalPage]                     = useState(0);

  const [showAddDefault, setShowAddDefault]       = useState(false);
  const [showAddDate, setShowAddDate]             = useState(false);
  const [deleteDefaultId, setDeleteDefaultId]     = useState<string | null>(null);
  const [deleteDateId, setDeleteDateId]           = useState<string | null>(null);
  const [copyingDefaults, setCopyingDefaults]     = useState(false);
  const [bulkCopying, setBulkCopying]             = useState(false);
  const [bulkProgress, setBulkProgress]           = useState<{ done: number; total: number } | null>(null);

  const today  = format(new Date(), 'yyyy-MM-dd');
  const days14 = get14Days();
  const week   = days14.slice(calPage * 7, calPage * 7 + 7);
  const getAllocatedRooms = (windows: any[]) => {
    return windows.reduce(
        (sum, item) => sum + Number(item.max_rooms),
        0
    );
};

  // ── Load ─────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!selectedPropertyId) { setLoading(false); return; }

    const endDate = format(addDays(new Date(), 13), 'yyyy-MM-dd');

    const [slotsRes, bookingsRes, dateWinRes, propertyRes] = await Promise.all([
      supabase.from('vd_time_slots').select('*').eq('property_id', selectedPropertyId).order('sort_order'),
      supabase.from('vd_bookings').select('*').eq('property_id', selectedPropertyId).gte('booking_date', today).lte('booking_date', endDate),
      supabase.from('vd_date_windows').select('*')
        .eq('property_id', selectedPropertyId)
        .gte('override_date', today)
        .lte('override_date', endDate)
        .order('sort_order'),
      supabase.from('properties').select('total_rooms').eq('id', selectedPropertyId).single()
    ]);

    setSlots((slotsRes.data || []) as VdTimeSlot[]);
    setTodayBookings((bookingsRes.data || []) as VdBooking[]);
    setTotalRooms(propertyRes.data?.total_rooms || 0);
    console.log("Property Response:", JSON.stringify(propertyRes, null, 2));
    console.log("Selected Property:", selectedPropertyId);

    const dw = (dateWinRes.data || []) as DateWindow[];
    setDateWindows(dw);
    setDatesCustomized(new Set(dw.map(w => w.override_date)));
    setLoading(false);
  }, [selectedPropertyId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    const ch = supabase
      .channel('slots-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vd_bookings',
        filter: `property_id=eq.${selectedPropertyId}` }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedPropertyId, loadData]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedDateWindows = selectedDate
    ? dateWindows.filter(w => w.override_date === selectedDate)
    : [];
  const isDateCustomized = selectedDate ? datesCustomized.has(selectedDate) : false;

  // ── Handlers — defaults ───────────────────────────────────────────────────────
  const handleDefaultToggle = async (slotId: string, active: boolean) => {
    if (active && slots.filter(s => s.is_active).length >= 6) {
      alert('Maximum 6 active windows allowed. Disable another first.');
      return;
    }
    await supabase.from('vd_time_slots').update({ is_active: active }).eq('id', slotId);
    loadData();
  };

  const handleDefaultUpdateField = async (slotId: string, payload: Partial<VdTimeSlot>) => {
    await supabase.from('vd_time_slots').update(payload).eq('id', slotId);
    loadData();
  };

  const handleDefaultDelete = async (slotId: string) => {
    await supabase.from('vd_time_slots').delete().eq('id', slotId);
    setDeleteDefaultId(null);
    loadData();
  };

  // ── Handlers — date windows ───────────────────────────────────────────────────
  const handleDateToggle = async (winId: string, active: boolean) => {
    if (active && selectedDateWindows.filter(w => w.is_active).length >= 6) {
      alert('Maximum 6 active windows per day. Disable another first.');
      return;
    }
    await supabase.from('vd_date_windows').update({ is_active: active }).eq('id', winId);
    loadData();
  };

  const handleDateUpdateField = async (winId: string, payload: Partial<DateWindow>) => {
    await supabase.from('vd_date_windows').update(payload).eq('id', winId);
    loadData();
  };

  const handleDateDelete = async (winId: string) => {
    await supabase.from('vd_date_windows').delete().eq('id', winId);
    setDeleteDateId(null);
    loadData();
  };

  const handleResetDate = async () => {
    if (!selectedDate || !selectedPropertyId) return;
    await supabase.from('vd_date_windows').delete()
      .eq('property_id', selectedPropertyId)
      .eq('override_date', selectedDate);
    loadData();
  };

  const handleCopyDefaults = async () => {
    if (!selectedDate || !selectedPropertyId || slots.length === 0) return;
    setCopyingDefaults(true);
    const rows = slots.map(s => ({
      property_id:    selectedPropertyId,
      override_date:  selectedDate,
      slot_label:     s.slot_label,
      start_hour:     s.start_hour,
      end_hour:       s.end_hour,
      duration_hours: s.duration_hours,
      price_per_room: Number(s.price_per_room),
      max_rooms:      s.max_rooms,
      is_active:      s.is_active,
      sort_order:     s.sort_order ?? s.start_hour,
      room_type:      s.room_type || '1BNS',
      bed_type:       s.bed_type || '',
      smoking_type:   s.smoking_type || '',
    }));
    await supabase.from('vd_date_windows').insert(rows);
    setCopyingDefaults(false);
    loadData();
  };

  const handleCopyToNext15Days = async () => {
    if (!selectedPropertyId || slots.length === 0) return;
    setBulkCopying(true);

    // Generate next 15 days starting from tomorrow
    const futureDates: string[] = [];
    for (let i = 1; i <= 15; i++) {
      futureDates.push(format(addDays(new Date(), i), 'yyyy-MM-dd'));
    }

    // Skip dates that already have custom windows
    const datesToCopy = futureDates.filter(d => !datesCustomized.has(d));
    setBulkProgress({ done: 0, total: datesToCopy.length });

    for (let i = 0; i < datesToCopy.length; i++) {
      const date = datesToCopy[i];
      const rows = slots.map(s => ({
        property_id:    selectedPropertyId,
        override_date:  date,
        slot_label:     s.slot_label,
        start_hour:     s.start_hour,
        end_hour:       s.end_hour,
        duration_hours: s.duration_hours,
        price_per_room: Number(s.price_per_room),
        max_rooms:      s.max_rooms,
        is_active:      s.is_active,
        sort_order:     s.sort_order ?? s.start_hour,
        room_type:      s.room_type || '1BNS',
        bed_type:       s.bed_type || '',
        smoking_type:   s.smoking_type || '',
      }));
      await supabase.from('vd_date_windows').insert(rows);
      setBulkProgress({ done: i + 1, total: datesToCopy.length });
    }

    setBulkCopying(false);
    setBulkProgress(null);
    loadData();
  };

  // ── Loading / no property ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64 animate-pulse" />
        <div className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!selectedPropertyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 bg-ms-orange-light rounded-full mx-auto flex items-center justify-center">
            <Clock className="w-8 h-8 text-ms-orange" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No Property Selected</h2>
          <p className="text-gray-500">Select a property to manage its time windows.</p>
        </div>
      </div>
    );
  }

  const activeDefaults   = slots.filter(s => s.is_active);
  console.log("All Slots:", slots);
console.log("Active Slots:", activeDefaults);
console.log("Count:", activeDefaults.length);
  const inactiveDefaults = slots.filter(s => !s.is_active);
  const selectedDateLabel = selectedDate
    ? format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d')
    : null;

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Time Windows</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {selectedDate
              ? `${selectedDateLabel} — up to 6 independent windows for this date.`
              : 'Default windows — apply every day unless a date has its own custom setup.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!selectedDate ? (
            <>
              <div className="flex items-center justify-center text-center  gap-2 text-sm font-semibold bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                
                <span className="text-gray-500"><span className="text-ms-orange">{activeDefaults.length} </span>/ 6 Active</span>
              </div>
              <Button
                onClick={handleCopyToNext15Days}
                disabled={bulkCopying || slots.length === 0}
                variant="outline"
                className="font-bold border-ms-orange-border text-ms-orange hover:bg-ms-orange-light dark:bg-black active:scale-95 gap-2"
              >
                <Copy className="w-4 h-4" />
                {bulkCopying && bulkProgress
                  ? `Copying… ${bulkProgress.done}/${bulkProgress.total}`
                  : 'Copy to next 15 days'}
              </Button>
              <Button
                onClick={() => setShowAddDefault(true)}
                disabled={slots.length >= 6}
                className="bg-ms-orange hover:bg-ms-orange-hover text-white font-bold shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Window
              </Button>
            </>
          ) : isDateCustomized ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-ms-orange">{selectedDateWindows.filter(w => w.is_active).length}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-500">6 Active</span>
              </div>
              <Button
                onClick={() => setShowAddDate(true)}
                disabled={selectedDateWindows.length >= 6}
                className="bg-ms-orange hover:bg-ms-orange-hover text-white font-bold shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Window
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* ── 2-Week Calendar Strip ───────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-ms-orange" />
            <span className="text-sm font-bold text-gray-800 dark:text-ms-orange">
              {calPage === 0 ? 'This Week' : 'Next Week'}
            </span>
            <span className="text-xs text-gray-400 font-medium">— pick a date to set up to 6 custom windows</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyToNext15Days}
              disabled={bulkCopying || slots.length === 0}
              className="flex items-center gap-1.5 text-xs dark:bg-black active:scale-95 dark:hover:text-ms-orange-light font-bold px-3 py-1.5 rounded-lg border border-ms-orange-border bg-ms-orange-light text-ms-orange hover:bg-ms-orange-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors before"
            >
              <Copy className="w-3.5 h-3.5" />
              {bulkCopying && bulkProgress
                ? `Copying… ${bulkProgress.done}/${bulkProgress.total}`
                : 'Copy to next 15 days'}
            </button>
            <button onClick={() => setCalPage(0)} disabled={calPage === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 dark:bg-zinc-300 dark:hover:bg-zinc-800 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-black" />
            </button>
            <span className="text-xs font-bold text-gray-500 px-2">Week {calPage + 1} / 2</span>
            <button onClick={() => setCalPage(1)} disabled={calPage === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 dark:bg-zinc-300 dark:hover:bg-zinc-800 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-black" />
            </button>
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)}
                className="ml-1 flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-ms-orange transition-colors px-2 py-1 rounded-lg hover:bg-ms-orange-light dark:Bg-black dark:text-white/40 dark:border-transparent dark:hover:bg-zinc-600 dark:hover:text-white">
                <X className="w-3 h-3" /> Back to defaults
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {week.map((day) => {
            const dateStr     = format(day, 'yyyy-MM-dd');
            const isCustom    = datesCustomized.has(dateStr);
            const isSelected  = selectedDate === dateStr;
            const isTodayDate = isToday(day);

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative flex flex-col items-center pt-2.5 pb-2 px-1 rounded-xl text-center transition-all border-2 ${
                  isSelected
                    ? 'bg-ms-orange border-ms-orange shadow-md scale-105'
                    : isTodayDate
                    ? 'bg-ms-orange-light border-ms-orange-border hover:border-ms-orange-border dark:bg-zinc-700 dark:border-transparent'
                    : 'bg-gray-50 border-transparent hover:bg-ms-orange-light hover:border-ms-orange-border dark:bg-black/50 dark:hover:border-ms-orange-hover'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isSelected ? 'text-white/80' : isTodayDate ? 'text-ms-orange' : 'text-gray-400'
                }`}>{format(day, 'EEE')}</span>
                <span className={`text-xl font-black leading-tight mt-0.5 ${
                  isSelected ? 'text-white' : isTodayDate ? 'text-ms-orange' : 'text-gray-900'
                }`}>{format(day, 'd')}</span>
                <span className={`text-[9px] font-semibold mt-0.5 ${
                  isSelected ? 'text-white/70' : 'text-gray-400'
                }`}>{format(day, 'MMM')}</span>
                {isTodayDate && !isSelected && (
                  <span className="text-[8px] font-black text-ms-orange uppercase tracking-widest mt-0.5">Today</span>
                )}
                {isCustom && (
                  <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 ${
                    isSelected ? 'bg-white border-ms-orange-border' : 'bg-ms-orange border-white dark:border-transparent'
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-ms-orange inline-block" />
            Custom windows set for this date
          </span>
          <span className="text-[11px] text-gray-300 font-medium ml-auto">
            No dot = uses default windows all day
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DATE MODE                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {selectedDate && (
        <>
          {!isDateCustomized ? (
            /* ── Empty state ── */
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <div className="w-16 h-16 bg-ms-orange-light rounded-full mx-auto flex items-center justify-center mb-4 dark:bg-ms-orange">
                <CalendarDays className="w-7 h-7 text-ms-orange dark:text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Using Default Windows</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                {selectedDateLabel} currently uses your default schedule. You can set up to 6 fully custom windows just for this date.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {slots.length > 0 && (
                  <Button
                    onClick={handleCopyDefaults}
                    disabled={copyingDefaults}
                    variant="outline"
                    className="font-bold border-ms-orange-border text-ms-orange hover:bg-ms-orange-light gap-2 dark:bg-ms-orange dark:text-white  dark:hover:bg-ms-orange-hover dark:hover:text-white dark:hover:border-transparent"
                  >
                    <Copy className="w-4 h-4" />
                    {copyingDefaults ? 'Copying...' : `Copy defaults (${slots.length} windows)`}
                  </Button>
                )}
                <Button
                  onClick={() => setShowAddDate(true)}
                  className="bg-ms-orange hover:bg-ms-orange-hover text-white font-bold shadow-md gap-2"
                >
                  <Plus className="w-4 h-4" /> Start from scratch
                </Button>
              </div>
            </div>
          ) : (
            /* ── Date has custom windows ── */
            <>
              <div className="flex items-center justify-between bg-ms-orange-light border border-ms-orange-border rounded-xl px-4 py-3 dark:bg-slate-950 dark:border-transparent">
                <div>
                  <p className="text-sm font-bold text-ms-orange">{selectedDateLabel}</p>
                  <p className="text-xs text-ms-orange">
                    {selectedDateWindows.length} custom window{selectedDateWindows.length !== 1 ? 's' : ''} — these replace defaults entirely for this date
                  </p>
                </div>
                <Button onClick={handleResetDate} variant="outline" size="sm"
                  className="text-ms-orange border-ms-orange-border hover:bg-ms-orange-light font-semibold text-xs gap-1.5 dark:bg-slate-900 dark:border-transparent">
                  <RotateCcw className="w-3 h-3" /> Reset to defaults
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {selectedDateWindows.map(win => (
                  <DateWindowCard
                    key={win.id}
                    window={win}
                    todayBookings={todayBookings.filter(b => b.booking_date === selectedDate)}
                    allDefaultSlots={slots}
                    onToggle={handleDateToggle}
                    onUpdate={handleDateUpdateField}
                    onDelete={() => setDeleteDateId(win.id)}
                  />
                ))}

                {/* Add slot placeholder */}
                {selectedDateWindows.length < 6 && (
                  <button
                    onClick={() => setShowAddDate(true)}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-ms-orange-border hover:bg-ms-orange-light/40 transition-all group min-h-[180px] "
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-ms-orange-light flex items-center justify-center transition-colors">
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-ms-orange transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-500 group-hover:text-ms-orange transition-colors">Add Window</p>
                      <p className="text-xs text-gray-400">{6 - selectedDateWindows.length} slot{6 - selectedDateWindows.length !== 1 ? 's' : ''} remaining</p>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DEFAULT MODE                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!selectedDate && (
        slots.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-ms-orange-light rounded-full mx-auto flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-ms-orange" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Default Windows Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Create your default schedule here. Then use the calendar to set custom windows for specific dates.
            </p>
            <Button onClick={() => setShowAddDefault(true)} className="bg-ms-orange hover:bg-ms-orange-hover font-bold px-8 py-6 text-lg shadow-lg">
              <Plus className="w-5 h-5 mr-3" /> Create First Window
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {activeDefaults.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Active Windows ({activeDefaults.length})</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {activeDefaults.map(slot => (
                    <DefaultSlotCard key={slot.id} slot={slot} todayBookings={todayBookings}
                      onToggle={handleDefaultToggle} onUpdate={handleDefaultUpdateField}
                      onDelete={() => setDeleteDefaultId(slot.id)} />
                  ))}
                </div>
              </div>
            )}
            {inactiveDefaults.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Inactive Windows ({inactiveDefaults.length})</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 opacity-60">
                  {inactiveDefaults.map(slot => (
                    <DefaultSlotCard key={slot.id} slot={slot} todayBookings={todayBookings}
                      onToggle={handleDefaultToggle} onUpdate={handleDefaultUpdateField}
                      onDelete={() => setDeleteDefaultId(slot.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Room type legend ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {ROOM_TYPES.map(rt => (
          <div key={rt.code} className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${rt.color}`}>
            <span>{rt.icon}</span><span>{rt.code}</span>
            <span className="font-normal opacity-70">— {rt.label.split('·')[1].trim()}</span>
          </div>
        ))}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showAddDefault && (
        <SlotFormModal
          title="New Default Window"
          description="Applies every day unless a date has its own custom windows."
          existingCount={slots.length}
          totalRooms={totalRooms}
          allocatedRooms={getAllocatedRooms(slots)}
          onClose={() => setShowAddDefault(false)}
          onSave={async (data) => {
            await supabase.from('vd_time_slots').insert({ property_id: selectedPropertyId, ...data, rooms_available: data.max_rooms, sort_order: data.start_hour });
            setShowAddDefault(false); loadData();
          }}
        />
      )}

      {showAddDate && selectedDate && (
        <SlotFormModal
          title={`New Window — ${selectedDateLabel}`}
          description="Applies only on this date. Won't affect your default schedule."
          existingCount={selectedDateWindows.length}
          totalRooms={totalRooms}
          allocatedRooms={getAllocatedRooms(selectedDateWindows)}
          onClose={() => setShowAddDate(false)}
          onSave={async (data) => {
            await supabase.from('vd_date_windows').insert({
              property_id: selectedPropertyId, override_date: selectedDate, ...data, sort_order: data.start_hour,
            });
            setShowAddDate(false); loadData();
          }}
        />
      )}

      {deleteDefaultId && (
        <Dialog open onOpenChange={() => setDeleteDefaultId(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-rose-600 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Delete Default Window</DialogTitle>
              <DialogDescription>Removes from the default schedule. Existing bookings are unaffected.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setDeleteDefaultId(null)}>Cancel</Button>
              <Button onClick={() => handleDefaultDelete(deleteDefaultId)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deleteDateId && (
        <Dialog open onOpenChange={() => setDeleteDateId(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-rose-600 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Delete Window</DialogTitle>
              <DialogDescription>Removes this window from {selectedDateLabel}. Other dates unaffected.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setDeleteDateId(null)}>Cancel</Button>
              <Button onClick={() => handleDateDelete(deleteDateId)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Default Slot Card ──────────────────────────────────────────────────────────
function DefaultSlotCard({ slot, todayBookings, onToggle, onUpdate, onDelete }: {
  slot: VdTimeSlot;
  todayBookings: VdBooking[];
  onToggle: (id: string, active: boolean) => void;
  onUpdate: (id: string, payload: Partial<VdTimeSlot>) => void;
  onDelete: () => void;
}) {
  const roomType     = getRoomType(slot.room_type || slot.bed_type || '1BNS');
  const slotBookings = todayBookings.filter(b => b.slot_id === slot.id && b.status !== 'owner_cancel' && b.status !== 'no_show');
  const bookedRooms  = slotBookings.reduce((sum, b) => sum + b.rooms_booked, 0);
  const remaining    = Math.max(0, slot.max_rooms - bookedRooms);
  const isFull       = remaining === 0;
  const occupancyPct = slot.max_rooms > 0 ? Math.round((bookedRooms / slot.max_rooms) * 100) : 0;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${
      slot.is_active ? 'border-gray-200 hover:border-ms-orange-border dark:border-transparent' : 'border-gray-100 dark:border-tr'
    }`}>
      <div className="p-4 border-b border-gray-100 dark:border-transparent flex items-center justify-between bg-gray-50/40">
        <div className="flex items-center gap-3">
          <div className={`px-2.5 py-1 rounded-lg text-xs font-black border ${roomType.color}`}>{roomType.code}</div>
          <div>
            <p className="font-bold text-gray-900 font-mono text-sm">{formatHour(slot.start_hour)} — {formatHour(slot.end_hour)}</p>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{slot.duration_hours}h · {roomType.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={slot.is_active} onCheckedChange={v => onToggle(slot.id, v)} />
          <button onClick={onDelete} className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Capacity</p>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-black text-gray-900">{slot.max_rooms}</span>
            <EditField value={slot.max_rooms} onSave={v => onUpdate(slot.id, { max_rooms: parseInt(v) })} type="number" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rate</p>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-black text-ms-teal">${Number(slot.price_per_room).toFixed(0)}</span>
            <EditField value={slot.price_per_room} onSave={v => onUpdate(slot.id, { price_per_room: parseFloat(v) })} type="number" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Available</p>
          <span className={`text-2xl font-black ${isFull ? 'text-rose-600' : remaining <= 2 ? 'text-amber-600' : 'text-blue-600'}`}>{remaining}</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${occupancyPct >= 90 ? 'bg-rose-500' : occupancyPct >= 60 ? 'bg-amber-500' : 'bg-ms-teal'}`}
            style={{ width: `${occupancyPct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{occupancyPct}% occupied today ({bookedRooms}/{slot.max_rooms} rooms)</p>
      </div>
    </div>
  );
}

// ── Date Window Card ───────────────────────────────────────────────────────────
function DateWindowCard({ window: win, todayBookings, allDefaultSlots, onToggle, onUpdate, onDelete }: {
  window: DateWindow;
  todayBookings: VdBooking[];
  allDefaultSlots: VdTimeSlot[];
  onToggle: (id: string, active: boolean) => void;
  onUpdate: (id: string, payload: Partial<DateWindow>) => void;
  onDelete: () => void;
}) {
  const roomType = getRoomType(win.room_type || '1BNS');
  // Match bookings by this window's ID OR any default slot with the same hours
  // (handles bookings made before custom windows were created for this date)
  const matchingSlotIds = new Set<string>([
    win.id,
    ...allDefaultSlots
      .filter(s => s.start_hour === win.start_hour && s.end_hour === win.end_hour)
      .map(s => s.id),
  ]);
  const slotBookings = todayBookings.filter(b => b.slot_id != null && matchingSlotIds.has(b.slot_id) && b.status !== 'owner_cancel' && b.status !== 'no_show');
  const bookedRooms  = slotBookings.reduce((sum, b) => sum + b.rooms_booked, 0);
  const remaining    = Math.max(0, win.max_rooms - bookedRooms);
  const isFull       = remaining === 0;
  const occupancyPct = win.max_rooms > 0 ? Math.round((bookedRooms / win.max_rooms) * 100) : 0;

  return (
    <div className={`bg-white border-2 rounded-2xl overflow-hidden shadow-sm transition-all ${
      win.is_active ? 'border-ms-orange-border hover:border-ms-orange-border' : 'border-gray-100'
    }`}>
      <div className="h-1 bg-gradient-to-r from-ms-orange to-ms-orange" />
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/40">
        <div className="flex items-center gap-3">
          <div className={`px-2.5 py-1 rounded-lg text-xs font-black border ${roomType.color}`}>{roomType.code}</div>
          <div>
            <div className="flex items-center gap-1.5">
              <HourSelect value={win.start_hour} onChange={v => onUpdate(win.id, {
                start_hour: v, duration_hours: calculateSlotDuration(v, win.end_hour),
                slot_label: `${formatHour(v)} -- ${formatHour(win.end_hour)}`,
              })} />
              <span className="text-gray-400 font-bold text-xs">—</span>
              <HourSelect value={win.end_hour} onChange={v => onUpdate(win.id, {
                end_hour: v, duration_hours: calculateSlotDuration(win.start_hour, v),
                slot_label: `${formatHour(win.start_hour)} -- ${formatHour(v)}`,
              })} />
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{win.duration_hours}h · {roomType.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={win.is_active} onCheckedChange={v => onToggle(win.id, v)} />
          <button onClick={onDelete} className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Capacity</p>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-black text-gray-900">{win.max_rooms}</span>
            <EditField value={win.max_rooms} onSave={v => onUpdate(win.id, { max_rooms: parseInt(v) })} type="number" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rate</p>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-black text-ms-orange">${Number(win.price_per_room).toFixed(0)}</span>
            <EditField value={win.price_per_room} onSave={v => onUpdate(win.id, { price_per_room: parseFloat(v) })} type="number" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Available</p>
          <span className={`text-2xl font-black ${isFull ? 'text-rose-600' : remaining <= 2 ? 'text-amber-600' : 'text-blue-600'}`}>{remaining}</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${occupancyPct >= 90 ? 'bg-rose-500' : occupancyPct >= 60 ? 'bg-amber-500' : 'bg-ms-teal'}`}
            style={{ width: `${occupancyPct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{occupancyPct}% occupied ({bookedRooms}/{win.max_rooms} rooms)</p>
      </div>
    </div>
  );
}

// ── Hour Select ────────────────────────────────────────────────────────────────
function HourSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))}
      className="text-xs font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-ms-orange cursor-pointer hover:border-ms-orange-border transition-colors font-mono">
      {HOUR_OPTIONS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
    </select>
  );
}

// ── Inline Edit Field ──────────────────────────────────────────────────────────
function EditField({ value, onSave, type }: { value: any; onSave: (v: string) => void; type: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(value));

  useEffect(() => { if (!editing) setVal(String(value)); }, [value, editing]);

  const handleSave = () => {
    if (val && val !== String(value)) onSave(val);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input autoFocus value={val} type={type} min="1"
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="w-16 h-8 text-sm px-2 text-center" />
        <button onClick={handleSave} className="p-1 text-ms-teal hover:bg-ms-teal-light rounded"><Save className="w-4 h-4" /></button>
        <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-ms-orange transition-colors p-1">
      <Edit2 className="w-3.5 h-3.5" />
    </button>
  );
}

// ── Shared Slot Form Modal ─────────────────────────────────────────────────────
function SlotFormModal({ title, description, existingCount, totalRooms, allocatedRooms, onClose, onSave }: {
  title: string;
  description: string;
  existingCount: number;
  totalRooms: number;
  allocatedRooms: number;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [startHour, setStartHour] = useState<number>(9);
  const [endHour,   setEndHour]   = useState<number>(12);
  const [price,     setPrice]     = useState('75');
  const [maxRooms,  setMaxRooms]  = useState('5');
  const [roomType,  setRoomType]  = useState('1BNS');
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);

  const duration = calculateSlotDuration(startHour, endHour);

  const validate = () => {
    if (startHour >= endHour)                                return 'Check-in must be before check-out';
    if (duration < 2)                                         return 'Minimum 2 hours required';
    if (isNaN(parseFloat(price)) || parseFloat(price) < 50)  return 'Minimum rate is $50.00';
    if (isNaN(parseInt(maxRooms)) || parseInt(maxRooms) < 1) return 'At least 1 room required';
    if (existingCount >= 6)                                   return 'Maximum 6 windows reached';
    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
      const requestedRooms = parseInt(maxRooms);
      const remainingRooms = totalRooms - allocatedRooms;
      if (requestedRooms > remainingRooms) {
          setError(
      `Not enough rooms available.
      Total Hotel Rooms : ${totalRooms}
      Already Allocated : ${allocatedRooms}
      Remaining Rooms : ${remainingRooms}`
          );
          return;
      }
    setError(''); setSaving(true);
    try {
      await onSave({
        slot_label:     `${formatHour(startHour)} -- ${formatHour(endHour)}`,
        start_hour:     startHour,
        end_hour:       endHour,
        duration_hours: duration,
        price_per_room: parseFloat(price),
        max_rooms:      parseInt(maxRooms),
        room_type:      roomType,
        bed_type:       roomType.startsWith('1BEX') || roomType.startsWith('2BEX') ? 'executive'
                        : roomType.startsWith('2') ? '2 bed' : '1 bed',
        smoking_type:   roomType.includes('NS') || roomType.includes('EX') ? 'non-smoking' : 'smoking',
        rooms_available: parseInt(maxRooms),
        is_active:      true,
      });
    } catch {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">{title}</DialogTitle>
          <DialogDescription className="text-gray-500">{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Check-in</Label>
              <Select value={String(startHour)} onValueChange={v => { setStartHour(Number(v)); setError(''); }}>
                <SelectTrigger className="font-semibold h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Check-out</Label>
              <Select value={String(endHour)} onValueChange={v => { setEndHour(Number(v)); setError(''); }}>
                <SelectTrigger className="font-semibold h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className={`rounded-lg p-2.5 text-center text-sm font-semibold border ${
            duration >= 3 ? 'bg-ms-orange-light border-ms-orange-border text-ms-orange' : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}>
            Duration: <span className="font-black">{duration}h</span>
            {duration < 2 && ' — minimum 2 hours required'}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Room Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_TYPES.map(rt => (
                <button key={rt.code} onClick={() => { setRoomType(rt.code); setError(''); }}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                    roomType === rt.code ? 'border-ms-orange bg-ms-orange-light' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}>
                  <span className="text-base">{rt.icon}</span>
                  <p className={`text-xs font-black mt-0.5 ${roomType === rt.code ? 'text-ms-orange' : 'text-gray-900'}`}>{rt.code}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{rt.label.split('·')[1]?.trim()}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Rate / Room ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 font-bold text-sm">$</span>
                <Input value={price} onChange={e => { setPrice(e.target.value); setError(''); }}
                  type="number" min="50" step="1" className="font-bold text-gray-900 h-10 pl-7" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Total Rooms</Label>
              <Input value={maxRooms} onChange={e => setMaxRooms(e.target.value)}
                type="number" min="1" className="font-bold text-gray-900 h-10" />
            </div>
          </div>

          {error && (
            <Alert className="border-rose-200 bg-rose-50">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <AlertDescription className="text-rose-700 font-semibold ml-2">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <Button onClick={onClose} variant="outline" className="font-bold h-11">Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-ms-orange hover:bg-ms-orange-hover text-white font-bold h-11 shadow-md">
              {saving ? 'Saving...' : 'Save Window'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
