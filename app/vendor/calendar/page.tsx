'use client';

import { useState, useEffect, useCallback } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import type { VdTimeSlot } from '@/lib/vendor-types';
import { formatHour } from '@/lib/vendor-types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Ban, Unlock, Edit2, DollarSign, ArrowRight } from 'lucide-react';

// Generates an array of the next 90 days (3 months)
const generateNext90Days = () => {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

export default function VendorCalendarPage() {
  const { vendor, selectedPropertyId } = useVendor();
  const [activeTab, setActiveTab] = useState<'rates' | 'blocks'>('rates');
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<VdTimeSlot[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  
  const datesList = generateNext90Days();

  const loadData = useCallback(async () => {
    if (!selectedPropertyId) {
      setLoading(false);
      return;
    }
    const [slotsRes, blocksRes, overridesRes] = await Promise.all([
      supabase.from('vd_time_slots').select('*').eq('property_id', selectedPropertyId).order('sort_order', { ascending: true }),
      supabase.from('blocked_dates').select('*').eq('property_id', selectedPropertyId).gte('blocked_date', datesList[0]),
      supabase.from('rate_overrides').select('*').eq('property_id', selectedPropertyId).gte('override_date', datesList[0])
    ]);
    
    setSlots((slotsRes.data || []) as VdTimeSlot[]);
    setBlockedDates(blocksRes.data || []);
    setOverrides(overridesRes.data || []);
    setLoading(false);
  }, [selectedPropertyId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-slate-800 h-96 rounded-xl m-8" />;
  }

  if (!selectedPropertyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-ms-orange-light rounded-2xl border border-ms-orange-border">
          <CalendarIcon className="w-12 h-12 text-ms-orange mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">No Property Selected</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Calendar Management</h1>
          <p className="text-gray-500 font-medium mt-1">Manage rate overrides and block out dates up to 3 months in advance.</p>
        </div>
      </div>
    
      <div className="flex items-center p-1 bg-gray-100 rounded-lg w-max border border-gray-200 dark:border-transparent dark:bg-transparent shadow-inner">
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-6 py-2.5 rounded-md font-bold text-sm transition-all ${activeTab === 'rates' ? 'bg-white text-ms-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <DollarSign className="w-4 h-4 inline-block mr-2" /> Rate Overrides
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          className={`px-6 py-2.5 rounded-md font-bold text-sm transition-all ${activeTab === 'blocks' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Ban className="w-4 h-4 inline-block mr-2" /> Block Dates
        </button>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden p-6 text-center text-gray-500 font-medium">
        {activeTab === 'rates' ? (
          <RateOverridesTab slots={slots} overrides={overrides} propertyId={selectedPropertyId} onUpdate={loadData} />
        ) : (
          <BlockedDatesTab blockedDates={blockedDates} vendorId={vendor?.id || ''} propertyId={selectedPropertyId} onUpdate={loadData} />
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------- //
// BLOCK DATES TAB
// -------------------------------------------------------------------------------- //
function BlockedDatesTab({ blockedDates, vendorId, propertyId, onUpdate }: any) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const dates = generateNext90Days();

  const toggleDate = (d: string) => {
    if (selectedDates.includes(d)) setSelectedDates(selectedDates.filter(x => x !== d));
    else setSelectedDates([...selectedDates, d]);
  };

  const isBlocked = (d: string) => blockedDates.some((b: any) => b.blocked_date === d);

  const handleBlock = async () => {
    if (selectedDates.length === 0) return;
    setLoading(true);
    const inserts = selectedDates.map(d => ({ property_id: propertyId, vendor_id: vendorId, blocked_date: d, reason: 'Manual Block' }));
    await supabase.from('blocked_dates').upsert(inserts, { onConflict: 'property_id, blocked_date' });
    setSelectedDates([]);
    onUpdate();
    setLoading(false);
  };

  const handleUnblock = async () => {
    if (selectedDates.length === 0) return;
    setLoading(true);
    await supabase.from('blocked_dates').delete().eq('property_id', propertyId).in('blocked_date', selectedDates);
    setSelectedDates([]);
    onUpdate();
    setLoading(false);
  };

  return (
    <div className="text-left space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Select Dates to Block/Unblock</h2>
        <div className="flex gap-3">
          <Button disabled={selectedDates.length === 0 || loading} onClick={handleUnblock} variant="outline" className="border-gray-200 text-gray-600 font-bold hover:bg-ms-teal-light hover:text-ms-teal hover:border-ms-teal-border  dark:hover:bg-ms-teal  dark:border-transparent dark:hover:text-white">
            <Unlock className="w-4 h-4 mr-2" /> Unblock Selected
          </Button>
          <Button disabled={selectedDates.length === 0 || loading} onClick={handleBlock} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
            <Ban className="w-4 h-4 mr-2" /> Block Selected
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {dates.map((d) => {
          const blocked = isBlocked(d);
          const selected = selectedDates.includes(d);
          const dateObj = new Date(d);
          dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
          return (
            <button
              key={d}
              onClick={() => toggleDate(d)}
              className={`p-3 rounded-xl border text-center transition-all ${
                blocked
                  ? selected ? 'bg-rose-600 border-rose-700 text-white shadow-inner' : 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                  : selected ? 'bg-ms-orange border-ms-orange text-white shadow-inner' : 'bg-white border-gray-200 hover:border-ms-orange-border text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider font-bold mb-1 opacity-80">
                {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-lg font-black tracking-tight">
                {dateObj.getDate()}
              </div>
              <div className="text-xs font-medium opacity-80 mt-1">
                {dateObj.toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------- //
// RATE OVERRIDES TAB
// -------------------------------------------------------------------------------- //
function RateOverridesTab({ slots, overrides, propertyId, onUpdate }: any) {
  const [selectedDate, setSelectedDate] = useState<string>(generateNext90Days()[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<VdTimeSlot | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const dates = generateNext90Days();

  const handleSaveOverride = async () => {
    if (!activeSlot || !newPrice) return;
    setLoading(true);
    const p = parseFloat(newPrice);
    if (p < 50) { alert('Minimum rate is $50'); setLoading(false); return; }

    await supabase.from('rate_overrides').upsert({
      property_id: propertyId,
      time_slot_id: activeSlot.id,
      override_date: selectedDate,
      price_per_room: p
    }, { onConflict: 'property_id, time_slot_id, override_date' });
    
    setModalOpen(false);
    onUpdate();
    setLoading(false);
  };

  const handleRemoveOverride = async (slotId: string) => {
    setLoading(true);
    await supabase.from('rate_overrides').delete()
      .eq('property_id', propertyId)
      .eq('time_slot_id', slotId)
      .eq('override_date', selectedDate);
    onUpdate();
    setLoading(false);
  };

  return (
    <div className="text-left space-y-6">
      <div className="flex items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl w-96 border border-gray-200 dark:bg-transparent" >
        <label className="text-sm font-bold text-gray-700 tracking-wide uppercase dark:text-ms-orange-light">Select Date:</label>
        <Select value={selectedDate} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-60 bg-white border-gray-300 font-bold text-gray-900 h-11 dark:border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {dates.map((d) => {
              const dateObj = new Date(d);
              dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
              return (
                <SelectItem key={d} value={d} className="font-medium">
                  {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slots.map((slot: VdTimeSlot) => {
          const override = overrides.find((o: any) => o.time_slot_id === slot.id && o.override_date === selectedDate);
          const activePrice = override ? override.price_per_room : slot.price_per_room;
          const isOverridden = !!override;

          return (
            <div key={slot.id} className={`flex items-center justify-between p-5 border rounded-xl transition-all shadow-sm bg-white ${isOverridden ? 'border-ms-orange-border ring-1 ring-ms-orange-light dark:ring-transparent' : 'border-gray-200'}`}>
              <div>
                <h4 className="text-xl font-black text-gray-900 font-mono tracking-tight">
                  {formatHour(slot.start_hour)} - {formatHour(slot.end_hour)}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-lg font-black ${isOverridden ? 'text-ms-orange' : 'text-ms-teal'}`}>${Number(activePrice).toFixed(0)}</span>
                  {isOverridden && <span className="text-[10px] font-bold uppercase tracking-wider bg-ms-orange-light text-ms-orange px-2 py-0.5 rounded border border-ms-orange-border dark:bg-transparent dark:border-transparent animate-pulse">Overridden</span>}
                  {!isOverridden && <span className="text-xs text-gray-400 font-medium line-through decoration-gray-300 ml-1">Base Rate</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOverridden ? (
                  <Button disabled={loading} size="sm" onClick={() => handleRemoveOverride(slot.id)} variant="outline" className="border-gray-200 text-gray-500 hover:text-rose-600 hover:bg-rose-50 font-bold dark:hover:bg-zinc-950">
                    Remove
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => { setActiveSlot(slot); setNewPrice(String(slot.price_per_room)); setModalOpen(true); }} className="bg-ms-orange-light hover:bg-ms-orange-light text-ms-orange border-none font-bold dark:bg-zinc-900 dark:hover:bg-zinc-700 active:scale-95">
                    Override
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Override Slot Rate</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">Set a custom price for this time window on {new Date(selectedDate).toLocaleDateString()}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 dark:border-transparent rounded-lg border border-gray-100">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Base Rate</span>
              <span className="text-lg font-black text-gray-900">${Number(activeSlot?.price_per_room || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="text-ms-orange w-6 h-6" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">New Custom Rate ($)</label>
              <Input
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                type="number"
                min="50"
                step="1"
                className="h-12 text-lg font-black bg-white border-2 border-ms-orange-border focus:border-ms-orange-border text-gray-900 dark:focus:border-black dark:border-transparent"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-gray-200 text-gray-600 font-bold">Cancel</Button>
            <Button onClick={handleSaveOverride} disabled={loading} className="bg-ms-orange hover:bg-ms-orange-hover text-white font-bold px-6">
              {loading ? 'Saving...' : 'Save Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
