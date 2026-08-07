'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Megaphone, Plus, Trash2, CheckCircle2, AlertTriangle,
  Info, Wrench, Zap, X, RefreshCw, ToggleLeft, ToggleRight,
} from 'lucide-react';

type AnnouncementType = 'info' | 'warning' | 'maintenance' | 'urgent';

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  active: boolean;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
};

const typeConfig: Record<AnnouncementType, { label: string; cls: string; icon: React.ReactNode }> = {
  info:        { label: 'Info',        cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-transparent dark:border-transparent',   icon: <Info className="w-3 h-3" /> },
  warning:     { label: 'Warning',     cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-transparent dark:border-transparent', icon: <AlertTriangle className="w-3 h-3" /> },
  maintenance: { label: 'Maintenance', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-transparent dark:border-transparent', icon: <Wrench className="w-3 h-3" /> },
  urgent:      { label: 'Urgent',      cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-transparent dark:border-transparent',   icon: <Zap className="w-3 h-3" /> },
};

const typeBorderLeft: Record<AnnouncementType, string> = {
  info:        'border-l-blue-400',
  warning:     'border-l-amber-400',
  maintenance: 'border-l-purple-400',
  urgent:      'border-l-rose-500',
};

const defaultForm = {
  title: '',
  body: '',
  type: 'info' as AnnouncementType,
  expires_at: '',
  active: true,
};

export function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    else setAnnouncements(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSaving(true);
    setError('');
    const payload: any = {
      title: form.title.trim(),
      body: form.body.trim(),
      type: form.type,
      active: form.active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    const { error: e } = await supabase.from('announcements').insert(payload);
    if (e) { setError(e.message); }
    else {
      setSuccess('Announcement created.');
      setForm(defaultForm);
      setShowForm(false);
      setTimeout(() => setSuccess(''), 3000);
      await load();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    setDeletingId(id);
    await supabase.from('announcements').delete().eq('id', id);
    setDeletingId(null);
    await load();
    setSuccess('Announcement deleted.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const toggleActive = async (ann: Announcement) => {
    setTogglingId(ann.id);
    await supabase.from('announcements').update({ active: !ann.active }).eq('id', ann.id);
    setTogglingId(null);
    await load();
  };

  if (loading) return <div className="h-64 bg-zinc-200 dark:bg-slate-700 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Platform Announcements</h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">Broadcast messages to all vendors and guests on the platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} className="text-zinc-700 font-bold border-zinc-300 gap-2 dark:bg-transparent/50 dark:border-transparent dark:text-zinc-500 dark:hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={() => { setShowForm(v => !v); setError(''); }}
            className="bg-ms-admin-bg hover:bg-ms-admin-surface text-white font-bold shadow-sm gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'New Announcement'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="bg-rose-50 dark:bg-rose-700/40 dark:border-transparent border-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-white" />
          <AlertDescription className="text-rose-800 dark:text-white font-bold ml-2">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-50 border-emerald-200 dark:border-transparent dark:bg-emerald-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-white" />
          <AlertDescription className="text-emerald-800 dark:text-white font-bold ml-2">{success}</AlertDescription>
        </Alert>
      )}

      {/* Inline create form */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-widest">Create New Announcement</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Title</label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Announcement title..."
                className="h-10 bg-white border-zinc-200 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Body</label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Announcement details..."
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-ms-orange/40 focus:border-ms-orange-border resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as AnnouncementType }))}
                className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-ms-orange/40 focus:border-ms-orange-border"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-ms-orange/40 focus:border-ms-orange-border"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Active</label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                className="focus:outline-none"
              >
                {form.active
                  ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                  : <ToggleLeft className="w-7 h-7 text-zinc-300" />}
              </button>
              <span className="text-sm font-medium text-zinc-600">{form.active ? 'Visible to users' : 'Hidden'}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-ms-orange hover:bg-ms-orange/80 text-white font-bold shadow-sm gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Announcement
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(defaultForm); setError(''); }} className="font-bold border-zinc-200">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Announcement list */}
      {announcements.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-16 text-center">
          <Megaphone className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-900">No announcements yet</h3>
          <p className="text-zinc-500 font-medium mt-1">Create your first platform announcement to broadcast to all users.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const cfg = typeConfig[ann.type] || typeConfig.info;
            const borderLeft = typeBorderLeft[ann.type] || 'border-l-blue-400';
            const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
            return (
              <div
                key={ann.id}
                className={`bg-white border border-zinc-200 border-l-4 ${borderLeft} rounded-xl shadow-sm p-5 flex items-start gap-4 ${!ann.active ? 'opacity-60' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${cfg.cls}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    {!ann.active && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-400 border border-zinc-200">Inactive</span>
                    )}
                    {isExpired && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-500 border border-rose-200">Expired</span>
                    )}
                  </div>
                  <h4 className="font-bold text-zinc-900 text-sm">{ann.title}</h4>
                  <p className="text-zinc-500 text-sm font-medium mt-1 line-clamp-2">{ann.body}</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Created {new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {ann.expires_at && (
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Expires {new Date(ann.expires_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    title={ann.active ? 'Deactivate' : 'Activate'}
                    disabled={togglingId === ann.id}
                    onClick={() => toggleActive(ann)}
                    className="focus:outline-none"
                  >
                    {togglingId === ann.id
                      ? <RefreshCw className="w-6 h-6 text-zinc-300 animate-spin" />
                      : ann.active
                        ? <ToggleRight className="w-7 h-7 text-emerald-500 hover:text-emerald-600 transition-colors" />
                        : <ToggleLeft className="w-7 h-7 text-zinc-300 hover:text-zinc-400 transition-colors" />
                    }
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={deletingId === ann.id}
                    onClick={() => handleDelete(ann.id)}
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:bg-transparent dark:hover:bg-transparent"
                  >
                    {deletingId === ann.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
