import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { AuthResponse, RegisterRequest } from '@/types';

export const identityService = {
  async createDummyUser(data: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
  },
};
