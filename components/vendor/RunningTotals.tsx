'use client';

import type { VdBooking, Vendor } from '@/lib/vendor-types';

type Props = {
  bookings: VdBooking[];
  vendor: Vendor;
};

export default function RunningTotals({ bookings, vendor }: Props) {
  const checkedIn = bookings.filter((b) => b.status === 'checked_in');
  const noShows = bookings.filter((b) => b.status === 'no_show');
  const ownerCancels = bookings.filter((b) => b.status === 'owner_cancel');
  const pending = bookings.filter((b) => b.status === 'pending');

  const totalGross = checkedIn.reduce((s, b) => s + Number(b.gross_amount), 0);
  const totalNet = checkedIn.reduce((s, b) => s + Number(b.vendor_net || 0), 0);
  const totalPenalties = ownerCancels.reduce((s, b) => s + Number(b.penalty_fee || 0), 0);

  const actioned = checkedIn.length + noShows.length + ownerCancels.length;
  const cancelRate = actioned > 0 ? (ownerCancels.length / actioned) * 100 : 0;

  const cancelRateColor = cancelRate >= 30 ? 'text-rose-400' : cancelRate >= 20 ? 'text-amber-400' : 'text-ms-teal';

  if (bookings.length === 0) return null;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-ms-teal font-bold">Checked In:</span>
          <span className="font-mono text-white">{checkedIn.length}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Gross:</span>
          <span className="font-mono text-amber-400">${totalGross.toFixed(2)}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Net:</span>
          <span className="font-mono text-ms-teal">${totalNet.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">No-Shows:</span>
          <span className="font-mono text-white">{noShows.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-rose-400 font-bold">Owner Cancels:</span>
          <span className="font-mono text-white">{ownerCancels.length}</span>
          {totalPenalties > 0 && (
            <>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Penalties:</span>
              <span className="font-mono text-rose-400">${totalPenalties.toFixed(2)}</span>
            </>
          )}
        </div>

        {pending.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">Pending:</span>
            <span className="font-mono text-white">{pending.length}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">Cancel Rate:</span>
          <span className={`font-mono font-bold ${cancelRateColor}`}>
            {cancelRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
