import { supabase } from './supabase';

// NOTE: vendor_team_members table was dropped in fix_consolidate_staff_tables migration.
// All queries now use vendor_staff with auth_user_id instead of user_id.

export type VendorPermissions = {
  can_manage_time_slots: boolean;
  can_manage_rates: boolean;
  can_confirm_checkin: boolean;
  can_mark_no_show: boolean;
  can_cancel_booking: boolean;
};

export type VendorTeamMember = {
  id: string;
  vendor_id: string;
  auth_user_id: string | null;   // was user_id in old vendor_team_members table
  email: string;
  name: string | null;
  role: string;
  permissions: VendorPermissions;
  is_active: boolean;
  created_at: string;
};

export const DEFAULT_PERMISSIONS: VendorPermissions = {
  can_manage_time_slots: true,
  can_manage_rates: true,
  can_confirm_checkin: true,
  can_mark_no_show: true,
  can_cancel_booking: true,
};

export async function getVendorTeamMembers(vendorId: string): Promise<VendorTeamMember[]> {
  const { data, error } = await supabase
    .from('vendor_staff')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching team members:', error);
    return [];
  }

  return (data || []) as VendorTeamMember[];
}

export async function getTeamMemberCount(vendorId: string): Promise<number> {
  const { count, error } = await supabase
    .from('vendor_staff')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
    .eq('is_active', true);

  if (error) {
    console.error('Error counting team members:', error);
    return 0;
  }

  return count || 0;
}

export async function createTeamMember(
  vendorId: string,
  email: string,
  name: string,
  permissions: VendorPermissions = DEFAULT_PERMISSIONS
): Promise<{ success: boolean; error?: string; data?: VendorTeamMember }> {
  const count = await getTeamMemberCount(vendorId);
  if (count >= 3) {
    return {
      success: false,
      error: 'You can only create up to 3 team members. Please deactivate an existing member first.',
    };
  }

  const existingMember = await supabase
    .from('vendor_staff')
    .select('id')
    .eq('vendor_id', vendorId)
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existingMember.data) {
    return {
      success: false,
      error: 'A team member with this email already exists.',
    };
  }

  const tempPassword =
    crypto.randomUUID().replace(/-/g, '') +
    crypto.randomUUID().replace(/-/g, '').slice(0, 8) +
    'A1!';

  const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    password: tempPassword,
    email_confirm: true,
  });

  if (signUpError || !newUser.user) {
    return {
      success: false,
      error: signUpError?.message || 'Failed to create user account',
    };
  }

  // Give the new staff member a vendor profile
  await supabase.from('profiles').upsert({
    id: newUser.user.id,
    role: 'vendor',
    name: name,
    phone: '',
    requires_password_reset: true,
  });

  const { data: staffMember, error: insertError } = await supabase
    .from('vendor_staff')
    .insert({
      vendor_id: vendorId,
      auth_user_id: newUser.user.id,
      email: email.toLowerCase(),
      name,
      permissions,
      role: 'front_desk',
      is_active: true,
    })
    .select()
    .single();

  if (insertError) {
    return {
      success: false,
      error: insertError.message,
    };
  }

  return {
    success: true,
    data: { ...staffMember, tempPassword } as any,
  };
}

export async function updateTeamMember(
  teamMemberId: string,
  updates: Partial<Pick<VendorTeamMember, 'name' | 'permissions' | 'is_active'>>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('vendor_staff')
    .update(updates)
    .eq('id', teamMemberId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteTeamMember(teamMemberId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('vendor_staff')
    .delete()
    .eq('id', teamMemberId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getTeamMemberPermissions(userId: string): Promise<VendorPermissions | null> {
  const { data, error } = await supabase
    .from('vendor_staff')
    .select('permissions')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;

  return data.permissions as VendorPermissions;
}

export async function isVendorTeamMember(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('vendor_staff')
    .select('id')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return !!data;
}

export async function getVendorIdForTeamMember(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('vendor_staff')
    .select('vendor_id')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return data?.vendor_id || null;
}
