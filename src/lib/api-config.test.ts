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
});
