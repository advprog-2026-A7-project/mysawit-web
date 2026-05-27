import type { UserRole } from '@/types';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  MANDOR: '/mandor/plantations',
  BURUH: '/harvest',
  SUPIR: '/shipment/active',
};

export function getPostAuthRedirectPath(role: string | null | undefined): string {
  if (!role || !(role in ROLE_REDIRECTS)) {
    return '/login';
  }

  return ROLE_REDIRECTS[role as UserRole];
}
