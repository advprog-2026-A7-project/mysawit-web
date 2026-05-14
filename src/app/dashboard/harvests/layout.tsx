'use client';

import { RequireRole } from '@/components/RequireRole';
import { rolesFor } from '@/lib/rbac';

export default function HarvestsLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={rolesFor('harvests')}>{children}</RequireRole>;
}
