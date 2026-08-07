'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, Megaphone, Calendar, XCircle, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: 'booking_confirmed' | 'booking_cancelled' | 'new_review' | 'system' | string;
  title: string;
  body?: string;
  read: boolean;
  created_at: string;
  data?: Record<string, any>;
}

const typeIcon: Record<string, React.ReactNode> = {
  booking_confirmed: <Calendar className="w-3.5 h-3.5 text-ms-teal" />,
  booking_cancelled: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
  new_review: <Star className="w-3.5 h-3.5 text-amber-400" />,
  system: <Megaphone className="w-3.5 h-3.5 text-[#c9a96e]" />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationBellProps {
  variant?: 'admin' | 'vendor';
}

export function NotificationBell({ variant = 'vendor' }: NotificationBellProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25);
    setNotifications(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: push new notifications to top
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-2 rounded-lg transition-all duration-150 ${
          variant === 'admin'
            ? 'text-slate-500 hover:text-slate-800 hover:bg-ms-bg dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
            : 'text-slate-500 hover:text-slate-800 hover:bg-ms-bg dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#0d1b35] border border-[#e2e8f0] dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] dark:border-white/10 bg-ms-bg dark:bg-[#0a1628]">
            <div>
              <p className="text-sm font-bold text-ms-text dark:text-white">Notifications</p>
              <p className="text-[11px] text-slate-400 dark:text-white/40">
                {unread > 0 ? `${unread} unread` : 'All caught up'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1.5 rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-ms-bg dark:divide-white/5">
            {loading ? (
              <div className="py-10 text-center">
                <div className="w-5 h-5 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-7 h-7 text-slate-200 dark:text-white/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400 dark:text-white/40">No notifications yet</p>
                <p className="text-[11px] text-slate-300 dark:text-white/20 mt-1">We'll alert you for bookings & updates</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    !n.read
                      ? 'bg-[#c9a96e]/5 hover:bg-[#c9a96e]/10 dark:bg-[#c9a96e]/5 dark:hover:bg-[#c9a96e]/10'
                      : 'hover:bg-ms-bg dark:hover:bg-white/5'
                  }`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    !n.read ? 'bg-[#c9a96e]/15' : 'bg-ms-bg dark:bg-white/10'
                  }`}>
                    {typeIcon[n.type] || <Bell className="w-3.5 h-3.5 text-slate-400" />}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold leading-snug ${
                      !n.read ? 'text-ms-text dark:text-white' : 'text-slate-500 dark:text-white/50'
                    }`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-slate-400 dark:text-white/40 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-300 dark:text-white/25 mt-1 font-medium">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="w-2 h-2 bg-[#c9a96e] rounded-full mt-1 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-ms-bg dark:border-white/10 bg-ms-bg dark:bg-[#0a1628]">
              <button
                onClick={clearAll}
                className="text-[11px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 font-medium transition-colors"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
