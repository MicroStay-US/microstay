'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Mail, Phone, Calendar as CalendarIcon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export function VendorsTab() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch official vendors directly from the vendors table
      const { data: allVendors } = await supabase.from('vendors').select('*');
      const approved = allVendors || [];

      // 2. Fetch all properties to count them manually by Auth User UUID
      const { data: properties } = await supabase.from('properties').select('vendor_id, id');
      
      const propertyMap = new Map<string, number>();
      if (properties) {
        properties.forEach(p => {
          propertyMap.set(p.vendor_id, (propertyMap.get(p.vendor_id) || 0) + 1);
        });
      }

      // 3. Fetch all bookings to calculate cancellation rates heuristically per vendor
      const { data: bookings } = await supabase.from('vd_bookings').select('vendor_id, status');
      
      const bookingData = new Map<string, { total: number, cancelled: number }>();
      if (bookings) {
        bookings.forEach(b => {
          const stats = bookingData.get(b.vendor_id) || { total: 0, cancelled: 0 };
          stats.total++;
          if (b.status === 'owner_cancel' || b.status === 'guest_cancel' || b.status === 'no_show') {
            stats.cancelled++;
          }
          bookingData.set(b.vendor_id, stats);
        });
      }

      const merged = approved.map((v: any) => {
        const bStats = bookingData.get(v.id) || { total: 0, cancelled: 0 };
        const cancelRate = bStats.total > 0 ? (bStats.cancelled / bStats.total) * 100 : 0;
        
        return {
          ...v,
          totalProperties: propertyMap.get(v.id) || 0,
          totalBookings: bStats.total,
          cancelRate: Math.round(cancelRate)
        };
      });

      setVendors(merged);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  if (loading) {
    return <div className="h-64 bg-zinc-200 animate-pulse rounded-xl" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Vendor Database & Risk Center</h2>
          <p className="text-sm text-zinc-500 mt-1">Directory of officially partnered business owners and algorithmic risk scoring.</p>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-zinc-300 mb-3" />
          <h3 className="text-lg font-bold text-zinc-900">No Approved Vendors</h3>
          <p className="text-zinc-500">You have zero active vendors operating on the MicroStay platform.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50/80 text-xs uppercase font-bold text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4">Business Information</th>
                  <th className="px-6 py-4">Properties</th>
                  <th className="px-6 py-4">Flow Rate</th>
                  <th className="px-6 py-4">System Risk</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {vendors.map((vendor) => {
                  const isHighRisk = vendor.cancelRate >= 30;
                  
                  return (
                    <tr key={vendor.id} className="hover:bg-zinc-50/50 transition-colors bg-white group">
                      <td className="px-6 py-5">
                        <div className="font-bold text-zinc-900">{vendor.business_name || vendor.motel_name}</div>
                        <div className="text-xs font-bold text-zinc-500 mt-1 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" /> {vendor.poc_name || 'Admin'}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1.5">
                          <Mail className="h-3 w-3" /> {vendor.email}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-1 rounded bg-zinc-100 text-zinc-800 font-black border border-zinc-200">
                          {vendor.totalProperties}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-zinc-900">{vendor.totalBookings} <span className="text-zinc-400 font-medium text-xs">tx</span></div>
                        <div className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{vendor.totalBookings > 0 ? 'Active Engine' : 'Idle'}</div>
                      </td>
                      <td className="px-6 py-5">
                        {vendor.totalBookings === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Insufficient Data
                          </span>
                        ) : isHighRisk ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-rose-50 border border-rose-200 text-rose-600 gap-1.5">
                              <AlertTriangle className="w-3 h-3" />
                              High Risk
                            </span>
                            <span className="text-xs font-bold text-rose-500">
                              {vendor.cancelRate}% Cancel Rate
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-600 gap-1.5">
                              <ShieldCheck className="w-3 h-3" />
                              Trusted
                            </span>
                            <span className="text-xs font-bold text-emerald-600">
                              {vendor.cancelRate}% Cancel Rate
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-zinc-600 hover:text-ms-orange hover:border-ms-orange-border shadow-sm transition-colors">
                          Audit Vendor
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
