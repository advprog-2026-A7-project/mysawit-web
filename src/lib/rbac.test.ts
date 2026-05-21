import { canAccess, rolesFor } from './rbac';

describe('rbac helpers', () => {
  it('returns the roles allowed for a dashboard module', () => {
    expect(rolesFor('identity')).toEqual(['ADMIN']);
    expect(rolesFor('payroll')).toEqual(['ADMIN', 'MANDOR', 'SUPIR', 'BURUH']);
    expect(rolesFor('shipments')).toEqual(['ADMIN', 'MANDOR', 'SUPIR']);
  });

  it('allows roles configured for a module', () => {
    expect(canAccess('ADMIN', 'user-admin')).toBe(true);
    expect(canAccess('MANDOR', 'harvests')).toBe(true);
    expect(canAccess('BURUH', 'payroll')).toBe(true);
    expect(canAccess('SUPIR', 'shipments')).toBe(true);
  });

  it('denies missing or unlisted roles', () => {
    expect(canAccess(undefined, 'identity')).toBe(false);
    expect(canAccess(null, 'identity')).toBe(false);
    expect(canAccess('BURUH', 'identity')).toBe(false);
    expect(canAccess('UNKNOWN', 'payroll')).toBe(false);
  });
});
