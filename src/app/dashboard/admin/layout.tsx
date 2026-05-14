'use client';

import { RequireRole } from '@/components/RequireRole';
import { rolesFor } from '@/lib/rbac';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={rolesFor('user-admin')}>{children}</RequireRole>;
}
