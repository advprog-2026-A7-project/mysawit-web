'use client';

import { RequireRole } from '@/components/RequireRole';
import { rolesFor } from '@/lib/rbac';

export default function IdentityLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={rolesFor('identity')}>{children}</RequireRole>;
}
