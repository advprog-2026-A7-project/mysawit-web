import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Employee, EmployeeRequest, Payroll, PayrollRequest } from '@/types';

export const payrollService = {
  async getEmployees(): Promise<Employee[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.EMPLOYEES);
  },

  async createEmployee(data: EmployeeRequest): Promise<Employee> {
    return apiClient.post(API_ENDPOINTS.PAYROLL.EMPLOYEES, data);
  },

  async getPayrolls(): Promise<Payroll[]> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.PAYROLLS);
  },

  async createPayroll(data: PayrollRequest): Promise<Payroll> {
    return apiClient.post(API_ENDPOINTS.PAYROLL.PAYROLLS, data);
  },
};
