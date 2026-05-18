'use client';

import { RequireRole } from '@/components/RequireRole';
import { RequireServiceOnline } from '@/components/RequireServiceOnline';
import { API_ENDPOINTS } from '@/lib/api-config';
import { rolesFor } from '@/lib/rbac';

export default function ShipmentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={rolesFor('shipments')}>
      <RequireServiceOnline
        serviceName="Shipment Service"
        healthUrl={API_ENDPOINTS.SHIPMENTS.HEALTH}
      >
        {children}
      </RequireServiceOnline>
    </RequireRole>
  );
}
