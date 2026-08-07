'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Plus, Eye, Calendar, Users, Check, X, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { isVendorTeamMember, getVendorIdForTeamMember } from '@/lib/vendor-permissions';

export default function VendorDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [motels, setMotels] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateMotel, setShowCreateMotel] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [vendorOwnerId, setVendorOwnerId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (profile?.role !== 'vendor') {
        router.push('/');
      } else {
        checkTeamMemberStatus();
      }
    }
  }, [user, profile, authLoading, router]);

  const checkTeamMemberStatus = async () => {
    if (!user) return;
    const isMember = await isVendorTeamMember(user.id);
    setIsTeamMember(isMember);
    if (isMember) {
      const ownerId = await getVendorIdForTeamMember(user.id);
      setVendorOwnerId(ownerId);
    }
    fetchVendorData();
  };

  const fetchVendorData = async () => {
    setLoading(true);
    try {
      const effectiveVendorId = isTeamMember && vendorOwnerId ? vendorOwnerId : user?.id;

      const { data: motelsData } = await supabase
        .from('motels')
        .select('*, rooms(count)')
        .eq('vendor_id', effectiveVendorId);

      setMotels(motelsData || []);

      const motelIds = (motelsData || []).map((m) => m.id);
      if (motelIds.length > 0) {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*, motels(name), rooms(room_type), time_slots(date, start_time, end_time)')
          .in('motel_id', motelIds)
          .order('created_at', { ascending: false });

        setBookings(bookingsData || []);
      }

      const { data: invoicesData } = await supabase
        .from('motel_invoices')
        .select('*')
        .eq('vendor_id', effectiveVendorId)
        .order('created_at', { ascending: false });

      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {profile?.name}
              {isTeamMember && <Badge variant="secondary" className="ml-2">Team Member</Badge>}
            </p>
          </div>
          <div className="flex gap-2">
            {!isTeamMember && (
              <Button variant="outline" onClick={() => router.push('/vendor/team')}>
                <Users className="mr-2 h-4 w-4" />
                Team Management
              </Button>
            )}
            <Button onClick={() => setShowCreateMotel(!showCreateMotel)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Motel
            </Button>
          </div>
        </div>

        {showCreateMotel && <CreateMotelForm onSuccess={() => { setShowCreateMotel(false); fetchVendorData(); }} />}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Properties</p>
                  <p className="text-3xl font-bold">{motels.length}</p>
                </div>
                <Building className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-3xl font-bold">{bookings.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Properties</p>
                  <p className="text-3xl font-bold">
                    {motels.filter((m) => m.active).length}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="motels">
          <TabsList>
            <TabsTrigger value="motels">My Properties</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="billing">
              Monthly Billing
              {invoices.filter(i => i.payment_status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {invoices.filter(i => i.payment_status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="motels" className="mt-6">
            {motels.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-600 mb-4">No properties yet</p>
                  <Button onClick={() => setShowCreateMotel(true)}>
                    Add Your First Property
                  </Button>
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
                      <p className="text-sm text-gray-600 mb-4">
                        {motel.city}, {motel.state}
                      </p>
                      <Button
                        variant="outline"
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
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onUpdate={fetchVendorData}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Platform Fee Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">How Billing Works</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li><strong>You collect:</strong> Full payment amount from customers</li>
                    <li><strong>Platform fee:</strong>  12% of gross booking amount (billed monthly)</li>
                    <li><strong>Due date:</strong> 7 days after month ends</li>
                    <li><strong>Payment:</strong> Send proof to admin for manual confirmation</li>
                    <li className="text-red-600 font-semibold">
                      <strong>Important:</strong> Properties auto-disabled on 7th if invoice unpaid
                    </li>
                  </ul>
                </div>

                {invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl text-gray-600">No invoices yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Invoices are generated on the 1st of each month
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Invoice #</th>
                          <th className="text-left p-3">Period</th>
                          <th className="text-right p-3">Bookings</th>
                          <th className="text-right p-3">Revenue Collected</th>
                          <th className="text-right p-3">Platform Fee Due</th>
                          <th className="text-center p-3">Due Date</th>
                          <th className="text-center p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm font-mono">{invoice.invoice_number}</td>
                            <td className="p-3 text-sm">
                              {new Date(invoice.billing_period_start).toLocaleDateString()} -{' '}
                              {new Date(invoice.billing_period_end).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">{invoice.total_bookings}</td>
                            <td className="p-3 text-right font-semibold text-green-600">
                              ${invoice.gross_revenue?.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-semibold text-red-600">
                              ${invoice.platform_fees?.toFixed(2)}
                            </td>
                            <td className="p-3 text-center text-sm">
                              {new Date(invoice.due_date).toLocaleDateString()}
                              {invoice.reminder_sent_date && (
                                <p className="text-xs text-yellow-600 mt-1">
                                  Reminder sent
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {invoice.payment_status === 'paid' ? (
                                <Badge variant="default" className="bg-green-600">
                                  Paid
                                </Badge>
                              ) : invoice.payment_status === 'overdue' || invoice.auto_disabled_date ? (
                                <Badge variant="destructive">
                                  Overdue - Properties Disabled
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Pending Payment</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-semibold">
                        <tr className="border-t-2">
                          <td colSpan={4} className="p-3 text-right">Total Due:</td>
                          <td className="p-3 text-right text-red-600">
                            $
                            {invoices
                              .filter((i) => i.payment_status !== 'paid')
                              .reduce((sum, i) => sum + (Number(i.platform_fees) || 0), 0)
                              .toFixed(2)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BookingCard({ booking, onUpdate }: { booking: any; onUpdate: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    if (!confirm('Confirm customer check-in?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          check_in_status: 'checked_in',
          actual_check_in_time: new Date().toISOString(),
          checked_in_by: user?.id,
        })
        .eq('id', booking.id);

      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Error checking in:', err);
      alert('Failed to confirm check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleNoShow = async () => {
    if (!confirm('Mark this booking as no-show?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          check_in_status: 'no_show',
          vendor_action: 'no_show',
          vendor_action_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Error marking no-show:', err);
      alert('Failed to mark as no-show');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'default';
      case 'no_show':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-semibold">{booking.motels?.name}</p>
          <Badge variant={getStatusColor(booking.check_in_status || 'pending')}>
            {booking.check_in_status || 'pending'}
          </Badge>
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <p>
            <strong>Booking ID:</strong> {booking.booking_id}
          </p>
          <p>
            <strong>Customer:</strong> {booking.customer_name || booking.last_name}
          </p>
          <p>
            <strong>Phone:</strong> {booking.phone}
          </p>
          <p>
            <strong>Date:</strong>{' '}
            {new Date(booking.time_slots?.date || booking.booking_date).toLocaleDateString()}
          </p>
          {booking.gross_amount > 0 && (
            <div className="flex items-center gap-4 mt-2 pt-2 border-t">
              <p className="text-green-600 font-semibold">
                <strong>Amount Collected:</strong> ${booking.gross_amount?.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                (Platform fee billed monthly)
              </p>
            </div>
          )}
        </div>
      </div>
      {booking.check_in_status === 'pending' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleCheckIn}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-1 h-4 w-4" />
            Check In
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleNoShow}
            disabled={loading}
          >
            <X className="mr-1 h-4 w-4" />
            No Show
          </Button>
        </div>
      )}
      {booking.check_in_status === 'checked_in' && booking.actual_check_in_time && (
        <div className="text-sm text-gray-600">
          <p>
            <strong>Checked in:</strong>{' '}
            {new Date(booking.actual_check_in_time).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function CreateMotelForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    description: '',
    amenities: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const amenitiesArray = formData.amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a);

      const { error: insertError } = await supabase.from('motels').insert({
        vendor_id: user?.id,
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        phone: formData.phone,
        email: formData.email,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        description: formData.description,
        amenities: amenitiesArray,
        active: true,
      });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create motel');
      setLoading(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Add New Property</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Motel Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">Zip Code *</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Contact Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude (for nearby search)</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                placeholder="e.g., 34.0522"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude (for nearby search)</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                placeholder="e.g., -118.2437"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amenities">Amenities (comma-separated)</Label>
            <Input
              id="amenities"
              placeholder="WiFi, Parking, TV, Coffee"
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Property'}
            </Button>
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
