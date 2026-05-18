import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import {
  AssignPlantationMandorRequest,
  EntityId,
  Plantation,
  PlantationRequest,
  TransferPlantationMandorRequest,
} from '@/types';

export const plantationService = {
  async getAll(): Promise<Plantation[]> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.BASE);
  },

  async getById(id: EntityId): Promise<Plantation> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.BY_ID(id));
  },

  async getByOwner(ownerId: EntityId): Promise<Plantation[]> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.BY_OWNER(ownerId));
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

  async assignSupir(id: EntityId, supirId: string): Promise<Plantation> {
    return apiClient.post(API_ENDPOINTS.PLANTATIONS.SUPIRS(id), { supirId });
  },

  async unassignSupir(id: EntityId, supirId: string): Promise<Plantation> {
    return apiClient.delete(API_ENDPOINTS.PLANTATIONS.UNASSIGN_SUPIR(id, supirId));
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.PLANTATIONS.HEALTH);
  },
};
