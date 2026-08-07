'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Building, Calendar, CircleCheck, Circle, DollarSign, TrendingUp, MapPin, FileText } from 'lucide-react';
import {
  getDashboardStats,
  getAreaAnalytics,
  getMotelPerformance,
  type DashboardStats,
  type AreaAnalytics,
  type MotelPerformance,
} from '@/lib/admin-analytics';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [motels, setMotels] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [areaAnalytics, setAreaAnalytics] = useState<AreaAnalytics[]>([]);
  const [motelPerformance, setMotelPerformance] = useState<MotelPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (profile?.role !== 'admin') {
        router.push('/');
      } else if (user.email && !isAdminEmail(user.email)) {
        setError('Access denied. Only authorized admin emails can access this dashboard.');
        setTimeout(() => router.push('/'), 3000);
      } else {
        fetchAdminData();
      }
    }
  }, [user, profile, authLoading, router]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [applicationsData, motelsData, bookingsData, invoicesData, dashboardStats, areas, performance] = await Promise.all([
        supabase.from('vendor_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('motels').select('*, profiles(name, email)').order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, motels(name), profiles(name, email)').order('created_at', { ascending: false }),
        supabase.from('motel_invoices').select('*, profiles(name, email)').order('created_at', { ascending: false }),
        getDashboardStats(new Date(), new Date()),
        getAreaAnalytics(new Date(), new Date()),
        getMotelPerformance(new Date(), new Date()),
      ]);

      setApplications(applicationsData.data || []);
      setMotels(motelsData.data || []);
      setBookings(bookingsData.data || []);
      setInvoices(invoicesData.data || []);
      setStats(dashboardStats);
      setAreaAnalytics(areas);
      setMotelPerformance(performance);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMonthlyInvoices = async () => {
    if (!confirm('Generate invoices for all vendors for last month?')) return;

    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const { data: vendors } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'vendor');

      if (vendors && vendors.length > 0) {
        for (const vendor of vendors) {
          await supabase.rpc('generate_monthly_invoice', {
            p_vendor_id: vendor.id,
            p_billing_month: lastMonth.toISOString().split('T')[0]
          });
        }

        setSuccessMessage(`Generated invoices for ${vendors.length} vendors!`);
        fetchAdminData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInvoicePaid = async (invoiceId: string, paymentProofUrl: string) => {
    setError('');
    setSuccessMessage('');

    try {
      await supabase.rpc('mark_invoice_paid', {
        p_invoice_id: invoiceId,
        p_payment_proof_url: paymentProofUrl,
        p_admin_id: user?.id
      });

      setSuccessMessage('Invoice marked as paid and vendor properties reactivated!');
      fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to mark invoice as paid');
    }
  };

  const handleApplicationAction = async (id: string, action: 'approved' | 'rejected', email: string, motelName: string) => {
    setError('');
    setSuccessMessage('');
    try {
      if (action === 'approved') {
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

        const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true,
        });

        if (signUpError) {
          setError(`Failed to create user account: ${signUpError.message}`);
          return;
        }

        if (newUser.user) {
          await supabase.from('profiles').upsert({
            id: newUser.user.id,
            role: 'vendor',
            name: motelName,
            phone: '',
            requires_password_reset: true,
          });

          const { error: updateError } = await supabase
            .from('vendor_applications')
            .update({
              status: action,
              user_id: newUser.user.id,
              created_user_id: newUser.user.id,
              temporary_password: tempPassword,
              approved_by: user?.id,
              approved_at: new Date().toISOString(),
            })
            .eq('id', id);

          if (updateError) throw updateError;

          setSuccessMessage(`Application approved! Vendor account created.\n\nSend these credentials to the vendor:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nThey will be required to create a new password on first login.`);
        }
      } else {
        const { error: updateError } = await supabase
          .from('vendor_applications')
          .update({
            status: action,
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
        setSuccessMessage('Application rejected successfully.');
      }

      fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to process application');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const pendingApplications = applications.filter((a) => a.status === 'pending');

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">MicroStay Business Dashboard</h1>
          <p className="text-gray-600">Complete business analytics and motel management</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800 whitespace-pre-line">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100">Today's Revenue</p>
                  <p className="text-3xl font-bold">{formatCurrency(stats?.todayRevenue || 0)}</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Monthly Revenue</p>
                  <p className="text-3xl font-bold">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
                  <p className="text-xs text-blue-100 mt-1">
                    Platform fees: {formatCurrency(stats?.platformFeesMonth || 0)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-blue-100" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Bookings</p>
                  <p className="text-3xl font-bold">{stats?.todayBookings || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total: {stats?.totalBookings || 0}
                  </p>
                </div>
                <Calendar className="h-10 w-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Motels</p>
                  <p className="text-3xl font-bold">{stats?.activeMotels || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total: {stats?.totalMotels || 0}
                  </p>
                </div>
                <Building className="h-10 w-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Checked In Today</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.checkedInToday || 0}</p>
                </div>
                <CircleCheck className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">No Shows Today</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.noShowsToday || 0}</p>
                </div>
                <Circle className="h-10 w-10 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Applications</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats?.pendingApplications || 0}</p>
                </div>
                <Users className="h-10 w-10 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Service Areas</p>
                  <p className="text-3xl font-bold">{areaAnalytics.length}</p>
                </div>
                <MapPin className="h-10 w-10 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="invoices">
              Monthly Invoices
              {invoices.filter(i => i.payment_status === 'pending').length > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {invoices.filter(i => i.payment_status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="areas">Areas</TabsTrigger>
            <TabsTrigger value="applications">
              Applications
              {pendingApplications.length > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {pendingApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="motels">Properties</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-6">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Monthly Vendor Invoices</h3>
                <p className="text-sm text-gray-600">
                  Vendors collect full payment. Platform bills monthly for platform fees ( 12% ).
                </p>
              </div>
              <Button onClick={handleGenerateMonthlyInvoices} className="bg-blue-600 hover:bg-blue-700">
                <FileText className="mr-2 h-4 w-4" />
                Generate Monthly Invoices
              </Button>
            </div>

            {invoices.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-600">No invoices generated yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Click "Generate Monthly Invoices" to create invoices for all vendors
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Invoice #</th>
                          <th className="text-left p-3">Vendor</th>
                          <th className="text-left p-3">Period</th>
                          <th className="text-right p-3">Bookings</th>
                          <th className="text-right p-3">Gross Revenue</th>
                          <th className="text-right p-3">Platform Fees Due</th>
                          <th className="text-center p-3">Due Date</th>
                          <th className="text-center p-3">Status</th>
                          <th className="text-center p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <InvoiceRow
                            key={invoice.id}
                            invoice={invoice}
                            onMarkPaid={handleMarkInvoicePaid}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-900 mb-2">
                      Automated Billing Schedule
                    </h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li><strong>1st of month:</strong> Invoices auto-generated for previous month</li>
                      <li><strong>5th of month:</strong> Reminder sent to vendors with unpaid invoices</li>
                      <li><strong>7th of month:</strong> Properties auto-disabled if invoice still unpaid</li>
                      <li><strong>Payment:</strong> Admin marks as paid after receiving proof - properties reactivated</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Motel Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {motelPerformance.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl text-gray-600">No performance data yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Motel</th>
                          <th className="text-left p-3">Location</th>
                          <th className="text-left p-3">Vendor</th>
                          <th className="text-right p-3">Bookings</th>
                          <th className="text-right p-3">Revenue</th>
                          <th className="text-right p-3">Check-in Rate</th>
                          <th className="text-right p-3">No-show Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {motelPerformance.map((motel) => (
                          <tr key={motel.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{motel.name}</td>
                            <td className="p-3 text-sm text-gray-600">
                              {motel.city}, {motel.state}
                            </td>
                            <td className="p-3 text-sm text-gray-600">{motel.vendor_name}</td>
                            <td className="p-3 text-right">{motel.total_bookings}</td>
                            <td className="p-3 text-right font-semibold text-green-600">
                              {formatCurrency(motel.revenue)}
                            </td>
                            <td className="p-3 text-right">
                              <Badge variant={motel.check_in_rate >= 80 ? 'default' : 'secondary'}>
                                {motel.check_in_rate.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <Badge variant={motel.no_show_rate > 20 ? 'destructive' : 'secondary'}>
                                {motel.no_show_rate.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="areas" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Business by Area</CardTitle>
              </CardHeader>
              <CardContent>
                {areaAnalytics.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl text-gray-600">No area data yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {areaAnalytics.map((area, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{area.city}</h3>
                              <p className="text-sm text-gray-600">{area.state}</p>
                            </div>
                            <MapPin className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Motels</p>
                              <p className="text-2xl font-bold">{area.activeMotels}/{area.totalMotels}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Bookings</p>
                              <p className="text-2xl font-bold">{area.totalBookings}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm text-gray-600">Total Revenue</p>
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(area.revenue)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            {applications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-600">No applications yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <Card key={app.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{app.motel_name}</h3>
                            <Badge
                              variant={
                                app.status === 'pending'
                                  ? 'secondary'
                                  : app.status === 'approved'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {app.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {app.address}, {app.city}, {app.state}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">Email: {app.email}</p>
                          <p className="text-sm text-gray-600">Phone: {app.phone}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Applied: {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {app.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApplicationAction(app.id, 'approved', app.email, app.motel_name)}
                            >
                              <CircleCheck className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApplicationAction(app.id, 'rejected', app.email, app.motel_name)}
                            >
                              <Circle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="motels" className="mt-6">
            {motels.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-600">No properties yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {motels.map((motel) => (
                  <Card key={motel.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold">{motel.name}</h3>
                        <Badge variant={motel.active ? 'default' : 'secondary'}>
                          {motel.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {motel.city}, {motel.state}
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        Vendor: {motel.profiles?.name || 'Unknown'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => router.push(`/motel/${motel.id}`)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-600">No bookings yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>All Bookings - Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Booking ID</th>
                          <th className="text-left p-3">Motel</th>
                          <th className="text-left p-3">Customer</th>
                          <th className="text-right p-3">Gross Amount</th>
                          <th className="text-right p-3">Platform Fee</th>
                          <th className="text-right p-3">Vendor Payout</th>
                          <th className="text-center p-3">Status</th>
                          <th className="text-center p-3">Check-in</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-sm font-mono">{booking.booking_id}</td>
                            <td className="p-3 text-sm font-medium">{booking.motels?.name}</td>
                            <td className="p-3 text-sm">
                              {booking.customer_name || booking.last_name || 'N/A'}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {booking.gross_amount > 0
                                ? formatCurrency(booking.gross_amount)
                                : '-'}
                            </td>
                            <td className="p-3 text-right text-green-600 font-semibold">
                              {booking.platform_fee > 0
                                ? formatCurrency(booking.platform_fee)
                                : '-'}
                            </td>
                            <td className="p-3 text-right text-blue-600">
                              {booking.vendor_payout > 0
                                ? formatCurrency(booking.vendor_payout)
                                : '-'}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant={
                                  booking.status === 'confirmed' ? 'default' : 'secondary'
                                }
                              >
                                {booking.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant={
                                  booking.check_in_status === 'checked_in'
                                    ? 'default'
                                    : booking.check_in_status === 'no_show'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {booking.check_in_status || 'pending'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-semibold">
                        <tr className="border-t-2">
                          <td colSpan={4} className="p-3 text-right">
                            Totals:
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(
                              bookings.reduce(
                                (sum, b) => sum + (Number(b.gross_amount) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="p-3 text-right text-green-600">
                            {formatCurrency(
                              bookings.reduce(
                                (sum, b) => sum + (Number(b.platform_fee) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="p-3 text-right text-blue-600">
                            {formatCurrency(
                              bookings.reduce(
                                (sum, b) => sum + (Number(b.vendor_payout) || 0),
                                0
                              )
                            )}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Platform Fee Structure
                    </h4>
                    <p className="text-sm text-blue-800">
                      <strong>Formula:</strong>12% of gross booking amount
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      <strong>Example:</strong> For a $60 booking:  ($60 × 0.12) = $7.20 platform fee
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, onMarkPaid }: { invoice: any; onMarkPaid: (id: string, proofUrl: string) => void }) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState('');

  const handleMarkPaid = () => {
    if (!paymentProofUrl.trim()) {
      alert('Please enter the payment proof URL');
      return;
    }
    onMarkPaid(invoice.id, paymentProofUrl);
    setShowPaymentDialog(false);
    setPaymentProofUrl('');
  };

  const getStatusBadge = (status: string, autoDisabled: boolean) => {
    if (status === 'paid') {
      return <Badge variant="default" className="bg-green-600">Paid</Badge>;
    } else if (status === 'overdue' || autoDisabled) {
      return <Badge variant="destructive">Overdue (Disabled)</Badge>;
    } else {
      return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const formatCurrency = (amount: number) => `$${amount?.toFixed(2) || '0.00'}`;

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="p-3 text-sm font-mono">{invoice.invoice_number}</td>
        <td className="p-3 text-sm">{invoice.profiles?.name || 'Unknown'}</td>
        <td className="p-3 text-sm">
          {new Date(invoice.billing_period_start).toLocaleDateString()} -{' '}
          {new Date(invoice.billing_period_end).toLocaleDateString()}
        </td>
        <td className="p-3 text-right">{invoice.total_bookings}</td>
        <td className="p-3 text-right font-semibold">
          {formatCurrency(invoice.gross_revenue)}
        </td>
        <td className="p-3 text-right font-semibold text-green-600">
          {formatCurrency(invoice.platform_fees)}
        </td>
        <td className="p-3 text-center text-sm">
          {new Date(invoice.due_date).toLocaleDateString()}
          {invoice.reminder_sent_date && (
            <p className="text-xs text-yellow-600 mt-1">
              Reminder sent {new Date(invoice.reminder_sent_date).toLocaleDateString()}
            </p>
          )}
        </td>
        <td className="p-3 text-center">
          {getStatusBadge(invoice.payment_status, invoice.auto_disabled_date)}
          {invoice.auto_disabled_date && (
            <p className="text-xs text-red-600 mt-1">
              Disabled {new Date(invoice.auto_disabled_date).toLocaleDateString()}
            </p>
          )}
        </td>
        <td className="p-3 text-center">
          {invoice.payment_status === 'paid' ? (
            <div>
              <p className="text-xs text-green-600">
                Paid {new Date(invoice.paid_date).toLocaleDateString()}
              </p>
              {invoice.payment_proof_url && (
                <a
                  href={invoice.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Proof
                </a>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowPaymentDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              Mark as Paid
            </Button>
          )}
        </td>
      </tr>

      {showPaymentDialog && (
        <tr>
          <td colSpan={9} className="p-4 bg-blue-50">
            <div className="max-w-md">
              <h4 className="font-semibold mb-2">Mark Invoice as Paid</h4>
              <p className="text-sm text-gray-600 mb-3">
                Enter the URL/link to the payment proof document (receipt, bank statement, etc.)
              </p>
              <Input
                type="url"
                placeholder="https://example.com/proof.pdf"
                value={paymentProofUrl}
                onChange={(e) => setPaymentProofUrl(e.target.value)}
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleMarkPaid} className="bg-green-600 hover:bg-green-700">
                  Confirm Payment
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
