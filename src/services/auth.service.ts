import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { LoginRequest, RegisterRequest, AuthResponse, GoogleAuthRequest, MessageResponse } from '@/types';

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

  async googleLogin(data: GoogleAuthRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.GOOGLE,
      data
    );
    apiClient.saveAuth(response);
    return response;
  },

  async linkGoogle(idToken: string): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      API_ENDPOINTS.AUTH.LINK_GOOGLE,
      { idToken }
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem('googleLinked', 'true');
    }
    return response;
  },

  async setPassword(password: string): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      API_ENDPOINTS.AUTH.SET_PASSWORD,
      { password }
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasPassword', 'true');
    }
    return response;
  },

  logout(): void {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refreshToken')
      : null;

    if (refreshToken) {
      fetch(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }

    apiClient.clearAuth();
  },

  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  },

  getUserInfo() {
    return apiClient.getUserInfo();
  },

  isAdmin(): boolean {
    const info = apiClient.getUserInfo();
    return info?.role === 'ADMIN';
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.AUTH.HEALTH);
  },
};
