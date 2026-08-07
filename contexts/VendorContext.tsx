'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import type { Vendor, TeamMember, Property, VendorRole, VendorContext as VCtx } from '@/lib/vendor-types';

const VendorContext = createContext<VCtx>({
  vendor: null,
  role: null,
  teamMember: null,
  properties: [],
  selectedPropertyId: null,
  setSelectedPropertyId: () => {},
  refreshVendor: async () => {},
  vendorLoading: true,
  needsOnboarding: false,
});

export function VendorProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [role, setRole] = useState<VendorRole | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const loadVendorData = useCallback(async () => {
    if (!user) {
      setVendor(null);
      setRole(null);
      setTeamMember(null);
      setProperties([]);
      setVendorLoading(false);
      setNeedsOnboarding(false);
      return;
    }

    setVendorLoading(true);

    // ── 1. Check if user is a vendor owner ──────────────────────────────────
    // NOTE: column was renamed user_id → auth_user_id in migration fix_vendor_dual_identity
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();
//       console.log('USER ID:', user.id);
// console.log('VENDOR DATA:', vendorData);

    if (vendorData) {
      setVendor(vendorData as Vendor);
      setRole('super_vendor');
      setTeamMember(null);
      // onboarded_at null = hasn't completed onboarding wizard yet
      setNeedsOnboarding(!vendorData.onboarded_at);

      const { data: propsData } = await supabase
        .from('properties')
        .select('*')
        .eq('vendor_id', vendorData.id)
        // .eq('status', 'approved')
        .order('created_at', { ascending: true });

      const props = (propsData || []) as Property[];
      setProperties(props);
      if (props.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(props[0].id);
      }
      setVendorLoading(false);
      return;
    }

    // ── 2. Check if user is a front-desk staff member ────────────────────────
    // NOTE: team_members table was replaced by vendor_staff in migration fix_consolidate_staff_tables
    const { data: staffData } = await supabase
      .from('vendor_staff')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (staffData) {
      setTeamMember(staffData as TeamMember);
      setRole('front_desk');
      setNeedsOnboarding(false);

      const { data: vData } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', staffData.vendor_id)
        .maybeSingle();

      if (vData) {
        setVendor(vData as Vendor);

        const { data: propsData } = await supabase
          .from('properties')
          .select('*')
          .eq('vendor_id', vData.id)
          .order('created_at', { ascending: true });

            // console.log("propsData:", propsData);

        const props = (propsData || []) as Property[];
        setProperties(props);
        if (props.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(props[0].id);
        }
      }
      setVendorLoading(false);
      return;
    }

    // ── 3. No vendor record — auto-create a minimal pending profile ──────────
    try {
      const res = await fetch('/api/vendor/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: profile?.name || user.email?.split('@')[0],
        }),
      });
      const json = await res.json();
      if (json.vendor) {
        setVendor(json.vendor as Vendor);
        setRole('super_vendor');
        setNeedsOnboarding(true);
      }
    } catch (e) {
      console.error('[VendorContext] auto-init failed:', e);
    }

    setVendorLoading(false);
  }, [user, profile]);

  useEffect(() => {
    loadVendorData();
  }, [loadVendorData]);

  return (
    <VendorContext.Provider
      value={{
        vendor,
        role,
        teamMember,
        properties,
        selectedPropertyId,
        setSelectedPropertyId,
        refreshVendor: loadVendorData,
        vendorLoading,
        needsOnboarding,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
}

export const useVendor = () => useContext(VendorContext);
