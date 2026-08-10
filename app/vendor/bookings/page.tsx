'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { VdBooking } from '@/lib/vendor-types';
import { formatHour } from '@/lib/vendor-types';
// Note: bookings are fetched via server API route (bypasses client-side auth/RLS issues)
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Calendar as CalendarIcon, Filter, CheckCircle2, UserX, Ban, DoorOpen, ListFilter, Download } from 'lucide-react';
import { exportBookingsToCSV } from '@/lib/exportUtils';

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: { label: 'PENDING', cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-700/40 dark:text-white dark:border-transparent', icon: <DoorOpen className="w-3 h-3 mr-1" /> },
  checked_in: { label: 'CHECKED IN', cls: 'bg-ms-teal-light text-ms-teal border-ms-teal-border dark:bg-teal-700/40 dark:text-white dark:border-transparent', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
  no_show: { label: 'NO-SHOW', cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-white dark:border-transparent', icon: <UserX className="w-3 h-3 mr-1" /> },
  owner_cancel: { label: 'CANCELLED', cls: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-700/40 dark:text-white dark:border-transparent', icon: <Ban className="w-3 h-3 mr-1" /> },
};

function getDefaultDates() {
  const now = new Date();
  const to = new Date(now);
  to.setMonth(to.getMonth() + 1);
  return {
    from: now.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export default function VendorBookingsPage() {
  const { vendor, selectedPropertyId } = useVendor();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<VdBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const defaults = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadBookings = useCallback(async () => {
    if (!vendor || !selectedPropertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const params = new URLSearchParams({
        propertyId: selectedPropertyId,
        dateFrom,
        dateTo,
      });
      const res = await fetch(`/api/vendor/bookings?${params}`);
      if (!res.ok) {
        console.error('Vendor bookings API error:', res.status);
        setBookings([]);
        setLoading(false);
        return;
      }
      const { data } = await res.json();
      setBookings((data || []) as VdBooking[]);
    } catch (err) {
      console.error('Vendor bookings fetch error:', err);
      setBookings([]);
    }

    setCurrentPage(1);
    setLoading(false);
  }, [vendor, selectedPropertyId, dateFrom, dateTo]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleAction = async (bookingId: string, actionType: 'checked_in' | 'no_show' | 'owner_cancel') => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (actionType === 'checked_in') {
      // Fee is 12% of gross — set at booking time, no recalculation on check-in
      await supabase.from('vd_bookings').update({
        status: actionType,
        checked_in_at: new Date().toISOString(),
        action_taken_by: user?.id,
      }).eq('id', bookingId);
    } else if (actionType === 'no_show') {
      await supabase.from('vd_bookings').update({
        status: actionType,
        no_show_at: new Date().toISOString(),
        action_taken_by: user?.id,
      }).eq('id', bookingId);
    } else if (actionType === 'owner_cancel') {
      await supabase.from('vd_bookings').update({
        status: actionType,
        owner_cancelled_at: new Date().toISOString(),
        penalty_fee: Number((booking.gross_amount * 0.12).toFixed(2)),
        cancel_reason: 'Cancelled from Bookings Table',
        action_taken_by: user?.id,
      }).eq('id', bookingId);
    }
    loadBookings();
  };

  const filtered = bookings.filter((b) => {
    if (tab === 'pending' && b.status !== 'pending') return false;
    if (tab === 'checked_in' && b.status !== 'checked_in') return false;
    if (tab === 'no_show' && b.status !== 'no_show') return false;
    if (tab === 'owner_cancel' && b.status !== 'owner_cancel') return false;
    if (search) {
      const s = search.toLowerCase();
      return b.guest_name.toLowerCase().includes(s) || b.booking_ref.toLowerCase().includes(s) || (b.guest_phone || '').includes(s);
    }
    return true;
  });

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const setPresetRange = (months: number) => {
    const now = new Date();
    if (months < 0) {
      const from = new Date(now);
      from.setMonth(from.getMonth() + months);
      setDateFrom(from.toISOString().split('T')[0]);
      setDateTo(now.toISOString().split('T')[0]);
    } else {
      const to = new Date(now);
      to.setMonth(to.getMonth() + months);
      setDateFrom(now.toISOString().split('T')[0]);
      setDateTo(to.toISOString().split('T')[0]);
    }
  };

  if (!selectedPropertyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <CalendarIcon className="w-12 h-12 text-ms-orange mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">No Property Selected</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Booking Management</h1>
          <p className="text-gray-500 dark:text-white/50 font-medium mt-1">Search, filter, and manage your entire reservation history.</p>
        </div>
        <button
          onClick={() => exportBookingsToCSV(filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-end">
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-gray-50 border-gray-200 text-gray-900 font-medium shadow-sm h-10 w-40 dark:border-transparent dark:bg-transparent/40" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-gray-50 border-gray-200 text-gray-900 font-medium shadow-sm h-10 w-40dark:border-transparent dark:bg-transparent/40" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
  <button
    onClick={() => {
      setSelectedPreset(-3);
      setPresetRange(-3);
    }}
    className={`text-xs font-semibold px-3 py-2 rounded-md border transition-all duration-200
      ${
        selectedPreset === -3
          ? "bg-ms-orange text-white border-ms-orange shadow-sm dark:bg-ms-orange dark:text-white dark:border-ms-orange"
          : "bg-white text-gray-600 border-gray-200 hover:bg-ms-orange-light hover:text-ms-orange hover:border-ms-orange-border dark:bg-transparent/40 dark:text-gray-300 dark:border-transparent dark:hover:bg-zinc-800 dark:hover:text-ms-orange dark:hover:border-zinc-700"
      }`}
  >
    Past 3 Months
  </button>

  <button
    onClick={() => {
      setSelectedPreset(-1);
      setPresetRange(-1);
    }}
    className={`text-xs font-semibold px-3 py-2 rounded-md border transition-all duration-200
      ${
        selectedPreset === -1
          ? "bg-ms-orange text-white border-ms-orange shadow-sm dark:bg-ms-orange dark:text-white dark:border-ms-orange"
          : "bg-white text-gray-600 border-gray-200 hover:bg-ms-orange-light hover:text-ms-orange hover:border-ms-orange-border dark:bg-transparent/40 dark:text-gray-300 dark:border-transparent dark:hover:bg-zinc-800 dark:hover:text-ms-orange dark:hover:border-zinc-700"
      }`}
  >
    Past Month
  </button>

  <button
    onClick={() => {
      setSelectedPreset(1);
      setPresetRange(1);
    }}
    className={`text-xs font-semibold px-3 py-2 rounded-md border transition-all duration-200
      ${
        selectedPreset === 1
          ? "bg-ms-orange text-white border-ms-orange shadow-sm dark:bg-ms-orange dark:text-white dark:border-ms-orange"
          : "bg-white text-gray-600 border-gray-200 hover:bg-ms-orange-light hover:text-ms-orange hover:border-ms-orange-border dark:bg-transparent/40 dark:text-gray-300 dark:border-transparent dark:hover:bg-zinc-800 dark:hover:text-ms-orange dark:hover:border-zinc-700"
      }`}
  >
    Next Month
  </button>

  <button
    onClick={() => {
      setSelectedPreset(3);
      setPresetRange(3);
    }}
    className={`text-xs font-semibold px-3 py-2 rounded-md border transition-all duration-200
      ${
        selectedPreset === 3
          ? "bg-ms-orange text-white border-ms-orange shadow-sm dark:bg-ms-orange dark:text-white dark:border-ms-orange"
          : "bg-white text-gray-600 border-gray-200 hover:bg-ms-orange-light hover:text-ms-orange hover:border-ms-orange-border dark:bg-transparent/40 dark:text-gray-300 dark:border-transparent dark:hover:bg-zinc-800 dark:hover:text-ms-orange dark:hover:border-zinc-700"
      }`}
  >
    Next 3 Months
  </button>
</div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-black flex flex-col sm:flex-row gap-4 justify-between items-center w-full">
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="w-full sm:w-auto overflow-x-auto"
          >
            <TabsList
              className="
      h-11
      rounded-xl
      border
      border-gray-200
      bg-gray-100
      p-1
      dark:border-transparent
      dark:bg-black
    "
            >
              <TabsTrigger
                value="all"
                className="
        rounded-lg
        px-4
        py-2
        text-xs
        font-semibold
        text-gray-600
        transition-all
        duration-200

        hover:bg-white
        hover:text-ms-orange

        dark:text-gray-300
        dark:hover:bg-zinc-800
        dark:hover:text-ms-orange

        data-[state=active]:bg-white
        data-[state=active]:text-ms-orange
        data-[state=active]:shadow-md

        dark:data-[state=active]:bg-zinc-800
        dark:data-[state=active]:text-ms-orange
      "
              >
                All
              </TabsTrigger>

              <TabsTrigger
                value="pending"
                className="
        rounded-lg
        px-4
        py-2
        text-xs
        font-semibold
        text-gray-600
        transition-all
        duration-200

        hover:bg-white
        hover:text-ms-orange

        dark:text-gray-300
        dark:hover:bg-zinc-800
        dark:hover:text-ms-orange

        data-[state=active]:bg-white
        data-[state=active]:text-ms-orange
        data-[state=active]:shadow-md

        dark:data-[state=active]:bg-zinc-800
        dark:data-[state=active]:text-ms-orange
      "
              >
                Expected

                {pendingCount > 0 && (
                  <span
                    className="
            ml-2
            rounded-full
            border
            border-ms-orange-border
            bg-ms-orange-light
            px-1.5
            py-0.5
            text-[10px]
            font-bold
            tabular-nums
            text-ms-orange
            dark:bg-zinc-900 dark:border-transparent

            dark:bg-orange-500/15
            dark:text-orange-300
          "
                  >
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="checked_in"
                className="
        rounded-lg
        px-4
        py-2
        text-xs
        font-semibold
        text-gray-600
        transition-all
        duration-200

        hover:bg-white
        hover:text-ms-orange

        dark:text-gray-300
        dark:hover:bg-zinc-800
        dark:hover:text-ms-orange

        data-[state=active]:bg-white
        data-[state=active]:text-ms-orange
        data-[state=active]:shadow-md

        dark:data-[state=active]:bg-zinc-800
        dark:data-[state=active]:text-ms-orange
      "
              >
                Checked In
              </TabsTrigger>

              <TabsTrigger
                value="no_show"
                className="
        rounded-lg
        px-4
        py-2
        text-xs
        font-semibold
        text-gray-600
        transition-all
        duration-200

        hover:bg-white
        hover:text-ms-orange

        dark:text-gray-300
        dark:hover:bg-zinc-800
        dark:hover:text-ms-orange

        data-[state=active]:bg-white
        data-[state=active]:text-ms-orange
        data-[state=active]:shadow-md

        dark:data-[state=active]:bg-zinc-800
        dark:data-[state=active]:text-ms-orange
      "
              >
                No Shows
              </TabsTrigger>

              <TabsTrigger
                value="owner_cancel"
                className="
        rounded-lg
        px-4
        py-2
        text-xs
        font-semibold
        text-gray-600
        transition-all
        duration-200

        hover:bg-white
        hover:text-ms-orange

        dark:text-gray-300
        dark:hover:bg-zinc-800
        dark:hover:text-ms-orange

        data-[state=active]:bg-white
        data-[state=active]:text-ms-orange
        data-[state=active]:shadow-md

        dark:data-[state=active]:bg-zinc-800
        dark:data-[state=active]:text-ms-orange
      "
              >
                Cancelled
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ref#, phone..."
              className="pl-9 bg-white border-gray-300 text-gray-900 shadow-sm h-10 font-medium focus:ring-ms-orange focus:border-ms-orange-border w-full" />
          </div>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-500 font-bold animate-pulse">Loading Bookings Data...</div>}

      {!loading && filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full mx-auto flex items-center justify-center mb-4">
            <ListFilter className="w-8 h-8 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No bookings found</h3>
          <p className="text-gray-500 font-medium max-w-sm mx-auto">
            {bookings.length === 0 ? 'No reservations exist within the selected date range.' : 'Try adjusting your search filters or viewing a different status tab.'}
          </p>
        </div>
      ) : !loading && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 dark:border-transparent dark:bg-transparent/30">
                  <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ref# & Guest</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Window</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Inventory</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Collected</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 ">
                {paginatedData.map((b) => {
                  const badge = statusConfig[b.status] || statusConfig.pending;
                  const slot = b.slot as any;
                  const isPending = b.status === 'pending';
                  const isToday = new Date().toISOString().split('T')[0] === b.booking_date;

                  return (
                    <tr key={b.id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-900 group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-ms-orange mb-0.5">{b.booking_ref}</div>
                        <div className="text-sm font-bold text-gray-900">{b.guest_name}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {b.guest_phone || '-'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{new Date(b.booking_date + 'T12:00:00').toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          {slot ? `${formatHour(slot.start_hour)} - ${formatHour(slot.end_hour)}` : 'Unknown Slot'}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="bg-gray-100 dark:bg-transparent dark:text-white text-gray-700 text-xs font-bold px-2 py-0.5 rounded border border-gray-200">
                            {b.rooms_booked} Unit{b.rooms_booked > 1 ? 's' : ''}
                          </span>
                          {slot?.bed_type && (
                            <span className="text-xs font-medium text-gray-500 capitalize px-2 py-0.5 border dark:bg-ms-orange dark:border-transparent dark:text-white border-gray-100 rounded bg-gray-50">{slot.bed_type}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-black text-gray-900">${Number(b.gross_amount).toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badge.cls}`}>
                          {badge.icon} {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={!isToday}
                              onClick={() => handleAction(b.id, 'checked_in')}
                              title={!isToday ? 'Only available on the booking date' : 'Mark as Checked In'}
                              className={`h-8 text-xs font-bold border transition-all ${isToday ? 'bg-ms-teal-light text-ms-teal hover:bg-ms-teal-light border-ms-teal-border dark:bg-green-600 dark:text-white dark:border-transparent  active:scale-95' : 'bg-gray-50 text-gray-300 border-gray-200  cursor-not-allowed opacity-60'}`}
                            >
                              ✓ Check-In
                            </Button>
                            <Button
                              size="sm"
                              disabled={!isToday}
                              onClick={() => handleAction(b.id, 'no_show')}
                              title={!isToday ? 'Only available on the booking date' : 'Mark as No-Show'}
                              className={`h-8 text-xs font-bold border transition-all ${isToday ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-300 dark:bg-slate-700 dark:text-white dark:border-transparent  active:scale-95' : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed opacity-60'}`}
                            >
                              ✗ No-Show
                            </Button>
                            <Button
                              size="sm"
                              disabled={!isToday}
                              onClick={() => handleAction(b.id, 'owner_cancel')}
                              title={!isToday ? 'Only available on the booking date' : 'Cancel this booking'}
                              className={`h-8 text-xs font-bold border transition-all ${isToday ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-300 dark:bg-rose-600 dark:text-white dark:border-transparent  active:scale-95' : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed opacity-60'}`}
                            >
                              ⊘ Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-gray-400 italic">
                            {b.status === 'checked_in' ? '✓ Completed' : b.status === 'no_show' ? '✗ No-Show' : b.status === 'owner_cancel' ? '⊘ Cancelled' : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs font-medium text-gray-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="font-semibold text-gray-600">
                  Previous
                </Button>
                <div className="flex items-center px-4 font-bold text-sm text-gray-900 border border-gray-200 rounded-md bg-white">
                  {currentPage} / {totalPages}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="font-semibold text-gray-600">
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
