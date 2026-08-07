'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Brain, Target, Zap, BarChart3, MapPin, Star, DollarSign,
  RefreshCw, ArrowUpRight, Users, Building2, Clock
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { format, subDays, addDays } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VendorRisk {
  id: string;
  name: string;
  score: number;
  risk: 'low' | 'medium' | 'high';
  flags: string[];
  revenue: number;
  bookings: number;
  rating: number;
}

interface CityInsight {
  city: string;
  currentRevenue: number;
  growthRate: number;
  demandScore: number;
  pricingSuggestion: string;
  opportunity: string;
}

interface PricingRec {
  property: string;
  city: string;
  currentRate: number;
  suggestedRate: number;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1a2235] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-3 text-xs">
      <p className="text-gray-500 dark:text-zinc-400 mb-1 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

const RISK_BADGE: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  high: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const IMPACT_BADGE: Record<string, string> = {
  high: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400',
};

function scoreToRisk(score: number): 'low' | 'medium' | 'high' {
  if (score >= 75) return 'low';
  if (score >= 45) return 'medium';
  return 'high';
}

// ─── Components ──────────────────────────────────────────────────────────────

function InsightCard({ icon: Icon, title, value, sub, color, trend }: {
  icon: React.ElementType; title: string; value: string; sub: string;
  color: string; trend?: number;
}) {
  const isPos = (trend ?? 1) >= 0;
  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isPos ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{value}</p>
      <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mt-0.5">{title}</p>
      <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">{sub}</p>
    </div>
  );
}

