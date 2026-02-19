import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Plantation, PlantationRequest } from '@/types';

export const plantationService = {
  async getAll(): Promise<Plantation[]> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.BASE);
  },

  async getById(id: number): Promise<Plantation> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.BY_ID(id));
  },

  async getByOwner(ownerId: number): Promise<Plantation[]> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.BY_OWNER(ownerId));
  },

  async create(data: PlantationRequest): Promise<Plantation> {
    return apiClient.post(API_ENDPOINTS.PLANTATIONS.BASE, data);
  },

  async update(id: number, data: PlantationRequest): Promise<Plantation> {
    return apiClient.put(API_ENDPOINTS.PLANTATIONS.BY_ID(id), data);
  },

  async delete(id: number): Promise<{ message: string }> {
    return apiClient.delete(API_ENDPOINTS.PLANTATIONS.BY_ID(id));
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.HEALTH);
  },
};
