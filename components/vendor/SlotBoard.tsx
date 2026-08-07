'use client';

import { useState } from 'react';
import type { VdBooking, VdTimeSlot, Vendor } from '@/lib/vendor-types';
import { formatHour, calculateFees } from '@/lib/vendor-types';
import { useAuth } from '@/contexts/AuthContext';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CircleCheck as CheckCircle, Circle as XCircle, Ban, Phone } from 'lucide-react';

type Props = {
  slots: VdTimeSlot[];
  bookings: VdBooking[];
  vendor: Vendor;
  onAction: () => void;
};

function getSlotStatus(slot: VdTimeSlot, slotBookings: VdBooking[]) {
  const now = new Date();
  const currentHour = now.getHours();
  const isActive = currentHour >= slot.start_hour && (slot.end_hour > slot.start_hour ? currentHour < slot.end_hour : currentHour < slot.end_hour || currentHour >= slot.start_hour);
  const isPast = slot.end_hour > slot.start_hour ? currentHour >= slot.end_hour : false;
  const hasPending = slotBookings.some((b) => b.status === 'pending');
  const allActioned = slotBookings.length > 0 && slotBookings.every((b) => b.status !== 'pending');

  if (hasPending && (isActive || isPast)) return 'action_needed';
  if (isActive) return 'active';
  if (allActioned && slotBookings.length > 0) return 'completed';
  if (slotBookings.length === 0) return 'empty';
  return 'upcoming';
}

