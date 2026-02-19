import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Harvest, HarvestRequest } from '@/types';

export const harvestService = {
  async getAll(): Promise<Harvest[]> {
    return apiClient.get(API_ENDPOINTS.HARVESTS.BASE);
  },

  async getById(id: number): Promise<Harvest> {
    return apiClient.get(API_ENDPOINTS.HARVESTS.BY_ID(id));
  },

  async getByPlantation(plantationId: number): Promise<Harvest[]> {
    return apiClient.get(API_ENDPOINTS.HARVESTS.BY_PLANTATION(plantationId));
  },

  async create(data: HarvestRequest): Promise<Harvest> {
    return apiClient.post(API_ENDPOINTS.HARVESTS.BASE, data);
  },

  async update(id: number, data: HarvestRequest): Promise<Harvest> {
    return apiClient.put(API_ENDPOINTS.HARVESTS.BY_ID(id), data);
  },

  async delete(id: number): Promise<{ message: string }> {
    return apiClient.delete(API_ENDPOINTS.HARVESTS.BY_ID(id));
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.HARVESTS.HEALTH);
  },
};
