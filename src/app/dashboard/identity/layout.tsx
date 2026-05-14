'use client';

import { RequireRole } from '@/components/RequireRole';
import { RequireServiceOnline } from '@/components/RequireServiceOnline';
import { API_ENDPOINTS } from '@/lib/api-config';
import { rolesFor } from '@/lib/rbac';

export default function IdentityLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={rolesFor('identity')}>
      <RequireServiceOnline serviceName="Identity Service" healthUrl={API_ENDPOINTS.AUTH.HEALTH}>
        {children}
      </RequireServiceOnline>
    </RequireRole>
  );
}
