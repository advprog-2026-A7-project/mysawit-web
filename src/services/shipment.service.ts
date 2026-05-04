import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { EntityId, Shipment, ShipmentRequest, ShipmentStatus, ShipmentStatusRequest } from '@/types';

export const shipmentService = {
  async getAll(): Promise<Shipment[]> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BASE);
  },

  async getById(id: EntityId): Promise<Shipment> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BY_ID(id));
  },

  async getByHarvest(harvestId: EntityId): Promise<Shipment[]> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BY_HARVEST(harvestId));
  },

  async getByStatus(status: string): Promise<Shipment[]> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BY_STATUS(status));
  },

  async create(data: ShipmentRequest): Promise<Shipment> {
    return apiClient.post(API_ENDPOINTS.SHIPMENTS.BASE, data);
  },

  async update(id: EntityId, data: ShipmentRequest): Promise<Shipment> {
    return apiClient.put(API_ENDPOINTS.SHIPMENTS.BY_ID(id), data);
  },

  async updateStatus(id: EntityId, data: ShipmentStatusRequest): Promise<Shipment> {
    return apiClient.patch(API_ENDPOINTS.SHIPMENTS.UPDATE_STATUS(id), data);
  },

  async approveByAdmin(id: EntityId, status: ShipmentStatus): Promise<Shipment> {
    return apiClient.patch(API_ENDPOINTS.SHIPMENTS.ADMIN_APPROVAL(id), { status });
  },

  async delete(id: EntityId): Promise<{ message: string }> {
    return apiClient.delete(API_ENDPOINTS.SHIPMENTS.BY_ID(id));
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.HEALTH);
  },
};
