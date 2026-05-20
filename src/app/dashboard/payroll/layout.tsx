'use client';

import { RequireRole } from '@/components/RequireRole';
import { RequireServiceOnline } from '@/components/RequireServiceOnline';
import { API_ENDPOINTS } from '@/lib/api-config';
import { rolesFor } from '@/lib/rbac';

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={rolesFor('payroll')}>
      <RequireServiceOnline serviceName="Payroll Service" healthUrl={API_ENDPOINTS.PAYROLL.HEALTH}>
        {children}
      </RequireServiceOnline>
    </RequireRole>
  );
}
