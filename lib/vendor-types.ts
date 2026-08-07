export type VendorRole = 'super_vendor' | 'front_desk';

export type Vendor = {
  id: string;
  auth_user_id: string;   // was user_id before fix_vendor_dual_identity migration
  business_name: string;
  owner_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  rooms: number | null;
  zip: string | null;
  status: 'pending' | 'active' | 'suspended';
  is_flagged: boolean;
  flag_reason: string | null;
  flagged_at: string | null;
  onboarded_at: string | null;
  created_at: string;
};

// Replaces old TeamMember (team_members table dropped; now uses vendor_staff)
export type TeamMember = {
  id: string;
  vendor_id: string;
  auth_user_id: string;   // was supabase_user_id in old team_members table
  name: string | null;
  email: string;
  role: 'owner' | 'manager' | 'front_desk' | 'support';
  permissions: Record<string, boolean>;
  is_active: boolean;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type Property = {
  id: string;
  vendor_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  total_rooms: number;
  star_rating: number;
  check_in_instructions: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  photos: string[];
  amenities: string[];
  special_instructions: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
};

export type VdTimeSlot = {
  id: string;
  property_id: string;
  slot_label: string;
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  price_per_room: number;
  max_rooms: number;
  room_type: string;
  bed_type?: string;
  smoking_type?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type BlockedDate = {
  id: string;
  property_id: string;
  vendor_id: string;
  blocked_date: string;
  reason: string;
  created_at: string;
};

export type VdBooking = {
  id: string;
  booking_ref: string;
  property_id: string;
  slot_id: string | null;
  vendor_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  rooms_booked: number;
  gross_amount: number;
  platform_flat_fee: number;
  platform_pct_fee: number | null;
  platform_total_fee: number | null;
  vendor_net: number | null;
  penalty_fee: number;
  status: 'pending' | 'checked_in' | 'no_show' | 'owner_cancel';
  checked_in_at: string | null;
  no_show_at: string | null;
  owner_cancelled_at: string | null;
  booking_date: string;
  action_taken_by: string | null;
  action_taken_by_name: string | null;
  cancel_reason: string | null;
  no_show_reason: string | null;
  auto_checkin_deadline: string | null;
  created_at: string;
  slot?: VdTimeSlot;
  property?: Property;
};

export type FeeLedgerEntry = {
  id: string;
  vd_booking_id: string | null;
  vendor_id: string;
  motel_id: string | null;
  entry_type: 'checkin_fee' | 'owner_cancel_penalty';
  gross_amount: number | null;
  flat_fee: number | null;
  pct_fee: number | null;
  total_fee: number;
  vendor_net: number | null;
  ledger_date: string;
  created_at: string;
};

export type ActivityLogEntry = {
  id: string;
  vendor_id: string;
  vd_booking_id: string | null;
  action: string;
  performed_by_user_id: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

export type VendorContext = {
  vendor: Vendor | null;
  role: VendorRole | null;
  teamMember: TeamMember | null;
  properties: Property[];
  selectedPropertyId: string | null;
  setSelectedPropertyId: (id: string | null) => void;
  refreshVendor: () => Promise<void>;
  vendorLoading: boolean;
  needsOnboarding: boolean;
};

export function formatHour(hour: number): string {
  if (hour === 0) return '12AM';
  if (hour === 12) return '12PM';
  if (hour < 12) return `${hour}AM`;
  return `${hour - 12}PM`;
}

export function calculateSlotDuration(startHour: number, endHour: number): number {
  if (endHour > startHour) return endHour - startHour;
  return 24 - startHour + endHour;
}

export function calculateFees(grossAmount: number) {
  const flatFee = 0.0;
  const pctFee = Math.round(grossAmount * 0.12 * 100) / 100;
  const totalFee = Math.round((flatFee + pctFee) * 100) / 100;
  const vendorNet = Math.round((grossAmount - totalFee) * 100) / 100;
  return { flatFee, pctFee, totalFee, vendorNet };
}
