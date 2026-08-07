'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminTab } from '@/contexts/AdminTabContext';

import { CommandCenterTab }     from '@/components/admin/tabs/CommandCenterTab';
import { OverviewTab }           from '@/components/admin/tabs/OverviewTab';
import { PartnersTab }           from '@/components/admin/tabs/PartnersTab';
import { BookingsTab }           from '@/components/admin/tabs/BookingsTab';
import { InvoicesTab }           from '@/components/admin/tabs/InvoicesTab';
import { PerformanceTab }        from '@/components/admin/tabs/PerformanceTab';
import { MotelAnalyticsTab }     from '@/components/admin/tabs/MotelAnalyticsTab';
import { SecurityTab }           from '@/components/admin/tabs/SecurityTab';
import { AIInsightsTab }         from '@/components/admin/tabs/AIInsightsTab';
import { SLAMonitorTab }         from '@/components/admin/tabs/SLAMonitorTab';
import { GuestManagementTab }    from '@/components/admin/tabs/GuestManagementTab';
import { PayoutTrackerTab }      from '@/components/admin/tabs/PayoutTrackerTab';
import { AnnouncementsTab }      from '@/components/admin/tabs/AnnouncementsTab';
import { PropertyApprovalTab }   from '@/components/admin/tabs/PropertyApprovalTab';
import { MapViewTab }            from '@/components/admin/tabs/MapViewTab';
import { FraudAlertsTab }        from '@/components/admin/tabs/FraudAlertsTab';
import { SupportTicketsTab }     from '@/components/admin/tabs/SupportTicketsTab';

export default function AdminDashboard() {
  // Auth is fully enforced by AdminDashboardLayout — no duplicate guard needed here.
  // A second guard with stale state causes redirect loops (e.g. profile=null briefly).
  const { activeTab } = useAdminTab();
  const [error] = useState('');

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="bg-rose-500/10 border-rose-500/20">
          <AlertDescription className="text-rose-400 font-bold">{error}</AlertDescription>
        </Alert>
      )}

      {activeTab === 'command'       && <CommandCenterTab />}
      {activeTab === 'overview'       && <OverviewTab />}
      {activeTab === 'partners'       && <PartnersTab />}
      {activeTab === 'bookings'       && <BookingsTab />}
      {activeTab === 'invoices'       && <InvoicesTab />}
      {activeTab === 'motel-analytics'&& <MotelAnalyticsTab />}
      {activeTab === 'performance'    && <PerformanceTab />}
      {activeTab === 'ai-insights'    && <AIInsightsTab />}
      {activeTab === 'sla'            && <SLAMonitorTab />}
      {activeTab === 'security'       && <SecurityTab />}
      {activeTab === 'guests'         && <GuestManagementTab />}
      {activeTab === 'payouts'        && <PayoutTrackerTab />}
      {activeTab === 'announcements'  && <AnnouncementsTab />}
      {activeTab === 'approval'       && <PropertyApprovalTab />}
      {activeTab === 'map'            && <MapViewTab />}
      {activeTab === 'fraud'          && <FraudAlertsTab />}
      {activeTab === 'support'        && <SupportTicketsTab />}
    </div>
  );
}
