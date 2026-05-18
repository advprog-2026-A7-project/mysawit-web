'use client';

import { RequireRole } from '@/components/RequireRole';
import { RequireServiceOnline } from '@/components/RequireServiceOnline';
import { API_ENDPOINTS } from '@/lib/api-config';
import { rolesFor } from '@/lib/rbac';

export default function HarvestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={rolesFor('harvests')}>
      <RequireServiceOnline serviceName="Harvest Service" healthUrl={API_ENDPOINTS.HARVESTS.HEALTH}>
        {children}
      </RequireServiceOnline>
    </RequireRole>
  );
}
