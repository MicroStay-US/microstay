'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Search, Send, ChevronRight } from 'lucide-react';

interface BookingItem {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  booking_date: string;
  booking_ref: string;
  status: string;
  unread_count: number;
}

interface Message {
  id: string;
  booking_id: string;
  vendor_id: string;
  sender_type: 'vendor' | 'guest';
  sender_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

const statusConfig: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-700/40 dark:border-transparent dark:text-white/70',
  checked_in: 'bg-ms-teal-light text-ms-teal border-ms-teal-border dark:bg-teal-700 dark:border-transparent dark:text-white/70',
  no_show: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-950 dark:text-white dark:border-transparent',
  owner_cancel: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-700/40 dark:border-transparent dark:text-white/40',
};

const statusLabel: Record<string, string> = {
  pending: 'Expected',
  checked_in: 'Checked In',
  no_show: 'No-Show',
  owner_cancel: 'Cancelled',
};

function formatTs(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function VendorMessagesPage() {
  const { vendor, selectedPropertyId } = useVendor();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [compose, setCompose] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  const loadBookings = useCallback(async () => {
    if (!vendor || !selectedPropertyId) { setLoadingBookings(false); return; }
    setLoadingBookings(true);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data: bookingData, error } = await supabase
      .from('vd_bookings')
      .select('id, guest_name, guest_email, guest_phone, booking_date, booking_ref, status')
      .eq('property_id', selectedPropertyId)
      .eq('vendor_id', vendor.id)
      .gte('booking_date', since.toISOString().split('T')[0])
      .order('booking_date', { ascending: false });

    if (error) console.error('Messages bookings fetch error:', error);

    const rows = bookingData || [];

    // Fetch unread counts per booking
    const bookingIds = rows.map((b) => b.id);
    let unreadMap: Record<string, number> = {};

    if (bookingIds.length > 0) {
      const { data: unreadData } = await supabase
        .from('vendor_messages')
        .select('booking_id')
        .in('booking_id', bookingIds)
        .eq('sender_type', 'guest')
        .eq('read', false);

      for (const row of unreadData || []) {
        unreadMap[row.booking_id] = (unreadMap[row.booking_id] || 0) + 1;
      }
    }

    setBookings(
      rows.map((b) => ({ ...b, unread_count: unreadMap[b.id] || 0 }))
    );
    setLoadingBookings(false);
  }, [vendor, selectedPropertyId]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const loadMessages = useCallback(async (bookingId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('vendor_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) console.error('Messages fetch error:', error);
    setMessages((data as Message[]) || []);
    setLoadingMessages(false);

    // Mark guest messages as read
    await supabase
      .from('vendor_messages')
      .update({ read: true })
      .eq('booking_id', bookingId)
      .eq('sender_type', 'guest');

    // Refresh unread counts
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, unread_count: 0 } : b))
    );
  }, []);

  const selectBooking = useCallback(
    (bookingId: string) => {
      setSelectedBookingId(bookingId);
      setCompose('');
      loadMessages(bookingId);

      // Unsubscribe previous
      if (realtimeRef.current) {
        realtimeRef.current.unsubscribe();
      }

      // Subscribe to new messages
      const channel = supabase
        .channel(`messages-booking-${bookingId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'vendor_messages',
            filter: `booking_id=eq.${bookingId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
            // Mark as read if from guest
            if ((payload.new as Message).sender_type === 'guest') {
              supabase
                .from('vendor_messages')
                .update({ read: true })
                .eq('id', (payload.new as Message).id);
            }
          }
        )
        .subscribe();

      realtimeRef.current = channel;
    },
    [loadMessages]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeRef.current) realtimeRef.current.unsubscribe();
    };
  }, []);

  // Scroll thread to bottom when messages update
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!compose.trim() || !selectedBookingId || !vendor) return;
    setSending(true);
    const body = compose.trim();
    setCompose('');

    const { error } = await supabase.from('vendor_messages').insert({
      booking_id: selectedBookingId,
      vendor_id: vendor.id,
      sender_type: 'vendor',
      sender_id: vendor.id,
      body,
      read: false,
    });

    if (error) {
      console.error('Send message error:', error);
      setCompose(body);
    }
    setSending(false);
  };

  const filteredBookings = bookings.filter((b) => {
    if (!search) return true;
    return b.guest_name.toLowerCase().includes(search.toLowerCase());
  });

  if (!selectedPropertyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <MessageSquare className="w-12 h-12 text-ms-orange mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">No Property Selected</h2>
          <p className="text-gray-500 font-medium">Select a property from the sidebar to view messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] bg-ms-bg dark:bg-black rounded-xl border border-gray-200 dark:border-transparent overflow-hidden shadow-sm">
      {/* LEFT PANE — Booking List */}
      <div className="w-72 shrink-0 flex flex-col border-r border-gray-200 dark:border-transparent bg-white">
        {/* Pane Header */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-transparent">
          <h2 className="text-base font-bold text-gray-900">Guest Messages</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Last 30 days</p>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b border-gray-100 dark:border-transparent">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guests..."
              className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/30 focus:border-[#c9a96e] text-gray-800 placeholder-gray-400 dark:bg-transparent"
            />
          </div>
        </div>

        {/* Booking List */}
        <div className="flex-1 overflow-y-auto">
          {loadingBookings ? (
            <div className="p-4 text-center text-xs text-gray-400 font-medium animate-pulse">Loading...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-medium">No recent bookings found.</p>
            </div>
          ) : (
            filteredBookings.map((b) => (
              <button
                key={b.id}
                onClick={() => selectBooking(b.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-zinc-800 transition-colors hover:bg-gray-50 flex items-start gap-3 ${
                  selectedBookingId === b.id ? 'bg-[#c9a96e]/8 border-l-2 border-l-[#c9a96e]' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold text-gray-900 truncate dark:text-ms-orange">{b.guest_name}</span>
                    {b.unread_count > 0 && (
                      <span className="shrink-0 bg-amber-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {b.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5 truncate">
                    {new Date(b.booking_date + 'T12:00:00').toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="font-mono text-[10px] text-ms-orange font-bold mt-0.5 dark:text-white/40">{b.booking_ref}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE — Conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedBooking ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gray-100 dark:bg-black rounded-full flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Select a booking to start messaging</h3>
              <p className="text-sm text-gray-500 font-medium max-w-xs">
                Choose a guest from the left panel to view or send messages.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#0f1f3d] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {selectedBooking.guest_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{selectedBooking.guest_name}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="font-mono text-xs font-bold text-ms-orange">{selectedBooking.booking_ref}</span>
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString([], {
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 ml-12 flex items-center gap-4 text-xs text-gray-500 font-medium">
                    {selectedBooking.guest_email && <span>{selectedBooking.guest_email}</span>}
                    {selectedBooking.guest_phone && <span>{selectedBooking.guest_phone}</span>}
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    statusConfig[selectedBooking.status] || statusConfig.pending
                  }`}
                >
                  {statusLabel[selectedBooking.status] || selectedBooking.status}
                </span>
              </div>
            </div>

            {/* Message Thread */}
            <div ref={threadRef} className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-6 py-5 space-y-4 bg-ms-bg dark:bg-slate-800">
              {loadingMessages ? (
                <div className="text-center text-sm text-gray-400 font-medium animate-pulse py-8">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 ">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No messages yet. Start the conversation below.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isVendor = msg.sender_type === 'vendor';
                  return (
                    <div key={msg.id} className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                          isVendor
                            ? 'bg-[#c9a96e]/15 border border-[#c9a96e]/40 rounded-br-sm'
                            : 'bg-white border border-gray-200 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                          {msg.body}
                        </p>
                        <p className={`text-[10px] font-medium mt-1 ${isVendor ? 'text-[#c9a96e] text-right' : 'text-gray-400'}`}>
                          {isVendor ? 'You' : selectedBooking.guest_name} &middot; {formatTs(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Compose Box */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3 text-center items-center">
                <textarea
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message to the guest..."
                  rows={2}
                  className="flex-1 resize-none px-4 py-3 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ms-orange/30 focus:border-ms-orange-border text-gray-800 placeholder-gray-400 transition-colors dark:bg-slate-900 dark:text-white"
                />
                <button
                  onClick={sendMessage}
                  disabled={!compose.trim() || sending}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--ms-orange)] active:scale-95 hover:bg-ms-orange-hover text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0 "
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 font-medium mt-2">Press Enter to send, Shift+Enter for new line.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
