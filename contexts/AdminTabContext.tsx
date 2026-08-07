'use client';

import { createContext, useContext, useState } from 'react';

interface AdminTabContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AdminTabContext = createContext<AdminTabContextType>({
  activeTab: 'overview',
  setActiveTab: () => {},
});

export function useAdminTab() {
  return useContext(AdminTabContext);
}

export function AdminTabProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('command');

  return (
    <AdminTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AdminTabContext.Provider>
  );
}
