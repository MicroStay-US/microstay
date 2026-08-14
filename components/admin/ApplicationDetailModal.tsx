'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  Camera,
  CircleCheck,
  Circle,
  User,
  Calendar,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';

interface ApplicationDetailModalProps {
  application: any;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string, email: string, motelName: string) => void;
  onReject: (id: string, email: string, motelName: string) => void;
}

export default function ApplicationDetailModal({
  application,
  open,
  onClose,
  onApprove,
  onReject,
}: ApplicationDetailModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!application) return null;

  const app = application;
  const email = app.contact_email || app.email || '';
  const phone = app.contact_phone || app.phone || '';
  const pocName = [app.poc_name, app.point_of_contact_first_name, app.point_of_contact_last_name]
    .filter(Boolean)
    .join(' ') || app.contact_name || 'N/A';
  
  // Adapt to the new schema: photos may come directly from the `vendor_photos` join 
  const photos = app.vendor_photos?.map((p: any) => p.photo_url) || app.motel_photos || app.photos || [];
  
  // Extract agreement pdf if exists
  const agreement = app.vendor_agreements?.[0];

  const statusColor =
    app.status === 'pending' || app.status === 'pending_review'
      ? 'secondary'
      : app.status === 'approved' || app.status === 'active'
      ? 'default'
      : 'destructive';

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                {app.motel_name || app.business_name}
                <Badge variant={statusColor}>{app.status}</Badge>
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-2 ">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
              <div className="space-y-4">
                <div >
                  <h3 className="text-sm font-semibold dark:text-ms-orange text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Business Information
                  </h3>
                  <div className="bg-gray-50 dark:bg-transparent rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Business Name</span>
                      <p className="font-medium">{app.business_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Motel Name</span>
                      <p className="font-medium">{app.motel_name || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold dark:text-ms-orange text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h3>
                  <div className="bg-gray-50  dark:bg-transparent rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Address</span>
                      <p className="font-medium">
                        {app.address || app.business_address || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-xs text-gray-500">City</span>
                        <p className="font-medium">{app.city}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">State</span>
                        <p className="font-medium">{app.state}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">ZIP</span>
                        <p className="font-medium">{app.zip_code || app.zip || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold dark:text-ms-orange text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Point of Contact
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3  dark:bg-transparent">
                    <div>
                      <span className="text-xs text-gray-500">Name</span>
                      <p className="font-medium">{pocName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-xs text-gray-500">Email</span>
                        <p className="font-medium text-blue-600">{email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-xs text-gray-500">Phone</span>
                        <p className="font-medium">{phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold dark:text-ms-orange text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Application Details
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2  dark:bg-transparent">
                    <div>
                      <span className="text-xs text-gray-500">Applied On</span>
                      <p className="font-medium">
                        {new Date(app.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {app.reviewed_at && (
                      <div>
                        <span className="text-xs text-gray-500">Reviewed On</span>
                        <p className="font-medium">
                          {new Date(app.reviewed_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                    {app.approved_at && (
                      <div>
                        <span className="text-xs text-gray-500">Approved On</span>
                        <p className="font-medium">
                          {new Date(app.approved_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {app.business_license_url && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Business License
                  </h3>
                  <button
                    type="button"
                    onClick={async () => {
                      // 2026-04-12: licenses may be in the new private bucket or legacy
                      // public bucket. If the stored value looks like a storage PATH
                      // (no http://), exchange it for a short-lived signed URL via the
                      // admin API. Legacy rows that still contain a full URL open directly.
                      const value = app.business_license_url as string;
                      if (/^https?:\/\//i.test(value)) {
                        window.open(value, '_blank', 'noopener');
                        return;
                      }
                      try {
                        const { data: session } = await supabase.auth.getSession();
                        const token = session?.session?.access_token;
                        const res = await fetch(
                          `/api/admin/documents/signed-url?path=${encodeURIComponent(value)}&bucket=vendor-private-docs`,
                          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                        );
                        const json = await res.json();
                        if (json.url) {
                          window.open(json.url, '_blank', 'noopener');
                        } else {
                          alert(json.error || 'Unable to open document');
                        }
                      } catch (e) {
                        alert('Unable to open document');
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="font-medium text-sm">View Business License</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Separator />
              </>
            )}

            <div>
              <h3 className="text-sm font-semibold dark:text-ms-orange text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Partner Agreement
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 dark:bg-slate-800">
                {app.agreement_accepted ? (
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                      <CircleCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-green-800">Agreement Accepted</p>
                      <p className="text-sm text-gray-600">
                        {app.agreement_accepted_at ? `Signed on ${new Date(app.agreement_accepted_at).toLocaleDateString()}` : 'Signed dynamically via Wizard'}
                      </p>
                      {agreement?.pdf_url && (
                        <a href={agreement.pdf_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-md border border-orange-200 transition-colors">
                          <FileText className="w-3.5 h-3.5" /> View Signed PDF Document
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 ">
                    <div className="bg-red-100 dark:bg-transparent p-2 rounded-full">
                      <X className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-red-800 dark:text-rose-700">Agreement Not Accepted !</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {photos.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Motel Photos ({photos.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {photos.map((url: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedPhoto(url)}
                        className="relative group overflow-hidden rounded-lg aspect-video bg-gray-100 hover:ring-2 hover:ring-orange-400 transition-all"
                      >
                        <img
                          src={url}
                          alt={`Motel photo ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                            (e.target as HTMLImageElement).alt = 'Image unavailable';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {app.status === 'pending' && (
              <>
                <Separator />
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    size="lg"
                    onClick={() => {
                      onApprove(app.id, email, app.motel_name);
                      onClose();
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CircleCheck className="mr-2 h-4 w-4" />
                    Approve Application
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={() => {
                      onReject(app.id, email, app.motel_name);
                      onClose();
                    }}
                  >
                    <Circle className="mr-2 h-4 w-4" />
                    Reject Application
                  </Button>
                </div>
              </>
            )}

            {app.status === 'rejected' && (
              <>
                <Separator />
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    size="lg"
                    onClick={() => {
                      onApprove(app.id, email, app.motel_name);
                      onClose();
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CircleCheck className="mr-2 h-4 w-4" />
                    Revoke Rejection & Approve
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl p-2">
            <img
              src={selectedPhoto}
              alt="Motel photo full view"
              className="w-full h-auto rounded-lg max-h-[80vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
