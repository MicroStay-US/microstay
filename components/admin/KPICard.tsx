'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
  loading?: boolean;
}

export function KPICard({ title, value, icon, subtitle, trend, onClick, loading }: KPICardProps) {
  if (loading) {
    return (
      <Card className="rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`
        rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all
        ${onClick ? 'cursor-pointer hover:border-slate-300' : ''}
      `}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="text-sm font-medium text-slate-600">{title}</div>
          <div className="text-slate-400">{icon}</div>
        </div>

        <div className="mb-2">
          <div className="text-3xl font-bold text-slate-900">{value}</div>
        </div>

        {subtitle && (
          <div className="text-sm text-slate-500 mb-2">{subtitle}</div>
        )}

        {trend && (
          <div className="flex items-center gap-1">
            {trend.direction === 'up' && (
              <>
                <ArrowUp className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600">
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
              </>
            )}
            {trend.direction === 'down' && (
              <>
                <ArrowDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  {trend.value}%
                </span>
              </>
            )}
            {trend.direction === 'neutral' && (
              <>
                <Minus className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-400">
                  0%
                </span>
              </>
            )}
            <span className="text-xs text-slate-500 ml-1">vs previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
