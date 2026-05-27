import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { EntityId, Harvest, HarvestStatus, UpdateHarvestStatusRequest } from '@/types';

interface HarvestFilters {
  harvesterName?: string;
  date?: string;
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

const toArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const record = value as { data?: unknown; content?: unknown; items?: unknown };
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.content)) return record.content as T[];
    if (Array.isArray(record.items)) return record.items as T[];
  }
  return [];
};

const appendFilters = (url: string, filters?: HarvestFilters): string => {
  const params = new URLSearchParams();
  if (filters?.harvesterName) params.set('harvesterName', filters.harvesterName);
  if (filters?.date) params.set('date', filters.date);
  if (filters?.startDate) params.set('startDate', toLocalDateTime(filters.startDate));
  if (filters?.endDate) params.set('endDate', toLocalDateTime(filters.endDate));
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString();
  return query ? `${url}?${query}` : url;
};

const toLocalDateTime = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;

const getMultipartAuthHeaders = (): HeadersInit => {
  if (typeof window === 'undefined') return {};

  const token = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('userRole');
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (userId) {
    headers['X-User-Id'] = userId;
    headers['X-Requester-Id'] = userId;
  }
  if (username) headers['X-User-Name'] = username;
  if (role) {
    headers['X-User-Role'] = role;
    if (userId && role === 'BURUH') {
      headers['X-Harvester-Id'] = userId;
      headers['X-Harvester-Name'] = username || userId;
    }
    if (userId && role === 'MANDOR') {
      headers['X-Foreman-Id'] = userId;
    }
  }

  return headers;
};

const parseFetchError = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return response.statusText || 'Request failed';

  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message || body.error || text;
  } catch {
    return text;
  }
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
    const requestBlob = new Blob(
      [JSON.stringify({
        plantationId: data.plantationId,
        weight: data.weight,
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
      headers: getMultipartAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await parseFetchError(response));
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
