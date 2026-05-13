describe('api-config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('uses fallback URLs when env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_PLANTATION_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_HARVEST_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_SHIPMENT_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_PAYROLL_SERVICE_URL;

    const { API_CONFIG, API_ENDPOINTS } = require('./api-config');

    expect(API_CONFIG.IDENTITY_SERVICE).toBe('http://localhost:8081');
    expect(API_CONFIG.PLANTATION_SERVICE).toBe('http://localhost:8082');
    expect(API_CONFIG.HARVEST_SERVICE).toBe('http://localhost:8083');
    expect(API_CONFIG.SHIPMENT_SERVICE).toBe('http://localhost:8084');
    expect(API_CONFIG.PAYROLL_SERVICE).toBe('http://localhost:8085');

    expect(API_ENDPOINTS.AUTH.LOGIN).toBe('http://localhost:8081/api/auth/login');
    expect(API_ENDPOINTS.PLANTATIONS.BY_ID(12)).toBe('http://localhost:8082/api/plantations/12');
    expect(API_ENDPOINTS.PLANTATIONS.BY_OWNER(7)).toBe('http://localhost:8082/api/plantations?ownerId=7');
    expect(API_ENDPOINTS.HARVESTS.BY_ID(3)).toBe('http://localhost:8083/api/harvests/3');
    expect(API_ENDPOINTS.HARVESTS.BY_PLANTATION(9)).toBe('http://localhost:8083/api/harvests?plantationId=9');
    expect(API_ENDPOINTS.SHIPMENTS.BY_ID(5)).toBe('http://localhost:8084/api/shipments/5');
    expect(API_ENDPOINTS.SHIPMENTS.BY_HARVEST(6)).toBe('http://localhost:8084/api/shipments?harvestId=6');
    expect(API_ENDPOINTS.SHIPMENTS.BY_STATUS('PENDING')).toBe('http://localhost:8084/api/shipments?status=PENDING');
  });

  it('uses environment-provided URLs', () => {
    process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL = 'https://identity.example.com';
    process.env.NEXT_PUBLIC_PLANTATION_SERVICE_URL = 'https://plantation.example.com';
    process.env.NEXT_PUBLIC_HARVEST_SERVICE_URL = 'https://harvest.example.com';
    process.env.NEXT_PUBLIC_SHIPMENT_SERVICE_URL = 'https://shipment.example.com';
    process.env.NEXT_PUBLIC_PAYROLL_SERVICE_URL = 'https://payroll.example.com';

    const { API_CONFIG, API_ENDPOINTS } = require('./api-config');

    expect(API_CONFIG.IDENTITY_SERVICE).toBe('https://identity.example.com');
    expect(API_CONFIG.PLANTATION_SERVICE).toBe('https://plantation.example.com');
    expect(API_CONFIG.HARVEST_SERVICE).toBe('https://harvest.example.com');
    expect(API_CONFIG.SHIPMENT_SERVICE).toBe('https://shipment.example.com');
    expect(API_CONFIG.PAYROLL_SERVICE).toBe('https://payroll.example.com');

    expect(API_ENDPOINTS.AUTH.REGISTER).toBe('https://identity.example.com/api/auth/register');
    expect(API_ENDPOINTS.PLANTATIONS.BASE).toBe('https://plantation.example.com/api/plantations');
    expect(API_ENDPOINTS.HARVESTS.BASE).toBe('https://harvest.example.com/api/harvests');
    expect(API_ENDPOINTS.SHIPMENTS.BASE).toBe('https://shipment.example.com/api/shipments');
  });
});
