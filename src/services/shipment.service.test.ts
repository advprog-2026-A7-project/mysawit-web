import { shipmentService } from './shipment.service';
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

  it('getAll builds shipment query filters', async () => {
    const payload = [{ id: 10 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.getAll({
      status: 'MANDOR_APPROVED',
      date: '2026-05-15',
      mandorName: 'Mandor',
      supirName: 'Supir',
      supirUserId: 'bbbbbbbb-2222-2222-2222-222222222222',
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/gateway/shipment/api/shipments?status=MANDOR_APPROVED&date=2026-05-15&mandorName=Mandor&supirName=Supir&supirUserId=bbbbbbbb-2222-2222-2222-222222222222'
    );
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

    const result = await shipmentService.getByStatus('MEMUAT');

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BY_STATUS('MEMUAT'));
    expect(result).toEqual(payload);
  });

  it('getAvailableSupirs calls available supirs endpoint with encoded search', async () => {
    const payload = [{ userId: 'driver-1' }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.getAvailableSupirs('Supir Local');

    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.SHIPMENTS.AVAILABLE_SUPIRS}?name=Supir%20Local`
    );
    expect(result).toEqual(payload);
  });

  it('getAvailableSupirs omits query string when search is blank', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);

    await shipmentService.getAvailableSupirs();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.AVAILABLE_SUPIRS);
  });

  it('create posts to base endpoint', async () => {
    const body = { harvestId: 1, destination: 'Jakarta', weight: 10 };
    const payload = { id: 5, ...body };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.create(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BASE, body);
    expect(result).toEqual(payload);
  });

  it('create normalizes date-only shipmentDate/deliveryDate to ISO datetime', async () => {
    const body = { harvestId: 1, destination: 'Jakarta', weight: 10, shipmentDate: '2026-01-01', deliveryDate: '2026-01-05' };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 5, ...body });
    await shipmentService.create(body);
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BASE, {
      ...body,
      shipmentDate: '2026-01-01T00:00:00',
      deliveryDate: '2026-01-05T00:00:00',
    });
  });

  it('create leaves shipmentDate/deliveryDate untouched when they already include time', async () => {
    const body = { harvestId: 1, destination: 'Jakarta', weight: 10, shipmentDate: '2026-01-01T08:00:00', deliveryDate: '2026-01-05T17:00:00' };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 5, ...body });
    await shipmentService.create(body);
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BASE, body);
  });

  it('update puts to BY_ID endpoint', async () => {
    const body = { harvestId: 1, destination: 'Bandung', weight: 15 };
    const payload = { id: 5, ...body };
    (apiClient.put as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.update(5, body);

    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BY_ID(5), body);
    expect(result).toEqual(payload);
  });

  it('updateStatus patches status endpoint', async () => {
    const body = { status: 'MENGIRIM' as const };
    const payload = { id: 5, status: 'MENGIRIM' };
    (apiClient.patch as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.updateStatus(5, body);

    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.UPDATE_STATUS(5), body);
    expect(result).toEqual(payload);
  });

  it('approveByMandor patches mandor approval endpoint', async () => {
    const body = { status: 'MANDOR_APPROVED' as const };
    const payload = { id: 5, status: 'MANDOR_APPROVED' };
    (apiClient.patch as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.approveByMandor(5, body);

    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.MANDOR_APPROVAL(5), body);
    expect(result).toEqual(payload);
  });

  it('approveByAdmin patches admin approval endpoint with full payload', async () => {
    const body = {
      status: 'PARTIALLY_REJECTED' as const,
      rejectionReason: 'bad weight',
      kgAccepted: 80,
    };
    const payload = { id: 5, status: 'PARTIALLY_REJECTED' };
    (apiClient.patch as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.approveByAdmin(5, body);

    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.ADMIN_APPROVAL(5), body);
    expect(result).toEqual(payload);
  });

  it('delete calls delete on BY_ID endpoint', async () => {
    const payload = { message: 'deleted' };
    (apiClient.delete as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.delete(5);

    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BY_ID(5));
    expect(result).toEqual(payload);
  });

  it('updateStatus patches the UPDATE_STATUS endpoint', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 5 });
    await shipmentService.updateStatus(5, { status: 'TIBA' });
    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.UPDATE_STATUS(5), { status: 'TIBA' });
  });

  it('approveByAdmin patches the ADMIN_APPROVAL endpoint with the status payload', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 5 });
    await shipmentService.approveByAdmin(5, 'ADMIN_APPROVED');
    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.ADMIN_APPROVAL(5), { status: 'ADMIN_APPROVED' });
  });

  it('checkHealth calls shipment health endpoint', async () => {
    const payload = { status: 'UP', service: 'mysawit-shipment-service' };
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await shipmentService.checkHealth();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.HEALTH);
    expect(result).toEqual(payload);
  });
});
