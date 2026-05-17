import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import {
  EntityId,
  Harvest,
  HarvestRequest,
  HarvestStatus,
  UpdateHarvestStatusRequest,
} from '@/types';

interface HarvestFilters {
  harvesterName?: string;
  startDate?: string;
  endDate?: string;
  status?: HarvestStatus;
}

const appendFilters = (url: string, filters?: HarvestFilters): string => {
  const params = new URLSearchParams();

  if (filters?.harvesterName) params.set('harvesterName', filters.harvesterName);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.status) params.set('status', filters.status);

  const query = params.toString();
  return query ? `${url}?${query}` : url;
};

const toLocalDateTime = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;

const normalizeHarvestRequest = (data: HarvestRequest): HarvestRequest => ({
  ...data,
  harvestDate: toLocalDateTime(data.harvestDate),
});

// Some upstream responses (paginated wrappers, error envelopes, empty bodies)
// can arrive as non-array JSON. Normalize so callers can always assume an array.
const toArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const maybe = value as { content?: unknown; data?: unknown; items?: unknown };
    if (Array.isArray(maybe.content)) return maybe.content as T[];
    if (Array.isArray(maybe.data)) return maybe.data as T[];
    if (Array.isArray(maybe.items)) return maybe.items as T[];
  }
  return [];
};

export const harvestService = {
  async getAll(filters?: HarvestFilters): Promise<Harvest[]> {
    const result = await apiClient.get<unknown>(
      appendFilters(API_ENDPOINTS.HARVESTS.BASE, filters),
    );
    return toArray<Harvest>(result);
  },

  async getMine(filters?: Omit<HarvestFilters, 'harvesterName'>): Promise<Harvest[]> {
    const result = await apiClient.get<unknown>(
      appendFilters(API_ENDPOINTS.HARVESTS.MY, filters),
    );
    return toArray<Harvest>(result);
  },

  async getById(id: EntityId): Promise<Harvest> {
    return apiClient.get(API_ENDPOINTS.HARVESTS.BY_ID(id));
  },

  async getByPlantation(plantationId: EntityId): Promise<Harvest[]> {
    const result = await apiClient.get<unknown>(API_ENDPOINTS.HARVESTS.BY_PLANTATION(plantationId));
    return toArray<Harvest>(result);
  },

  async create(data: HarvestRequest): Promise<Harvest> {
    return apiClient.post(API_ENDPOINTS.HARVESTS.BASE, normalizeHarvestRequest(data));
  },

  async update(id: number, data: HarvestRequest): Promise<Harvest> {
    return apiClient.put(API_ENDPOINTS.HARVESTS.BY_ID(id), normalizeHarvestRequest(data));
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
