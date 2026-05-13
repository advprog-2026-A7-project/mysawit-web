import { harvestService } from './harvest.service';
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

describe('harvest.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAll calls harvest base endpoint', async () => {
    const payload = [{ id: 1 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BASE);
    expect(result).toEqual(payload);
  });

  it('getById calls BY_ID endpoint', async () => {
    const payload = { id: 2 };
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.getById(2);

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BY_ID(2));
    expect(result).toEqual(payload);
  });

  it('getByPlantation calls BY_PLANTATION endpoint', async () => {
    const payload = [{ id: 3 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.getByPlantation(99);

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BY_PLANTATION(99));
    expect(result).toEqual(payload);
  });

  it('create posts to base endpoint', async () => {
    const body = { plantationId: 1, harvestDate: '2026-01-01', weight: 10 };
    const payload = { id: 4, ...body };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.create(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BASE, body);
    expect(result).toEqual(payload);
  });

  it('update puts to BY_ID endpoint', async () => {
    const body = { plantationId: 1, harvestDate: '2026-01-02', weight: 12 };
    const payload = { id: 4, ...body };
    (apiClient.put as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.update(4, body);

    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BY_ID(4), body);
    expect(result).toEqual(payload);
  });

  it('delete calls delete on BY_ID endpoint', async () => {
    const payload = { message: 'deleted' };
    (apiClient.delete as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.delete(4);

    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BY_ID(4));
    expect(result).toEqual(payload);
  });

  it('checkHealth calls harvest health endpoint', async () => {
    const payload = { status: 'UP', service: 'mysawit-harvest-service' };
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.checkHealth();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.HEALTH);
    expect(result).toEqual(payload);
  });
});
