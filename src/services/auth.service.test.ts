import { authService } from './auth.service';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    saveAuth: jest.fn(),
    clearAuth: jest.fn(),
    isAuthenticated: jest.fn(),
    getUserInfo: jest.fn(),
  },
}));

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('login posts credentials and stores auth', async () => {
    const response = {
      token: 'jwt',
      type: 'Bearer',
      id: 1,
      username: 'user',
      email: 'user@mail.com',
      role: 'BURUH',
    };

    (apiClient.post as jest.Mock).mockResolvedValue(response);

    const result = await authService.login({ email: 'user@mail.com', password: 'secret' });

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGIN, {
      email: 'user@mail.com',
      password: 'secret',
    });
    expect(apiClient.saveAuth).toHaveBeenCalledWith(response);
    expect(result).toEqual(response);
  });

  it('register posts data and stores auth', async () => {
    const response = {
      token: 'jwt',
      type: 'Bearer',
      id: 1,
      username: 'user',
      email: 'user@mail.com',
      role: 'BURUH',
    };

    (apiClient.post as jest.Mock).mockResolvedValue(response);

    const result = await authService.register({
      username: 'user',
      email: 'user@mail.com',
      password: 'secret123',
    });

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.REGISTER, {
      username: 'user',
      email: 'user@mail.com',
      password: 'secret123',
    });
    expect(apiClient.saveAuth).toHaveBeenCalledWith(response);
    expect(result).toEqual(response);
  });

  it('googleLogin posts the id token and stores auth', async () => {
    const response = {
      token: 'jwt', type: 'Bearer', id: 1, username: 'user', email: 'u@mail.com', role: 'BURUH',
    };
    (apiClient.post as jest.Mock).mockResolvedValue(response);

    const result = await authService.googleLogin({
      idToken: 'google-id-token',
      username: 'budi',
      role: 'MANDOR',
      certificationNumber: 'CERT-001',
    });

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.GOOGLE, {
      idToken: 'google-id-token',
      username: 'budi',
      role: 'MANDOR',
      certificationNumber: 'CERT-001',
    });
    expect(apiClient.saveAuth).toHaveBeenCalledWith(response);
    expect(result).toEqual(response);
  });

  it('linkGoogle posts the id token and marks googleLinked in localStorage', async () => {
    localStorage.clear();
    (apiClient.post as jest.Mock).mockResolvedValue({ message: 'linked' });

    const result = await authService.linkGoogle('id-token');

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LINK_GOOGLE, { idToken: 'id-token' });
    expect(localStorage.getItem('googleLinked')).toBe('true');
    expect(result).toEqual({ message: 'linked' });
  });

  it('setPassword posts the password and marks hasPassword in localStorage', async () => {
    localStorage.clear();
    (apiClient.post as jest.Mock).mockResolvedValue({ message: 'set' });

    const result = await authService.setPassword('secret123');

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.SET_PASSWORD, { password: 'secret123' });
    expect(localStorage.getItem('hasPassword')).toBe('true');
    expect(result).toEqual({ message: 'set' });
  });

  it('logout posts a refresh-token revocation and clears auth state', () => {
    localStorage.setItem('refreshToken', 'refresh-1');
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    authService.logout();

    expect(global.fetch).toHaveBeenCalledWith(
      API_ENDPOINTS.AUTH.LOGOUT,
      expect.objectContaining({ method: 'POST' })
    );
    expect(apiClient.clearAuth).toHaveBeenCalledTimes(1);
    localStorage.clear();
  });

  it('logout swallows fetch failures and still clears auth state', () => {
    localStorage.setItem('refreshToken', 'refresh-2');
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));

    expect(() => authService.logout()).not.toThrow();

    expect(apiClient.clearAuth).toHaveBeenCalledTimes(1);
    localStorage.clear();
  });

  it('logout skips the network call when no refresh token is stored', () => {
    localStorage.clear();
    global.fetch = jest.fn();

    authService.logout();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(apiClient.clearAuth).toHaveBeenCalledTimes(1);
  });

  it('isAdmin returns true only when stored role is ADMIN', () => {
    (apiClient.getUserInfo as jest.Mock).mockReturnValue({ role: 'ADMIN' });
    expect(authService.isAdmin()).toBe(true);

    (apiClient.getUserInfo as jest.Mock).mockReturnValue({ role: 'BURUH' });
    expect(authService.isAdmin()).toBe(false);

    (apiClient.getUserInfo as jest.Mock).mockReturnValue(null);
    expect(authService.isAdmin()).toBe(false);
  });

  it('saveAuth stores an externally created auth response', () => {
    const response = {
      token: 'jwt',
      type: 'Bearer',
      id: '1',
      username: 'shipment-dev',
      email: 'shipment-dev@mail.com',
      role: 'MANDOR' as const,
      googleLinked: false,
      hasPassword: true,
    };

    authService.saveAuth(response);

    expect(apiClient.saveAuth).toHaveBeenCalledWith(response);
  });

  it('isAuthenticated proxies apiClient', () => {
    (apiClient.isAuthenticated as jest.Mock).mockReturnValue(true);

    expect(authService.isAuthenticated()).toBe(true);
    expect(apiClient.isAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('getUserInfo proxies apiClient', () => {
    const userInfo = { id: '1', username: 'user', role: 'BURUH' };
    (apiClient.getUserInfo as jest.Mock).mockReturnValue(userInfo);

    expect(authService.getUserInfo()).toEqual(userInfo);
    expect(apiClient.getUserInfo).toHaveBeenCalledTimes(1);
  });

  it('checkHealth calls auth health endpoint', async () => {
    const health = { status: 'UP', service: 'mysawit-identity-service' };
    (apiClient.get as jest.Mock).mockResolvedValue(health);

    const result = await authService.checkHealth();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.HEALTH);
    expect(result).toEqual(health);
  });
});
