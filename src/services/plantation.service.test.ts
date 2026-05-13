import { plantationService } from './plantation.service';
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

describe('plantation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAll calls plantations base endpoint', async () => {
    const payload = [{ id: 1 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BASE);
    expect(result).toEqual(payload);
  });

  it('getById calls BY_ID endpoint', async () => {
    const payload = { id: 2 };
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.getById(2);

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BY_ID(2));
    expect(result).toEqual(payload);
  });

  it('getByOwner calls BY_OWNER endpoint', async () => {
    const payload = [{ id: 3 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.getByOwner(99);

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BY_OWNER(99));
    expect(result).toEqual(payload);
  });

  it('create posts to base endpoint', async () => {
    const body = { name: 'A', location: 'Riau', area: 10 };
    const payload = { id: 4, ...body };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.create(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BASE, body);
    expect(result).toEqual(payload);
  });

  it('update puts to BY_ID endpoint', async () => {
    const body = { name: 'A', location: 'Riau', area: 11 };
    const payload = { id: 4, ...body };
    (apiClient.put as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.update(4, body);

    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BY_ID(4), body);
    expect(result).toEqual(payload);
  });

  it('delete calls delete on BY_ID endpoint', async () => {
    const payload = { message: 'deleted' };
    (apiClient.delete as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.delete(4);

    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BY_ID(4));
    expect(result).toEqual(payload);
  });

  it('checkHealth calls plantations health endpoint', async () => {
    const payload = { status: 'UP', service: 'mysawit-plantation-service' };
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.checkHealth();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.HEALTH);
    expect(result).toEqual(payload);
  });
});
