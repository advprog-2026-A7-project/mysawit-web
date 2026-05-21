import type { UserRole } from '@/types';

export type DashboardModule =
  | 'identity'
  | 'plantations'
  | 'harvests'
  | 'shipments'
  | 'payroll'
  | 'user-admin';

const MODULE_ROLES: Record<DashboardModule, UserRole[]> = {
  identity: ['ADMIN'],
  plantations: ['ADMIN'],
  harvests: ['MANDOR', 'BURUH'],
  shipments: ['ADMIN', 'MANDOR', 'SUPIR'],
  payroll: ['ADMIN', 'MANDOR', 'SUPIR', 'BURUH'],
  'user-admin': ['ADMIN'],
};

export function rolesFor(module: DashboardModule): UserRole[] {
  return MODULE_ROLES[module];
}

export function canAccess(role: string | undefined | null, module: DashboardModule): boolean {
  if (!role) return false;
  return (MODULE_ROLES[module] as readonly string[]).includes(role);
}
