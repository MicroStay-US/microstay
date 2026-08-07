'use client';

import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { supabase } from '@/lib/supabase'; // used only for auth token
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users, Search, Flag, Ban, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react';

type GuestRow = {
  guest_email: string;
  guest_name: string;
  guest_phone: string;
  total_bookings: number;
  total_spent: number;
  no_show_count: number;
  last_booking_date: string;
  flagged: boolean;
  banned: boolean;
};

type TabFilter = 'all' | 'flagged' | 'banned';

function StatusBadge({ flagged, banned }: { flagged: boolean; banned: boolean }) {
  if (banned) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border bg-rose-50 text-rose-700 border-rose-200 dark:bg-transparent/30 dark:border-transparent">
        <Ban className="w-3 h-3" /> Banned
      </span>
    );
  }
  if (flagged) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border bg-amber-50 text-amber-700 dark:bg-amber-700/40 dark:border-transparent border-amber-200">
        <Flag className="w-3 h-3" /> Flagged
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-transparent/30 dark:border-transparent">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
  );
}

export function GuestManagementTab() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [expandedBookings, setExpandedBookings] = useState<Record<string, any[]>>({});
  const [expandedLoading, setExpandedLoading] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const loadGuests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/guests', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load guests');
      setGuests(data.guests || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadGuests(); }, [loadGuests]);

  const loadExpandedBookings = async (email: string) => {
    if (expandedBookings[email]) return;
    setExpandedLoading(prev => ({ ...prev, [email]: true }));
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/guests/bookings?email=${encodeURIComponent(email)}`, { headers });
      const data = await res.json();
      setExpandedBookings(prev => ({ ...prev, [email]: data.bookings || [] }));
    } catch {
      setExpandedBookings(prev => ({ ...prev, [email]: [] }));
    } finally {
      setExpandedLoading(prev => ({ ...prev, [email]: false }));
    }
  };

  const toggleExpand = (email: string) => {
    if (expandedEmail === email) {
      setExpandedEmail(null);
    } else {
      setExpandedEmail(email);
      loadExpandedBookings(email);
    }
  };

  const patchProfile = async (email: string, _profileId: string | null, field: 'flagged' | 'banned', value: boolean) => {
    const key = `${email}-${field}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/guests', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ email, field, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update guest');
      await loadGuests();
      setSuccess(`Guest ${value ? field : `un-${field}`}d successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const filtered = useMemo(() => {
    let rows = guests;
    if (tabFilter === 'flagged') rows = rows.filter(g => g.flagged && !g.banned);
    if (tabFilter === 'banned') rows = rows.filter(g => g.banned);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(g =>
        g.guest_name.toLowerCase().includes(s) ||
        g.guest_email.toLowerCase().includes(s) ||
        g.guest_phone.includes(s)
      );
    }
    return rows;
  }, [guests, search, tabFilter]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Guests', count: guests.length },
    { key: 'flagged', label: 'Flagged', count: guests.filter(g => g.flagged && !g.banned).length },
    { key: 'banned', label: 'Banned', count: guests.filter(g => g.banned).length },
  ];

  if (loading) return <div className="h-64 bg-zinc-200 dark:bg-slate-700 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Guest Management</h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">View and moderate all guests across the platform.</p>
        </div>
        <Button variant="outline" onClick={loadGuests} className="text-zinc-700 font-bold dark:bg-slate-800 dark:text-white dark:border-transparent dark:hover:text-ms-orange border-zinc-300 gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {error && (
        <Alert className="bg-rose-50 border-rose-200 dark:rose-700 dark:border-red-700/30">
          <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-white" />
          <AlertDescription className="text-rose-800 dark:text-white font-bold ml-2">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-600 dark:border-transparent">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:bg-emerald-600/30" />
          <AlertDescription className="text-emerald-800 dark:bg-emerald-600/30 dark:text-white font-bold ml-2">{success}</AlertDescription>
        </Alert>
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 bg-zinc-100 dark:bg-transparent p-1 rounded-lg">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTabFilter(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                tabFilter === t.key
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-black ${
                tabFilter === t.key ? 'bg-zinc-100 text-zinc-600 dark:text-ms-orange dark:bg-transparent/40'  : 'bg-zinc-200 text-zinc-400 dark:bg-transparent/10'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="pl-9 h-10 bg-white border-zinc-200 text-sm font-medium shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 dark:bg-slate-800/40 dark:border-transparent rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-zinc-300 dark:text-white mx-auto mb-3" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No guests found</h3>
            <p className="text-zinc-500 font-medium mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b dark:bg-slate-900 dark:border-transparent border-zinc-200">
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Guest</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Phone</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Bookings</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Total Spent</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">No-Shows</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Last Booking</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-black">
                {filtered.map(guest => {
                  const isExpanded = expandedEmail === guest.guest_email;
                  const flagKey = `${guest.guest_email}-flagged`;
                  const banKey = `${guest.guest_email}-banned`;
                  return (
                    <Fragment key={guest.guest_email}>
                      <tr
                        className="hover:bg-zinc-50/80 transition-colors bg-white cursor-pointer"
                        onClick={() => toggleExpand(guest.guest_email)}
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="font-bold text-zinc-900 dark:text-ms-orange">{guest.guest_name || '—'}</div>
                          <div className="text-xs text-zinc-500 font-medium mt-0.5">{guest.guest_email}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-zinc-600">
                          {guest.guest_phone || '—'}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-zinc-900">
                          {guest.total_bookings}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-zinc-900">
                          ${guest.total_spent.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <span className={`font-black ${guest.no_show_count > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                            {guest.no_show_count}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-zinc-600">
                          {guest.last_booking_date
                            ? new Date(guest.last_booking_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          <StatusBadge flagged={guest.flagged} banned={guest.banned} />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading[flagKey] || guest.banned}
                              onClick={() => patchProfile(guest.guest_email, null, 'flagged', !guest.flagged)}
                              className={`h-8 text-[10px] font-black uppercase tracking-widest border ${
                                guest.flagged
                                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-700 dark:shadow-md dark:hover:shadow-amber-600 dark:text-white dark:border-transparent'
                                  : 'border-zinc-200 text-zinc-600 hover:border-amber-300 hover:text-amber-700 dark:text-amber-600'
                              }`}
                            >
                              <Flag className="w-3 h-3 mr-1" />
                              {guest.flagged ? 'Unflag' : 'Flag'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading[banKey]}
                              onClick={() => patchProfile(guest.guest_email, null, 'banned', !guest.banned)}
                              className={`h-8 text-[10px] font-black uppercase tracking-widest border ${
                                guest.banned
                                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-700 dark:shadow-md dark:hover:shadow-rose-600 dark:text-white dark:border-transparent'
                                  : 'border-zinc-200 text-zinc-600 hover:border-rose-300 hover:text-rose-700 dark:text-rose-600'
                              }`}
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              {guest.banned ? 'Unban' : 'Ban'}
                            </Button>
                            <button className="text-zinc-400 hover:text-zinc-700 transition-colors">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${guest.guest_email}-expanded`} className="bg-zinc-50/60 dark:bg-transparent/50">
                          <td colSpan={8} className="px-6 py-4">
                            {expandedLoading[guest.guest_email] ? (
                              <div className="h-10 bg-zinc-200 dark:bg-slate-700  animate-pulse rounded" />
                            ) : (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Last 5 Bookings</p>
                                {(expandedBookings[guest.guest_email] || []).length === 0 ? (
                                  <p className="text-sm text-zinc-400 dark:text-white font-medium">No bookings found.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {expandedBookings[guest.guest_email].map(b => (
                                      <div key={b.id} className="flex items-center gap-4 bg-white rounded-lg px-4 py-2.5 border border-zinc-200 text-sm">
                                        <span className="font-mono text-[10px] font-bold text-ms-orange">{b.booking_ref || b.id.slice(0, 8)}</span>
                                        <span className="font-medium text-zinc-700">{b.property_name || 'Unknown Property'}</span>
                                        <span className="text-zinc-500">
                                          {b.booking_date
                                            ? new Date(b.booking_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                            : '—'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                                          b.status === 'checked_in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-600 dark:text-white dark:border-transparent' :
                                          b.status === 'no_show' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-red-800/40 dark:text-white dark:animate-pulse dark:border-transparent' :
                                          b.status === 'owner_cancel' || b.status === 'guest_cancel' ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-slate-500 dark:text-black dark:border-transparent' :
                                          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-800/40 dark:text-white dark:border-transparent'
                                        }`}>{b.status}</span>
                                        <span className="ml-auto font-bold text-zinc-900">${Number(b.gross_amount).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
