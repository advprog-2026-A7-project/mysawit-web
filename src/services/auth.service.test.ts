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
      role: 'USER',
    };

    (apiClient.post as jest.Mock).mockResolvedValue(response);

    const result = await authService.login({ username: 'user', password: 'secret' });

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGIN, {
      username: 'user',
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
      role: 'USER',
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

  it('logout clears auth state', () => {
    authService.logout();

    expect(apiClient.clearAuth).toHaveBeenCalledTimes(1);
  });

  it('isAuthenticated proxies apiClient', () => {
    (apiClient.isAuthenticated as jest.Mock).mockReturnValue(true);

    expect(authService.isAuthenticated()).toBe(true);
    expect(apiClient.isAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('getUserInfo proxies apiClient', () => {
    const userInfo = { id: '1', username: 'user', role: 'USER' };
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
