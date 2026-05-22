import { payrollService, wageConfigService, walletService } from './payroll.service';
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

describe('payrollService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls payroll read endpoints', async () => {
    (apiClient.get as jest.Mock)
      .mockResolvedValueOnce([{ id: 10 }])
      .mockResolvedValueOnce({ id: 11 })
      .mockResolvedValueOnce([{ id: 12 }])
      .mockResolvedValueOnce([{ id: 13 }]);

    await expect(payrollService.getAll()).resolves.toEqual([{ id: 10 }]);
    await expect(payrollService.getById(11)).resolves.toEqual({ id: 11 });
    await expect(payrollService.getByUser('worker-1')).resolves.toEqual([{ id: 12 }]);
    await expect(payrollService.getByStatus('PENDING')).resolves.toEqual([{ id: 13 }]);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, API_ENDPOINTS.PAYROLLS.BASE);
    expect(apiClient.get).toHaveBeenNthCalledWith(2, API_ENDPOINTS.PAYROLLS.BY_ID(11));
    expect(apiClient.get).toHaveBeenNthCalledWith(3, API_ENDPOINTS.PAYROLLS.BY_USER('worker-1'));
    expect(apiClient.get).toHaveBeenNthCalledWith(4, API_ENDPOINTS.PAYROLLS.BY_STATUS('PENDING'));
  });

  it('normalizes date-only period fields and writes payrolls', async () => {
    const body = {
      userId: 'worker-1',
      roleType: 'BURUH',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      baseAmount: 5000000,
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 14, ...body });
    (apiClient.put as jest.Mock).mockResolvedValue({ id: 14, ...body });

    await payrollService.create(body);
    await payrollService.update(14, body);

    const normalized = {
      ...body,
      periodStart: '2026-01-01T00:00:00',
      periodEnd: '2026-01-31T00:00:00',
    };
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BASE, normalized);
    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BY_ID(14), normalized);
  });

  it('keeps period fields untouched when they already include time', async () => {
    const body = {
      userId: 'worker-1',
      periodStart: '2026-01-01T08:00:00',
      periodEnd: '2026-01-31T17:00:00',
      baseAmount: 5000000,
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 14, ...body });

    await payrollService.create(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BASE, body);
  });

  it('calls payroll transition and delete endpoints', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 16 });
    (apiClient.delete as jest.Mock).mockResolvedValue(undefined);

    await payrollService.approve(16);
    await payrollService.accept(17);
    await payrollService.reject(18);
    await payrollService.reject(19, 'invalid amount');
    await payrollService.pay(20);
    await payrollService.pay(21, 'CASH');
    await payrollService.delete(22);

    expect(apiClient.patch).toHaveBeenNthCalledWith(1, API_ENDPOINTS.PAYROLLS.APPROVE(16));
    expect(apiClient.patch).toHaveBeenNthCalledWith(2, API_ENDPOINTS.PAYROLLS.ACCEPT(17));
    expect(apiClient.patch).toHaveBeenNthCalledWith(3, API_ENDPOINTS.PAYROLLS.REJECT(18), undefined);
    expect(apiClient.patch).toHaveBeenNthCalledWith(4, API_ENDPOINTS.PAYROLLS.REJECT(19), { reason: 'invalid amount' });
    expect(apiClient.patch).toHaveBeenNthCalledWith(5, API_ENDPOINTS.PAYROLLS.PAY(20), { paymentMethod: 'BANK_TRANSFER' });
    expect(apiClient.patch).toHaveBeenNthCalledWith(6, API_ENDPOINTS.PAYROLLS.PAY(21), { paymentMethod: 'CASH' });
    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BY_ID(22));
  });
});

describe('walletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls wallet endpoints', async () => {
    (apiClient.get as jest.Mock)
      .mockResolvedValueOnce({ userId: 'admin', balance: 100 })
      .mockResolvedValueOnce([{ id: 1 }]);
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 2 });

    await walletService.getByUser('admin');
    await walletService.getTransactions('admin');
    await walletService.topUpSandbox('admin', { amountSawitDollar: 25 });
    await walletService.topUpSandbox('worker-1', { amountSawitDollar: 10, gateway: 'manual' });

    expect(apiClient.get).toHaveBeenNthCalledWith(1, API_ENDPOINTS.WALLETS.BY_USER('admin'));
    expect(apiClient.get).toHaveBeenNthCalledWith(2, API_ENDPOINTS.WALLETS.TRANSACTIONS('admin'));
    expect(apiClient.post).toHaveBeenNthCalledWith(1, API_ENDPOINTS.WALLETS.TOP_UP_SANDBOX('admin'), {
      amountSawitDollar: '25',
      gateway: 'SANDBOX',
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, API_ENDPOINTS.WALLETS.TOP_UP_SANDBOX('worker-1'), {
      amountSawitDollar: '10',
      gateway: 'manual',
    });
  });
});

describe('wageConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls wage-config endpoints', async () => {
    const body = {
      roleType: 'BURUH',
      ratePerKg: 1500,
      effectiveDate: '2026-01-01',
    };
    (apiClient.get as jest.Mock).mockResolvedValue([{ id: 1 }]);
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 2, ...body });
    (apiClient.put as jest.Mock).mockResolvedValue({ id: 2, ...body });
    (apiClient.delete as jest.Mock).mockResolvedValue(undefined);

    await wageConfigService.getAll();
    await wageConfigService.getById(2);
    await wageConfigService.getByRole('BURUH');
    await wageConfigService.getByRoleActive('BURUH');
    await wageConfigService.create(body);
    await wageConfigService.update(2, body);
    await wageConfigService.delete(2);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, API_ENDPOINTS.WAGE_CONFIGS.BASE);
    expect(apiClient.get).toHaveBeenNthCalledWith(2, API_ENDPOINTS.WAGE_CONFIGS.BY_ID(2));
    expect(apiClient.get).toHaveBeenNthCalledWith(3, API_ENDPOINTS.WAGE_CONFIGS.BY_ROLE('BURUH'));
    expect(apiClient.get).toHaveBeenNthCalledWith(4, API_ENDPOINTS.WAGE_CONFIGS.BY_ROLE_ACTIVE('BURUH'));
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BASE, body);
    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(2), body);
    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(2));
  });
});
