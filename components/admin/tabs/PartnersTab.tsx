'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2, UserPlus, Mail, Building2, MapPin,
  Users, AlertTriangle, ShieldCheck,
  Search, FileText, ClipboardList, WifiOff, Wifi
} from 'lucide-react';
import ApplicationDetailModal from '@/components/admin/ApplicationDetailModal';
import { useRBAC } from '@/contexts/RBACContext';
import { safeFetch } from '@/lib/api';

type SubTab = 'applications' | 'properties' | 'vendors';

export function PartnersTab({ initialSubTab }: { initialSubTab?: SubTab }) {
  const router = useRouter();
  const { can } = useRBAC();
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab || 'applications');

  // ---------- Applications state ----------
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // ---------- Properties state ----------
  const [properties, setProperties] = useState<any[]>([]);
  const [propsLoading, setPropsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  // ---------- Vendors state ----------
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // ---- Loaders ----
  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    const json = await safeFetch<{ data?: any[] }>('/api/admin/applications');
    const data = (json?.data || []).filter((v: any) =>
      v.status?.startsWith('pending') || v.status === 'suspended' || v.status === 'active'
    );
    setApplications(data);
    setAppsLoading(false);
  }, []);

  const loadProperties = useCallback(async () => {
    setPropsLoading(true);
    const json = await safeFetch<{ data?: any[] }>('/api/admin/properties');
    setProperties(json?.data|| []);
    setPropsLoading(false);
  }, []);

  const loadVendors = useCallback(async () => {
    setVendorsLoading(true);
    try {
      const { data: allVendors } = await supabase.from('vendors').select('*');
      const { data: props } = await supabase.from('properties').select('vendor_id, id');
      const { data: bookings } = await supabase.from('vd_bookings').select('vendor_id, status');

      const propertyMap = new Map<string, number>();
      (props || []).forEach((p: any) => propertyMap.set(p.vendor_id, (propertyMap.get(p.vendor_id) || 0) + 1));

      const bookingData = new Map<string, { total: number; cancelled: number }>()   ;
      (bookings || []).forEach((b: any) => {
        const s = bookingData.get(b.vendor_id) || { total: 0, cancelled: 0 };
        s.total++;
        if (['owner_cancel', 'customer_cancel', 'no_show'].includes(b.status)) s.cancelled++;
        bookingData.set(b.vendor_id, s);
      });

      const merged = (allVendors || []).map((v: any) => {
        const bStats = bookingData.get(v.id) || { total: 0, cancelled: 0 };
        const cancelRate = bStats.total > 0 ? (bStats.cancelled / bStats.total) * 100 : 0;
        return { ...v, totalProperties: propertyMap.get(v.id) || 0, totalBookings: bStats.total, cancelRate: Math.round(cancelRate) };
      });
      setVendors(merged);
    } catch { setVendors([]); }
    setVendorsLoading(false);
  }, []);

  useEffect(() => { loadApplications(); loadProperties(); loadVendors(); }, [loadApplications, loadProperties, loadVendors]);

  const togglePropertyStatus = async (e: React.MouseEvent, propertyId: string, currentStatus: string) => {
    e.stopPropagation();
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setToggling(propertyId);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: newStatus } : p));
      }
    } finally {
      setToggling(null);
    }
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    if (action === 'rejected') {
      const confirmed = window.confirm("Are you sure you want to completely delete this vendor application? This action cannot be undone and all data will be permanently wiped.");
      if (!confirmed) return;
    }
    setActionError(''); setActionSuccess('');
    try {
      const endpoint = action === 'approved' ? '/api/vendor/approve' : '/api/vendor/reject';
      const body = action === 'approved' ? { vendorId: id } : { vendorId: id, reason: 'Admin rejected application' };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to process application');
      setActionSuccess(`Application ${action} successfully.${action === 'approved' ? ' Switched to Properties.' : ''}`);
      setSelectedApp(null);
      if (action === 'approved') {
        await loadProperties();
        setTimeout(() => setSubTab('properties'), 800);
      } else {
        await loadApplications();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to process application');
    }
  };

  const [auditVendor, setAuditVendor] = useState<any | null>(null);

  // ---- Derived counts for KPI strip ----
  const pendingCount = applications.filter(a => a.status?.startsWith('pending')).length;
  const liveCount = properties.filter(p => p.status === 'active').length;
  const highRiskCount = vendors.filter(v => v.cancelRate >= 30 && v.totalBookings > 0).length;

  const filteredProperties = properties.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name?.toLowerCase().includes(s) || p.city?.toLowerCase().includes(s) || p.state?.toLowerCase().includes(s);
  });

  const subTabs: { key: SubTab; label: string; icon: any; badge?: number }[] = [
    { key: 'applications', label: 'Applications', icon: ClipboardList, badge: pendingCount },
    { key: 'properties', label: 'Properties', icon: Building2 },
    { key: 'vendors', label: 'Vendors', icon: Users },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div onClick={() => setSubTab('applications')} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-ms-orange-border transition-colors">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pending Applications</p>
          <p className="text-3xl font-black text-zinc-900 mt-1">{pendingCount}</p>
          <p className="text-xs text-zinc-400 mt-1">awaiting review</p>
        </div>
        <div onClick={() => setSubTab('properties')} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-ms-orange-border transition-colors">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Live Properties</p>
          <p className="text-3xl font-black text-zinc-900 mt-1">{liveCount}</p>
          <p className="text-xs text-zinc-400 mt-1">of {properties.length} total</p>
        </div>
        <div onClick={() => setSubTab('vendors')} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-ms-orange-border transition-colors">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Vendors</p>
          <p className="text-3xl font-black text-zinc-900 mt-1">{vendors.length}</p>
          <p className="text-xs text-zinc-400 mt-1">{highRiskCount > 0 ? <span className="text-rose-500 font-bold">{highRiskCount} high risk</span> : 'all trusted'}</p>
        </div>
      </div>

      {/* Sub-tab pills */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-0">
        {subTabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-lg border-b-2 transition-all relative
              ${subTab === key
                ? 'border-ms-orange-border text-ms-orange bg-ms-orange-light/50'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 dark:hover:bg-slate-950 dark:hover:text-white'
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge && badge > 0 ? (
              <span className="bg-ms-orange text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ---- APPLICATIONS ---- */}
      {subTab === 'applications' && (
        <div className="space-y-6">
          {actionError && <Alert className="bg-rose-50 border-rose-200 dark:bg-rose-500 dark:border-transparent"><AlertDescription className="text-rose-800 dark:text-white animate-pulse font-bold dark:bg-rose-500 dark:border-transparent">{actionError} !</AlertDescription></Alert>}
          {actionSuccess && <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-500 dark:border-transparent"><CheckCircle2 className="h-4 w-4 text-emerald-600 inline mr-2" /><AlertDescription className="text-emerald-800 font-bold inline">{actionSuccess}</AlertDescription></Alert>}

          {appsLoading ? <div className="h-48 bg-zinc-200 dark:bg-slate-700 animate-pulse rounded-xl" /> : (() => {
            const pending = applications.filter(a => a.status?.startsWith('pending'));
            const past = applications.filter(a => !a.status?.startsWith('pending'));
            return (
              <>
                <div className="bg-white border border-zinc-200  rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 dark:bg-slate-950 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-zinc-400" /> Pending Applications
                      <span className="bg-ms-orange-light text-ms-orange text-xs font-black px-2 py-0.5 rounded-full ml-1 dark:bg-ms-orange dark:text-white">{pending.length}</span>
                    </h3>
                    <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400">AI Intelligent Scoring Active</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-black dark:bg-slate-800">
                    {pending.length === 0 ? (
                      <div className="px-5 py-16 text-center">
                        <UserPlus className="w-8 h-8 text-zinc-300 dark:text-white mx-auto mb-3" />
                        <p className="text-zinc-500 dark:text-white font-medium">No pending applications in the queue.</p>
                      </div>
                    ) : pending.map(app => {
                      const requiredFields = [app.motel_name, app.email, app.phone, app.poc_name, app.poc_phone, app.address, app.city, app.zip_code, app.permit_or_ein];
                      const filled = requiredFields.filter(f => f && f.toString().trim() !== '').length;
                      const completenessScore = Math.round((filled / requiredFields.length) * 100);
                      const cityName = app.city || '';
                      const demandScore = cityName.length > 6 ? 92 : cityName.length > 4 ? 75 : 45;
                      let riskLevel = 'Low', riskColor = 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-slate-900 dark:border-transparent', aiRecommendation = 'High demand location. Recommend approval.';
                      if (completenessScore < 70) { riskLevel = 'High'; riskColor = 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-red-700 dark:border-red-700 dark:text-white'; aiRecommendation = 'Incomplete vendor data. Request additional info.'; }
                      else if (demandScore < 50) { riskLevel = 'Medium'; riskColor = 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-yellow-900 dark:border-yellow-900'; aiRecommendation = 'Low demand zone. Verify market viability before approval.'; }
                      return (
                        <div key={app.id} className="p-6 flex flex-col xl:flex-row gap-6 hover:bg-zinc-50/50 transition-colors bg-white dark:hover:bg-transparent/10">
                          <div className="xl:w-1/3">
                            <h4 className="text-lg font-black text-zinc-900 tracking-tight">{app.business_name || app.motel_name}</h4>
                            <div className="flex flex-col gap-1 mt-2">
                              <span className="text-sm font-medium text-zinc-500 flex items-center gap-2"><Mail className="w-4 h-4 text-zinc-400" /> {app.email || app.contact_email}</span>
                              <span className="text-sm font-medium text-zinc-500 flex items-center gap-2"><UserPlus className="w-4 h-4 text-zinc-400" /> {app.poc_name || 'No POC Provided'}</span>
                              <span className="text-xs font-bold text-zinc-400 mt-1">{app.city}, {app.state} {app.zip_code}</span>
                            </div>
                          </div>
                          <div className="xl:w-1/2 grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 flex flex-col justify-center items-center text-center dark:bg-transparent/70 dark:border-transparent">
                              <p className="text-[10px] uppercase font-black text-zinc-500 tracking-wider mb-1">Completeness</p>
                              <p className={`text-xl font-black ${completenessScore === 100 ? 'text-emerald-600' : completenessScore > 70 ? 'text-amber-500' : 'text-rose-500'}`}>{completenessScore}%</p>
                            </div>
                            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 flex flex-col justify-center items-center text-center dark:bg-transparent/40 dark:border-transparent">
                              <p className="text-[10px] uppercase font-black text-zinc-500 tracking-wider mb-1">Location Demand</p>
                              <p className={`text-xl font-black ${demandScore >= 90 ? 'text-emerald-600' : demandScore > 60 ? 'text-amber-500' : 'text-rose-500'}`}>{demandScore}/100</p>
                            </div>
                            <div className={`p-3 rounded-lg border flex flex-col justify-center items-center text-center ${riskColor}`}>
                              <p className="text-[10px] uppercase font-black tracking-wider mb-1 opacity-80">Risk Score</p>
                              <p className="text-lg font-black">{riskLevel}</p>
                            </div>
                            <div className="col-span-3 mt-1 flex items-center gap-2 bg-ms-admin-bg p-2.5 rounded-lg">
                              <div className="w-2 h-2 rounded-full bg-ms-orange animate-pulse shrink-0" />
                              <p className="text-xs font-bold text-zinc-300">AI Insight: <span className="text-white font-medium italic">{aiRecommendation}</span></p>
                            </div>
                          </div>
                          <div className="xl:w-1/6 flex flex-col justify-center gap-2 shrink-0">
                            <Button onClick={() => setSelectedApp(app)} className="w-full bg-ms-orange hover:bg-ms-orange/80 text-white font-bold shadow-sm">Review File</Button>
                            {can('approveVendors') && (
                              <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleAction(app.id, 'approved')} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold dark:bg-emerald-700 dark:text-white dark:border-transparent dark:shadow-md dark:hover:shadow-emerald-500 dark:active:scale-90">Approve</Button>
                                <Button variant="outline" size="sm" onClick={() => handleAction(app.id, 'rejected')} className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold dark:bg-rose-500 dark:text-white dark:border-transparent dark:shadow-md dark:hover:shadow-rose-300 dark:active:scale-90">Reject</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 px-1">Application History</h3>
                <div className="bg-white
                 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b dark:border-gray-700 dark:bg-slate-900 border-gray-100">
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Business</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 ">
                        {past.map(app => (
                          <tr key={app.id} className="bg-white hover:bg-gray-50">
                            <td className="px-5 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-ms-orange">{app.business_name || app.motel_name}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{app.email || app.contact_email}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${app.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-green-600/40 dark:border-transparent dark:text-white animate-pulse' : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-red-900/40 dark:border-transparent dark:text-white'}`}>
                                {app.status === 'active' ? 'approved' : app.status === 'suspended' ? 'rejected' : app.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}

          {selectedApp && (
            <ApplicationDetailModal
              open={true}
              application={selectedApp}
              onClose={() => setSelectedApp(null)}
              onApprove={() => handleAction(selectedApp.id, 'approved')}
              onReject={() => handleAction(selectedApp.id, 'rejected')}
            />
          )}
        </div>
      )}

      {/* ---- PROPERTIES ---- */}
      {subTab === 'properties' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 font-medium">Directory of all live motels and hotels operating on MicroStay.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or location..." className="pl-9 h-10 w-64 bg-white border-zinc-200 text-sm font-medium shadow-sm" />
            </div>
          </div>

          {propsLoading ? <div className="h-48 bg-zinc-200 dark:bg-slate-700 animate-pulse rounded-xl" /> : (
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b dark:bg-slate-900 dark: border-zinc-200">
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-black">
                    {filteredProperties.map(p => {
                      const ownerName = p.vendor?.owner_name || p.vendor?.business_name || 'Unknown Owner';
                      return (
                        <tr key={p.id} onClick={() => router.push(`/admin/properties/${p.id}`)} className="hover:bg-zinc-50/80 transition-colors bg-white cursor-pointer group">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold dark:text-ms-orange text-zinc-900 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-zinc-400 group-hover:text-ms-orange transition-colors  " /> {p.name}
                            </div>
                            <div className="text-xs text-zinc-500 font-medium mt-1 truncate max-w-[200px]">{p.address}</div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 dark:text-white/50 text-sm font-bold text-zinc-800">
                              <MapPin className="w-3.5 h-3.5  text-zinc-400 group-hover:text-ms-orange transition-colors" />
                              {p.city}, {p.state} {p.zip_code}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <button
                              onClick={e => { e.stopPropagation(); setSubTab('vendors'); }}
                              className="text-sm font-bold text-zinc-900 hover:text-ms-orange transition-colors"
                            >
                              {ownerName}
                            </button>
                            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3 text-zinc-400" /> {p.vendor?.email || p.email || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-600 dark:text-white dark:border-transparent' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-700/40 dark:text-white dark:border-transparent'}`}>
                              {p.status === 'active' ? 'LIVE' : 'OFFLINE'}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                            <button
                              disabled={toggling === p.id}
                              onClick={(e) => togglePropertyStatus(e, p.id, p.status)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                toggling === p.id
                                  ? 'opacity-50 cursor-not-allowed bg-zinc-100 text-zinc-400 border-zinc-200'
                                  : p.status === 'active'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-700 dark:text-white dark:border-transparent dark:hover:bg-rose-700/30 '
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-700 dark:text-white dark:border-transparent dark:hover:bg-emerald-700/30 '
                              }`}
                            >
                              {toggling === p.id ? '...' : p.status === 'active'
                                ? <><WifiOff className="w-3.5 h-3.5" /> Take Offline</>
                                : <><Wifi className="w-3.5 h-3.5" /> Go Live</>}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProperties.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-16 text-center">
                        <Building2 className="mx-auto h-8 w-8 text-zinc-300 mb-3" />
                        <p className="text-zinc-500 font-medium">No properties match your search.</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- VENDORS ---- */}
      {subTab === 'vendors' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 font-medium">Directory of officially partnered business owners and algorithmic risk scoring.</p>

          {vendorsLoading ? <div className="h-48 bg-zinc-200 animate-pulse rounded-xl dark:bg-slate-700" /> : vendors.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-12 text-center">
              <Users className="mx-auto h-8 w-8 text-zinc-300 mb-3" />
              <h3 className="text-lg font-bold text-zinc-900">No Approved Vendors</h3>
              <p className="text-zinc-500">You have zero active vendors operating on the MicroStay platform.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50/80 dark:bg-slate-950 text-xs uppercase font-bold text-zinc-500 border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-4">Business Information</th>
                      <th className="px-6 py-4">Properties</th>
                      <th className="px-6 py-4">Flow Rate</th>
                      <th className="px-6 py-4">System Risk</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-black">
                    {vendors.map(vendor => {
                      const isHighRisk = vendor.cancelRate >= 30;
                      return (
                        <tr key={vendor.id} className="hover:bg-zinc-50/50 dark:hover:bg-transparent/10 transition-colors bg-white group  ">
                          <td className="px-6 py-5">
                            <div className="font-bold text-zinc-900 dark:text-ms-orange">{vendor.business_name || vendor.motel_name}</div>
                            <div className="text-xs font-bold text-zinc-500 mt-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {vendor.poc_name || 'Admin'}</div>
                            <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1.5"><Mail className="h-3 w-3" /> {vendor.email}</div>
                          </td>
                          <td className="px-6 py-5">
                            <button
                              onClick={() => setSubTab('properties')}
                              className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-1 rounded bg-zinc-100 text-zinc-800 font-black border border-zinc-200 hover:bg-ms-orange-light hover:border-ms-orange-border hover:text-ms-orange transition-colors dark:bg-slate-800 dark:text-ms-orange-light dark:border-transparent dark:hover:text-ms-orange"
                              title="View properties"
                            >
                              {vendor.totalProperties}
                            </button>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold text-zinc-900">{vendor.totalBookings} <span className="text-zinc-400 font-medium text-xs">tx</span></div>
                            <div className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{vendor.totalBookings > 0 ? 'Active Engine' : 'Idle'}</div>
                          </td>
                          <td className="px-6 py-5 ">
                            {vendor.totalBookings === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Insufficient Data</span>
                            ) : isHighRisk ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-rose-50 border border-rose-200 text-rose-600 gap-1.5 dark:bg-rose-600 dark:text-white dark:border-transparent"><AlertTriangle className="w-3 h-3" />High Risk</span>
                                <span className="text-xs font-bold text-rose-500">{vendor.cancelRate}% Cancel Rate</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-600 gap-1.5 dark:bg-emerald-600 dark:text-white dark:border-transparent"><ShieldCheck className="w-3 h-3" />Trusted</span>
                                <span className="text-xs font-bold text-emerald-600">{vendor.cancelRate}% Cancel Rate</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <Button variant="outline" size="sm" onClick={() => setAuditVendor(vendor)} className="h-8 text-xs font-bold text-zinc-600 hover:text-ms-orange hover:border-ms-orange-border shadow-sm transition-colors">
                              Audit Vendor
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vendor Audit Modal */}
      {auditVendor && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setAuditVendor(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 w-[480px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-ms-orange">Vendor Audit</p>
                <h2 className="text-lg font-black text-zinc-900 mt-0.5">{auditVendor.business_name}</h2>
              </div>
              <button onClick={() => setAuditVendor(null)} className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-transparent/40 dark:hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Contact', value: auditVendor.poc_name || '—' },
                { label: 'Email', value: auditVendor.email || '—' },
                { label: 'Properties', value: auditVendor.totalProperties },
                { label: 'Total Bookings', value: auditVendor.totalBookings },
                { label: 'Cancel Rate', value: `${auditVendor.cancelRate}%` },
                { label: 'Risk Level', value: auditVendor.cancelRate >= 30 && auditVendor.totalBookings > 0 ? 'High Risk' : auditVendor.totalBookings === 0 ? 'No Data' : 'Trusted' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100 dark:bg-transparent/40 dark:text-white dark:border-transparent">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-ms-orange ">{label}</p>
                  <p className="text-sm font-bold text-zinc-900 mt-0.5 truncate">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {auditVendor.cancelRate >= 30 && auditVendor.totalBookings > 0 && (
                <div className="flex-1 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-semibold dark:bg-rose-700/40 dark:text-white dark:border-transparent">
                  ⚠️ High cancel rate detected. Consider vendor review or suspension.
                </div>
              )}
              {(auditVendor.cancelRate < 30 || auditVendor.totalBookings === 0) && (
                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 font-semibold dark:bg-emerald-600/40 dark:text-white dark:border-transparent">
                  ✓ Vendor performance within acceptable thresholds.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
