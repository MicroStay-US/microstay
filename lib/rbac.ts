// ─── Role-Based Access Control System ────────────────────────────────────────

export type AdminRole = 'super_admin' | 'manager' | 'support' | 'none';

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  support: 'Support',
  none: 'No Access',
};

export const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  manager: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  support: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  none: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export interface Permissions {
  // Bookings
  viewBookings: boolean;
  manageBookings: boolean;       // confirm check-in, cancel
  bulkActions: boolean;
  // Vendors / Partners
  viewVendors: boolean;
  approveVendors: boolean;
  manageVendors: boolean;        // edit, delete
  // Revenue / Finance
  viewRevenue: boolean;
  manageRevenue: boolean;        // mark paid, issue invoices
  // Analytics / Reports
  viewReports: boolean;
  viewAiInsights: boolean;
  // Operations
  accessCommandCenter: boolean;
  viewSLA: boolean;
  manageSLA: boolean;            // manual override
  // System
  accessSettings: boolean;
  manageRBAC: boolean;           // change user roles
}

const NO_PERMISSIONS: Permissions = {
  viewBookings: false, manageBookings: false, bulkActions: false,
  viewVendors: false, approveVendors: false, manageVendors: false,
  viewRevenue: false, manageRevenue: false,
  viewReports: false, viewAiInsights: false,
  accessCommandCenter: false, viewSLA: false, manageSLA: false,
  accessSettings: false, manageRBAC: false,
};

export const ROLE_PERMISSIONS: Record<AdminRole, Permissions> = {
  none: NO_PERMISSIONS,
  super_admin: {
    viewBookings: true, manageBookings: true, bulkActions: true,
    viewVendors: true, approveVendors: true, manageVendors: true,
    viewRevenue: true, manageRevenue: true,
    viewReports: true, viewAiInsights: true,
    accessCommandCenter: true, viewSLA: true, manageSLA: true,
    accessSettings: true, manageRBAC: true,
  },
  manager: {
    viewBookings: true, manageBookings: true, bulkActions: true,
    viewVendors: true, approveVendors: false, manageVendors: false,
    viewRevenue: true, manageRevenue: false,
    viewReports: true, viewAiInsights: true,
    accessCommandCenter: true, viewSLA: true, manageSLA: true,
    accessSettings: false, manageRBAC: false,
  },
  support: {
    viewBookings: true, manageBookings: true, bulkActions: false,
    viewVendors: true, approveVendors: false, manageVendors: false,
    viewRevenue: false, manageRevenue: false,
    viewReports: false, viewAiInsights: false,
    accessCommandCenter: true, viewSLA: true, manageSLA: false,
    accessSettings: false, manageRBAC: false,
  },
};

/**
 * Maps a Supabase profile role string to an AdminRole.
 * Unknown or non-admin roles return 'none' — zero permissions.
 */
export function resolveAdminRole(profileRole: string | undefined | null): AdminRole {
  if (profileRole === 'super_admin' || profileRole === 'admin') return 'super_admin';
  if (profileRole === 'manager') return 'manager';
  if (profileRole === 'support') return 'support';
  return 'none'; // any unknown role → no access
}

export function can(role: AdminRole, permission: keyof Permissions): boolean {
  return ROLE_PERMISSIONS[role][permission] === true;
}

export function isAtLeast(role: AdminRole, minimum: AdminRole): boolean {
  const order: AdminRole[] = ['support', 'manager', 'super_admin'];
  return order.indexOf(role) >= order.indexOf(minimum);
}
