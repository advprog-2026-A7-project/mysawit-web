import { payrollService } from './payroll.service';
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

describe('payroll.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getEmployees calls payroll employees endpoint', async () => {
    const payload = [{ id: 1 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await payrollService.getEmployees();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLL.EMPLOYEES);
    expect(result).toEqual(payload);
  });

  it('createEmployee posts to payroll employees endpoint', async () => {
    const body = {
      name: 'Budi',
      employeeCode: 'EMP001',
      position: 'Harvester',
      baseSalary: 5000000,
      status: 'ACTIVE',
    };
    const payload = { id: 1, ...body };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await payrollService.createEmployee(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLL.EMPLOYEES, body);
    expect(result).toEqual(payload);
  });

  it('getPayrolls calls payroll records endpoint', async () => {
    const payload = [{ id: 10 }];
    (apiClient.get as jest.Mock).mockResolvedValue(payload);

    const result = await payrollService.getPayrolls();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLL.PAYROLLS);
    expect(result).toEqual(payload);
  });

  it('createPayroll posts to payroll records endpoint', async () => {
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

    const result = await payrollService.createPayroll(body);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.PAYROLL.PAYROLLS, body);
    expect(result).toEqual(payload);
  });
});
