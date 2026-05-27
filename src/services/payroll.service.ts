import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import {
  PaymentTransaction,
  Payroll,
  PayrollRequest,
  PayrollSearchParams,
  WageConfig,
  WageConfigRequest,
  Wallet,
  WalletTopUpRequest,
} from '@/types';

const toLocalDateTime = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;

const normalizePayrollRequest = (data: PayrollRequest): PayrollRequest => ({
  ...data,
  periodStart: toLocalDateTime(data.periodStart),
  periodEnd: toLocalDateTime(data.periodEnd),
});

const dateBoundary = (value: string, boundary: 'start' | 'end') => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value);
  return new Date(`${value}T${boundary === 'start' ? '00:00:00' : '23:59:59'}`);
};

const filterPayrollHistory = (payrolls: Payroll[], params?: Omit<PayrollSearchParams, 'userId'>) =>
  payrolls.filter((payroll) => {
    if (params?.status && payroll.status !== params.status) return false;

    const periodStart = new Date(payroll.periodStart);
    if (params?.from && periodStart < dateBoundary(params.from, 'start')) return false;
    if (params?.to && periodStart > dateBoundary(params.to, 'end')) return false;

    return true;
  });

// Payroll operations
export const payrollService = {
  async getAll(params?: PayrollSearchParams): Promise<Payroll[]> {
    if (!params) {
      return apiClient.get(API_ENDPOINTS.PAYROLLS.BASE);
    }

    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.set('userId', params.userId);
    if (params.status) searchParams.set('status', params.status);
    if (params.from) searchParams.set('from', toLocalDateTime(params.from));
    if (params.to) searchParams.set('to', toLocalDateTime(params.to));
    const qs = searchParams.toString();

    return apiClient.get(qs ? `${API_ENDPOINTS.PAYROLLS.BASE}?${qs}` : API_ENDPOINTS.PAYROLLS.BASE);
  },

  async getById(id: number): Promise<Payroll> {
    return apiClient.get(API_ENDPOINTS.PAYROLLS.BY_ID(id));
  },

  async getByUser(userId: string): Promise<Payroll[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLLS.BY_USER(userId));
  },

  async getUserHistory(userId: string, params?: Omit<PayrollSearchParams, 'userId'>): Promise<Payroll[]> {
    try {
      const payrolls = await apiClient.get<Payroll[]>(API_ENDPOINTS.PAYROLLS.BY_USER(userId));
      return filterPayrollHistory(payrolls, params);
    } catch (primaryError) {
      try {
        return await this.getAll({ userId, ...params });
      } catch {
        throw primaryError;
      }
    }
  },

  async getByStatus(status: string): Promise<Payroll[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLLS.BY_STATUS(status));
  },

  async create(data: PayrollRequest): Promise<Payroll> {
    return apiClient.post(API_ENDPOINTS.PAYROLLS.BASE, normalizePayrollRequest(data));
  },

  async update(id: number, data: PayrollRequest): Promise<Payroll> {
    return apiClient.put(API_ENDPOINTS.PAYROLLS.BY_ID(id), normalizePayrollRequest(data));
  },

  async approve(id: number, adminId?: string): Promise<Payroll> {
    return apiClient.patch(
      API_ENDPOINTS.PAYROLLS.APPROVE(id),
      adminId ? { adminId } : undefined
    );
  },

  async accept(id: number): Promise<Payroll> {
    return apiClient.patch(API_ENDPOINTS.PAYROLLS.ACCEPT(id));
  },

  async reject(id: number, reason?: string): Promise<Payroll> {
    return apiClient.patch(API_ENDPOINTS.PAYROLLS.REJECT(id), reason ? { reason } : undefined);
  },

  async pay(id: number, paymentMethod = 'SANDBOX'): Promise<Payroll> {
    return apiClient.patch(API_ENDPOINTS.PAYROLLS.PAY(id), { paymentMethod });
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.PAYROLLS.BY_ID(id));
  },
};

// WageConfig operations
export const wageConfigService = {
  async getAll(): Promise<WageConfig[]> {
    return apiClient.get(API_ENDPOINTS.WAGE_CONFIGS.BASE);
  },

  async getById(id: number): Promise<WageConfig> {
    return apiClient.get(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(id));
  },

  async getByRole(role: string): Promise<WageConfig[]> {
    return apiClient.get(API_ENDPOINTS.WAGE_CONFIGS.BY_ROLE(role));
  },

  async getByRoleActive(role: string): Promise<WageConfig> {
    return apiClient.get(API_ENDPOINTS.WAGE_CONFIGS.BY_ROLE_ACTIVE(role));
  },

  async create(data: WageConfigRequest): Promise<WageConfig> {
    return apiClient.post(API_ENDPOINTS.WAGE_CONFIGS.BASE, data);
  },

  async update(id: number, data: WageConfigRequest): Promise<WageConfig> {
    return apiClient.put(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(id), data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(id));
  },

};

export const walletService = {
  async getWallet(userId: string): Promise<Wallet> {
    return apiClient.get(API_ENDPOINTS.WALLETS.BY_USER(userId));
  },

  async getTransactions(userId: string): Promise<PaymentTransaction[]> {
    return apiClient.get(API_ENDPOINTS.WALLETS.TRANSACTIONS(userId));
  },

  async topUpSandbox(userId: string, data: WalletTopUpRequest): Promise<PaymentTransaction> {
    return apiClient.post(API_ENDPOINTS.WALLETS.TOP_UP_SANDBOX(userId), data);
  },

  async settleSandbox(transactionId: string, status = 'PAID'): Promise<PaymentTransaction> {
    return apiClient.post(API_ENDPOINTS.WALLETS.SETTLE_SANDBOX(transactionId), { status });
  },
};
