'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare, Search, Send, RefreshCw, CheckCircle2,
  AlertTriangle, Clock, ChevronRight,
} from 'lucide-react';

type Ticket = {
  id: string;
  ticket_number: string;
  vendor_id: string | null;
  user_id: string | null;
  subject: string;
  body: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  vendor?: { business_name: string; email: string };
};

type Reply = {
  id: string;
  ticket_id: string;
  user_id: string | null;
  body: string;
  is_admin_reply: boolean;
  created_at: string;
};

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved';

const priorityConfig: Record<string, string> = {
  low:    'bg-zinc-100 text-zinc-500 border-zinc-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high:   'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
};

const statusConfig: Record<string, string> = {
  open:        'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed:      'bg-zinc-100 text-zinc-500 border-zinc-200',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function SupportTicketsTab() {
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [replies, setReplies]       = useState<Reply[]>([]);
  const [selected, setSelected]     = useState<Ticket | null>(null);
  const [loading, setLoading]       = useState(true);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [replyText, setReplyText]   = useState('');
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const realtimeRef = useRef<any>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from('support_tickets')
      .select('*, vendor:vendors(business_name, email)')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (e) setError(e.message);
    else setTickets((data as Ticket[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const loadReplies = useCallback(async (ticketId: string) => {
    setRepliesLoading(true);
    const { data } = await supabase
      .from('support_ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setReplies(data || []);
    setRepliesLoading(false);
  }, []);

  // Subscribe to real-time updates for selected ticket
  useEffect(() => {
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }
    if (!selected) return;

    const channel = supabase
      .channel(`ticket-replies-${selected.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_ticket_replies', filter: `ticket_id=eq.${selected.id}` },
        (payload) => {
          setReplies(prev => [...prev, payload.new as Reply]);
          setTimeout(() => {
            threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
          }, 100);
        }
      )
      .subscribe();

    realtimeRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [selected?.id]);

  // Scroll to bottom when replies load
  useEffect(() => {
    setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, [replies]);

  const selectTicket = (ticket: Ticket) => {
    setSelected(ticket);
    setReplyText('');
    setError('');
    loadReplies(ticket.id);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    setError('');

    const { error: e } = await supabase.from('support_ticket_replies').insert({
      ticket_id: selected.id,
      body: replyText.trim(),
      is_admin_reply: true,
    });

    if (e) { setError(e.message); }
    else {
      // Update ticket status to in_progress and updated_at
      await supabase.from('support_tickets').update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      }).eq('id', selected.id);

      setReplyText('');
      setSuccess('Reply sent.');
      setTimeout(() => setSuccess(''), 2000);

      // Update local ticket
      setTickets(prev => prev.map(t => t.id === selected.id
        ? { ...t, status: 'in_progress', updated_at: new Date().toISOString() }
        : t));
      setSelected(prev => prev ? { ...prev, status: 'in_progress' } : prev);

      // Reload replies (real-time handles it but also manually refresh)
      await loadReplies(selected.id);
    }
    setSending(false);
  };

  const updateTicketStatus = async (status: 'in_progress' | 'resolved') => {
    if (!selected) return;
    await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', selected.id);
    setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status } : t));
    setSelected(prev => prev ? { ...prev, status } : prev);
    setSuccess(`Ticket marked as ${status.replace('_', ' ')}.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.subject.toLowerCase().includes(s) || t.ticket_number.toLowerCase().includes(s);
    }
    return true;
  });

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Support Tickets</h2>
        <p className="text-zinc-500 font-medium text-sm mt-1">Respond to vendor and guest support requests.</p>
      </div>

      {error && (
        <Alert className="bg-rose-50 border-rose-200 dark:bg-rose-700/40 dark:border-transparent dark:text-white">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-800 font-bold ml-2">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-50 border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 font-bold ml-2">{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4 h-[680px]">
        {/* Left panel: ticket list */}
        <div className="w-80 flex-shrink-0 bg-white border border-zinc-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 dark:bg-slate-900 dark:border-black">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets..."
                className="pl-9 h-9 bg-white border-zinc-200 text-sm font-medium"
              />
            </div>
            <div className="flex gap-1">
              {statusTabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setStatusFilter(t.key)}
                  className={`flex-1 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === t.key
                      ? 'bg-ms-admin-bg text-white'
                      : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-slate-700">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-zinc-100 dark:bg-slate-700 animate-pulse rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                <p className="text-zinc-400 font-medium text-sm">No tickets found</p>
              </div>
            ) : filtered.map(ticket => {
              const isActive = selected?.id === ticket.id;
              return (
                <button
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={`w-full text-left px-4 py-3 transition-all relative hover:bg-zinc-50 ${
                    isActive ? 'bg-ms-orange-light/70 border-l-2 border-l-ms-orange-border' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[10px] font-bold text-zinc-400">#{ticket.ticket_number}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${priorityConfig[ticket.priority] || priorityConfig.normal}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-zinc-900 text-xs truncate mb-1">{ticket.subject}</div>
                  <div className="text-[10px] text-zinc-400 font-medium truncate">{ticket.vendor?.business_name || 'Guest'}</div>
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${statusConfig[ticket.status] || statusConfig.open}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo(ticket.updated_at)}
                    </span>
                  </div>
                  {isActive && <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ms-orange" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel: ticket thread */}
        <div className="flex-1 bg-white border border-zinc-200 dark:bg-slate-900/40 dark:text-white dark:border-transparent rounded-2xl shadow-sm flex flex-col overflow-hidden min-w-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <MessageSquare className="w-14 h-14 text-zinc-200" />
              <h3 className="text-lg font-bold text-zinc-400">Select a ticket to view</h3>
              <p className="text-zinc-400 text-sm font-medium">Click any ticket from the list to open the conversation thread.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 dark:bg-slate-900 dark:border-transparent dark:text-white">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs font-bold text-zinc-400 dark:text-ms-orange">#{selected.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${statusConfig[selected.status]}`}>
                        {selected.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${priorityConfig[selected.priority]}`}>
                        {selected.priority}
                      </span>
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">{selected.subject}</h3>
                    {selected.vendor && (
                      <div className="text-xs text-zinc-500 dark:text-white/30 font-medium mt-0.5">
                        {selected.vendor.business_name} · {selected.vendor.email}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {selected.status !== 'in_progress' && (
                      <Button size="sm" variant="outline" onClick={() => updateTicketStatus('in_progress')} className="h-8 text-[10px] font-black uppercase tracking-widest border-amber-200 text-amber-700 hover:bg-amber-50 dark:bg-amber-500/40 dark:text-black dark:border-transparent">
                        Mark In Progress
                      </Button>
                    )}
                    {selected.status !== 'resolved' && (
                      <Button size="sm" onClick={() => updateTicketStatus('resolved')} className="h-8 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-500/40 dark:text-black dark:border-transparent">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark Resolved
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={loadTickets} className="h-8 w-8 p-0 text-zinc-400">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Thread */}
              <div ref={threadRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Original message */}
                <div className="flex flex-col items-start">
                  <div className="max-w-[80%] bg-zinc-100 border dark:bg-slate-900 dark:border-transparent  border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-widest dark:text-white text-zinc-400 mb-2">
                      Original Message · {new Date(selected.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-white whitespace-pre-wrap">{selected.body}</p>
                  </div>
                </div>

                {/* Replies */}
                {repliesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                        <div className="w-64 h-14 bg-zinc-100 dark:bg-slate-700 animate-pulse rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : replies.map(reply => (
                  <div key={reply.id} className={`flex ${reply.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      reply.is_admin_reply
                        ? 'bg-ms-orange text-white rounded-br-sm '
                        : 'bg-zinc-100 border border-zinc-200 dark:bg-transparent/40 dark:border-transparent dark:text-white text-zinc-800 rounded-bl-sm'
                    }`}>
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                        reply.is_admin_reply ? 'text-ms-orange-light dark:text-ms-orange' : 'text-zinc-400 dark:text-white'
                      }`}>
                        {reply.is_admin_reply ? 'Admin' : 'Vendor'} · {timeAgo(reply.created_at)}
                      </div>
                      <p className="text-sm font-medium whitespace-pre-wrap">{reply.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <div className="px-5 py-4 border-t border-zinc-100 dark:bg-slate-700 dark:text-white bg-zinc-50/50">
                <div className="flex gap-3 items-end">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply();
                    }}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 bg-white dark:bg-transparent/10 dark:text-white text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-ms-orange/40 focus:border-ms-orange-border resize-none"
                  />
                  <Button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="h-11 px-5 bg-ms-orange hover:bg-ms-orange/80 text-white font-bold shadow-sm gap-2 flex-shrink-0"
                  >
                    {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </Button>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium mt-2 dark:text-white dark:bg-slate-950/40">Ctrl +Enter to send. Admin replies appear in gold.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
