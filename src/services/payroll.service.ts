import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Employee, EmployeeRequest, Payroll, PayrollRequest, WageConfig, WageConfigRequest } from '@/types';

// Employee operations
export const employeeService = {
  async getAll(): Promise<Employee[]> {
    return apiClient.get(API_ENDPOINTS.EMPLOYEES.BASE);
  },

  async getById(id: number): Promise<Employee> {
    return apiClient.get(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
  },

  async getByCode(code: string): Promise<Employee> {
    return apiClient.get(API_ENDPOINTS.EMPLOYEES.BY_CODE(code));
  },

  async getByPlantation(plantationId: number): Promise<Employee[]> {
    return apiClient.get(API_ENDPOINTS.EMPLOYEES.BY_PLANTATION(plantationId));
  },

  async getByStatus(status: string): Promise<Employee[]> {
    return apiClient.get(API_ENDPOINTS.EMPLOYEES.BY_STATUS(status));
  },

  async create(data: EmployeeRequest): Promise<Employee> {
    return apiClient.post(API_ENDPOINTS.EMPLOYEES.BASE, data);
  },

  async update(id: number, data: EmployeeRequest): Promise<Employee> {
    return apiClient.put(API_ENDPOINTS.EMPLOYEES.BY_ID(id), data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
  },
};

// Payroll operations
export const payrollService = {
  async getAll(): Promise<Payroll[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLLS.BASE);
  },

  async getById(id: number): Promise<Payroll> {
    return apiClient.get(API_ENDPOINTS.PAYROLLS.BY_ID(id));
  },

  async getByEmployee(employeeId: number): Promise<Payroll[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLLS.BY_EMPLOYEE(employeeId));
  },

  async getByStatus(status: string): Promise<Payroll[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLLS.BY_STATUS(status));
  },

  async create(data: PayrollRequest): Promise<Payroll> {
    return apiClient.post(API_ENDPOINTS.PAYROLLS.BASE, data);
  },

  async update(id: number, data: PayrollRequest): Promise<Payroll> {
    return apiClient.put(API_ENDPOINTS.PAYROLLS.BY_ID(id), data);
  },

  async approve(id: number): Promise<Payroll> {
    return apiClient.patch(API_ENDPOINTS.PAYROLLS.APPROVE(id));
  },

  async accept(id: number): Promise<Payroll> {
    return apiClient.patch(API_ENDPOINTS.PAYROLLS.ACCEPT(id));
  },

  async reject(id: number, reason?: string): Promise<Payroll> {
    return apiClient.patch(API_ENDPOINTS.PAYROLLS.REJECT(id), reason ? { reason } : undefined);
  },

  async pay(id: number, paymentMethod = 'BANK_TRANSFER'): Promise<Payroll> {
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
