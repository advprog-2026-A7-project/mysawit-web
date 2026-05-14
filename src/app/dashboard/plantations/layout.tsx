'use client';

import { RequireRole } from '@/components/RequireRole';
import { RequireServiceOnline } from '@/components/RequireServiceOnline';
import { API_ENDPOINTS } from '@/lib/api-config';
import { rolesFor } from '@/lib/rbac';

export default function PlantationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={rolesFor('plantations')}>
      <RequireServiceOnline
        serviceName="Plantation Service"
        healthUrl={API_ENDPOINTS.PLANTATIONS.HEALTH}
      >
        {children}
      </RequireServiceOnline>
    </RequireRole>
  );
}
