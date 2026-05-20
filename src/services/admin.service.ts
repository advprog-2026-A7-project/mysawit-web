import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { UserDetailResponse, UserSearchParams, MessageResponse } from '@/types';

export const adminService = {
  async getUsers(params?: UserSearchParams): Promise<UserDetailResponse[]> {
    let url = API_ENDPOINTS.IDENTITY.USERS;

    if (params) {
      const searchParams = new URLSearchParams();
      if (params.name) searchParams.set('name', params.name);
      if (params.email) searchParams.set('email', params.email);
      if (params.role) searchParams.set('role', params.role);
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    return apiClient.get<UserDetailResponse[]>(url);
  },

  async getUserById(userId: string): Promise<UserDetailResponse> {
    return apiClient.get<UserDetailResponse>(API_ENDPOINTS.IDENTITY.USER_BY_ID(userId));
  },

  async assignMandor(buruhId: string, mandorId: string): Promise<MessageResponse> {
    return apiClient.put<MessageResponse>(
      API_ENDPOINTS.IDENTITY.ASSIGN_MANDOR(buruhId),
      { mandorId }
    );
  },

  async unassignMandor(buruhId: string): Promise<MessageResponse> {
    return apiClient.put<MessageResponse>(
      API_ENDPOINTS.IDENTITY.UNASSIGN_MANDOR(buruhId),
      {}
    );
  },

  async deleteUser(userId: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(API_ENDPOINTS.IDENTITY.USER_BY_ID(userId));
  },
};
