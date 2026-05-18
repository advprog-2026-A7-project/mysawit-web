import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { EntityId, Harvest, UpdateHarvestStatusRequest } from '@/types';

interface HarvestFilters {
  harvesterName?: string;
  startDate?: string;
  endDate?: string;
  status?: HarvestStatus;
}

interface CreateHarvestData {
  plantationId: EntityId;
  weight: number;
  news?: string;
  files: FileList | File[];
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

  /**
   * Create harvest — backend expects multipart/form-data:
   *   - request: JSON blob (LogHarvestRequest)
   *   - files: one or more photo files
   */
  async create(data: CreateHarvestData): Promise<{ message: string; id: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const requestBlob = new Blob(
      [JSON.stringify({
        plantationId: data.plantationId,
        weightKg: data.weight,
        news: data.news ?? '',
      })],
      { type: 'application/json' }
    );

    const formData = new FormData();
    formData.append('request', requestBlob);

    const files = Array.from(data.files);
    if (files.length === 0) throw new Error('Minimal 1 foto hasil panen harus dilampirkan');
    files.forEach(f => formData.append('files', f));

    const response = await fetch(API_ENDPOINTS.HARVESTS.BASE, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      try { const j = JSON.parse(text); throw new Error(j.message || j.error || text); } catch { throw new Error(text || response.statusText); }
    }

    return response.json() as Promise<{ message: string; id: string }>;
  },

  async updateStatus(data: UpdateHarvestStatusRequest): Promise<Harvest> {
    return apiClient.patch(API_ENDPOINTS.HARVESTS.UPDATE_STATUS, data);
  },

  async checkHealth(): Promise<{ status: string }> {
    return apiClient.get(API_ENDPOINTS.HARVESTS.HEALTH);
  },
};
