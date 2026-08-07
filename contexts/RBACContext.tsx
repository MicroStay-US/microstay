'use client';

import { createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AdminRole, Permissions, ROLE_LABELS, ROLE_COLORS,
  resolveAdminRole, can, isAtLeast
} from '@/lib/rbac';

interface RBACContextType {
  role: AdminRole;
  roleLabel: string;
  roleColor: string;
  can: (permission: keyof Permissions) => boolean;
  isAtLeast: (minimum: AdminRole) => boolean;
}

const RBACContext = createContext<RBACContextType>({
  role: 'super_admin',
  roleLabel: 'Super Admin',
  roleColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  can: () => true,
  isAtLeast: () => true,
});

export function RBACProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const role = resolveAdminRole(profile?.role);

  return (
    <RBACContext.Provider value={{
      role,
      roleLabel: ROLE_LABELS[role],
      roleColor: ROLE_COLORS[role],
      can: (permission) => can(role, permission),
      isAtLeast: (minimum) => isAtLeast(role, minimum),
    }}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  return useContext(RBACContext);
}
