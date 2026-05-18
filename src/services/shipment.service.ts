import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import {
  AdminApprovalRequest,
  EntityId,
  MandorApprovalRequest,
  Shipment,
  ShipmentFilters,
  ShipmentRequest,
  ShipmentStatus,
  ShipmentStatusRequest,
  SupirAssignment,
} from '@/types';

function buildShipmentListUrl(filters?: ShipmentFilters): string {
  const params = new URLSearchParams();

  if (filters?.status) params.set('status', String(filters.status));
  if (filters?.date) params.set('date', filters.date);
  if (filters?.mandorName) params.set('mandorName', filters.mandorName);
  if (filters?.supirName) params.set('supirName', filters.supirName);
  if (filters?.supirUserId) params.set('supirUserId', String(filters.supirUserId));

  const query = params.toString();
  return query ? `${API_ENDPOINTS.SHIPMENTS.BASE}?${query}` : API_ENDPOINTS.SHIPMENTS.BASE;
}

const toLocalDateTime = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;

const normalizeShipmentRequest = (data: ShipmentRequest): ShipmentRequest => ({
  ...data,
  shipmentDate: toLocalDateTime(data.shipmentDate),
  deliveryDate: toLocalDateTime(data.deliveryDate),
});

export const shipmentService = {
  async getAll(filters?: ShipmentFilters): Promise<Shipment[]> {
    return apiClient.get(buildShipmentListUrl(filters));
  },

  async getById(id: EntityId): Promise<Shipment> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BY_ID(id));
  },

  async getByHarvest(harvestId: EntityId): Promise<Shipment[]> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.BY_HARVEST(harvestId));
  },

  async getByStatus(status: string): Promise<Shipment[]> {
    return this.getAll({ status });
  },

  async getAvailableSupirs(name?: string): Promise<SupirAssignment[]> {
    const query = name ? `?name=${encodeURIComponent(name)}` : '';
    return apiClient.get(`${API_ENDPOINTS.SHIPMENTS.AVAILABLE_SUPIRS}${query}`);
  },

  async create(data: ShipmentRequest): Promise<Shipment> {
    return apiClient.post(API_ENDPOINTS.SHIPMENTS.BASE, normalizeShipmentRequest(data));
  },

  async update(id: number, data: ShipmentRequest): Promise<Shipment> {
    return apiClient.put(API_ENDPOINTS.SHIPMENTS.BY_ID(id), normalizeShipmentRequest(data));
  },

  async updateStatus(id: EntityId, data: ShipmentStatusRequest): Promise<Shipment> {
    return apiClient.patch(API_ENDPOINTS.SHIPMENTS.UPDATE_STATUS(id), data);
  },

  async approveByMandor(id: EntityId, data: MandorApprovalRequest): Promise<Shipment> {
    return apiClient.patch(API_ENDPOINTS.SHIPMENTS.MANDOR_APPROVAL(id), data);
  },

  async approveByAdmin(id: EntityId, data: AdminApprovalRequest | ShipmentStatus): Promise<Shipment> {
    const payload = typeof data === 'string' ? { status: data } : data;
    return apiClient.patch(API_ENDPOINTS.SHIPMENTS.ADMIN_APPROVAL(id), payload);
  },

  async delete(id: EntityId): Promise<{ message: string }> {
    return apiClient.delete(API_ENDPOINTS.SHIPMENTS.BY_ID(id));
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return apiClient.get(API_ENDPOINTS.SHIPMENTS.HEALTH);
  },
};
