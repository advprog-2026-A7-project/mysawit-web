import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { EntityId, Harvest, HarvestRequest, UpdateHarvestStatusRequest } from '@/types';

interface HarvestFilters {
  harvesterName?: string;
  startDate?: string;
  endDate?: string;
}

const appendFilters = (url: string, filters?: HarvestFilters): string => {
  const params = new URLSearchParams();

  if (filters?.harvesterName) params.set('harvesterName', filters.harvesterName);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);

  const query = params.toString();
  return query ? `${url}?${query}` : url;
};

export const harvestService = {
  async getAll(filters?: HarvestFilters): Promise<Harvest[]> {
    return apiClient.get(appendFilters(API_ENDPOINTS.HARVESTS.BASE, filters));
  },

  async getMine(filters?: Omit<HarvestFilters, 'harvesterName'>): Promise<Harvest[]> {
    return apiClient.get(appendFilters(API_ENDPOINTS.HARVESTS.MY, filters));
  },

  async getById(id: EntityId): Promise<Harvest> {
    return apiClient.get(API_ENDPOINTS.HARVESTS.BY_ID(id));
  },

  async getByPlantation(plantationId: EntityId): Promise<Harvest[]> {
    return apiClient.get(API_ENDPOINTS.HARVESTS.BY_PLANTATION(plantationId));
  },

  async create(data: HarvestRequest): Promise<Harvest> {
    return apiClient.post(API_ENDPOINTS.HARVESTS.BASE, data);
  },

  async update(id: EntityId, data: HarvestRequest): Promise<Harvest> {
    return apiClient.put(API_ENDPOINTS.HARVESTS.BY_ID(id), data);
  },

  async updateStatus(data: UpdateHarvestStatusRequest): Promise<Harvest> {
    return apiClient.patch(API_ENDPOINTS.HARVESTS.UPDATE_STATUS, data);
  },

  async delete(id: EntityId): Promise<{ message: string }> {
    return apiClient.delete(API_ENDPOINTS.HARVESTS.BY_ID(id));
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.HARVESTS.HEALTH);
  },
};
