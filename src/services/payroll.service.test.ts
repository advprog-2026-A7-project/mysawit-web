import { employeeService, payrollService } from './payroll.service';
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

describe('payroll.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('employeeService.getAll calls employees endpoint', async () => {
    const payload = [{ id: 1 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await employeeService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.EMPLOYEES.BASE);
    expect(result).toEqual(payload);
  });

  it('employeeService.create posts to employees endpoint', async () => {
    const body = {
      name: 'Budi',
      employeeCode: 'EMP001',
      position: 'Harvester',
      baseSalary: 5000000,
      status: 'ACTIVE',
    };
    const payload = { id: 1, ...body };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await employeeService.create(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.EMPLOYEES.BASE, body);
    expect(result).toEqual(payload);
  });

  it('payrollService.getAll calls payrolls endpoint', async () => {
    const payload = [{ id: 10 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await payrollService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BASE);
    expect(result).toEqual(payload);
  });

  it('payrollService.create posts to payrolls endpoint', async () => {
    const body = {
      employeeId: 1,
      periodStart: '2026-01-01T00:00',
      periodEnd: '2026-01-31T23:59',
      baseAmount: 5000000,
      bonusAmount: 200000,
      deductionAmount: 100000,
      status: 'PENDING',
      paymentMethod: 'BANK_TRANSFER',
    };
    const payload = { id: 11, ...body };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await payrollService.create(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLLS.BASE, body);
    expect(result).toEqual(payload);
  });
});
