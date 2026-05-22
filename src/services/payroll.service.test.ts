import { payrollService, wageConfigService } from './payroll.service';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

const USER_ID = '11111111-1111-1111-1111-111111111111';

describe('payrollService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAll calls payrolls base endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([{ id: 10 }]);
    const result = await payrollService.getAll();
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BASE);
    expect(result).toEqual([{ id: 10 }]);
  });

  it('getAll appends supported search params', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([{ id: 10 }]);

    await payrollService.getAll({
      userId: USER_ID,
      status: 'PENDING',
      from: '2026-05-01',
      to: '2026-05-31T23:59:59',
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.PAYROLLS.BASE}?userId=${USER_ID}&status=PENDING&from=2026-05-01T00%3A00%3A00&to=2026-05-31T23%3A59%3A59`
    );
  });

  it('getById calls payrolls by-id endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ id: 11 });
    const result = await payrollService.getById(11);
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BY_ID(11));
    expect(result).toEqual({ id: 11 });
  });

  it('getByUser calls payrolls by-user endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([{ id: 12 }]);
    const result = await payrollService.getByUser(USER_ID);
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BY_USER(USER_ID));
    expect(result).toEqual([{ id: 12 }]);
  });

  it('getByStatus calls payrolls by-status endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([{ id: 13 }]);
    const result = await payrollService.getByStatus('PENDING');
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BY_STATUS('PENDING'));
    expect(result).toEqual([{ id: 13 }]);
  });

  it('create normalizes date-only period fields and posts to payrolls base', async () => {
    const body = {
      userId: USER_ID,
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      baseAmount: 5000000,
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 14, ...body });
    await payrollService.create(body);
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BASE, {
      ...body,
      periodStart: '2026-01-01T00:00:00',
      periodEnd: '2026-01-31T00:00:00',
    });
  });

  it('create keeps period fields untouched when they already include time', async () => {
    const body = {
      userId: USER_ID,
      periodStart: '2026-01-01T08:00:00',
      periodEnd: '2026-01-31T17:00:00',
      baseAmount: 5000000,
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 14, ...body });
    await payrollService.create(body);
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BASE, body);
  });

  it('update normalizes and puts to payrolls by-id endpoint', async () => {
    const body = {
      userId: USER_ID,
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      baseAmount: 5500000,
    };
    (apiClient.put as jest.Mock).mockResolvedValue({ id: 15, ...body });
    await payrollService.update(15, body);
    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BY_ID(15), {
      ...body,
      periodStart: '2026-02-01T00:00:00',
      periodEnd: '2026-02-28T00:00:00',
    });
  });

  it('approve patches payrolls approve endpoint', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 16, status: 'APPROVED' });
    const result = await payrollService.approve(16);
    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.APPROVE(16), undefined);
    expect(result).toEqual({ id: 16, status: 'APPROVED' });
  });

  it('approve sends adminId when provided', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 16, status: 'APPROVED' });
    await payrollService.approve(16, 'admin-1');
    expect(apiClient.patch).toHaveBeenCalledWith(
      API_ENDPOINTS.PAYROLLS.APPROVE(16),
      { adminId: 'admin-1' }
    );
  });

  it('accept patches payrolls accept endpoint', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 17, status: 'ACCEPTED' });
    const result = await payrollService.accept(17);
    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.ACCEPT(17));
    expect(result).toEqual({ id: 17, status: 'ACCEPTED' });
  });

  it('reject patches payrolls reject endpoint without reason', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 18, status: 'REJECTED' });
    await payrollService.reject(18);
    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.REJECT(18), undefined);
  });

  it('reject patches payrolls reject endpoint with reason', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 18, status: 'REJECTED' });
    await payrollService.reject(18, 'invalid amount');
    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.REJECT(18), { reason: 'invalid amount' });
  });

  it('pay patches payrolls pay endpoint with default method', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 19, status: 'PAID' });
    await payrollService.pay(19);
    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.PAY(19), { paymentMethod: 'SANDBOX' });
  });

  it('pay patches payrolls pay endpoint with custom method', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 19, status: 'PAID' });
    await payrollService.pay(19, 'CASH');
    expect(apiClient.patch).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.PAY(19), { paymentMethod: 'CASH' });
  });

  it('delete calls payrolls by-id endpoint', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue(undefined);
    await payrollService.delete(20);
    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BY_ID(20));
  });
});

describe('wageConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAll calls wage-configs base endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const result = await wageConfigService.getAll();
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BASE);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('getById calls wage-configs by-id endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ id: 2 });
    const result = await wageConfigService.getById(2);
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(2));
    expect(result).toEqual({ id: 2 });
  });

  it('getByRole calls wage-configs by-role endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([{ id: 3 }]);
    const result = await wageConfigService.getByRole('HARVESTER');
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BY_ROLE('HARVESTER'));
    expect(result).toEqual([{ id: 3 }]);
  });

  it('getByRoleActive calls wage-configs active-role endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ id: 4 });
    const result = await wageConfigService.getByRoleActive('HARVESTER');
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BY_ROLE_ACTIVE('HARVESTER'));
    expect(result).toEqual({ id: 4 });
  });

  it('create posts to wage-configs base endpoint', async () => {
    const body = {
      roleType: 'HARVESTER',
      ratePerKg: 1500,
      effectiveDate: '2026-01-01',
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 1, ...body });
    const result = await wageConfigService.create(body);
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BASE, body);
    expect(result).toEqual({ id: 1, ...body });
  });

  it('update puts to wage-configs by-id endpoint', async () => {
    const body = {
      roleType: 'HARVESTER',
      ratePerKg: 1700,
      effectiveDate: '2026-02-01',
    };
    (apiClient.put as jest.Mock).mockResolvedValue({ id: 1, ...body });
    const result = await wageConfigService.update(1, body);
    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(1), body);
    expect(result).toEqual({ id: 1, ...body });
  });

  it('delete calls wage-configs by-id endpoint', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue(undefined);
    await wageConfigService.delete(1);
    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(1));
  });
});
