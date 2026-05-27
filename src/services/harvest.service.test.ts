import { harvestService } from './harvest.service';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('harvest.service', () => {
  const fetchMock = jest.fn();
  const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ message: 'created', id: 'h-1' }),
    });
    global.fetch = fetchMock;
    Storage.prototype.getItem = jest.fn().mockReturnValue('token-1');
  });

  it('getAll calls harvest base endpoint', async () => {
    const payload = [{ id: 1 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await harvestService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BASE);
    expect(result).toEqual(payload);
  });

  it('getAll appends all supported filters', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);

    await harvestService.getAll({
      harvesterName: 'Budi',
      date: '2026-01-01',
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.HARVESTS.BASE}?harvesterName=Budi&date=2026-01-01`
    );
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

  it('create posts multipart form data to base endpoint', async () => {
    const body = { plantationId: 1, weight: 10, news: 'fresh', files: [file] };

    const result = await harvestService.create(body);

    expect(fetchMock).toHaveBeenCalledWith(
      API_ENDPOINTS.HARVESTS.BASE,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-User-Id': 'token-1',
          'X-Requester-Id': 'token-1',
          'X-User-Role': 'token-1',
        }),
        body: expect.any(FormData),
      })
    );
    expect(result).toEqual({ message: 'created', id: 'h-1' });
  });

  it('create omits authorization header when token is missing', async () => {
    (Storage.prototype.getItem as jest.Mock).mockReturnValue(null);
    const body = { plantationId: 1, weight: 10, files: [file] };

    await harvestService.create(body);

    expect(fetchMock).toHaveBeenCalledWith(
      API_ENDPOINTS.HARVESTS.BASE,
      expect.objectContaining({ headers: {} })
    );
  });

  it('create attaches BURUH harvester headers when role is BURUH', async () => {
    (Storage.prototype.getItem as jest.Mock).mockImplementation((key: string) => {
      switch (key) {
        case 'authToken': return 'tok';
        case 'userId': return 'user-1';
        case 'username': return 'budi';
        case 'userRole': return 'BURUH';
        default: return null;
      }
    });

    await harvestService.create({ plantationId: 1, weight: 10, files: [file] });

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers).toEqual({
      Authorization: 'Bearer tok',
      'X-User-Id': 'user-1',
      'X-Requester-Id': 'user-1',
      'X-User-Name': 'budi',
      'X-User-Role': 'BURUH',
      'X-Harvester-Id': 'user-1',
      'X-Harvester-Name': 'budi',
    });
  });

  it('create falls back to user id for harvester name when BURUH username is missing', async () => {
    (Storage.prototype.getItem as jest.Mock).mockImplementation((key: string) => {
      switch (key) {
        case 'userId': return 'user-2';
        case 'userRole': return 'BURUH';
        default: return null;
      }
    });

    await harvestService.create({ plantationId: 1, weight: 10, files: [file] });

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Harvester-Name']).toBe('user-2');
    expect(headers['X-User-Name']).toBeUndefined();
  });

  it('create attaches foreman header when role is MANDOR', async () => {
    (Storage.prototype.getItem as jest.Mock).mockImplementation((key: string) => {
      switch (key) {
        case 'userId': return 'mandor-9';
        case 'userRole': return 'MANDOR';
        default: return null;
      }
    });

    await harvestService.create({ plantationId: 1, weight: 10, files: [file] });

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Foreman-Id']).toBe('mandor-9');
    expect(headers['X-Harvester-Id']).toBeUndefined();
  });

  it('create rejects empty file lists before calling fetch', async () => {
    await expect(harvestService.create({ plantationId: 1, weight: 10, files: [] }))
      .rejects.toThrow('Minimal 1 foto hasil panen harus dilampirkan');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('create throws backend message from json error response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue('{"message":"invalid photo"}'),
    });

    await expect(harvestService.create({ plantationId: 1, weight: 10, files: [file] }))
      .rejects.toThrow('invalid photo');
  });

  it('create handles json error and status fallback variants', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValue('{"error":"error field"}'),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
        text: jest.fn().mockResolvedValue('{}'),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Gateway Timeout',
        text: jest.fn().mockResolvedValue(''),
      });

    await expect(harvestService.create({ plantationId: 1, weight: 10, files: [file] }))
      .rejects.toThrow('error field');
    await expect(harvestService.create({ plantationId: 1, weight: 10, files: [file] }))
      .rejects.toThrow('{}');
    await expect(harvestService.create({ plantationId: 1, weight: 10, files: [file] }))
      .rejects.toThrow('Gateway Timeout');
  });

  it('create throws raw text when error response is not json', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue('plain failure'),
    });

    await expect(harvestService.create({ plantationId: 1, weight: 10, files: [file] }))
      .rejects.toThrow('plain failure');
  });

  it('create falls back to generic message when both error body and statusText are empty', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: '',
      text: jest.fn().mockResolvedValue(''),
    });

    await expect(harvestService.create({ plantationId: 1, weight: 10, files: [file] }))
      .rejects.toThrow('Request failed');
  });

  it('getMine preserves startDate values that already include time without re-appending T00:00:00', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await harvestService.getMine({ startDate: '2026-05-01T08:30:00' });
    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.HARVESTS.MY}?startDate=2026-05-01T08%3A30%3A00`
    );
  });

  it('getMine without filters hits MY endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await harvestService.getMine();
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.MY);
  });

  it('getMine appends query parameters when filters are provided', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await harvestService.getMine({ date: '2026-01-01' });
    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.HARVESTS.MY}?date=2026-01-01`
    );
  });

  it('getMine appends PRD history filters for date range and status', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await harvestService.getMine({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      status: 'REJECTED',
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.HARVESTS.MY}?startDate=2026-05-01T00%3A00%3A00&endDate=2026-05-31T00%3A00%3A00&status=REJECTED`
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
        date: '2026-01-01',
        status: 'PENDING',
      });
      expect(apiClient.get).toHaveBeenCalledWith(
        `${API_ENDPOINTS.HARVESTS.BASE}?harvesterName=budi&date=2026-01-01&status=PENDING`,
      );
    });
  });
});
