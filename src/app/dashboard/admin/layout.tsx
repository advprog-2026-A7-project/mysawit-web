'use client';

import { RequireRole } from '@/components/RequireRole';
import { RequireServiceOnline } from '@/components/RequireServiceOnline';
import { API_ENDPOINTS } from '@/lib/api-config';
import { rolesFor } from '@/lib/rbac';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={rolesFor('user-admin')}>
      <RequireServiceOnline serviceName="Identity Service" healthUrl={API_ENDPOINTS.AUTH.HEALTH}>
        {children}
      </RequireServiceOnline>
    </RequireRole>
  );
}
