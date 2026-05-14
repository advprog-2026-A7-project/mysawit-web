'use client';

import { RequireRole } from '@/components/RequireRole';
import { rolesFor } from '@/lib/rbac';

export default function PlantationsLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={rolesFor('plantations')}>{children}</RequireRole>;
}
