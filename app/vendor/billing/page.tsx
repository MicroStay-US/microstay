'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  DollarSign,
  ExternalLink,
  FileText,
  Settings,
} from 'lucide-react';

/**
 * Vendor billing page.
 *
 * Invoices are issued automatically on the 1st of each month by the
 * /api/cron/bill-month cron. Each invoice is a real Stripe Invoice with a
 * hosted payment URL that Stripe emails to the vendor. This page just lists
 * them and provides the "Pay Now" button, which simply opens the Stripe-
 * hosted page in a new tab.
 *
 * All card entry, 3-D Secure, receipts, and PDF download are handled by
 * Stripe's hosted UI — we don't collect or store payment details.
 */

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Due',        cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:border-transparent dark:bg-amber-800/40  dark:text-white' },
  unpaid:     { label: 'Due',        cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:border-transparent dark:bg-amber-800/40  dark:text-white' },
  processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-800 border-blue-200 dark:border-transparent dark:bg-blue-800/40  dark:text-white' },
  paid:       { label: 'Paid',       cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:border-transparent dark:bg-emerald-800/40  dark:text-white' },
  failed:     { label: 'Failed',     cls: 'bg-rose-100 text-rose-800 border-rose-200 dark:border-transparent dark:bg-rose-800/40  dark:text-white' },
  overdue:    { label: 'Overdue',    cls: 'bg-rose-100 text-rose-800 border-rose-200 dark:border-transparent dark:bg-rose-800/40  dark:text-white' },
};

type Invoice = {
  id: string;
  invoice_period: string;
  issued_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  total_commission: number;
  total_platform_fees: number;
  total_penalties: number;
  total_due: number;
  status: string;
  payment_status: string;
  stripe_hosted_invoice_url: string | null;
  stripe_invoice_pdf: string | null;
  stripe_invoice_id: string | null;
};

export default function VendorBillingPage() {
  const { vendor } = useVendor();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [unbilledBalance, setUnbilledBalance] = useState<number>(0);
  const [unbilledLoading, setUnbilledLoading] = useState(true);
  const [payEarlyLoading, setPayEarlyLoading] = useState(false);
  const [payEarlyError, setPayEarlyError] = useState('');

  const loadInvoices = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_period, issued_date, due_date, paid_at, total_commission, total_platform_fees, total_penalties, total_due, status, payment_status, stripe_hosted_invoice_url, stripe_invoice_pdf,total_gross, stripe_invoice_id')
      .eq('vendor_id', vendor.id)
      .order('issued_date', { ascending: false });
    setInvoices((data as Invoice[]) || []);
    setLoading(false);
    console.log("Vendor Data",data);
  }, [vendor]);

  const loadUnbilled = useCallback(async () => {
    if (!vendor) return;
    setUnbilledLoading(true);
    try {
      const res = await fetch('/api/vendor/billing/unbilled');
      if (res.ok) {
        const json = await res.json();
        setUnbilledBalance(json.unbilled_balance || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUnbilledLoading(false);
    }
  }, [vendor]);

  useEffect(() => { loadInvoices(); loadUnbilled(); }, [loadInvoices, loadUnbilled]);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    setPortalError('');
    try {
      const res = await fetch('/api/vendor/billing/portal', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to open payment portal');
      window.location.href = json.url;
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  const totalDue = invoices
    .filter((i) => i.payment_status !== 'paid' && i.status !== 'paid')
    .reduce((s, i) => s + Number(i.total_due), 0);

  const handlePayEarly = async () => {
    setPayEarlyLoading(true);
    setPayEarlyError('');
    try {
      const res = await fetch('/api/vendor/billing/pay-early', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to process early payment');
      
      if (json.invoice_url) {
        window.open(json.invoice_url, '_blank');
        loadInvoices();
        loadUnbilled();
      }
    } catch (err: any) {
      setPayEarlyError(err.message);
    } finally {
      setPayEarlyLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading billing…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight dark:text-white">Billing & Invoices</h1>
          <p className="text-gray-500 font-medium mt-1 dark:text-gray-400">
            Pay your monthly MicroStay platform commission. Setup auto-pay via ACH/Credit Card or pay early.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={openCustomerPortal}
          disabled={portalLoading}
          className="font-bold border-gray-300 text-gray-700 gap-2 dark:bg-slate-800 dark:border-transparent dark:text-white/80 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <Settings className="w-4 h-4" />
          {portalLoading ? 'Opening…' : 'Manage Payment Methods / Auto-Pay'}
        </Button>
      </div>

      {portalError && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-900">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <AlertDescription className="font-medium text-rose-800 ml-2 dark:text-rose-300">{portalError}</AlertDescription>
        </Alert>
      )}

      {payEarlyError && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-900">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <AlertDescription className="font-medium text-rose-800 ml-2 dark:text-rose-300">{payEarlyError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-ms-orange-border bg-ms-orange-light dark:bg-ms-orange">
          <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-ms-orange rounded-xl p-3 dark:bg-ms-orange-light">
                <DollarSign className="w-5 h-5 text-white dark:text-ms-orange" />
              </div>
              <div>
                <p className="text-xs font-bold text-ms-orange uppercase tracking-wider dark:text-white">Total Gross</p>
                <p className="text-2xl font-black text-ms-orange dark:text-white">
                  {/* ${unbilledLoading ? '...' : unbilledBalance.toFixed(2)} */}

                </p>
              </div>
            </div>
            {unbilledBalance > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePayEarly}
                disabled={payEarlyLoading || unbilledLoading}
                className="w-full bg-white text-ms-orange font-bold border-transparent hover:bg-ms-orange hover:text-white dark:bg-white dark:text-ms-orange dark:hover:bg-ms-orange-light"
              >
                {payEarlyLoading ? 'Processing...' : 'Pay Early'}
              </Button>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/40 dark:border-blue-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-blue-500 dark:bg-blue-400 rounded-xl p-3">
              <AlertCircle className="w-5 h-5 text-white dark:text-blue-900" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider dark:text-blue-300">Invoice Due</p>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-200">${totalDue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        {/* <Card className="border-emerald-200 bg-emerald-50 dark:bg-green-600 dark:border-transparent">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-emerald-500 dark:bg-white rounded-xl p-3">
              <Receipt className="w-5 h-5 text-white dark:text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider dark:text-white">Total Invoices</p>
              <p className="text-2xl font-black text-emerald-700 dark:text-white">{invoices.length}</p>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="p-10 text-center text-gray-400 font-medium">
            No invoices yet. Your first invoice will be issued on the 1st of the month after your first booking is checked in.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const isPaid = inv.payment_status === 'paid' || inv.status === 'paid';
            const statusKey = isPaid ? 'paid' : (inv.payment_status || 'pending');
            const st = statusConfig[statusKey] || statusConfig.pending;

            return (
              <Card key={inv.id} className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50 border-b border-gray-100 p-5 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <p className="font-black text-gray-900">Invoice · {inv.invoice_period}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {inv.due_date ? `Due ${inv.due_date}` : 'Due date pending'}
                      {inv.issued_date ? ` · Issued ${inv.issued_date}` : ''}
                    </p>
                  </div>
                  <Badge className={`border font-bold ${st.cls}`}>{st.label}</Badge>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 font-medium text-xs uppercase tracking-wider">Commission(12%)</p>
                      <p className="font-bold text-gray-900">${Number(inv.total_commission).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium text-xs uppercase tracking-wider">Platform Fees</p>
                      <p className="font-bold text-gray-900">${Number(inv.total_platform_fees).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium text-xs uppercase tracking-wider">Total Due</p>
                      <p className="font-black text-lg text-ms-orange">${Number(inv.total_due).toFixed(2)}</p>
                    </div>
                  </div>

                  {isPaid && (
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Paid {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </div>
                  )}

                  {!isPaid && inv.payment_status === 'processing' && (
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                      <Clock className="w-4 h-4" />
                      Payment processing…
                    </div>
                  )}

                  {/* Pay button — opens Stripe-hosted invoice in new tab */}
                  {!isPaid && inv.stripe_hosted_invoice_url && (
                    <a
                      href={inv.stripe_hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full"
                    >
                      <Button className="w-full h-11 bg-ms-orange hover:bg-ms-orange-hover text-white font-bold gap-2">
                        <CreditCard className="h-4 w-4" />
                        {inv.payment_status === 'failed' ? 'Retry Payment' : 'Pay Invoice'}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}

                  {/* Fallback for legacy invoices without a hosted URL */}
                  {!isPaid && !inv.stripe_hosted_invoice_url && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 font-medium ml-2">
                        This invoice is being processed. You&apos;ll receive a payment link by email shortly,
                        or contact billing@microstay.us if it&apos;s urgent.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* PDF download for any invoice that has one */}
                  {inv.stripe_invoice_pdf && (
                    <a
                      href={inv.stripe_invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Download PDF
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 font-medium pb-4">
        Payments processed securely by Stripe · Questions? Email{' '}
        <a href="mailto:billing@microstay.us" className="text-ms-orange hover:underline">billing@microstay.us</a>
      </p>
    </div>
  );
}
