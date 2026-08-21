'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle, XCircle, CheckCircle2, AlertTriangle,
  RefreshCw, Building2, MapPin, User, Clock, Image as ImageIcon, X,
} from 'lucide-react';

type VendorWithProperty = {
  id: string;
  auth_user_id: string;
  business_name: string;
  owner_name: string;
  email: string;
  status: string;
  created_at: string;
  properties: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    status: string;
    photos: string[];
  }[];
};

function PropertyStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${cfg[status] || cfg.pending}`}>
      {status}
    </span>
  );
}

export function PropertyApprovalTab() {
  const [vendors, setVendors] = useState<VendorWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: e } = await supabase
      .from('vendors')
      .select('id, auth_user_id, business_name, owner_name, email, status, created_at, properties(id, name, address, city, state, status, photos)')
      .or('status.eq.pending,status.eq.pending_review')
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    else setVendors((data as VendorWithProperty[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateVendorStatus = async (vendorId: string, status: 'active' | 'rejected') => {
    const key = `${vendorId}-${status}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    setError('');
    const { error: e } = await supabase.from('vendors').update({ status }).eq('id', vendorId);
    if (e) { setError(e.message); }
    else {
      setSuccess(`Vendor ${status === 'active' ? 'approved' : 'rejected'} successfully.`);
      setTimeout(() => setSuccess(''), 4000);
      await load();
    }
    setActionLoading(prev => ({ ...prev, [key]: false }));
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  if (loading) return <div className="h-64 bg-zinc-200 dark:bg-slate-700 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-zinc-300 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightbox}
            alt="Property photo"
            className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl "
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
            Property Approvals
            {vendors.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-700/40 dark:text-white dark:border-transparent">
                {vendors.length} Pending
              </span>
            )}
          </h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">Review and approve vendor property applications.</p>
        </div>
        <Button variant="outline" onClick={load} className="text-zinc-700 font-bold border-zinc-300 gap-2 dark:bg-slate-900 dark:text-white/80 dark:border-transparent dark:hover:bg-slate-800 dark:text-white ">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {error && (
        <Alert className="bg-rose-50 border-rose-200 dark:bg-emerald-700  dark:border-transparent">
          <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-white" />
          <AlertDescription className="text-rose-800 font-bold ml-2 dark:text-white">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-50 dark:bg-emerald-700  dark:border-transparent border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-white" />
          <AlertDescription className="text-emerald-800 font-bold ml-2 dark:text-white">{success}</AlertDescription>
        </Alert>
      )}

      {vendors.length === 0 ? (
        <div className="bg-white border border-zinc-200 dark:bg-transparent/50 dark:border-transparent rounded-2xl shadow-sm p-16 text-center">
          <CheckCircle className="w-14 h-14 text-emerald-300 dark:slate-800 dark:text-black mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-900 dark:text-black">No Pending Applications</h3>
          <p className="text-zinc-500 font-medium mt-1 dark:text-black/30">All vendor applications have been reviewed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {vendors.map(vendor => {
            const prop = vendor.properties?.[0];
            const photos: string[] = prop?.photos || [];
            const previewPhotos = photos.slice(0, 3);
            const approveKey = `${vendor.id}-active`;
            const rejectKey = `${vendor.id}-rejected`;

            return (
              <div key={vendor.id} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* Photo strip */}
                {previewPhotos.length > 0 ? (
                  <div className="flex h-40 gap-0.5 bg-zinc-100 ">
                    {previewPhotos.map((url, i) => (
                      <div
                        key={i}
                        className="flex-1 cursor-pointer overflow-hidden group "
                        onClick={() => setLightbox(url)}
                      >
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-90  transition-opacity"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    ))}
                    {photos.length > 3 && (
                      <div className="w-14 h-full bg-zinc-800/70 flex items-center justify-center">
                        <span className="text-white text-xs font-black">+{photos.length - 3}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 bg-zinc-100 dark:bg-slate-900 flex items-center justify-center rounded-t-2xl">
                    <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-slate-500" />
                    <span className="text-zinc-400 dark:text-slate-400 text-sm font-medium ml-2">
                      No photos uploaded
                    </span>
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                  {/* Vendor info */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-zinc-900 text-base">{vendor.business_name || 'Pending Setup'}</h3>
                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium mt-0.5">
                          <User className="w-3 h-3" /> {vendor.owner_name}
                        </div>
                        <div className="text-zinc-400 text-xs font-medium mt-0.5">{vendor.email}</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex-shrink-0">
                        <Clock className="w-3 h-3" /> {timeAgo(vendor.created_at)}
                      </div>
                    </div>

                    {/* Property info */}
                    {prop && (
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 mt-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-zinc-400" />
                          <span className="font-bold text-zinc-800 text-sm">{prop.name}</span>
                          <PropertyStatusBadge status={prop.status} />
                        </div>
                        <div className="flex items-start gap-1.5 text-xs text-zinc-500 font-medium">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{prop.address}, {prop.city}, {prop.state}</span>
                        </div>
                      </div>
                    )}

                    {!prop && (
                      <div className="bg-amber-50 border border-amber-200 dark:bg-ms-orange dark:text-white dark:border-transparent rounded-xl p-3 mt-3 text-xs font-bold text-amber-700">
                        No property linked to this vendor yet.
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-auto">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm gap-2"
                      disabled={actionLoading[approveKey] || actionLoading[rejectKey]}
                      onClick={() => updateVendorStatus(vendor.id, 'active')}
                    >
                      {actionLoading[approveKey]
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <CheckCircle className="w-4 h-4" />}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold gap-2 dark:bg-slate-900 dark:hover:text-white dark:hover:bg-red-500 dark:border-transparent"
                      disabled={actionLoading[approveKey] || actionLoading[rejectKey]}
                      onClick={() => updateVendorStatus(vendor.id, 'rejected')}
                    >
                      {actionLoading[rejectKey]
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <XCircle className="w-4 h-4" />}
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
