'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Download, TrendingUp, CheckCircle2, AlertTriangle, Search, Clock, Zap, RefreshCw } from 'lucide-react';
import { exportInvoicesToCSV } from '@/lib/exportUtils';
import { Input } from '@/components/ui/input';
import { useDateRange } from '@/contexts/DateRangeContext';

export function InvoicesTab() {
  const { dateRange } = useDateRange();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingStats, setBookingStats] = useState({ totalGross: 0, totalEarned: 0 });

  const loadInvoices = useCallback(async () => {
    setLoading(true);

    const { data: invoicesData } = await supabase
      .from("invoices")
      .select(`id, vendor_id, status, paid_date, created_at`)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    // Fetch bookings for live stats based on date range
    const { data: bookings } = await supabase
      .from("vd_bookings")
      .select(`
        vendor_id,
        gross_amount,
        status,
        booking_date,
        vendor:vendors(
          id,
          business_name,
          email,
          poc_name
        )
      `)
      .eq("status", "checked_in")
      .gte("booking_date", dateRange.start.toISOString().split("T")[0])
      .lte("booking_date", dateRange.end.toISOString().split("T")[0]);
      
    console.log("bookings", bookings);
    console.log("bookings", invoicesData);

    let totalGross = 0;
    let totalEarned = 0;
    const vendorAggregates: Record<string, any> = {};

    if (bookings) {
      bookings.forEach(b => {
        const vId = b.vendor_id;
        const gross = Number(b.gross_amount || 0);

        totalGross += gross;
        
        if (!vendorAggregates[vId]) {
          const matchedInvoice = invoicesData?.find(inv => inv.vendor_id == vId);
          vendorAggregates[vId] = {
            id: matchedInvoice ? matchedInvoice.id : (vId + "-" + Date.now()), // Unique UI key
            is_fake: !matchedInvoice,
            vendor_id: vId,
            vendor: Array.isArray(b.vendor) ? b.vendor[0] : b.vendor, // Safely handle one-to-one mapping
            invoice_period: `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
            total_gross: 0,
            booking_count: 0,
            status: matchedInvoice ? matchedInvoice.status : 'pending',
            paid_date: matchedInvoice ? matchedInvoice.paid_date : null,
            created_at: matchedInvoice ? matchedInvoice.created_at : new Date().toISOString()
          };
        }
        vendorAggregates[vId].total_gross += gross;
        vendorAggregates[vId].booking_count += 1;
      });

      totalEarned = (totalGross * 0.12);
    }

    const processedInvoices = Object.values(vendorAggregates).map(inv => {
      inv.total_commission = inv.total_gross * 0.12;
      // inv.total_platform_fees = inv.booking_count * 5;
      inv.total_due = inv.total_commission;//add pentality here with ?+  code
      return inv;
    });

    // Auto-create invoices in the database if they do not exist
    const missingInvoices = processedInvoices.filter(inv => inv.is_fake);
    if (missingInvoices.length > 0) {
      const insertPayload = missingInvoices.map(inv => ({
        vendor_id: inv.vendor_id,
        invoice_period: inv.invoice_period,
        total_commission: inv.total_commission,
        total_platform_fees: inv.total_platform_fees,
        total_due: inv.total_due,
        status: 'pending',
        issued_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }));

      const { data: insertedInvoices, error: insertError } = await supabase
        .from('invoices')
        .insert(insertPayload)
        .select();

      if (!insertError && insertedInvoices) {
        insertedInvoices.forEach(realInv => {
          const uiInv = processedInvoices.find(p => p.vendor_id === realInv.vendor_id);
          if (uiInv) {
            uiInv.id = realInv.id;
            uiInv.is_fake = false;
            uiInv.status = realInv.status;
            uiInv.created_at = realInv.created_at;
          }
        });
      }
    }

    setBookingStats({ totalGross, totalEarned });
    setInvoices(processedInvoices);
    setLoading(false);
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const generateLastMonth = async () => {
    if (!confirm('Execute monthly billing cycle? This will calculate all commission ledgers for the prior 30 days.')) return;
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const period = lastMonth.toISOString().split('T')[0].substring(0, 7);

      const { data: vendors } = await supabase.from('vendors').select('id').eq('status', 'approved');
      if (vendors) {
        let count = 0;
        for (const v of vendors) {
          const { error: rpcError } = await supabase.rpc('generate_monthly_invoice', {
            p_vendor_id: v.id,
            p_billing_month: lastMonth.toISOString().split('T')[0]
          });
          if (!rpcError) count++;
        }
        setSuccess(`Billed ${count} vendor accounts for ${period} operational ledgers.`);
        loadInvoices();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute billing run. Ensure RPC is compiled in Supabase.');
    }
    setGenerating(false);
  };

  const markPaid = async (inve: any) => {
    try {
      setError('');
      if (inve.is_fake) {
        const { error } = await supabase.from('invoices').insert({
          vendor_id: inve.vendor_id,
          invoice_period: inve.invoice_period,
          total_commission: inve.total_commission,
          total_platform_fees: inve.total_platform_fees,
          total_due: inve.total_due,
          total_gross:inve.total_gross,
          payment_status:'paid',
          status: 'paid',
          issued_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paid_date: new Date().toISOString(),
          created_at: dateRange.end.toISOString()
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('invoices').update({ status: 'paid', paid_date: new Date().toISOString() }).eq('id', inve.id);
        if (error) throw error;
      }
      loadInvoices();
    } catch (err: any) {
      console.error("Mark Paid Error:", err);
      setError(err.message || 'Failed to update invoice status.');
    }
  };
  

  const downloadInvoiceCSV = (inve: any) => {
    const rows = [
      ['Field', 'Value'],
      ['Invoice ID', inve.id],
      ['Period', inve.invoice_period],
      ['Vendor', inve.vendor?.business_name || 'Unknown'],
      ['Vendor Email', inve.vendor?.email || ''],
      ['Commission (12%)', `$${Number(inve.total_commission).toFixed(2)}`],

      ['Total Due', `$${Number(inve.total_due).toFixed(2)}`],
      ['Status', inve.status],
      ['Generated', new Date(inve.created_at).toLocaleDateString()],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${inve.invoice_period}-${inve.vendor?.business_name || inve.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncVendorPortals = async () => {
    setSyncing(true);
    setError('');
    await loadInvoices();
    setSuccess('Vendor portal data synced successfully.');
    setTimeout(() => setSuccess(''), 4000);
    setSyncing(false);
  };

  const today = new Date().getDate();

  // ── Filter invoices by date range + search ──────────────────────────────────
  // Match on `issued_date` (the date the invoice was generated). If not present,
  // fall back to `created_at`. The selected date range comes from the toolbar
  // at the top of the admin dashboard.
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return invoices.filter((inve) => {
      if (q) {
        const hay = [
          inve.vendor?.business_name,
          inve.vendor?.email,
          inve.vendor?.poc_name,
          inve.invoice_period,
          inve.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [invoices, dateRange, searchQuery]);

  // ── Summary KPIs (over the filtered set) ────────────────────────────────────
  const totalGrossAllMotels  = bookingStats.totalGross;
  const totalMicroStayEarned = bookingStats.totalEarned;
  const paidOnTime  = filteredInvoices.filter(inve => {
    if (inve.status !== 'paid' || !inve.paid_date) return false;
    return new Date(inve.paid_date).getDate() <= 7;
  }).length;
  const overdueCount = filteredInvoices.filter(inve => inve.status === 'overdue').length;
  const pendingCount = filteredInvoices.filter(inve => inve.status === 'pending').length;

  // ── Totals for the footer row in the System Invoices table ──────────────────
  const totals = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, inve) => {
        const gross = Number(inve.total_gross) || Number(inve.total_commission) / 0.12;
        acc.gross += gross;
        acc.commission += Number(inve.total_commission) || 0;
        // acc.flatFees += Number(inve.total_platform_fees) || 0;
        acc.totalDue += Number(inve.total_due) || 0;
        return acc;
      },
      { gross: 0, commission: 0, totalDue: 0 }
    );
  }, [filteredInvoices]);

  if (loading) return <div className="h-64 bg-zinc-200 dark:bg-gray-700 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Automated Invoicing Engine</h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">Manage vendor billing sequences and platform commission collection.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportInvoicesToCSV(filteredInvoices)} disabled={filteredInvoices.length === 0} className="text-zinc-700 font-bold dark:bg-slate-700 dark:border-transparent dark:text-white dark:hover:bg-transparent/40 dark:hover:text-ms-orange border-zinc-300 gap-2">
            <Download className="w-3.5 h-3.5" /> Export CSV 
          </Button>
          <Button variant="outline" onClick={syncVendorPortals} disabled={syncing} className="text-zinc-700 font-bold border-zinc-300 dark:text-white dark:hover:bg-transparent/40 dark:hover:text-ms-orange dark:bg-slate-700 dark:border-transparent">
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            Sync Vendor Portals
          </Button>
          <Button onClick={generateLastMonth} disabled={generating} className="bg-ms-orange hover:bg-ms-orange/80 text-white font-bold shadow-sm ">
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Execute Billing Cycle
          </Button>
        </div>
      </div>

      {/* ── Summary KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Motel Gross</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">${totalGrossAllMotels.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">combined all vendors</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">MicroStay Earned</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">${totalMicroStayEarned.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">12% per booking</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Paid Before 7th</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{paidOnTime}</p>
          <p className="text-xs text-zinc-400 mt-1">on-time payments</p>
        </div>
        <div className={`border rounded-xl p-4 shadow-sm ${overdueCount > 0 ? 'bg-rose-50 border-rose-200 dark:bg-transparent/30 dark:border-transparent dark:text-zinc-600' : 'bg-white border-zinc-200 dark:bg-transparent/30 dark:border-transparent dark:text-zinc-600'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${overdueCount > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>Overdue / Pending</p>
          <p className={`text-2xl font-black mt-1 ${overdueCount > 0 ? 'text-rose-600' : 'text-zinc-900'}`}>{overdueCount} <span className="text-base font-bold text-zinc-400">/ {pendingCount}</span></p>
          <p className="text-xs text-zinc-400 mt-1">past 7-day deadline</p>
        </div>
      </div>

      {error && <Alert className="bg-rose-50 border-rose-200 dark:bg-transparent dark:text-rose-800 dark:border-transparent"><AlertTriangle className="h-4 w-4 text-rose-600 dark:text-white"/><AlertDescription className="text-rose-800 dark:text-white font-bold ml-2">{error}</AlertDescription></Alert>}
      {success && <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-600 dark:border-transparent"><CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-white"/><AlertDescription className="dark:text-white text-emerald-800 font-bold ml-2">{success}</AlertDescription></Alert>}

      {/* Monthly Chron Lifecycle Panel */}
      <div className="dark:bg-ms-admin-bg rounded-2xl p-6 shadow-sm bg-slate-300/40 dark:border dark:border-zinc-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-ms-orange/10 to-transparent pointer-events-none" />
        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Operations Lifecycle (Current Run)
        </h3>
        
        <div className=" flex flex-row justify-evenly relative z-10">
          <div className={`p-4 rounded-xl border ${today >= 1 ? 'bg-ms-orange-light dark:bg-transparent/30  dark:border-transparent border-ms-orange-border' : 'bg-zinc-800/50 border-zinc-700'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${today >= 1 ? 'bg-ms-orange text-white' : 'bg-zinc-700 text-zinc-400'}`}>Day 1</span>
            <p className="dark:text-white font-bold mt-3">Auto-Generate Invoices</p>
            <p className="text-xs text-zinc-400 font-medium mt-1">Engine parses 30-day aggregate flows  and generates<br></br> PDF receipts.</p>
          </div>
          
          <div className={`p-4 rounded-xl border ${today >= 5 ? 'bg-ms-orange-light border-ms-orange-border dark:bg-black dark:border-transparent' : 'bg-zinc-800/50 border-zinc-700 dark:bg-orange-200/40'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${today >= 5 ? 'bg-ms-orange text-white ' : 'bg-zinc-700 text-zinc-400'}`}>Day 5</span>
            <p className="dark:text-white font-bold mt-3">Trigger Email Reminders</p>
            <p className="text-xs text-zinc-400 font-medium mt-1">Alerts fired to all vendors with unsettled portal balances.</p>
          </div>
          
          {/* <div className={`p-4 rounded-xl border ${today >= 7 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-zinc-800/50 border-zinc-700 dark:bg-amber-600/40'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${today >= 7 ? 'bg-rose-500 text-white dark:bg-rose-500/40 dark:text-black' : 'dark:bg-gray-700 dark:text-white bg-zinc-700 text-zinc-400'}`}>Day 7+</span>
            <p className="text-white font-bold mt-3">Flag Overdue & Penalize</p>
            <p className="text-xs text-zinc-400 font-medium mt-1">System locks vendor APIs and enforces 5% hard penalty on balance.</p>
          </div> */}
        </div>
      </div>

      <div className="bg-white dark:border-transparent border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-5 border-b border-zinc-100 dark:border-transparent dark:bg-transparent/50 bg-zinc-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-zinc-400" />
            <h3 className="font-bold text-zinc-900">System Invoices</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-medium">
              {filteredInvoices.length} of {invoices.length} invoices
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search vendor name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 w-64 bg-white border-zinc-200 text-sm font-medium shadow-sm"
              />
            </div>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-zinc-900">
              {invoices.length === 0 ? 'Void Ledger' : 'No invoices in this date range'}
            </h3>
            <p className="text-zinc-500 font-medium mt-1">
              {invoices.length === 0
                ? 'Execute the billing cycle manually or await the 1st of the month chronological trigger.'
                : 'Adjust the date range at the top of the page or clear the search to see more invoices.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b dark:border-slate-900 dark:bg-slate-800 border-zinc-200">
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Billing Period</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vendor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Motel Gross</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Commission (12%)</th>

                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Total Due</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Paid ≤ 7th?</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-black">
                {filteredInvoices.map((inve) => {
                  const gross = Number(inve.total_gross) || Number(inve.total_commission) / 0.12;
                  const paidBeforeSeventh = inve.status === 'paid' && inve.paid_date && new Date(inve.paid_date).getDate() <= 7;
                  const paidAfterSeventh  = inve.status === 'paid' && inve.paid_date && new Date(inve.paid_date).getDate() > 7;
                  return (
                  <tr key={inve.id} className="hover:bg-zinc-50/80 transition-colors bg-white">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="font-bold text-zinc-900">{inve.invoice_period}</div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-1">#{inve.id.split('-')[0]}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="font-bold text-zinc-900 dark:text-ms-orange">{inve.vendor?.business_name || 'Unknown Vendor'}</div>
                      <div className="text-xs text-zinc-500 font-medium mt-0.5">{inve.vendor?.email}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <span className="font-black text-zinc-900">${gross.toFixed(2)}</span>
                      <div className="text-[10px] text-zinc-400 mt-0.5">motel collected</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-zinc-600">${Number(inve.total_commission).toFixed(2)}</td>
                    {/* <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-zinc-600">${Number(inve.total_platform_fees).toFixed(2)}</td> */}
                    <td className="px-6 py-5 whitespace-nowrap text-right font-black text-zinc-900 text-lg">${Number(inve.total_due).toFixed(2)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                        inve.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:border-transparent dark:bg-emerald-600/40 dark:text-white  ' :
                        inve.status === 'overdue' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:border-transparent dark:bg-rose-700/40 dark:text-white animate-pulse' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:border-transparent dark:bg-amber-600/40 dark:text-white '
                      }`}>
                        {inve.status === 'paid' ? '✓ Paid' : inve.status === 'overdue' ? '⚠ Overdue' : '⏳ Pending'}
                      </span>
                      {inve.paid_date && <div className="text-[10px] text-zinc-400 mt-1">{new Date(inve.paid_date).toLocaleDateString()}</div>}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      {inve.status !== 'paid' ? (
                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Not Paid</span>
                      ) : paidBeforeSeventh ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle2 className="w-3 h-3" /> On Time
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-widest">
                          <AlertTriangle className="w-3 h-3" /> Late
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => downloadInvoiceCSV(inve)} className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 border dark:hover:bg-transparent/50 dark:text-white border-zinc-200 active:scale-95" title="Download CSV">
                          <Download className="w-4 h-4" />
                        </Button>
                        {inve.status !== 'paid' && (
                          <Button size="sm" onClick={() => markPaid(inve)} className="h-8 text-[10px] font-black uppercase tracking-widest bg-ms-admin-bg text-white active:scale-95 hover:bg-ms-admin-surface shadow-sm">
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              {/* ── Totals row (sum across filtered invoices) ─────────────── */}
              <tfoot>
                <tr className="dark:bg-zinc-900 bg-zinc-300/40 text-black dark:text-white border-t-2 border-ms-orange">
                  <td className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" colSpan={2}>
                    Total ({filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'})
                  </td>
                  <td className="px-6 py-5 text-right font-black">
                    ${totals.gross.toFixed(2)}
                    <div className="text-[10px] dark:text-zinc-400 font-medium mt-0.5">combined gross</div>
                  </td>
                  <td className="px-6 py-5 text-right font-black">
                    ${totals.commission.toFixed(2)}
                  </td>
                  {/* <td className="px-6 py-5 text-right font-black">
                    ${totals.flatFees.toFixed(2)}
                  </td> */}
                  <td className="px-6 py-5 text-right font-black text-ms-orange text-lg">
                    ${totals.totalDue.toFixed(2)}
                  </td>
                  <td colSpan={3} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    ← Platform earnings
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
