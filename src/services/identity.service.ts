import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import {
  AssignMandorRequest,
  AuthResponse,
  MessageResponse,
  RegisterRequest,
  User,
  UserRole,
} from '@/types';

export const identityService = {
  async createDummyUser(data: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
  },

  async listUsers(filters?: {
    name?: string;
    email?: string;
    role?: UserRole | '';
  }): Promise<User[]> {
    const params = new URLSearchParams();

    if (filters?.name) params.set('name', filters.name);
    if (filters?.email) params.set('email', filters.email);
    if (filters?.role) params.set('role', filters.role);

    const query = params.toString();
    return apiClient.get(query ? `${API_ENDPOINTS.IDENTITY.USERS}?${query}` : API_ENDPOINTS.IDENTITY.USERS);
  },

  async getUser(id: string): Promise<User> {
    return apiClient.get(API_ENDPOINTS.IDENTITY.USER_BY_ID(id));
  },

  async assignMandor(buruhId: string, data: AssignMandorRequest): Promise<MessageResponse> {
    return apiClient.put(API_ENDPOINTS.IDENTITY.ASSIGN_MANDOR(buruhId), data);
  },

  async unassignMandor(buruhId: string): Promise<MessageResponse> {
    return apiClient.put(API_ENDPOINTS.IDENTITY.UNASSIGN_MANDOR(buruhId), {});
  },

  async deleteUser(id: string): Promise<MessageResponse> {
    return apiClient.delete(API_ENDPOINTS.IDENTITY.USER_BY_ID(id));
  },
};
