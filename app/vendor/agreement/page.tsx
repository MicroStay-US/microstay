'use client';

import { useVendor } from '@/contexts/VendorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { FileText, Download, Building2 } from 'lucide-react';

export default function VendorAgreementPage() {
  const { vendor } = useVendor();
  const { profile } = useAuth();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/microstay-partneragreement.pdf';
    link.download = 'microstay-partneragreement.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!vendor) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-xl font-semibold text-white">No Vendor Profile</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Agreement & Signup Form</h1>
        <p className="text-slate-400 mt-1">View and download your partnership agreement</p>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">MicroStay Partner Agreement</h2>
            <p className="text-sm text-slate-400 mt-1">
              The official agreement you signed when partnering with MicroStay. This document outlines the terms, fee structure, and responsibilities.
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Business Name</span>
              <p className="text-white mt-0.5">{vendor.business_name}</p>
            </div>
            <div>
              <span className="text-slate-500">Owner</span>
              <p className="text-white mt-0.5">{vendor.owner_name}</p>
            </div>
            <div>
              <span className="text-slate-500">Email</span>
              <p className="text-white mt-0.5">{vendor.email}</p>
            </div>
            <div>
              <span className="text-slate-500">Status</span>
              <p className="mt-0.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  vendor.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>{vendor.status.toUpperCase()}</span>
              </p>
            </div>
            <div>
              <span className="text-slate-500">Onboarded</span>
              <p className="text-white mt-0.5">{vendor.onboarded_at ? new Date(vendor.onboarded_at).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-500">Address</span>
              <p className="text-white mt-0.5">{[vendor.address, vendor.city, vendor.state, vendor.zip].filter(Boolean).join(', ') || 'N/A'}</p>
            </div>
          </div>
        </div>

        <Button onClick={handleDownload} className="bg-cyan-500 hover:bg-cyan-600 font-bold w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />Download Agreement (PDF)
        </Button>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Fee Structure Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-800">
            {/* <span className="text-slate-400">Platform Flat Fee (per check-in)</span>
            <span className="text-white font-mono"></span> */}
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400">Platform Percentage Fee</span>
            <span className="text-white font-mono">12%</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400">Owner Cancel Rate Threshold (flag)</span>
            <span className="text-amber-400 font-mono">30%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