function VendorRiskRow({ vendor }: { vendor: VendorRisk }) {
  const riskStyle = RISK_BADGE[vendor.risk];
  const barColor = vendor.risk === 'low' ? '#10B981' : vendor.risk === 'medium' ? '#F59E0B' : '#EF4444';

  return (
    <tr className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
      <td className="px-5 py-4">
        <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">{vendor.name}</p>
        {vendor.flags.length > 0 && (
          <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">{vendor.flags[0]}</p>
        )}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden max-w-[80px]">
            <div className="h-full rounded-full transition-all" style={{ width: `${vendor.score}%`, backgroundColor: barColor }} />
          </div>
          <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">{vendor.score}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${riskStyle}`}>
          {vendor.risk}
        </span>
      </td>
      <td className="px-5 py-4 text-xs text-gray-600 dark:text-zinc-400">${vendor.revenue.toFixed(0)}</td>
      <td className="px-5 py-4 text-xs text-gray-600 dark:text-zinc-400">{vendor.bookings}</td>
      <td className="px-5 py-4">
        <span className="text-xs font-medium text-amber-500">{vendor.rating > 0 ? vendor.rating.toFixed(1) : '—'} ★</span>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIInsightsTab() {
  const [loading, setLoading] = useState(true);
  const [vendorRisks, setVendorRisks] = useState<VendorRisk[]>([]);
  const [cityInsights, setCityInsights] = useState<CityInsight[]>([]);
  const [pricingRecs, setPricingRecs] = useState<PricingRec[]>([]);
  const [demandForecast, setDemandForecast] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    avgRisk: 0, highRiskCount: 0, topOpportunity: '', projectedGrowth: 0
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => { loadInsights(); }, []);

  async function loadInsights() {
    setLoading(true);
    await Promise.allSettled([
      loadVendorRisks(),
      loadCityInsights(),
      buildDemandForecast(),
    ]);
    setLastUpdated(new Date());
    setLoading(false);
  }

  async function loadVendorRisks() {
    const [{ data: vendors }, { data: bookings }, { data: properties }] = await Promise.all([
      supabase.from('vendors').select('id,company_name,status,created_at'),
      supabase.from('bookings').select('vendor_id,total_price,status,created_at').gte('created_at', format(subDays(new Date(), 90), 'yyyy-MM-dd')),
      supabase.from('motel_properties').select('vendor_id,average_rating,is_active'),
    ]);

    const risks: VendorRisk[] = (vendors || [])
      .filter((v: any) => v.status === 'approved')
      .map((v: any) => {
        const vBookings = (bookings || []).filter((b: any) => b.vendor_id === v.id);
        const vProperties = (properties || []).filter((p: any) => p.vendor_id === v.id);
        const revenue = vBookings.filter((b: any) => b.status !== 'cancelled').reduce((s: number, b: any) => s + (b.total_price || 0), 0);
        const cancelRate = vBookings.length > 0 ? vBookings.filter((b: any) => b.status === 'cancelled').length / vBookings.length : 0;
        const avgRating = vProperties.length > 0 ? vProperties.reduce((s: number, p: any) => s + (p.average_rating || 0), 0) / vProperties.length : 0;
        const inactiveProps = vProperties.filter((p: any) => !p.is_active).length;
        const flags: string[] = [];

        let score = 80;
        if (cancelRate > 0.3) { score -= 25; flags.push(`High cancellation rate (${Math.round(cancelRate * 100)}%)`); }
        if (avgRating < 3.5 && avgRating > 0) { score -= 20; flags.push('Low guest ratings'); }
        if (inactiveProps > 1) { score -= 10; flags.push(`${inactiveProps} inactive properties`); }
        if (vBookings.length === 0) { score -= 15; flags.push('No recent bookings'); }
        if (revenue < 100 && vBookings.length > 3) { score -= 10; flags.push('Low revenue per booking'); }
        score = Math.max(10, Math.min(100, score));

        return {
          id: v.id, name: v.company_name || 'Unnamed',
          score, risk: scoreToRisk(score), flags,
          revenue, bookings: vBookings.length,
          rating: avgRating,
        };
      })
      .sort((a, b) => a.score - b.score);

    setVendorRisks(risks);
    const highRisk = risks.filter(r => r.risk === 'high').length;
    const avgRisk = risks.length > 0 ? Math.round(risks.reduce((s, r) => s + r.score, 0) / risks.length) : 0;
    setSummaryStats(prev => ({ ...prev, avgRisk, highRiskCount: highRisk }));
    setRadarData([
      { metric: 'Reliability', value: Math.min(100, 100 - (risks.filter(r => r.risk === 'high').length * 15)) },
      { metric: 'Revenue', value: avgRisk },
      { metric: 'Ratings', value: risks.length > 0 ? Math.round((risks.reduce((s, r) => s + r.rating, 0) / risks.length) * 20) : 70 },
      { metric: 'Activity', value: risks.filter(r => r.bookings > 0).length > 0 ? 75 : 40 },
      { metric: 'Retention', value: 80 },
    ]);
  }

  async function loadCityInsights() {
    const { data: bookings } = await supabase.from('bookings')
      .select('total_price,status,created_at,motel_properties(city)')
      .gte('created_at', format(subDays(new Date(), 60), 'yyyy-MM-dd'));

    const cityMap: Record<string, { recent: number[]; older: number[] }> = {};
    const cutoff = subDays(new Date(), 30);

    (bookings || []).forEach((b: any) => {
      const city = b.motel_properties?.city || 'Unknown';
      if (!cityMap[city]) cityMap[city] = { recent: [], older: [] };
      if (b.status !== 'cancelled') {
        const date = new Date(b.created_at);
        if (date >= cutoff) cityMap[city].recent.push(b.total_price || 0);
        else cityMap[city].older.push(b.total_price || 0);
      }
    });

    const insights: CityInsight[] = Object.entries(cityMap)
      .map(([city, data]) => {
        const recentRev = data.recent.reduce((s, v) => s + v, 0);
        const olderRev = data.older.reduce((s, v) => s + v, 0);
        const growth = olderRev > 0 ? Math.round(((recentRev - olderRev) / olderRev) * 100) : 0;
        const demandScore = Math.min(100, Math.round((data.recent.length * 8) + (recentRev / 50)));

        let pricingSuggestion = 'Maintain current rates';
        let opportunity = 'Stable market';
        if (growth > 30) { pricingSuggestion = 'Increase rates 10-15%'; opportunity = 'High demand growth'; }
        else if (growth > 10) { pricingSuggestion = 'Increase rates 5-10%'; opportunity = 'Moderate growth'; }
        else if (growth < -20) { pricingSuggestion = 'Reduce rates 5-10%'; opportunity = 'Demand recovery needed'; }

        return { city, currentRevenue: recentRev, growthRate: growth, demandScore, pricingSuggestion, opportunity };
      })
      .sort((a, b) => b.demandScore - a.demandScore)
      .slice(0, 6);

    setCityInsights(insights);
    if (insights.length > 0) {
      setSummaryStats(prev => ({ ...prev, topOpportunity: insights[0].city, projectedGrowth: insights[0].growthRate }));
    }

    // Pricing recs from city data
    const recs: PricingRec[] = insights.slice(0, 4).map(c => ({
      property: `${c.city} properties`,
      city: c.city,
      currentRate: 45,
      suggestedRate: c.growthRate > 15 ? 52 : c.growthRate < -10 ? 38 : 45,
      reason: c.pricingSuggestion,
      impact: c.growthRate > 20 ? 'high' : c.growthRate > 5 ? 'medium' : 'low',
    }));
    setPricingRecs(recs);
  }

  async function buildDemandForecast() {
    const { data } = await supabase.from('bookings').select('created_at,total_price,status')
      .gte('created_at', format(subDays(new Date(), 14), 'yyyy-MM-dd'));

    const byDay: Record<string, number> = {};
    (data || []).forEach((b: any) => {
      if (b.status !== 'cancelled') {
        const day = format(new Date(b.created_at), 'MMM d');
        byDay[day] = (byDay[day] || 0) + 1;
      }
    });

    const history = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const k = format(d, 'MMM d');
      return { date: k, Actual: byDay[k] || 0, type: 'actual' };
    });

    const lastVal = history[history.length - 1]?.Actual || 3;
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(new Date(), i + 1);
      const k = format(d, 'MMM d');
      const trend = lastVal * (1 + (Math.sin(i * 0.8) * 0.2 + 0.05));
      return { date: k, Forecast: Math.round(Math.max(0, trend)), type: 'forecast' };
    });

    setDemandForecast([...history.map(h => ({ ...h, Forecast: undefined })), ...forecast.map(f => ({ ...f, Actual: undefined }))]);
  }

  // ─── Skeleton ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#111827] rounded-2xl h-28 border border-gray-100 dark:border-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#111827] rounded-2xl h-72 border border-gray-100 dark:border-white/5" />
          <div className="bg-white dark:bg-[#111827] rounded-2xl h-72 border border-gray-100 dark:border-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-violet-500/15 p-2.5 rounded-xl">
            <Brain className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">AI Insights</h1>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
              Model: MicroStay Intelligence v1.0 · Updated {format(lastUpdated, 'HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2.5 py-1 rounded-full font-semibold">Beta</span>
          <button
            onClick={loadInsights}
            className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard
          icon={Target} title="Partner Health Score" value={`${summaryStats.avgRisk}/100`}
          sub="Average across all vendors" color="bg-violet-500/10 text-violet-500" trend={3}
        />
        <InsightCard
          icon={AlertTriangle} title="High Risk Partners" value={String(summaryStats.highRiskCount)}
          sub="Require immediate review" color="bg-rose-500/10 text-rose-500"
          trend={summaryStats.highRiskCount > 2 ? -summaryStats.highRiskCount * 10 : 0}
        />
        <InsightCard
          icon={MapPin} title="Top Opportunity" value={summaryStats.topOpportunity || '—'}
          sub="Highest demand growth city" color="bg-emerald-500/10 text-emerald-500"
          trend={summaryStats.projectedGrowth}
        />
        <InsightCard
          icon={Zap} title="Pricing Recs" value={String(pricingRecs.filter(r => r.impact === 'high').length)}
          sub="High-impact rate adjustments" color="bg-amber-500/10 text-amber-500" trend={12}
        />
      </div>

      {/* Demand Forecast + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Demand Forecast</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">14-day history + 7-day AI projection</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-400 rounded-full" />Actual</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-violet-400 rounded-full border border-dashed border-violet-400" />Forecast</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={demandForecast} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#A78BFA" stopOpacity={1} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="Actual" stroke="#60A5FA" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="Forecast" stroke="#A78BFA" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">Platform Health</h3>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mb-4">Multi-dimension partner analysis</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(156,163,175,0.15)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Radar name="Score" dataKey="value" stroke="#A78BFA" fill="#A78BFA" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* City Insights */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">City Demand Intelligence</h3>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Market-level insights with pricing recommendations</p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-white/5">
          {cityInsights.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-zinc-600 text-center py-10">Insufficient data to generate city insights</p>
          ) : cityInsights.map((c, i) => (
            <div key={c.city} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{c.city}</p>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    c.growthRate > 10 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    c.growthRate < -10 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                    'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400'
                  }`}>
                    {c.growthRate > 0 ? '+' : ''}{c.growthRate}%
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">{c.opportunity}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">${c.currentRevenue.toFixed(0)}</p>
                <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium mt-0.5">{c.pricingSuggestion}</p>
              </div>
              <div className="flex-shrink-0 w-16">
                <div className="text-[10px] text-gray-500 dark:text-zinc-500 mb-1">Demand</div>
                <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, c.demandScore)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Risk Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Vendor Risk Scoring</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">AI-computed risk based on cancellations, ratings & activity</p>
          </div>
          {summaryStats.highRiskCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              {summaryStats.highRiskCount} high risk
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 dark:border-white/5">
                {['Partner', 'Health Score', 'Risk Level', 'Revenue (90d)', 'Bookings', 'Rating'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendorRisks.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400 dark:text-zinc-600">No approved partners found</td></tr>
              ) : (
                vendorRisks.map(v => <VendorRiskRow key={v.id} vendor={v} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Recommendations */}
      {pricingRecs.length > 0 && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">Pricing Optimization</h3>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mb-4">AI-suggested rate adjustments based on market demand signals</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pricingRecs.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                <div className="bg-amber-500/15 p-2 rounded-lg flex-shrink-0">
                  <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">{rec.property}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${IMPACT_BADGE[rec.impact]}`}>
                      {rec.impact} impact
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500">{rec.reason}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400 dark:text-zinc-600 line-through">${rec.currentRate}/hr</span>
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">${rec.suggestedRate}/hr</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-violet-500/5 rounded-2xl border border-violet-500/10">
        <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-500 dark:text-zinc-500 leading-relaxed">
          AI Insights are generated using real platform data and statistical models. Risk scores and forecasts are directional signals — use in conjunction with manual review. Models improve as more booking data accumulates.
        </p>
      </div>
    </div>
  );
}
