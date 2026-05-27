import { getPostAuthRedirectPath } from './role-redirect';

describe('getPostAuthRedirectPath', () => {
  it.each([
    ['ADMIN', '/admin/dashboard'],
    ['MANDOR', '/mandor/plantations'],
    ['BURUH', '/harvest'],
    ['SUPIR', '/shipment/active'],
  ])('returns the post-auth landing page for %s', (role, path) => {
    expect(getPostAuthRedirectPath(role)).toBe(path);
  });

  it.each([undefined, null, '', 'UNKNOWN'])('falls back to login for unsupported role %s', (role) => {
    expect(getPostAuthRedirectPath(role)).toBe('/login');
  });
});
