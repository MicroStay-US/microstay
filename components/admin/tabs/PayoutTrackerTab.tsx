'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { exportToCSV } from '@/lib/exportUtils';
import {
  DollarSign, Download, RefreshCw, CheckCircle2, AlertTriangle,
  Clock, TrendingUp, Users,
} from 'lucide-react';

type PayoutRow = {
  id: string;
  vendor_id: string;
  invoice_id: string | null;
  period_label: string;
  total_gross: number;
  commission_deducted: number;
  platform_fees: number;
  penalties: number;
  net_payout: number;
  status: 'pending' | 'processing' | 'paid';
  paid_at: string | null;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
  vendor?: { business_name: string; email: string };
};

type StatusFilter = 'all' | 'pending' | 'processing' | 'paid';

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    pending:    'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    paid:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${cfg[status] || cfg.pending}`}>
      {status === 'paid' ? '✓ Paid' : status === 'processing' ? '⟳ Processing' : '⏳ Pending'}
    </span>
  );
}

export function PayoutTrackerTab() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError('');

    // Try payouts table first
    const { data: rawPayouts, error: pErr } = await supabase
      .from('payouts')
      .select('*, vendor:vendors(business_name, email)')
      .order('created_at', { ascending: false });

    if (!pErr && rawPayouts && rawPayouts.length > 0) {
      setPayouts(rawPayouts as PayoutRow[]);
    } else {
      // Fallback: derive from paid invoices
      const { data: invoices, error: iErr } = await supabase
        .from('invoices')
        .select('*, vendor:vendors(business_name, email)')
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (iErr) { setError(iErr.message); setLoading(false); return; }

      const derived: PayoutRow[] = (invoices || []).map(inv => {
        const gross = Number(inv.total_gross) || 0;
        const commission = Number(inv.total_commission) || 0;
        const fees = Number(inv.total_platform_fees) || 0;
        const penalties = Number(inv.total_penalties) || 0;
        const net = gross - commission - fees - penalties;
        return {
          id: inv.id,
          vendor_id: inv.vendor_id,
          invoice_id: inv.id,
          period_label: inv.invoice_period || '—',
          total_gross: gross,
          commission_deducted: commission,
          platform_fees: fees,
          penalties,
          net_payout: net,
          status: 'paid',
          paid_at: inv.paid_date || null,
          paid_by: null,
          notes: 'Derived from invoice',
          created_at: inv.created_at,
          vendor: inv.vendor,
        };
      });
      setPayouts(derived);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadPayouts(); }, [loadPayouts]);

  const markPaid = async (payout: PayoutRow) => {
    setActionLoading(prev => ({ ...prev, [payout.id]: true }));
    setError('');
    const { error: e } = await supabase
      .from('payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payout.id);
    if (e) { setError(e.message); }
    else { setSuccess('Payout marked as paid.'); setTimeout(() => setSuccess(''), 3000); }
    setActionLoading(prev => ({ ...prev, [payout.id]: false }));
    await loadPayouts();
  };

  const handleExport = () => {
    const rows = filtered.map(p => ({
      'Period': p.period_label,
      'Vendor': p.vendor?.business_name || '—',
      'Vendor Email': p.vendor?.email || '—',
      'Gross Revenue': `$${p.total_gross.toFixed(2)}`,
      'Commission': `$${p.commission_deducted.toFixed(2)}`,
      'Platform Fees': `$${p.platform_fees.toFixed(2)}`,
      'Penalties': `$${p.penalties.toFixed(2)}`,
      'Net Payout': `$${p.net_payout.toFixed(2)}`,
      'Status': p.status,
      'Paid At': p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—',
    }));
    exportToCSV(rows, 'microstay-payouts');
  };

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return payouts;
    return payouts.filter(p => p.status === statusFilter);
  }, [payouts, statusFilter]);

  // KPIs
  const totalPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.net_payout, 0);
  const totalPaid    = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.net_payout, 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth   = payouts.filter(p => p.status === 'paid' && p.paid_at && p.paid_at >= monthStart)
    .reduce((s, p) => s + p.net_payout, 0);
  const awaitingCount = new Set(payouts.filter(p => p.status !== 'paid').map(p => p.vendor_id)).size;

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'paid', label: 'Paid' },
  ];

  if (loading) return <div className="h-64 bg-zinc-200 dark:bg-slate-700 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Payout Tracker</h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">Track and manage vendor net payouts after platform fees.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0} className="dark:bg-transparent/40 dark:text-white text-zinc-700 font-bold border-zinc-300 gap-2">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="outline" onClick={loadPayouts} className="text-zinc-700 font-bold border-zinc-300 gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200  rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Pending</p>
          </div>
          <p className="text-2xl font-black text-amber-600">${totalPending.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">awaiting payout</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Paid Out</p>
          </div>
          <p className="text-2xl font-black text-emerald-600">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">all time</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">This Month</p>
          </div>
          <p className="text-2xl font-black text-zinc-900">${thisMonth.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">paid this month</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Awaiting</p>
          </div>
          <p className="text-2xl font-black text-zinc-900">{awaitingCount}</p>
          <p className="text-xs text-zinc-400 mt-1">vendors pending payment</p>
        </div>
      </div>

      {error && (
        <Alert className="bg-rose-50 dark:bg-rose-700/40 dark:border-transparent border-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-white" />
          <AlertDescription className="text-rose-800 dark:text-white font-bold ml-2">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-700/40 dark:border-transparent">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-white" />
          <AlertDescription className="text-emerald-800 dark:text-white font-bold ml-2">{success}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div className="bg-white border border-zinc-200 dark:border-transparent dark:bg-slate-950 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-transparent dark:bg-slate-900 bg-zinc-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-zinc-400" />
            <h3 className="font-bold text-zinc-900">Payouts ({filtered.length})</h3>
          </div>
          <div className="flex gap-1 bg-zinc-100 dark:bg-slate-950 p-1 rounded-lg">
            {statusTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                  statusFilter === t.key
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <DollarSign className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-zinc-900">No payouts found</h3>
            <p className="text-zinc-500 font-medium mt-1">Payouts appear here once invoices are processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b dark:bg-slate-900 dark:border-transparent border-zinc-200">
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vendor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Period</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Gross Revenue</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Our Cut</th>
                  <th className="px-6 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right">Net Payout</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Paid Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-black">
                {filtered.map(p => {
                  const ourCut = p.commission_deducted + p.platform_fees + p.penalties;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors dark:bg-slate-700 dark:hover:bg-slate-700/40 bg-white">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="font-bold text-zinc-900 dark:text-ms-orange">{p.vendor?.business_name || '—'}</div>
                        <div className="text-xs text-zinc-500 font-medium mt-0.5 dark:text-white/40">{p.vendor?.email || '—'}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="font-bold text-zinc-700 dark:text-white/30">{p.period_label}</div>
                        <div className="text-[10px] text-zinc-400 font-medium mt-0.5 dark:text-white">#{p.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-zinc-900 dark:text-ms-orange-light">
                        ${p.total_gross.toFixed(2)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <span className="font-bold text-zinc-600">${ourCut.toFixed(2)}</span>
                        <div className="text-[10px] text-zinc-400 mt-0.5 ">comm + fees + penalties</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <span className="font-black text-emerald-600 text-lg">${p.net_payout.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-zinc-600 dark:text-white">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        {p.status !== 'paid' ? (
                          <Button
                            size="sm"
                            disabled={actionLoading[p.id]}
                            onClick={() => markPaid(p)}
                            className="h-8 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-800/40 dark:text-white dark:border-transparent"
                          >
                            {actionLoading[p.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Mark Paid'}
                          </Button>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Settled</span>
                        )}
                      </td>
                    </tr>
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
