'use client';

import { useState, useEffect } from 'react';
import { Clock, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function VendorHeader() {
  const [time, setTime] = useState('');
  const { profile } = useAuth();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-16 bg-slate-900/50 border-b border-slate-700 px-6 flex items-center justify-between backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-mono text-sm text-cyan-400">
          <Clock className="w-4 h-4" />
          {time}
        </div>
        <div className="text-sm text-slate-400">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-400 hover:text-slate-300" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
