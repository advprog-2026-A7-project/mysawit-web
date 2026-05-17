import { API_CONFIG, API_ENDPOINTS } from './api-config';

describe('api-config', () => {
  it('uses the frontend API gateway for browser endpoints', () => {
    expect(API_CONFIG.GATEWAY_BASE).toBe('/api/gateway');
    expect(API_ENDPOINTS.AUTH.LOGIN).toBe('/api/gateway/identity/api/auth/login');
    expect(API_ENDPOINTS.PLANTATIONS.BY_ID(12)).toBe('/api/gateway/plantation/api/plantations/12');
    expect(API_ENDPOINTS.PLANTATIONS.BY_OWNER(7)).toBe('/api/gateway/plantation/api/plantations/owner/7');
    expect(API_ENDPOINTS.PLANTATIONS.ASSIGN_MANDOR(7)).toBe('/api/gateway/plantation/api/plantations/7/mandor');
    expect(API_ENDPOINTS.PLANTATIONS.TRANSFER_MANDOR).toBe('/api/gateway/plantation/api/plantations/transfer-mandor');
    expect(API_ENDPOINTS.HARVESTS.BY_ID(3)).toBe('/api/gateway/harvest/harvests/3');
    expect(API_ENDPOINTS.HARVESTS.BY_PLANTATION(9)).toBe('/api/gateway/harvest/harvests?plantationId=9');
    expect(API_ENDPOINTS.SHIPMENTS.BY_ID(5)).toBe('/api/gateway/shipment/api/shipments/5');
    expect(API_ENDPOINTS.SHIPMENTS.BY_HARVEST(6)).toBe('/api/gateway/shipment/api/shipments?harvestId=6');
    expect(API_ENDPOINTS.SHIPMENTS.BY_STATUS('MEMUAT')).toBe('/api/gateway/shipment/api/shipments?status=MEMUAT');
    expect(API_ENDPOINTS.SHIPMENTS.AVAILABLE_SUPIRS).toBe('/api/gateway/shipment/api/shipments/available-supirs');
    expect(API_ENDPOINTS.SHIPMENTS.MANDOR_APPROVAL(5)).toBe('/api/gateway/shipment/api/shipments/5/mandor-approval');
    expect(API_ENDPOINTS.SHIPMENTS.ADMIN_APPROVAL(5)).toBe('/api/gateway/shipment/api/shipments/5/admin-approval');
  });

  it('keeps endpoint URLs stable for gateway-backed services', () => {
    expect(API_ENDPOINTS.AUTH.REGISTER).toBe('/api/gateway/identity/api/auth/register');
    expect(API_ENDPOINTS.PLANTATIONS.BASE).toBe('/api/gateway/plantation/api/plantations');
    expect(API_ENDPOINTS.HARVESTS.BASE).toBe('/api/gateway/harvest/harvests');
    expect(API_ENDPOINTS.SHIPMENTS.BASE).toBe('/api/gateway/shipment/api/shipments');
    expect(API_ENDPOINTS.EMPLOYEES.BASE).toBe('/api/gateway/payroll/api/employees');
    expect(API_ENDPOINTS.PAYROLLS.BASE).toBe('/api/gateway/payroll/api/payrolls');
    expect(API_ENDPOINTS.WAGE_CONFIGS.BASE).toBe('/api/gateway/payroll/api/wage-configs');
  });

  it('builds identity admin endpoints', () => {
    expect(API_ENDPOINTS.IDENTITY.USER_BY_ID('user-1')).toBe('/api/gateway/identity/api/admin/users/user-1');
    expect(API_ENDPOINTS.IDENTITY.ASSIGN_MANDOR('b-1')).toBe('/api/gateway/identity/api/admin/users/b-1/assign-mandor');
    expect(API_ENDPOINTS.IDENTITY.UNASSIGN_MANDOR('b-1')).toBe('/api/gateway/identity/api/admin/users/b-1/unassign-mandor');
    expect(API_ENDPOINTS.IDENTITY.INTERNAL_USER_BY_ID('user-1')).toBe('/api/gateway/identity/api/internal/users/user-1');
  });

  it('builds shipment endpoints', () => {
    expect(API_ENDPOINTS.SHIPMENTS.UPDATE_STATUS('s-1')).toBe('/api/gateway/shipment/api/shipments/s-1/status');
    expect(API_ENDPOINTS.SHIPMENTS.ADMIN_APPROVAL('s-1')).toBe('/api/gateway/shipment/api/shipments/s-1/admin-approval');
  });

  it('builds payroll service endpoints', () => {
    expect(API_ENDPOINTS.PAYROLL.EMPLOYEE_BY_ID(1)).toBe('/api/gateway/payroll/api/employees/1');
    expect(API_ENDPOINTS.PAYROLL.EMPLOYEE_BY_CODE('EMP-1')).toBe('/api/gateway/payroll/api/employees/code/EMP-1');
    expect(API_ENDPOINTS.PAYROLL.EMPLOYEES_BY_PLANTATION(2)).toBe('/api/gateway/payroll/api/employees/plantation/2');
    expect(API_ENDPOINTS.PAYROLL.EMPLOYEES_BY_STATUS('ACTIVE')).toBe('/api/gateway/payroll/api/employees/status/ACTIVE');
    expect(API_ENDPOINTS.PAYROLL.PAYROLL_BY_ID(3)).toBe('/api/gateway/payroll/api/payrolls/3');
    expect(API_ENDPOINTS.PAYROLL.PAYROLLS_BY_EMPLOYEE(4)).toBe('/api/gateway/payroll/api/payrolls/employee/4');
    expect(API_ENDPOINTS.PAYROLL.PAYROLLS_BY_STATUS('PENDING')).toBe('/api/gateway/payroll/api/payrolls/status/PENDING');
    expect(API_ENDPOINTS.PAYROLL.APPROVE_PAYROLL(5)).toBe('/api/gateway/payroll/api/payrolls/5/approve');
    expect(API_ENDPOINTS.PAYROLL.PAY_PAYROLL(5)).toBe('/api/gateway/payroll/api/payrolls/5/pay');
  });

  it('builds nested EMPLOYEES, PAYROLLS, and WAGE_CONFIGS endpoints', () => {
    expect(API_ENDPOINTS.EMPLOYEES.BY_ID(1)).toBe('/api/gateway/payroll/api/employees/1');
    expect(API_ENDPOINTS.EMPLOYEES.BY_CODE('EMP-2')).toBe('/api/gateway/payroll/api/employees/code/EMP-2');
    expect(API_ENDPOINTS.EMPLOYEES.BY_PLANTATION(2)).toBe('/api/gateway/payroll/api/employees/plantation/2');
    expect(API_ENDPOINTS.EMPLOYEES.BY_STATUS('ACTIVE')).toBe('/api/gateway/payroll/api/employees/status/ACTIVE');

    expect(API_ENDPOINTS.PAYROLLS.BY_ID(3)).toBe('/api/gateway/payroll/api/payrolls/3');
    expect(API_ENDPOINTS.PAYROLLS.BY_EMPLOYEE(4)).toBe('/api/gateway/payroll/api/payrolls/employee/4');
    expect(API_ENDPOINTS.PAYROLLS.BY_STATUS('PENDING')).toBe('/api/gateway/payroll/api/payrolls/status/PENDING');
    expect(API_ENDPOINTS.PAYROLLS.APPROVE(5)).toBe('/api/gateway/payroll/api/payrolls/5/approve');
    expect(API_ENDPOINTS.PAYROLLS.ACCEPT(5)).toBe('/api/gateway/payroll/api/payrolls/5/accept');
    expect(API_ENDPOINTS.PAYROLLS.REJECT(5)).toBe('/api/gateway/payroll/api/payrolls/5/reject');
    expect(API_ENDPOINTS.PAYROLLS.PAY(5)).toBe('/api/gateway/payroll/api/payrolls/5/pay');

    expect(API_ENDPOINTS.WAGE_CONFIGS.BY_ID(6)).toBe('/api/gateway/payroll/api/wage-configs/6');
    expect(API_ENDPOINTS.WAGE_CONFIGS.BY_ROLE('BURUH')).toBe('/api/gateway/payroll/api/wage-configs/role/BURUH');
    expect(API_ENDPOINTS.WAGE_CONFIGS.BY_ROLE_ACTIVE('BURUH')).toBe('/api/gateway/payroll/api/wage-configs/role/BURUH/active');
  });
});
