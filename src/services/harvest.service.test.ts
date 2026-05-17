import { harvestService } from './harvest.service';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
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

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BASE, {
      ...body,
      harvestDate: '2026-01-01T00:00:00',
    });
    expect(result).toEqual(payload);
  });

  it('create preserves undefined harvestDate when omitted', async () => {
    const body = { plantationId: 1, weight: 10 };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 4, ...body });
    await harvestService.create(body);
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BASE, { ...body, harvestDate: undefined });
  });

  it('create preserves empty harvestDate when explicitly blank', async () => {
    const body = { plantationId: 1, harvestDate: '', weight: 10 };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 4, ...body });
    await harvestService.create(body);
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BASE, body);
  });

  it('create leaves harvestDate untouched when it already includes time', async () => {
    const body = { plantationId: 1, harvestDate: '2026-01-01T08:00:00', weight: 10 };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 4, ...body });
    await harvestService.create(body);
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BASE, body);
  });

  it('update puts to BY_ID endpoint', async () => {
    const body = { plantationId: 1, harvestDate: '2026-01-02', weight: 12 };
    const payload = { id: 4, ...body };
    (apiClient.put as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.update(4, body);

    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BY_ID(4), {
      ...body,
      harvestDate: '2026-01-02T00:00:00',
    });
    expect(result).toEqual(payload);
  });

  it('delete calls delete on BY_ID endpoint', async () => {
    const payload = { message: 'deleted' };
    (apiClient.delete as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.delete(4);

    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BY_ID(4));
    expect(result).toEqual(payload);
  });

  it('getMine without filters hits MY endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await harvestService.getMine();
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.MY);
  });

  it('getMine appends query parameters when filters are provided', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await harvestService.getMine({ startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.HARVESTS.MY}?startDate=2026-01-01&endDate=2026-01-31`
    );
  });

  it('updateStatus patches status endpoint', async () => {
    const body = { id: 4, status: 'APPROVED' as const };
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 4 });
    await harvestService.updateStatus(body);
    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.UPDATE_STATUS, body);
  });

  it('checkHealth calls harvest health endpoint', async () => {
    const payload = { status: 'UP', service: 'mysawit-harvest-service' };
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.checkHealth();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.HEALTH);
    expect(result).toEqual(payload);
  });

  describe('toArray normalization', () => {
    it('getAll unwraps a paginated { content: [] } response', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ content: [{ id: 1 }, { id: 2 }] });
      const result = await harvestService.getAll();
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('getAll unwraps a { data: [] } response', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [{ id: 3 }] });
      const result = await harvestService.getAll();
      expect(result).toEqual([{ id: 3 }]);
    });

    it('getAll unwraps an { items: [] } response', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ items: [{ id: 4 }] });
      const result = await harvestService.getAll();
      expect(result).toEqual([{ id: 4 }]);
    });

    it('getAll returns [] when response is an unrelated object', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ message: 'no harvests' });
      const result = await harvestService.getAll();
      expect(result).toEqual([]);
    });

    it('getAll returns [] when response is null/primitive', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue(null);
      expect(await harvestService.getAll()).toEqual([]);

      (apiClient.get as jest.Mock).mockResolvedValue('oops');
      expect(await harvestService.getAll()).toEqual([]);
    });

    it('getMine and getByPlantation share the same array normalization', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ content: [{ id: 5 }] });
      expect(await harvestService.getMine()).toEqual([{ id: 5 }]);

      (apiClient.get as jest.Mock).mockResolvedValueOnce({ items: [{ id: 6 }] });
      expect(await harvestService.getByPlantation(1)).toEqual([{ id: 6 }]);
    });

    it('getAll appends filter query parameters', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue([]);
      await harvestService.getAll({
        harvesterName: 'budi',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        status: 'PENDING',
      });
      expect(apiClient.get).toHaveBeenCalledWith(
        `${API_ENDPOINTS.HARVESTS.BASE}?harvesterName=budi&startDate=2026-01-01&endDate=2026-01-31&status=PENDING`,
      );
    });
  });
});
