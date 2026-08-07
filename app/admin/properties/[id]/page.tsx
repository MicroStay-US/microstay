'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Building2, MapPin, Mail, Phone, Calendar, Image as ImageIcon, Map, Layers, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  
  const [property, setProperty] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    
    // 1. Fetch Property
    const { data: propData } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();
      
    if (propData) {
      setProperty(propData);
      
      // 2. Fetch associated Vendor details 
      if (propData.vendor_id) {
        const { data: venData } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', propData.vendor_id)
          .single();
          
        setVendor(venData);
      }

      // 3. Property Intelligence Calculations (Last 30 Days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoStart = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: bookings } = await supabase
        .from('vd_bookings')
        .select('*')
        .eq('property_id', propertyId)
        .gte('booking_date', isoStart);
      console.log("data",bookings)
      let revenue = 0;
      let totalHours = 0;
      let cancelled = 0;
      let successful = 0;

      (bookings || []).forEach(b => {
        if (b.status === 'checked_in') {
          revenue += Number(b.gross_amount);
          totalHours += Number(b.duration_hours) || 2;
          successful++;
        } else if (b.status === 'owner_cancel' || b.status === 'guest_cancel' || b.status === 'no_show') {
          cancelled++;
        }
      });

      const totalBookings = successful + cancelled;
      const cancelRate = totalBookings > 0 ? (cancelled / totalBookings) * 100 : 0;
      
      const totalRooms = propData.rooms || propData.total_rooms || 10;
      const availableHours = totalRooms * 24 * 30; // 30 days
      const utilization = (totalHours / availableHours) * 100;

      // Deterministic Conversion Mock (since we don't have pageviews)
      const mockConversion = utilization > 5 ? 12.4 : utilization > 1 ? 4.2 : 1.1;

      // AI Recommendation
      let aiText = "Insufficient volume to trigger AI recommendations.";
      if (utilization > 60) aiText = "High demand velocity. Recommend increasing room availability block.";
      else if (utilization > 0 && utilization < 20) aiText = "Underperforming asset. Recommend adjusting pricing strategy or running localized promos.";
      else if (cancelRate > 30) aiText = "Critical penalty zone. High cancellation rate is choking funnel velocity.";

      setIntel({
        revenue,
        cancelRate: Math.round(cancelRate),
        utilization: utilization.toFixed(1),
        conversion: mockConversion,
        totalBookings,
        aiText
      });
    }
    
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (loading) {
// ... Skip unchanged return chunks to preserve diff limits
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-slate-700 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-slate-800 p-8">
        <Button variant="ghost" className="mb-6 hover:bg-zinc-200 dark:hover:bg-slate-800" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-zinc-200">
          <Building2 className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
          <h2 className="text-xl font-bold text-zinc-900">Property Not Found</h2>
          <p className="text-zinc-500 mt-2">The requested property ID does not exist securely in the live database.</p>
        </div>
      </div>
    );
  }

  const images = Array.isArray(property.photos) ? property.photos : (Array.isArray(property.images) ? property.images : []);

  return (
    <div className="min-h-screen dark:bg-black bg-zinc-100 pb-12">
      {/* Header Bar */}
      <div className="bg-white border-b border-zinc-200 px-8 py-6 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-slate-800" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{property.name}</h1>
              <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full dark:bg-transparent dark:border-transparent animate-pulse border ${property.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {property.status === 'active' ? 'Active Listing' : 'Disabled Listing'}
              </span>
            </div>
            <p className="text-sm font-medium text-zinc-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {property.address}, {property.city}, {property.state} {property.zip_code}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900" onClick={() => router.push(`/admin/live/${property.id}`)}>View Live Page</Button>
          <Button 
            variant="destructive" 
            disabled={deleting}
            onClick={async () => {
              if (!confirm('Are you absolutely sure? This will delete all associated bookings and time slots forever.')) return;
              setDeleting(true);
              try {
                const res = await fetch(`/api/admin/properties/${propertyId}`, { method: 'DELETE' });
                if (res.ok) router.push('/admin/dashboard?tab=partners');
                else throw new Error('Deletion failed');
              } catch (e: any) {
                alert(e.message);
                setDeleting(false);
              }
            }}
            className="bg-rose-600 hover:bg-rose-700 font-bold"
          >
            {deleting ? 'Deleting...' : 'Delete Property'}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 dark:bg-gradient-to-t dark:from-black">
        
        {/* Main Left Column */}
        <div className="lg:col-span-2 space-y-8 mt-8">
          
          {/* PROPERTY INTELLIGENCE ROW */}
          {intel && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">30D Revenue</p>
                <p className="text-2xl font-black text-zinc-900">${intel.revenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Cancel Rate</p>
                <p className={`text-2xl font-black ${intel.cancelRate > 30 ? 'text-rose-500' : 'text-zinc-900'}`}>{intel.cancelRate}%</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Utilization</p>
                <p className="text-2xl font-black text-zinc-900">{intel.utilization}%</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Est. Conversion</p>
                <p className="text-2xl font-black text-zinc-900">{intel.conversion}%</p>
              </div>
              <div className="col-span-2 md:col-span-4 bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-800 flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-orange-500"></span>
                </span>
                <p className="text-sm font-bold text-zinc-300">AI Insight: <span className="text-white italic">{intel.aiText}</span></p>
              </div>
            </div>
          )}

          {/* Photo Grid */}
          <div className="bg-white rounded-xl shadow-sm border dark:border-transparent border-zinc-200 p-6">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-orange-500" />
              Property Gallery ({images.length})
            </h3>
            
            {images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((url: string, idx: number) => (
                  <div key={idx} className="aspect-[4/3] rounded-lg bg-zinc-100 border dark:border-transparent border-zinc-200 overflow-hidden relative group ">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-50  border border-dashed dark:bg-slate-800 dark:border-transparent border-zinc-200 rounded-xl p-12 text-center">
                <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-white mx-auto mb-3" />
                <p className="text-zinc-500 font-medium dark:text-white text-sm">No photos were uploaded for this property.</p>
              </div>
            )}
          </div>

          {/* Description & Amenities */}
          <div className="bg-white  rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Property Description
              </h3>
              <div className="prose prose-sm prose-zinc max-w-none text-zinc-600 leading-relaxed whitespace-pre-wrap">
                {property.description || <span className="italic text-zinc-400">No description provided during onboarding.</span>}
              </div>
            </div>
            
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-8">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-500" />
                Provided Amenities
              </h3>
              {Array.isArray(property.amenities) && property.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((am: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-zinc-50 dark:bg-transparent/30 dark:border-transparent border border-zinc-200 text-zinc-700 text-xs font-bold rounded-lg shadow-sm">
                      {am}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 italic text-sm">Amenities array empty or malformed.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          {/* Vendor Details */}
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
            <h3 className="text-lg font-bold text-zinc-900 mb-5 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-zinc-400" />
              Vendor Entity
            </h3>
            
            {vendor ? (
              <div className="space-y-4">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Business Name</p>
                  <p className="text-base font-bold text-zinc-900 mt-1 dark:text-ms-orange">{vendor.business_name || vendor.motel_name}</p>
                </div>
                
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Point of Contact</p>
                  <p className="font-bold text-zinc-800 mt-1 dark:text-white/40">{vendor.poc_name || 'Admin Provisioned'}</p>
                </div>
                
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-zinc-50 border dark:border-zinc-800 border-zinc-200 flex items-center justify-center shrink-0 dark:bg-zinc-900/40">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 dark:text-white" />
                    </div>
                    <p className="text-sm font-medium text-zinc-700 truncate">{vendor.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 dark:bg-zinc-900/40">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 dark:text-white" />
                    </div>
                    <p className="text-sm font-medium text-zinc-700">{vendor.poc_phone || vendor.phone}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Tax ID / License</p>
                  <p className="text-sm font-mono font-medium text-zinc-700 bg-zinc-50 px-3 py-2 rounded border border-zinc-200 dark:bg-transparent">
                    {vendor.permit_or_ein || 'N/A'}
                  </p>
                  {vendor.business_license_url && (
                    <a href={vendor.business_license_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 py-2 rounded-lg transition-colors border border-orange-200">
                      View Source Document
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-zinc-50 rounded-lg border border-zinc-100">
                <p className="text-zinc-500 text-sm font-medium">Vendor trace untethered or legacy.</p>
              </div>
            )}
          </div>

          {/* Logistics Box */}
          <div className="bg-white rounded-xl shadow-sm border dark:border-transparent border-zinc-200 p-6">
            <h3 className="text-lg font-bold text-zinc-900 mb-5 flex items-center gap-2">
              <Map className="w-5 h-5 text-zinc-400" />
              Logistics
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b dark:border-zinc-800 border-zinc-100">
                <span className="text-sm font-medium text-zinc-500">Physical Rooms</span>
                <span className="text-base font-bold text-zinc-900">{property.rooms || property.total_rooms || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-medium text-zinc-500">Database ID</span>
                <span className="font-mono text-[10px] bg-zinc-100 dark:bg-transparent dark:border-tr
                 px-2 py-1 rounded text-zinc-600 tracking-widest">{property.id.split('-')[0]}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-zinc-500">System Creation</span>
                <span className="text-sm font-bold text-zinc-700">
                  {property.created_at ? (
                    (() => {
                      try {
                        const d = new Date(property.created_at);
                        return isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      } catch(e) { return 'Unknown'; }
                    })()
                  ) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
