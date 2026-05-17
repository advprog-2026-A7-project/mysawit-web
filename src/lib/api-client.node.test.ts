/** @jest-environment node */

import { apiClient } from './api-client';

describe('api-client (node)', () => {
  it('returns null user info and does not touch auth storage without window', () => {
    expect(apiClient.getUserInfo()).toBeNull();

    apiClient.saveAuth({
      token: 'jwt',
      type: 'Bearer',
      id: '1',
      username: 'user',
      email: 'user@mail.com',
      role: 'BURUH',
      googleLinked: false,
      hasPassword: false,
    });

    apiClient.clearAuth();
    expect(apiClient.isAuthenticated()).toBe(false);
  });

  it('sends only the Content-Type header on the server (no auth token, no user identity)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: jest.fn().mockResolvedValue({ ok: true }),
    });
    (global as { fetch: unknown }).fetch = fetchMock;

    await apiClient.get('/resource');

    expect(fetchMock).toHaveBeenCalledWith('/resource', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('does not attempt token refresh on 401 when running on the server (no refresh token available)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: jest.fn().mockResolvedValue({ error: 'unauthenticated' }),
    });
    (global as { fetch: unknown }).fetch = fetchMock;

    await expect(apiClient.get('/resource')).rejects.toThrow();
    // Only the original request — no refresh attempt, since getRefreshToken
    // short-circuits to null when window is undefined.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
