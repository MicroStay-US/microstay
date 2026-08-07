'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import type { FeeLedgerEntry } from '@/lib/vendor-types';
import { Button } from '@/components/ui/button';
import { DollarSign, Download } from 'lucide-react';

export default function VendorFeesPage() {
  const router = useRouter();
  const { vendor, role } = useVendor();
  const [ledger, setLedger] = useState<FeeLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'front_desk') router.push('/vendor/dashboard');
  }, [role, router]);

  const loadLedger = useCallback(async () => {
    if (!vendor) return;
    const { data } = await supabase
      .from('fee_ledger')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('ledger_date', { ascending: false });
    setLedger((data || []) as FeeLedgerEntry[]);
    setLoading(false);
  }, [vendor]);

  useEffect(() => { loadLedger(); }, [loadLedger]);

  if (role === 'front_desk') return null;

  const monthGroups: Record<string, FeeLedgerEntry[]> = {};
  ledger.forEach((entry) => {
    const month = entry.ledger_date.substring(0, 7);
    if (!monthGroups[month]) monthGroups[month] = [];
    monthGroups[month].push(entry);
  });

  const exportCsv = (month: string, entries: FeeLedgerEntry[]) => {
    const header = 'Date,Type,Gross,12% Fee,Total Fee,Net\n';
    const rows = entries.map((e) =>
      `${e.ledger_date},${e.entry_type},${e.gross_amount || ''},${e.pct_fee || ''},${e.total_fee},${e.vendor_net || ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `microstay-fees-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        <div className="h-8 bg-slate-800 rounded w-48 animate-pulse" />
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Fee & Penalty Statement</h1>
        <p className="text-slate-400 mt-1">Monthly financial accountability to MicroStay</p>
      </div>

      {ledger.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-12 text-center">
          <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Fee Records Yet</h3>
          <p className="text-slate-400 max-w-sm mx-auto">Fees will appear here after your first check-in or owner cancellation.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(monthGroups).map(([month, entries]) => {
            const checkinEntries = entries.filter((e) => e.entry_type === 'checkin_fee');
            const penaltyEntries = entries.filter((e) => e.entry_type === 'owner_cancel_penalty');
            const totalGross = checkinEntries.reduce((s, e) => s + Number(e.gross_amount || 0), 0);
            const totalFlat = checkinEntries.reduce((s, e) => s + Number(e.flat_fee || 0), 0);
            const totalPct = checkinEntries.reduce((s, e) => s + Number(e.pct_fee || 0), 0);
            const totalPenalties = penaltyEntries.reduce((s, e) => s + Number(e.total_fee || 0), 0);
            const totalOwed = checkinEntries.reduce((s, e) => s + Number(e.total_fee || 0), 0) + totalPenalties;
            const totalNet = checkinEntries.reduce((s, e) => s + Number(e.vendor_net || 0), 0);

            const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            return (
              <div key={month} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{monthLabel}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-rose-400 font-mono">Owed: ${totalOwed.toFixed(2)}</span>
                    <Button size="sm" variant="outline" onClick={() => exportCsv(month, entries)} className="border-slate-700 text-slate-300 h-8 text-xs">
                      <Download className="w-3 h-3 mr-1" />CSV
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b border-slate-800">
                  <div><p className="text-xs text-slate-500">Check-Ins</p><p className="text-lg font-bold font-mono text-white">{checkinEntries.length}</p></div>
                  <div><p className="text-xs text-slate-500">Gross</p><p className="text-lg font-bold font-mono text-amber-400">${totalGross.toFixed(2)}</p></div>
                  <div><p className="text-xs text-slate-500">12% Fees</p><p className="text-lg font-bold font-mono text-rose-400">${totalPct.toFixed(2)}</p></div>
                  <div><p className="text-xs text-slate-500">Your Net</p><p className="text-lg font-bold font-mono text-emerald-400">${totalNet.toFixed(2)}</p></div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left px-4 py-2 text-xs text-slate-500">Date</th>
                        <th className="text-left px-4 py-2 text-xs text-slate-500">Type</th>
                        <th className="text-right px-4 py-2 text-xs text-slate-500">Gross</th>
                        <th className="text-right px-4 py-2 text-xs text-slate-500">Fee</th>
                        <th className="text-right px-4 py-2 text-xs text-slate-500">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.id} className="border-b border-slate-800/50">
                          <td className="px-4 py-2 text-sm text-slate-400 font-mono">{new Date(e.ledger_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                              e.entry_type === 'checkin_fee' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}>
                              {e.entry_type === 'checkin_fee' ? 'Check-In Fee' : 'Cancel Penalty'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-amber-400 text-right font-mono">{e.gross_amount ? `$${Number(e.gross_amount).toFixed(2)}` : '-'}</td>
                          <td className="px-4 py-2 text-sm text-rose-400 text-right font-mono">${Number(e.total_fee).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-emerald-400 text-right font-mono">{e.vendor_net ? `$${Number(e.vendor_net).toFixed(2)}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
