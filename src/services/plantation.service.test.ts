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

  it('getAll appends name and code filters', async () => {
    const payload = [{ id: 1 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.getAll({ name: 'Kebun A', code: 'KB-A' });

    expect(apiClient.get).toHaveBeenCalledWith(`${API_ENDPOINTS.PLANTATIONS.BASE}?name=Kebun+A&code=KB-A`);
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

  it('getByMandor calls BY_MANDOR endpoint', async () => {
    const payload = [{ id: 7, mandorId: 'mandor-1' }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.getByMandor('mandor-1');

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BY_MANDOR('mandor-1'));
    expect(result).toEqual(payload);
  });

  it('create posts to base endpoint', async () => {
    const body = {
      name: 'A',
      location: 'Riau',
      area: 10,
      coordinates: [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
        { latitude: 1, longitude: 1 },
        { latitude: 1, longitude: 0 },
      ],
    };
    const payload = { id: 4, ...body };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.create(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BASE, body);
    expect(result).toEqual(payload);
  });

  it('update puts to BY_ID endpoint', async () => {
    const body = {
      name: 'A',
      location: 'Riau',
      area: 11,
      coordinates: [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
        { latitude: 1, longitude: 1 },
        { latitude: 1, longitude: 0 },
      ],
    };
    const payload = { id: 4, ...body };
    (apiClient.put as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.update(4, body);

    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BY_ID(4), body);
    expect(result).toEqual(payload);
  });

  it('assignMandor posts to plantation mandor endpoint', async () => {
    const body = { mandorId: 'mandor-1' };
    const payload = { id: 4, mandorId: 'mandor-1' };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.assignMandor(4, body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.ASSIGN_MANDOR(4), body);
    expect(result).toEqual(payload);
  });

  it('transferMandor puts to transfer endpoint', async () => {
    const body = {
      mandorId: 'mandor-1',
      fromPlantationId: 4,
      toPlantationId: 5,
    };
    (apiClient.put as jest.Mock).mockResolvedValue(undefined);

    await plantationService.transferMandor(body);

    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.TRANSFER_MANDOR, body);
  });

  it('unassignMandor deletes plantation mandor endpoint', async () => {
    const payload = { id: 4, mandorId: null };
    (apiClient.delete as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.unassignMandor(4);

    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.UNASSIGN_MANDOR(4));
    expect(result).toEqual(payload);
  });

  it('getSupirs calls plantation supirs endpoint', async () => {
    const payload = ['supir-1'];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.getSupirs(4);

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.SUPIRS(4));
    expect(result).toEqual(payload);
  });

  it('getSupirDetails calls plantation supir details endpoint with encoded name search', async () => {
    const payload = [{ id: 'supir-1', name: 'Supir Local' }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.getSupirDetails(4, 'Supir Local');

    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.PLANTATIONS.SUPIRS_DETAILS(4)}?name=Supir%20Local`
    );
    expect(result).toEqual(payload);
  });

  it('assignSupir posts supir id to plantation supirs endpoint', async () => {
    const payload = { id: 4, supirIds: ['supir-1'] };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.assignSupir(4, 'supir-1');

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.SUPIRS(4), { supirId: 'supir-1' });
    expect(result).toEqual(payload);
  });

  it('unassignSupir deletes plantation supir endpoint', async () => {
    const payload = { id: 4, supirIds: [] };
    (apiClient.delete as jest.Mock).mockResolvedValue(payload);

    const result = await plantationService.unassignSupir(4, 'supir-1');

    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.UNASSIGN_SUPIR(4, 'supir-1'));
    expect(result).toEqual(payload);
  });

  it('transferSupir puts to transfer supir endpoint', async () => {
    const body = {
      supirId: 'supir-1',
      fromPlantationId: 4,
      toPlantationId: 5,
    };
    (apiClient.put as jest.Mock).mockResolvedValue(undefined);

    await plantationService.transferSupir(body);

    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.TRANSFER_SUPIR, body);
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