const statusConfig: Record<string, { label: string; color: string; border: string; bg: string }> = {
  active: { label: 'ACTIVE NOW', color: 'text-ms-teal', border: 'border-ms-teal-border/50', bg: 'bg-ms-teal/10' },
  action_needed: { label: 'ACTION NEEDED', color: 'text-rose-400', border: 'border-rose-500/50', bg: 'bg-rose-500/10' },
  upcoming: { label: 'UPCOMING', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  completed: { label: 'COMPLETED', color: 'text-slate-500', border: 'border-slate-700', bg: 'bg-slate-800/30' },
  empty: { label: 'EMPTY', color: 'text-slate-600', border: 'border-slate-800', bg: 'bg-slate-900/50' },
};

export default function SlotBoard({ slots, bookings, vendor, onAction }: Props) {
  const [actionModal, setActionModal] = useState<{ type: 'checkin' | 'noshow' | 'ownercancel'; booking: VdBooking } | null>(null);

  return (
    <div className="space-y-4">
      {slots.map((slot) => {
        const slotBookings = bookings.filter((b) => b.slot_id === slot.id);
        const bookedRooms = slotBookings.reduce((sum, b) => sum + b.rooms_booked, 0);
        const status = getSlotStatus(slot, slotBookings);
        const cfg = statusConfig[status];
        const occupancyPct = slot.max_rooms > 0 ? (bookedRooms / slot.max_rooms) * 100 : 0;

        return (
          <div key={slot.id} className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all`}>
            <div className="flex flex-col md:flex-row">
              <div className="md:w-48 p-4 md:p-5 border-b md:border-b-0 md:border-r border-slate-800/50 flex flex-col justify-center">
                <p className="text-lg font-bold text-white font-mono">
                  {formatHour(slot.start_hour)} – {formatHour(slot.end_hour)}
                </p>
                <p className="text-xs text-slate-500 mt-1">{slot.duration_hours}hr window</p>
                <div className="mt-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{bookedRooms}/{slot.max_rooms} rooms</span>
                    <span className="font-mono">${Number(slot.price_per_room).toFixed(0)}/rm</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${occupancyPct >= 100 ? 'bg-rose-500' : occupancyPct >= 50 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                      style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 md:p-5">
                {slotBookings.length === 0 ? (
                  <p className="text-sm text-slate-600 italic">No bookings for this window</p>
                ) : (
                  <div className="space-y-3">
                    {slotBookings.map((booking) => (
                      <BookingRow
                        key={booking.id}
                        booking={booking}
                        onCheckin={() => setActionModal({ type: 'checkin', booking })}
                        onNoShow={() => setActionModal({ type: 'noshow', booking })}
                        onOwnerCancel={() => setActionModal({ type: 'ownercancel', booking })}
                      />
                    ))}
                    {slot.max_rooms - bookedRooms > 0 && (
                      <p className="text-xs text-slate-600">+ {slot.max_rooms - bookedRooms} rooms still available</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {actionModal && (
        <ActionModal
          type={actionModal.type}
          booking={actionModal.booking}
          vendor={vendor}
          onClose={() => setActionModal(null)}
          onComplete={() => { setActionModal(null); onAction(); }}
        />
      )}
    </div>
  );
}

function BookingRow({ booking, onCheckin, onNoShow, onOwnerCancel }: {
  booking: VdBooking;
  onCheckin: () => void;
  onNoShow: () => void;
  onOwnerCancel: () => void;
}) {
  const isPending = booking.status === 'pending';
  const statusBadge: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    checked_in: { label: 'Checked In', cls: 'bg-ms-teal/20 text-ms-teal border-ms-teal-border/30' },
    no_show: { label: 'No-Show', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    owner_cancel: { label: 'Owner Cancel', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  };
  const badge = statusBadge[booking.status] || statusBadge.pending;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg ${isPending ? 'bg-slate-800/50' : 'bg-slate-800/20 opacity-60'}`}>
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{booking.guest_name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span className="font-mono">{booking.booking_ref}</span>
            <span>{booking.rooms_booked} room{booking.rooms_booked > 1 ? 's' : ''}</span>
            <span className="font-mono text-amber-400">${Number(booking.gross_amount).toFixed(2)}</span>
            {booking.guest_phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />{booking.guest_phone}
              </span>
            )}
          </div>
          {!isPending && booking.action_taken_by_name && (
            <p className="text-[10px] text-slate-500 mt-1">
              Actioned by {booking.action_taken_by_name} at{' '}
              {new Date(booking.checked_in_at || booking.no_show_at || booking.owner_cancelled_at || '').toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={onCheckin} className="bg-ms-teal hover:bg-ms-teal-hover text-white h-10 px-3 text-xs font-bold">
            <CheckCircle className="w-4 h-4 mr-1" />CHECK-IN
          </Button>
          <Button size="sm" onClick={onNoShow} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-10 px-3 text-xs font-bold">
            <XCircle className="w-4 h-4 mr-1" />NO-SHOW
          </Button>
          <Button size="sm" onClick={onOwnerCancel} variant="outline" className="border-rose-600/50 text-rose-400 hover:bg-rose-500/10 h-10 px-3 text-xs font-bold">
            <Ban className="w-4 h-4 mr-1" />CANCEL
          </Button>
        </div>
      )}
    </div>
  );
}

function ActionModal({ type, booking, vendor, onClose, onComplete }: {
  type: 'checkin' | 'noshow' | 'ownercancel';
  booking: VdBooking;
  vendor: Vendor;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { user } = useAuth();
  const { role, teamMember } = useVendor();
  const [loading, setLoading] = useState(false);
  const [noShowReason, setNoShowReason] = useState('Guest did not arrive');
  const [cancelReason, setCancelReason] = useState('');

  const fees = calculateFees(Number(booking.gross_amount));
  const performerName = role === 'front_desk' ? teamMember?.name : vendor.owner_name;
  const performerRole = role === 'front_desk' ? 'Front Desk' : 'Owner';

  const handleCheckin = async () => {
    setLoading(true);
    const gross = Number(booking.gross_amount);
    const { flatFee, pctFee, totalFee, vendorNet } = calculateFees(gross);

    await supabase.from('vd_bookings').update({
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      platform_pct_fee: pctFee,
      platform_total_fee: totalFee,
      vendor_net: vendorNet,
      action_taken_by: user?.id,
      action_taken_by_name: performerName,
    }).eq('id', booking.id);

    await supabase.from('fee_ledger').insert({
      vd_booking_id: booking.id,
      vendor_id: vendor.id,
      entry_type: 'checkin_fee',
      gross_amount: gross,
      flat_fee: flatFee,
      pct_fee: pctFee,
      total_fee: totalFee,
      vendor_net: vendorNet,
      ledger_date: booking.booking_date,
    });

    await supabase.from('activity_log').insert({
      vendor_id: vendor.id,
      vd_booking_id: booking.id,
      action: 'checked_in',
      performed_by_user_id: user?.id,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: { booking_ref: booking.booking_ref, gross_amount: gross, vendor_net: vendorNet },
    });

    await supabase.rpc('check_vendor_flag', { p_vendor_id: vendor.id });
    onComplete();
  };

  const handleNoShow = async () => {
    setLoading(true);
    await supabase.from('vd_bookings').update({
      status: 'no_show',
      no_show_at: new Date().toISOString(),
      no_show_reason: noShowReason,
      action_taken_by: user?.id,
      action_taken_by_name: performerName,
    }).eq('id', booking.id);

    await supabase.from('activity_log').insert({
      vendor_id: vendor.id,
      vd_booking_id: booking.id,
      action: 'no_show',
      performed_by_user_id: user?.id,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: { booking_ref: booking.booking_ref, reason: noShowReason },
    });

    await supabase.rpc('check_vendor_flag', { p_vendor_id: vendor.id });
    onComplete();
  };

  const handleOwnerCancel = async () => {
    if (!cancelReason.trim()) return;
    setLoading(true);

    await supabase.from('vd_bookings').update({
      status: 'owner_cancel',
      owner_cancelled_at: new Date().toISOString(),
      penalty_fee: 5.0,
      cancel_reason: cancelReason,
      action_taken_by: user?.id,
      action_taken_by_name: performerName,
    }).eq('id', booking.id);

    await supabase.from('fee_ledger').insert({
      vd_booking_id: booking.id,
      vendor_id: vendor.id,
      entry_type: 'owner_cancel_penalty',
      total_fee: 5.0,
      ledger_date: booking.booking_date,
    });

    await supabase.from('activity_log').insert({
      vendor_id: vendor.id,
      vd_booking_id: booking.id,
      action: 'owner_cancel',
      performed_by_user_id: user?.id,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: { booking_ref: booking.booking_ref, reason: cancelReason, penalty: 5.0 },
    });

    await supabase.rpc('check_vendor_flag', { p_vendor_id: vendor.id });
    onComplete();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#111827] border-slate-700 text-white max-w-md">
        {type === 'checkin' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-ms-teal flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> CONFIRM CHECK-IN
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Ref:</span><span className="font-mono">{booking.booking_ref}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Guest:</span><span>{booking.guest_name}</span></div>
                {booking.guest_phone && <div className="flex justify-between"><span className="text-slate-400">Phone:</span><span className="font-mono">{booking.guest_phone}</span></div>}
                <div className="flex justify-between"><span className="text-slate-400">Rooms:</span><span>{booking.rooms_booked}</span></div>
              </div>
              <div className="border-t border-slate-700 pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Gross Collected:</span><span className="font-mono text-amber-400">${Number(booking.gross_amount).toFixed(2)}</span></div>

                <div className="flex justify-between"><span className="text-slate-400">MicroStay 12%:</span><span className="font-mono text-rose-400">-${fees.pctFee.toFixed(2)}</span></div>
                <div className="border-t border-slate-700 pt-2 flex justify-between font-bold">
                  <span className="text-ms-teal">YOUR NET:</span>
                  <span className="font-mono text-ms-teal">${fees.vendorNet.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">Actioned by: {performerName}</p>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleCheckin} disabled={loading} className="flex-1 bg-ms-teal hover:bg-ms-teal-hover font-bold">
                  {loading ? 'Processing...' : 'CONFIRM CHECK-IN'}
                </Button>
                <Button onClick={onClose} variant="outline" className="border-slate-600 text-slate-300">Cancel</Button>
              </div>
            </div>
          </>
        )}

        {type === 'noshow' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> MARK AS NO-SHOW
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Ref:</span><span className="font-mono">{booking.booking_ref}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Guest:</span><span>{booking.guest_name}</span></div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Reason:</label>
                <Select value={noShowReason} onValueChange={setNoShowReason}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Guest did not arrive" className="text-slate-200">Guest did not arrive</SelectItem>
                    <SelectItem value="Guest cancelled by call/text" className="text-slate-200">Guest cancelled by call/text</SelectItem>
                    <SelectItem value="Duplicate booking" className="text-slate-200">Duplicate booking</SelectItem>
                    <SelectItem value="Other" className="text-slate-200">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-slate-500">No fees charged to either party.</p>
              <p className="text-xs text-slate-500">Actioned by: {performerName}</p>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleNoShow} disabled={loading} className="flex-1 bg-slate-600 hover:bg-slate-700 font-bold">
                  {loading ? 'Processing...' : 'CONFIRM NO-SHOW'}
                </Button>
                <Button onClick={onClose} variant="outline" className="border-slate-600 text-slate-300">Cancel</Button>
              </div>
            </div>
          </>
        )}

        {type === 'ownercancel' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2">
                <Ban className="w-5 h-5" /> OWNER CANCELLATION
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                You are refusing a guest who has a confirmed reservation and showed up.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Ref:</span><span className="font-mono">{booking.booking_ref}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Guest:</span><span>{booking.guest_name}</span></div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 space-y-2">
                <p className="text-sm text-rose-300 font-semibold">PENALTY: 12% commission (${fees.pctFee.toFixed(2)}) will be charged to your account</p>
                <p className="text-xs text-rose-300/70">If your owner cancel rate reaches 30%, your account will be FLAGGED for review.</p>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Reason (required):</label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain why you're cancelling..."
                  className="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
              <p className="text-xs text-slate-500">Actioned by: {performerName}</p>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleOwnerCancel}
                  disabled={loading || !cancelReason.trim()}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 font-bold"
                >
                  {loading ? 'Processing...' : 'CONFIRM + ACCEPT PENALTY'}
                </Button>
                <Button onClick={onClose} variant="outline" className="border-slate-600 text-slate-300">Go Back</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
