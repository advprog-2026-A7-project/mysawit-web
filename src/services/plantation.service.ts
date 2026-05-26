import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import {
  AssignPlantationMandorRequest,
  EntityId,
  Plantation,
  PlantationRequest,
  SupirDetail,
  TransferPlantationMandorRequest,
  TransferPlantationSupirRequest,
} from '@/types';

export const plantationService = {
  async getAll(filters?: { name?: string; code?: string }): Promise<Plantation[]> {
    const params = new URLSearchParams();
    if (filters?.name?.trim()) params.set('name', filters.name.trim());
    if (filters?.code?.trim()) params.set('code', filters.code.trim());
    const query = params.toString();
    return apiClient.get(query ? `${API_ENDPOINTS.PLANTATIONS.BASE}?${query}` : API_ENDPOINTS.PLANTATIONS.BASE);
  },

  async getById(id: EntityId): Promise<Plantation> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.BY_ID(id));
  },

  async getByOwner(ownerId: EntityId): Promise<Plantation[]> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.BY_OWNER(ownerId));
  },

  async getByMandor(mandorId: EntityId): Promise<Plantation[]> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.BY_MANDOR(mandorId));
  },

  async create(data: PlantationRequest): Promise<Plantation> {
    return apiClient.post(API_ENDPOINTS.PLANTATIONS.BASE, data);
  },

  async update(id: EntityId, data: PlantationRequest): Promise<Plantation> {
    return apiClient.put(API_ENDPOINTS.PLANTATIONS.BY_ID(id), data);
  },

  async delete(id: EntityId): Promise<{ message: string }> {
    return apiClient.delete(API_ENDPOINTS.PLANTATIONS.BY_ID(id));
  },

  // Mandor management
  async assignMandor(id: EntityId, data: AssignPlantationMandorRequest): Promise<Plantation> {
    return apiClient.post(API_ENDPOINTS.PLANTATIONS.ASSIGN_MANDOR(id), data);
  },

  async unassignMandor(id: EntityId): Promise<Plantation> {
    return apiClient.delete(API_ENDPOINTS.PLANTATIONS.UNASSIGN_MANDOR(id));
  },

  async transferMandor(data: TransferPlantationMandorRequest): Promise<void> {
    return apiClient.put(API_ENDPOINTS.PLANTATIONS.TRANSFER_MANDOR, data);
  },

  // Supir management
  async getSupirs(id: EntityId): Promise<string[]> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.SUPIRS(id));
  },

  async getSupirDetails(id: EntityId, name?: string): Promise<SupirDetail[]> {
    const query = name?.trim() ? `?name=${encodeURIComponent(name.trim())}` : '';
    return apiClient.get(`${API_ENDPOINTS.PLANTATIONS.SUPIRS_DETAILS(id)}${query}`);
  },

  async assignSupir(id: EntityId, supirId: string): Promise<Plantation> {
    return apiClient.post(API_ENDPOINTS.PLANTATIONS.SUPIRS(id), { supirId });
  },

  async unassignSupir(id: EntityId, supirId: string): Promise<Plantation> {
    return apiClient.delete(API_ENDPOINTS.PLANTATIONS.UNASSIGN_SUPIR(id, supirId));
  },

  async transferSupir(data: TransferPlantationSupirRequest): Promise<void> {
    return apiClient.put(API_ENDPOINTS.PLANTATIONS.TRANSFER_SUPIR, data);
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.HEALTH);
  },
};
