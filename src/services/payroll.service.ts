import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Employee, EmployeeRequest, EntityId, Payroll, PayrollRequest } from '@/types';

export const payrollService = {
  async getEmployees(): Promise<Employee[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.EMPLOYEES);
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
