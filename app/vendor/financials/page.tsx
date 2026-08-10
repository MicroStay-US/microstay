'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
// import { calculateFees, formatHour } from '@/lib/vendor-types';
// import { calculateFees } from '@/lib/vendor-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import { DownloadCloud, DollarSign, TrendingUp, TrendingDown, Receipt, Calendar as CalendarIcon, Ban } from 'lucide-react';

export default function VendorFinancialsPage() {
  return (
    <DateRangeProvider>
      <VendorFinancialsPageContent />
    </DateRangeProvider>
  );
}

function VendorFinancialsPageContent() {
  const { vendor, selectedPropertyId, role } = useVendor();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  
  const { dateRange } = useDateRange();
  const dateFrom = dateRange.start.toISOString().split('T')[0];
  const dateTo = dateRange.end.toISOString().split('T')[0];

  const loadFinancials = useCallback(async () => {
    if (!vendor || !selectedPropertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // Fetch checked-in bookings to calculate fee breakdowns dynamically since fee_ledger might lag or be complex joined.
    // The prompt requested: Total Earnings (Checked-in only), Platform Fees breakdown per booking.
    const { data: bData } = await supabase
      .from('vd_bookings')
      .select('*, slot:vd_time_slots(*)')
      .eq('vendor_id', vendor.id)
      .eq('property_id', selectedPropertyId)
      .in('status', ['checked_in']) // owner_cancel includes penalties
      .gte('booking_date', dateFrom)
      .lte('booking_date', dateTo)
      .order('booking_date', { ascending: false });

    setData(bData || []);
    setLoading(false);
  }, [vendor, selectedPropertyId, dateFrom, dateTo]);

  useEffect(() => {
    if (role === 'super_vendor') {
      loadFinancials();
    }
  }, [loadFinancials, role]);

  if (role === 'front_desk') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Ban className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-gray-500 font-medium">Front desk staff do not have access to financial reports.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-slate-700 h-96 rounded-xl m-8" />;
  }

  // Calculate Totals
  // const checkedIn = data.filter(b => b.status === 'checked_in');
  // const ownerCancel = data.filter(b => b.status === 'owner_cancel');

  // const totalGross = checkedIn.reduce((sum, b) => sum + Number(b.gross_amount), 0);
  // const totalNetEarnings = checkedIn.reduce((sum, b) => sum + calculateFees(Number(b.gross_amount)).vendorNet, 0);
  // const totalPlatformFees = checkedIn.reduce((sum, b) => sum + calculateFees(Number(b.gross_amount)).totalFee, 0);
  // const totalPenalties = ownerCancel.reduce((sum, b) => sum + Number(b.penalty_fee || 5.0), 0);
  
  // const netProfit = totalNetEarnings;
  // Calculate Totals
const checkedIn = data.filter(b => b.status === 'checked_in');

const totalGross = checkedIn.reduce(
  (sum, b) => sum + Number(b.gross_amount || 0),
  0
);

const totalPlatformFees = checkedIn.reduce(
  (sum, b) => sum + (Number(b.gross_amount || 0) * 0.12),
  0
);

const totalNetEarnings = totalGross - totalPlatformFees;

const netProfit = totalNetEarnings;
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Reports</h1>
          <p className="text-gray-500 font-medium mt-1">Track your earnings, platform fees, and export data for accounting.</p>
        </div>
        <Button variant="outline" className="border-gray-200 text-gray-700 font-bold hover:bg-gray-50 hover:text-gray-900 shadow-sm bg-white h-11 px-6 dark:bg-gray-800 dark:text-white hover:scale-105 active:scale-95">
          <DownloadCloud className="w-4 h-4 mr-2" /> Export to CSV
        </Button>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-0 overflow-hidden dark:bg-slate-900 dark:border-transparent">
        <DateRangeFilter />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Gross Revenue" value={`$${totalGross.toFixed(2)}`} subtext={`${checkedIn.length} completed stays`} icon={<DollarSign className="w-5 h-5 text-blue-600" />} color="bg-blue-50 border-blue-100" />
        <MetricCard title="MicroStay Platform Fees" value={`-$${totalPlatformFees.toFixed(2)}`} subtext="12% commission" icon={<TrendingDown className="w-5 h-5 text-rose-600" />} color="bg-rose-50 border-rose-100" />
        {/* <MetricCard title="Cancellation Penalties" value={`-$${totalPenalties.toFixed(2)}`} subtext={`${ownerCancel.length} host cancellations`} icon={<Ban className="w-5 h-5 text-amber-600" />} color="bg-amber-50 border-amber-100" /> */}
        <MetricCard title="Net Profit (Your Earnings)" value={`$${netProfit.toFixed(2)}`} subtext="Gross - Platform Fees" icon={<TrendingUp className="w-5 h-5 text-ms-teal" />} color="bg-ms-teal-light border-ms-teal-border" titleColor="text-ms-teal" valColor="text-ms-teal" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-transparent dark:bg-slate-900 bg-gray-50/50 flex gap-2 items-center">
          <Receipt className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900">Transaction Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b dark:bg-slate-800 border-gray-100 dark:border-transparent">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Ref</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Guest & Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Gross Collected</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">MicroStay 12%</th>

                {/* <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Penalties</th> */}
                <th className="px-6 py-4 text-xs font-bold text-ms-teal uppercase tracking-wider text-right bg-ms-teal-light/30">Your Net Earnings</th>
              </tr>
            </thead>
            {/* <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">No financial transactions found for this period.</td>
                </tr>
              ) : (
                // data.map((b) => {
                //   const gross = Number(b.gross_amount);
                  // const { flatFee, pctFee, totalFee, vendorNet } = calculateFees(gross);
                  
                  // const isCancel = b.status === 'owner_cancel';
                  // const penalty = Number(b.penalty_fee || 5.0);
                  data.map((b) => {
                  const gross = Number(b.gross_amount || 0);
                  const pctFee = gross * 0.03;
                  const flatFee = 5;
                  const totalFee = pctFee + flatFee;
                  const vendorNet = gross - totalFee;

                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">{new Date(b.booking_date).toLocaleDateString()}</div>
                        <div className="font-mono text-xs text-ms-orange mt-1">{b.booking_ref}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">{b.guest_name}</div>
                        <div className="mt-1">
                          {isCancel ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-700/40 dark:border-transparent dark:text-white">CANCELLED</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-ms-teal-light text-ms-teal border-ms-teal-border dark:bg-green-700/40 dark:text-white dark:border-transparent">CHECKED IN</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {!isCancel ? <span className="font-bold text-gray-900">${gross.toFixed(2)}</span> : <span className="text-gray-400 font-medium">$0.00</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-rose-600 font-medium">
                        {!isCancel ? `-$${pctFee.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-rose-600 font-medium">
                        {!isCancel ? `-$${flatFee.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-rose-600 font-medium">
                        {isCancel ? `-$${penalty.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right bg-ms-teal-light/30">
                        <span className={`text-base font-black ${isCancel ? 'text-rose-600' : 'text-ms-teal'}`}>
                          {isCancel ? `-$${penalty.toFixed(2)}` : `$${vendorNet.toFixed(2)}`}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody> */}
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No financial transactions found for this period.
                  </td>
                </tr>
              ) : (
                data.map((b) => {
                  const gross = Number(b.gross_amount || 0);
                  const pctFee = gross * 0.12;
                  // const flatFee = 5;
                  const totalFee = pctFee;
                  const vendorNet = gross - totalFee;

                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">
                          {new Date(b.booking_date).toLocaleDateString()}
                        </div>
                        <div className="font-mono text-xs text-ms-orange mt-1">
                          {b.booking_ref}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">
                          {b.guest_name}
                        </div>

                        <div className="mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-ms-teal-light text-ms-teal border-ms-teal-border dark:bg-green-700/40 dark:text-white dark:border-transparent">
                            CHECKED IN
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="font-bold text-gray-900">
                          ${gross.toFixed(2)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-rose-600 font-medium">
                        -${pctFee.toFixed(2)}
                      </td>

                      {/* <td className="px-6 py-4 whitespace-nowrap text-right text-rose-600 font-medium">
                        -${flatFee.toFixed(2)}
                      </td> */}

                      <td className="px-6 py-4 whitespace-nowrap text-right bg-ms-teal-light/30">
                        <span className="text-base font-black text-ms-teal">
                          ${vendorNet.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function MetricCard({ title, value, subtext, icon, color, titleColor = "text-gray-900", valColor = "text-gray-900" }: any) {
  return (
    <div className={`p-5 rounded-xl border ${color} shadow-sm bg-white dark:border-transparent`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-wider ${titleColor}`}>{title}</h3>
        <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 dark:border-transparent dark:bg-zinc-700">{icon}</div>
      </div>
      <p className={`text-3xl font-black ${valColor} tracking-tight`}>{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-2">{subtext}</p>
    </div>
  );
}
