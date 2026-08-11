'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { VdBooking, VdTimeSlot } from '@/lib/vendor-types';
import { formatHour, calculateFees } from '@/lib/vendor-types';
import {
  TriangleAlert, CalendarCheck, CheckCircle2, UserX, Ban,
  DollarSign, DoorOpen, Clock, Hourglass, Building2
} from 'lucide-react';

// ── Pending approval screen ────────────────────────────────────────────────────
function PendingApprovalScreen({ businessName }: { businessName: string }) {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center space-y-5 max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
        <div className="w-20 h-20 bg-ms-orange-light dark:bg-ms-orange rounded-full mx-auto flex items-center justify-center shadow-inner">
          <Hourglass className="w-9 h-9 text-ms-orange dark:text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Application Under Review</h2>
          <p className="text-gray-500 font-medium mt-2 text-sm leading-relaxed">
            Thank you, <strong>{businessName}</strong>! Your application has been submitted and is currently being reviewed by the MicroStay team. You'll receive an email once your account is approved.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Submitted', done: true },
            { label: 'Under Review', done: true },
            { label: 'Approved', done: false },
          ].map(({ label, done }) => (
            <div key={label} className={`rounded-xl p-3 border ${done ? 'bg-ms-orange-light border-ms-orange-border dark:bg-ms-orange dark:border-transparent' : 'bg-gray-50 border-gray-200 dark:bg-zinc-800 dark:border-transparent animate-pulse'}`}>
              <div className={`w-5 h-5 rounded-full mx-auto mb-1.5 flex items-center justify-center ${done ? 'bg-ms-orange' : 'bg-gray-300 dark:bg-transparent'}`}>
                {done && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <p className={`text-[11px] font-semibold ${done ? 'text-ms-orange dark:text-white' : 'text-gray-400'}`}>{label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          Questions? Email <a href="mailto:support@microstay.us" className="text-ms-orange font-semibold">support@microstay.us</a>
        </p>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function VendorOperationsCenter() {
  const { vendor, selectedPropertyId, role, vendorLoading } = useVendor();
  const { user } = useAuth();
  const [slots, setSlots] = useState<VdTimeSlot[]>([]);
  const [bookings, setBookings] = useState<VdBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    if (!vendor || !selectedPropertyId) {
      setLoading(false);
      return;
    }
    const [slotsRes, bookingsRes] = await Promise.all([
      supabase.from('vd_time_slots').select('*').eq('property_id', selectedPropertyId).eq('is_active', true),
      supabase.from('vd_bookings').select('*, slot:vd_time_slots(*)').eq('vendor_id', vendor.id).eq('property_id', selectedPropertyId).eq('booking_date', today),
    ]);
    setSlots((slotsRes.data || []) as VdTimeSlot[]);
    setBookings((bookingsRes.data || []) as VdBooking[]);
    setLoading(false);
  }, [vendor, selectedPropertyId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!vendor) return;
    const ch = supabase.channel('vd-ops-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vd_bookings', filter: `vendor_id=eq.${vendor.id}` }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vendor, loadData]);

  // Loading skeleton
  if (vendorLoading || loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white dark:bg-slate-900 rounded-xl w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl shadow-sm" />)}
        </div>
        <div className="h-80 bg-white rounded-xl shadow-sm" />
      </div>
    );
  }

  // Pending or no property → show approval screen
  if (!vendor || vendor.status === 'pending') {
    return <PendingApprovalScreen businessName={vendor?.business_name || 'Your Property'} />;
  }

  // Suspended
  if (vendor.status === 'suspended') {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center max-w-sm bg-white dark:bg-black dark:border-transparent rounded-2xl shadow-sm border border-red-100 p-10 space-y-4">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-700/40 rounded-full mx-auto flex items-center justify-center">
            <Ban className="w-7 h-7 text-red-500 dark:text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-ms-orange-white">Account Suspended</h2>
          <p className="text-gray-500 text-sm dark:text-white/50">Your vendor account has been suspended. Please contact <a href="mailto:support@microstay.us" className="text-ms-orange font-semibold">support@microstay.us</a> for assistance.</p>
        </div>
      </div>
    );
  }

  // ── Live metrics ─────────────────────────────────────────────────────────────
  const checkedIn   = bookings.filter(b => b.status === 'checked_in');
  const noShows     = bookings.filter(b => b.status === 'no_show');
  const pending     = bookings.filter(b => b.status === 'pending');
  const totalRooms  = slots.reduce((s, slot) => s + slot.max_rooms, 0);
  const activeBookings = bookings.filter(b => b.status === 'pending' || b.status === 'checked_in');
  const roomsBooked = activeBookings.reduce((s, b) => s + b.rooms_booked, 0);
  const roomsAvail  = Math.max(0, totalRooms - roomsBooked);
  const occupancy   = totalRooms > 0 ? Math.round((roomsBooked / totalRooms) * 100) : 0;
  const earnings    = checkedIn.reduce((s, b) => s + calculateFees(Number(b.gross_amount)).vendorNet, 0);

  const handleAction = async (bookingId: string, action: 'checked_in' | 'no_show' | 'owner_cancel') => {
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;
    if (action === 'checked_in') {
      const { pctFee, totalFee, vendorNet } = calculateFees(Number(b.gross_amount));
      await supabase.from('vd_bookings').update({ status: action, checked_in_at: new Date().toISOString(), platform_pct_fee: pctFee, platform_total_fee: totalFee, vendor_net: vendorNet, action_taken_by: user?.id }).eq('id', bookingId);
    } else if (action === 'no_show') {
      await supabase.from('vd_bookings').update({ status: action, no_show_at: new Date().toISOString(), action_taken_by: user?.id }).eq('id', bookingId);
    } else {
      await supabase.from('vd_bookings').update({ status: action, owner_cancelled_at: new Date().toISOString(), penalty_fee: 5.0, cancel_reason: 'Cancelled via Quick Action', action_taken_by: user?.id }).eq('id', bookingId);
    }
    loadData();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Flagged account banner */}
      {vendor.is_flagged && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-amber-700/40 dark:border-transparent border border-red-200 rounded-xl px-5 py-4">
          <TriangleAlert className="w-5 h-5 text-red-600 dark:text-white flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-white">Account Flagged</p>
            <p className="text-xs text-red-600 mt-0.5 dark:text-white">{vendor.flag_reason}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900  tracking-tight">Operations Center</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm ">
          <Building2 className="w-4 h-4 text-ms-orange" />
          <span className="text-sm font-semibold text-gray-700 dark:text-white">{vendor.business_name}</span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={<CalendarCheck className="w-5 h-5 text-blue-600" />}   label="Total Today"      value={bookings.length} accent="blue"    />
        <MetricCard icon={<Clock        className="w-5 h-5 text-amber-600" />}    label="Pending"          value={pending.length}  accent="amber"   />
        <MetricCard icon={<CheckCircle2 className="w-5 h-5 text-ms-teal" />}  label="Checked In"       value={checkedIn.length} accent="emerald" />
        <MetricCard icon={<UserX        className="w-5 h-5 text-slate-500" />}    label="No-Shows"         value={noShows.length}  accent="slate"   />
        <MetricCard icon={<DoorOpen     className="w-5 h-5 text-purple-600" />}   label={`Occupancy ${occupancy}%`} value={`${roomsBooked}/${totalRooms}`} accent="purple" />
        {role === 'super_vendor'
          ? <MetricCard icon={<DollarSign className="w-5 h-5 text-ms-teal" />} label="Est. Net Earnings" value={`$${earnings.toFixed(0)}`} accent="emerald" highlight />
          : <MetricCard icon={<Ban        className="w-5 h-5 text-gray-400" />}   label="Est. Earnings"    value="Hidden" accent="gray" />
        }
      </div>

      {/* Live Booking Roster */}
      <div className="bg-white border  border-gray-100 dark:border-transparent shadow-sm rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b dark:bg-transparent/40 border-gray-100 dark:border-zinc-600 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Live Booking Roster</h2>
          <span className="bg-ms-orange-light text-ms-orange text-xs font-bold px-3 py-1 rounded-full border border-ms-orange-border dark:border-transparent dark:bg-transparent">
            {pending.length} Pending
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/60 border-b dark:bg-transparent/50 dark:border-transparent border-gray-100">
                {['Ref', 'Guest', 'Time Window', 'Rooms', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-600">
              {bookings.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-14 text-center text-gray-400 font-medium text-sm">No bookings today. Time to relax! ☕</td></tr>
              ) : (
                bookings.map(b => {
                  const slot = b.slot;
                  const isPending = b.status === 'pending';
                  return (
                    <tr key={b.id} className={`transition-colors hover:bg-ms-orange-light/20 ${!isPending ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-sm font-semibold text-gray-700 dark:text-ms-orange">{b.booking_ref}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-gray-900">{b.guest_name}</p>
                        {b.guest_phone && <p className="text-xs text-gray-400">{b.guest_phone}</p>}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-white/80">
                        {slot ? `${formatHour(Number(slot.start_hour))} – ${formatHour(Number(slot.end_hour))}` : '—'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-lg border border-gray-200 dark:border-transparent dark:bg-ms-orange-hover">
                          {b.rooms_booked} {slot?.room_type ? `· ${slot.room_type}` : ''}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${Number(b.gross_amount).toFixed(2)}</td>
                      <td className="px-5 py-4 whitespace-nowrap"><StatusBadge status={b.status} /></td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleAction(b.id, 'checked_in')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-ms-teal-light text-ms-teal border border-ms-teal-border hover:bg-ms-teal-light transition-colors dark:bg-teal-700 dark:text-white dark:border-transparent dark:hover:bg-teal-700/40">Check In</button>
                            <button onClick={() => handleAction(b.id, 'no_show')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors dark:bg-gray-700/40 dark:border-transparent dark:hover:bg-transparent/40">No-Show</button>

                            <button onClick={() => handleAction(b.id, 'owner_cancel')} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors dark:bg-rose-800 dark:text-zinc-300 dark:hover:bg-red-700/40 dark:hover:text-white">Cancel</button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actioned</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Time Windows summary */}
      {slots.length > 0 && (
        <div className="bg-white border border-gray-100  dark:border-transparent shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-700">
            <h2 className="text-base font-bold text-gray-900">Active Time Windows</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-100 dark:bg-gray-700">
            {slots.map(s => {
              const booked = activeBookings.filter(b => b.slot_id === s.id).reduce((sum, b) => sum + b.rooms_booked, 0);
              const avail  = Math.max(0, s.max_rooms - booked);
              return (
                <div key={s.id} className="bg-white p-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider truncate">{s.slot_label || `${formatHour(s.start_hour)}–${formatHour(s.end_hour)}`}</p>
                  <p className="text-lg font-black text-gray-900 mt-1">{avail}<span className="text-xs text-gray-400 font-normal">/{s.max_rooms}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">rooms available</p>
                  <p className="text-xs font-semibold text-ms-orange mt-1">${Number(s.price_per_room).toFixed(0)}/room</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const ACCENT = {
  blue:    'bg-blue-50 text-blue-600',
  amber:   'bg-amber-50 text-amber-600',
  emerald: 'bg-ms-teal-light text-ms-teal',
  slate:   'bg-slate-100 text-slate-500',
  purple:  'bg-purple-50 text-purple-600',
  gray:    'bg-gray-100 text-gray-400',
};

function MetricCard({ icon, label, value, accent, highlight }: {
  icon: React.ReactNode; label: string; value: string | number;
  accent: keyof typeof ACCENT; highlight?: boolean;
}) {
  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${highlight ? 'border-ms-orange-border ring-1 ring-ms-orange-light dark:border-transparent' : 'border-gray-100 dark:border-transparent'}`}>
      <div className={`w-9 h-9 rounded-lg ${ACCENT[accent]} flex items-center justify-center mb-3 dark:bg-transparent`}>{icon}</div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{label}</p>
      <p className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">{value}</p>
    </div>
  );
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:      { label: 'Pending',     cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-700/40 dark:text-white dark:border-transparent' },
  checked_in:   { label: 'Checked In',  cls: 'bg-ms-teal-light text-ms-teal border-ms-teal-border dark:bg-teal-700/40 dark:text-white dark:border-transparent' },
  no_show:      { label: 'No-Show',     cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-white dark:border-transparent' },
  owner_cancel: { label: 'Cancelled',   cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-700/40 dark:text-white dark:border-transparent' },
  customer_cancel:{ label: 'Customer Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-700/40 dark:text-white dark:border-transparent' },
};

function StatusBadge({ status }: { status: string }) {
  const { label, cls } = STATUS_CFG[status] || STATUS_CFG.pending;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>{label}</span>;
}
