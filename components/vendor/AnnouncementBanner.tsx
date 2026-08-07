'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Info, AlertTriangle, Wrench, Zap } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'maintenance' | 'urgent';
}

const typeConfig = {
  info:        { icon: Info,          bg: 'bg-blue-50 border-blue-200',     text: 'text-blue-800',  iconCls: 'text-blue-500' },
  warning:     { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-800', iconCls: 'text-amber-500' },
  maintenance: { icon: Wrench,        bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800',iconCls: 'text-purple-500' },
  urgent:      { icon: Zap,           bg: 'bg-red-50 border-red-200',       text: 'text-red-800',   iconCls: 'text-red-500' },
};

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('id, title, body, type')
        .eq('active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false });
      setAnnouncements(data || []);
    };
    load();
  }, []);

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 px-4 pt-3">
      {visible.map(a => {
        const cfg = typeConfig[a.type] || typeConfig.info;
        const Icon = cfg.icon;
        return (
          <div key={a.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${cfg.bg}`}>
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconCls}`} />
            <div className="flex-1 min-w-0">
              <span className={`font-bold ${cfg.text}`}>{a.title}: </span>
              <span className={`${cfg.text} opacity-80`}>{a.body}</span>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set(Array.from(prev).concat(a.id)))}
              className={`shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity ${cfg.iconCls}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
