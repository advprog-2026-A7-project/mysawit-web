'use client';

import { RequireRole } from '@/components/RequireRole';
import { rolesFor } from '@/lib/rbac';

export default function ShipmentsLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={rolesFor('shipments')}>{children}</RequireRole>;
}
