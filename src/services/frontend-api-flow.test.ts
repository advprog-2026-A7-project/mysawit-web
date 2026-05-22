import { authService } from './auth.service';
import { harvestService } from './harvest.service';
import { identityService } from './identity.service';
import { payrollService, wageConfigService, walletService } from './payroll.service';
import { plantationService } from './plantation.service';
import { shipmentService } from './shipment.service';
import { API_ENDPOINTS } from '@/lib/api-config';

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: jest.fn().mockReturnValue(null) },
  text: jest.fn().mockResolvedValue(JSON.stringify(body)),
}) as unknown as Response;

describe('frontend API flow contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ id: 1 }));
  });

  it('calls identity auth endpoints with proper methods and bodies', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ token: 'jwt', type: 'Bearer', id: '1', username: 'user', email: 'u@test.id', role: 'USER' }))
      .mockResolvedValueOnce(jsonResponse({ token: 'jwt2', type: 'Bearer', id: '2', username: 'new', email: 'n@test.id', role: 'USER' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'UP', service: 'mysawit-identity-service' }))
      .mockResolvedValueOnce(jsonResponse({ token: 'dummy', type: 'Bearer', id: '3', username: 'dummy', email: 'd@test.id', role: 'USER' }));

    await authService.login({ email: 'u@test.id', password: 'secret123' });
    await authService.register({ username: 'new', email: 'n@test.id', password: 'secret123' });
    await authService.checkHealth();
    await identityService.createDummyUser({ username: 'dummy', email: 'd@test.id', password: 'secret123' });

    expect(global.fetch).toHaveBeenNthCalledWith(1, API_ENDPOINTS.AUTH.LOGIN, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'u@test.id', password: 'secret123' }),
    }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, API_ENDPOINTS.AUTH.REGISTER, expect.objectContaining({ method: 'POST' }));
    expect(global.fetch).toHaveBeenNthCalledWith(3, API_ENDPOINTS.AUTH.HEALTH, expect.objectContaining({ method: 'GET' }));
    expect(global.fetch).toHaveBeenNthCalledWith(4, API_ENDPOINTS.AUTH.REGISTER, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'dummy', email: 'd@test.id', password: 'secret123' }),
    }));
  });

  it('calls plantation, harvest, and shipment CRUD endpoints', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ message: 'ok' }));

    await plantationService.getAll();
    await plantationService.getById(1);
    await plantationService.getByOwner(9);
    await plantationService.create({ name: 'Block A', location: 'Riau', area: 10 });
    await plantationService.update(1, { name: 'Block B', location: 'Jambi', area: 12 });
    await plantationService.delete(1);
    await plantationService.checkHealth();

    await harvestService.getAll();
    await harvestService.getById(2);
    await harvestService.getByPlantation(1);
    await harvestService.create({ plantationId: 1, harvestDate: '2026-05-22', weight: 100 });
    await harvestService.update(2, { plantationId: 1, harvestDate: '2026-05-23', weight: 120 });
    await harvestService.delete(2);
    await harvestService.checkHealth();

    await shipmentService.getAll();
    await shipmentService.getById(3);
    await shipmentService.getByHarvest(2);
    await shipmentService.getByStatus('PENDING');
    await shipmentService.create({ harvestId: 2, destination: 'Mill A', weight: 50, shipmentDate: '2026-05-22' });
    await shipmentService.update(3, { harvestId: 2, destination: 'Mill B', weight: 60, deliveryDate: '2026-05-23' });
    await shipmentService.delete(3);
    await shipmentService.checkHealth();

    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BASE, expect.objectContaining({ method: 'GET' }));
    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.PLANTATIONS.BY_OWNER(9), expect.objectContaining({ method: 'GET' }));
    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.HARVESTS.BASE, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ plantationId: 1, harvestDate: '2026-05-22T00:00:00', weight: 100 }),
    }));
    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BY_STATUS('PENDING'), expect.objectContaining({ method: 'GET' }));
    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.SHIPMENTS.BASE, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ harvestId: 2, destination: 'Mill A', weight: 50, shipmentDate: '2026-05-22T00:00:00' }),
    }));
  });

  it('calls payroll M100, wallet, and wage config endpoints', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ id: 1 }));

    await payrollService.getAll();
    await payrollService.getById(1);
    await payrollService.getByUser('worker-1');
    await payrollService.getByStatus('PENDING');
    await payrollService.create({ userId: 'worker-1', roleType: 'BURUH', periodStart: '2026-05-01', periodEnd: '2026-05-31', baseAmount: 100 });
    await payrollService.update(1, { userId: 'worker-1', periodStart: '2026-05-01', periodEnd: '2026-05-31', baseAmount: 120 });
    await payrollService.approve(1);
    await payrollService.accept(1);
    await payrollService.reject(1, 'invalid data');
    await payrollService.pay(1, 'SANDBOX');
    await payrollService.delete(1);

    await walletService.getByUser('admin');
    await walletService.getTransactions('admin');
    await walletService.topUpSandbox('admin', { amountSawitDollar: 100 });

    await wageConfigService.getAll();
    await wageConfigService.getById(1);
    await wageConfigService.getByRole('BURUH');
    await wageConfigService.getByRoleActive('BURUH');
    await wageConfigService.create({ roleType: 'BURUH', ratePerKg: 350, effectiveDate: '2026-01-01' });
    await wageConfigService.update(1, { roleType: 'SUPIR', ratePerKg: 250, effectiveDate: '2026-01-01' });
    await wageConfigService.delete(1);

    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BY_USER('worker-1'), expect.objectContaining({ method: 'GET' }));
    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BASE, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        userId: 'worker-1',
        roleType: 'BURUH',
        periodStart: '2026-05-01T00:00:00',
        periodEnd: '2026-05-31T00:00:00',
        baseAmount: 100,
      }),
    }));
    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.REJECT(1), expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ reason: 'invalid data' }),
    }));
    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.WALLETS.TOP_UP_SANDBOX('admin'), expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ amountSawitDollar: '100', gateway: 'SANDBOX' }),
    }));
    expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BY_ROLE_ACTIVE('BURUH'), expect.objectContaining({ method: 'GET' }));
  });
});
