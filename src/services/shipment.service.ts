import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Shipment, ShipmentRequest } from '@/types';

const toLocalDateTime = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;

const normalizeShipmentRequest = (data: ShipmentRequest): ShipmentRequest => ({
  ...data,
  shipmentDate: toLocalDateTime(data.shipmentDate),
  deliveryDate: toLocalDateTime(data.deliveryDate),
});

export const shipmentService = {
  async getAll(): Promise<Shipment[]> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BASE);
  },

  async getById(id: number): Promise<Shipment> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BY_ID(id));
  },

  async getByHarvest(harvestId: number): Promise<Shipment[]> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BY_HARVEST(harvestId));
  },

  async getByStatus(status: string): Promise<Shipment[]> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BY_STATUS(status));
  },

  async create(data: ShipmentRequest): Promise<Shipment> {
    return apiClient.post(API_ENDPOINTS.SHIPMENTS.BASE, normalizeShipmentRequest(data));
  },

  async update(id: number, data: ShipmentRequest): Promise<Shipment> {
    return apiClient.put(API_ENDPOINTS.SHIPMENTS.BY_ID(id), normalizeShipmentRequest(data));
  },

  async delete(id: number): Promise<{ message: string }> {
    return apiClient.delete(API_ENDPOINTS.SHIPMENTS.BY_ID(id));
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.HEALTH);
  },
};
