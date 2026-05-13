import { shipmentService } from './shipment.service';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('shipment.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAll calls shipment base endpoint', async () => {
    const payload = [{ id: 1 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BASE);
    expect(result).toEqual(payload);
  });

  it('getById calls BY_ID endpoint', async () => {
    const payload = { id: 2 };
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.getById(2);

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BY_ID(2));
    expect(result).toEqual(payload);
  });

  it('getByHarvest calls BY_HARVEST endpoint', async () => {
    const payload = [{ id: 3 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.getByHarvest(99);

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BY_HARVEST(99));
    expect(result).toEqual(payload);
  });

  it('getByStatus calls BY_STATUS endpoint', async () => {
    const payload = [{ id: 4 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.getByStatus('PENDING');

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BY_STATUS('PENDING'));
    expect(result).toEqual(payload);
  });

  it('create posts to base endpoint', async () => {
    const body = { harvestId: 1, destination: 'Jakarta', weight: 10 };
    const payload = { id: 5, ...body };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.create(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BASE, body);
    expect(result).toEqual(payload);
  });

  it('update puts to BY_ID endpoint', async () => {
    const body = { harvestId: 1, destination: 'Bandung', weight: 15 };
    const payload = { id: 5, ...body };
    (apiClient.put as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.update(5, body);

    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BY_ID(5), body);
    expect(result).toEqual(payload);
  });

  it('delete calls delete on BY_ID endpoint', async () => {
    const payload = { message: 'deleted' };
    (apiClient.delete as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.delete(5);

    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BY_ID(5));
    expect(result).toEqual(payload);
  });

  it('checkHealth calls shipment health endpoint', async () => {
    const payload = { status: 'UP', service: 'mysawit-shipment-service' };
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.checkHealth();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.HEALTH);
    expect(result).toEqual(payload);
  });
});
