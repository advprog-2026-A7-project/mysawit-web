/** @jest-environment node */

import { apiClient } from './api-client';

describe('api-client (node)', () => {
  it('returns null user info and does not touch auth storage without window', () => {
    expect(apiClient.getUserInfo()).toBeNull();

    apiClient.saveAuth({
      token: 'jwt',
      type: 'Bearer',
      id: 1,
      username: 'user',
      email: 'user@mail.com',
      role: 'USER',
    });

    apiClient.clearAuth();
    expect(apiClient.isAuthenticated()).toBe(false);
  });
});
