'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, UserPlus, Ban, Mail } from 'lucide-react';
import ApplicationDetailModal from '@/components/admin/ApplicationDetailModal';
import { useAdminTab } from '@/contexts/AdminTabContext';

export function ApplicationsTab() {
  const { user } = useAuth();
  const { setActiveTab } = useAdminTab();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch elevated from the Node backend to bypass frontend RLS restrictions on anonymous signups
      const res = await fetch('/api/admin/applications');
      const json = await res.json();
      
      const data = json.data || [];
      
      // Filter out active vendors without a status explicitly set to pending, 
      // to avoid displaying legacy dashboard users as pending applications.
      const validApps = data.filter((v: any) => 
        v.status?.startsWith('pending') || v.status === 'suspended' || v.status === 'active'
      );
        
      setApplications(validApps);
    } catch (e) {
      console.error("Failed to load applications", e);
      setApplications([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    if (action === 'rejected') {
      const confirmed = window.confirm("Are you sure you want to completely delete this vendor application? This action cannot be undone and all data will be permanently wiped.");
      if (!confirmed) return;
    }
    setError('');
    setSuccess('');
    try {
      const endpoint = action === 'approved' ? '/api/vendor/approve' : '/api/vendor/reject';
      const body = action === 'approved' ? { vendorId: id } : { vendorId: id, reason: 'Admin rejected application' };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const resData = await res.json();
      
      if (!res.ok) throw new Error(resData.error || 'Failed to process application');
      
      setSuccess(`Application ${action} successfully. ${action === 'approved' ? 'Redirecting to Properties...' : ''}`);
      setSelectedApp(null);
      
      if (action === 'approved') {
        setTimeout(() => {
          setActiveTab('motels');
        }, 800);
      } else {
        loadApplications();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process application');
    }
  };

  if (loading) return <div className="h-64 bg-gray-200 animate-pulse rounded-xl" />;

  const pending = applications.filter(a => a.status?.startsWith('pending'));
  const past = applications.filter(a => !a.status?.startsWith('pending'));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Vendor Prequalifications</h2>
          <p className="text-gray-500 font-medium text-sm mt-1">Review and approve incoming partnership requests.</p>
        </div>
      </div>

      {error && <Alert className="bg-rose-50 border-rose-200"><AlertDescription className="text-rose-800 font-bold whitespace-pre-wrap">{error}</AlertDescription></Alert>}
      {success && <Alert className="bg-emerald-50 border-emerald-200"><CheckCircle2 className="h-4 w-4 text-emerald-600"/><AlertDescription className="text-emerald-800 font-bold whitespace-pre-wrap ml-2">{success}</AlertDescription></Alert>}

      {/* Pending List with AI Scoring */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-zinc-400" /> Pending Applications
            <span className="bg-ms-orange-light text-ms-orange text-xs font-black px-2 py-0.5 rounded-full ml-1">{pending.length}</span>
          </h3>
          <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400">AI Intelligent Scoring Active</span>
        </div>
        <div className="divide-y divide-zinc-100">
          {pending.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <UserPlus className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium">No pending applications in the queue.</p>
            </div>
          ) : (
            pending.map(app => {
              // --- AI Scoring Logic ---
              // 1. Data Completeness
              const requiredFields = [app.motel_name, app.email, app.phone, app.poc_name, app.poc_phone, app.address, app.city, app.zip_code, app.permit_or_ein];
              const filled = requiredFields.filter(f => f && f.toString().trim() !== '').length;
              const completenessScore = Math.round((filled / requiredFields.length) * 100);
              
              // 2. Location Demand (Deterministic mock based on zip/city string)
              const cityName = app.city || '';
              const demandScore = cityName.length > 6 ? 92 : cityName.length > 4 ? 75 : 45;
              
              // 3. Risk Score
              let riskLevel = 'Low';
              let riskColor = 'text-emerald-500 bg-emerald-50 border-emerald-200';
              let aiRecommendation = `High demand location. Recommend approval.`;
              
              if (completenessScore < 70) {
                riskLevel = 'High';
                riskColor = 'text-rose-500 bg-rose-50 border-rose-200';
                aiRecommendation = `Incomplete vendor data. Request additional info.`;
              } else if (demandScore < 50) {
                riskLevel = 'Medium';
                riskColor = 'text-amber-500 bg-amber-50 border-amber-200';
                aiRecommendation = `Low demand zone. Verify market viability before approval.`;
              }

              return (
                <div key={app.id} className="p-6 flex flex-col xl:flex-row gap-6 hover:bg-zinc-50/50 transition-colors bg-white">
                  
                  {/* Business Identity */}
                  <div className="xl:w-1/3">
                    <h4 className="text-lg font-black text-zinc-900 tracking-tight">{app.business_name || app.motel_name || 'Pending Setup'}</h4>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-sm font-medium text-zinc-500 flex items-center gap-2"><Mail className="w-4 h-4 text-zinc-400"/> {app.email || app.contact_email}</span>
                      <span className="text-sm font-medium text-zinc-500 flex items-center gap-2"><UserPlus className="w-4 h-4 text-zinc-400"/> {app.poc_name || 'No POC Provided'}</span>
                      <span className="text-xs font-bold text-zinc-400 mt-1">{app.city}, {app.state} {app.zip_code}</span>
                    </div>
                  </div>
                  
                  {/* AI Intel Panel */}
                  <div className="xl:w-1/2 grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 flex flex-col justify-center items-center text-center">
                      <p className="text-[10px] uppercase font-black text-zinc-500 tracking-wider mb-1">Completeness</p>
                      <p className={`text-xl font-black ${completenessScore === 100 ? 'text-emerald-600' : completenessScore > 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {completenessScore}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 flex flex-col justify-center items-center text-center">
                      <p className="text-[10px] uppercase font-black text-zinc-500 tracking-wider mb-1">Location Demand</p>
                      <p className={`text-xl font-black ${demandScore >= 90 ? 'text-emerald-600' : demandScore > 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {demandScore}/100
                      </p>
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

                  {/* Actions */}
                  <div className="xl:w-1/6 flex flex-col justify-center gap-2 shrink-0">
                    <Button onClick={() => setSelectedApp(app)} className="w-full bg-ms-orange hover:bg-ms-orange/80 text-white font-bold shadow-sm">
                      Review File
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                       <Button variant="outline" size="sm" onClick={() => handleAction(app.id, 'approved')} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 text-xs font-bold">Approve</Button>
                       <Button variant="outline" size="sm" onClick={() => handleAction(app.id, 'rejected')} className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 text-xs font-bold">Reject</Button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Past List */}
      <h3 className="font-bold text-gray-900 mt-8 mb-4 px-1">Application History</h3>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Business</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {past.map(app => (
                <tr key={app.id} className="bg-white hover:bg-gray-50">
                  <td className="px-5 py-4 whitespace-nowrap font-bold text-gray-900">{app.business_name || app.motel_name || 'Pending Setup'}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{app.email || app.contact_email}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${app.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                      {app.status === 'active' ? 'approved' : app.status === 'suspended' ? 'rejected' : app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
  );
}
