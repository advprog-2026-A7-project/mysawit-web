import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Employee, EmployeeRequest, EntityId, Payroll, PayrollRequest } from '@/types';
import { Employee, EmployeeRequest, Payroll, PayrollRequest, WageConfig, WageConfigRequest } from '@/types';

const toLocalDateTime = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;

const normalizePayrollRequest = (data: PayrollRequest): PayrollRequest => ({
  ...data,
  periodStart: toLocalDateTime(data.periodStart),
  periodEnd: toLocalDateTime(data.periodEnd),
});

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
    return apiClient.post(API_ENDPOINTS.PAYROLLS.BASE, normalizePayrollRequest(data));
  },

  async update(id: number, data: PayrollRequest): Promise<Payroll> {
    return apiClient.put(API_ENDPOINTS.PAYROLLS.BY_ID(id), normalizePayrollRequest(data));
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

  async getEmployeeById(id: EntityId): Promise<Employee> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.EMPLOYEE_BY_ID(id));
  },

  async getEmployeeByCode(employeeCode: string): Promise<Employee> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.EMPLOYEE_BY_CODE(employeeCode));
  },

  async getEmployeesByPlantation(plantationId: EntityId): Promise<Employee[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.EMPLOYEES_BY_PLANTATION(plantationId));
  },

  async getEmployeesByStatus(status: string): Promise<Employee[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.EMPLOYEES_BY_STATUS(status));
  },

  async createEmployee(data: EmployeeRequest): Promise<Employee> {
    return apiClient.post(API_ENDPOINTS.PAYROLL.EMPLOYEES, data);
  },

  async updateEmployee(id: EntityId, data: EmployeeRequest): Promise<Employee> {
    return apiClient.put(API_ENDPOINTS.PAYROLL.EMPLOYEE_BY_ID(id), data);
  },

  async deleteEmployee(id: EntityId): Promise<{ message: string }> {
    return apiClient.delete(API_ENDPOINTS.PAYROLL.EMPLOYEE_BY_ID(id));
  },

  async getPayrolls(): Promise<Payroll[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.PAYROLLS);
  },

  async getPayrollById(id: EntityId): Promise<Payroll> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.PAYROLL_BY_ID(id));
  },

  async getPayrollsByEmployee(employeeId: EntityId): Promise<Payroll[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.PAYROLLS_BY_EMPLOYEE(employeeId));
  },

  async getPayrollsByStatus(status: string): Promise<Payroll[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.PAYROLLS_BY_STATUS(status));
  },

  async createPayroll(data: PayrollRequest): Promise<Payroll> {
    return apiClient.post(API_ENDPOINTS.PAYROLL.PAYROLLS, data);
  async create(data: WageConfigRequest): Promise<WageConfig> {
    return apiClient.post(API_ENDPOINTS.WAGE_CONFIGS.BASE, data);
  },

  async update(id: number, data: WageConfigRequest): Promise<WageConfig> {
    return apiClient.put(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(id), data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(id));
  },

  async updatePayroll(id: EntityId, data: PayrollRequest): Promise<Payroll> {
    return apiClient.put(API_ENDPOINTS.PAYROLL.PAYROLL_BY_ID(id), data);
  },

  async approvePayroll(id: EntityId): Promise<Payroll> {
    return apiClient.patch(API_ENDPOINTS.PAYROLL.APPROVE_PAYROLL(id));
  },

  async payPayroll(id: EntityId, paymentMethod: string): Promise<Payroll> {
    return apiClient.patch(API_ENDPOINTS.PAYROLL.PAY_PAYROLL(id), { paymentMethod });
  },

  async deletePayroll(id: EntityId): Promise<{ message: string }> {
    return apiClient.delete(API_ENDPOINTS.PAYROLL.PAYROLL_BY_ID(id));
  },

  async checkHealth(): Promise<{ status: string; service?: string }> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.HEALTH);
  },
};
