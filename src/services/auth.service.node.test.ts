/** @jest-environment node */

import { authService } from './auth.service';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    clearAuth: jest.fn(),
  },
}));

describe('auth.service (node, no window)', () => {
  it('logout skips the network call when window is undefined (no localStorage access)', () => {
    const fetchMock = jest.fn();
    (global as { fetch: unknown }).fetch = fetchMock;

    expect(() => authService.logout()).not.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(apiClient.clearAuth).toHaveBeenCalledTimes(1);
  });
});
