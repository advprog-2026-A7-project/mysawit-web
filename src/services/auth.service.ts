import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { LoginRequest, RegisterRequest, AuthResponse } from '@/types';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    apiClient.saveAuth(response);
    return response;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    apiClient.saveAuth(response);
    return response;
  },

  logout(): void {
    apiClient.clearAuth();
  },

  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  },

  getUserInfo() {
    return apiClient.getUserInfo();
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.AUTH.HEALTH);
  },
};
