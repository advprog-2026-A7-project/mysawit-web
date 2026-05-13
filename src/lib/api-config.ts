// API Base URLs for all microservices
export const API_CONFIG = {
  IDENTITY_SERVICE: process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL || 'http://localhost:8081',
  PLANTATION_SERVICE: process.env.NEXT_PUBLIC_PLANTATION_SERVICE_URL || 'http://localhost:8082',
  HARVEST_SERVICE: process.env.NEXT_PUBLIC_HARVEST_SERVICE_URL || 'http://localhost:8083',
  SHIPMENT_SERVICE: process.env.NEXT_PUBLIC_SHIPMENT_SERVICE_URL || 'http://localhost:8084',
  PAYROLL_SERVICE: process.env.NEXT_PUBLIC_PAYROLL_SERVICE_URL || 'http://localhost:8085',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints (Identity Service)
  AUTH: {
    LOGIN: `${API_CONFIG.IDENTITY_SERVICE}/api/auth/login`,
    REGISTER: `${API_CONFIG.IDENTITY_SERVICE}/api/auth/register`,
    HEALTH: `${API_CONFIG.IDENTITY_SERVICE}/api/auth/health`,
  },
  
  // Plantation endpoints
  PLANTATIONS: {
    BASE: `${API_CONFIG.PLANTATION_SERVICE}/api/plantations`,
    BY_ID: (id: number) => `${API_CONFIG.PLANTATION_SERVICE}/api/plantations/${id}`,
    BY_OWNER: (ownerId: number) => `${API_CONFIG.PLANTATION_SERVICE}/api/plantations?ownerId=${ownerId}`,
    HEALTH: `${API_CONFIG.PLANTATION_SERVICE}/api/plantations/health`,
  },
  
  // Harvest endpoints
  HARVESTS: {
    BASE: `${API_CONFIG.HARVEST_SERVICE}/api/harvests`,
    BY_ID: (id: number) => `${API_CONFIG.HARVEST_SERVICE}/api/harvests/${id}`,
    BY_PLANTATION: (plantationId: number) => `${API_CONFIG.HARVEST_SERVICE}/api/harvests?plantationId=${plantationId}`,
    HEALTH: `${API_CONFIG.HARVEST_SERVICE}/api/harvests/health`,
  },
  
  // Shipment endpoints
  SHIPMENTS: {
    BASE: `${API_CONFIG.SHIPMENT_SERVICE}/api/shipments`,
    BY_ID: (id: number) => `${API_CONFIG.SHIPMENT_SERVICE}/api/shipments/${id}`,
    BY_HARVEST: (harvestId: number) => `${API_CONFIG.SHIPMENT_SERVICE}/api/shipments?harvestId=${harvestId}`,
    BY_STATUS: (status: string) => `${API_CONFIG.SHIPMENT_SERVICE}/api/shipments?status=${status}`,
    HEALTH: `${API_CONFIG.SHIPMENT_SERVICE}/api/shipments/health`,
  },

  // Employee endpoints (Payroll Service)
  EMPLOYEES: {
    BASE: `${API_CONFIG.PAYROLL_SERVICE}/api/employees`,
    BY_ID: (id: number) => `${API_CONFIG.PAYROLL_SERVICE}/api/employees/${id}`,
    BY_CODE: (code: string) => `${API_CONFIG.PAYROLL_SERVICE}/api/employees/code/${code}`,
    BY_PLANTATION: (plantationId: number) => `${API_CONFIG.PAYROLL_SERVICE}/api/employees/plantation/${plantationId}`,
    BY_STATUS: (status: string) => `${API_CONFIG.PAYROLL_SERVICE}/api/employees/status/${status}`,
    HEALTH: `${API_CONFIG.PAYROLL_SERVICE}/actuator/health`,
  },

  // Payroll endpoints (Payroll Service)
  PAYROLLS: {
    BASE: `${API_CONFIG.PAYROLL_SERVICE}/api/payrolls`,
    BY_ID: (id: number) => `${API_CONFIG.PAYROLL_SERVICE}/api/payrolls/${id}`,
    BY_EMPLOYEE: (employeeId: number) => `${API_CONFIG.PAYROLL_SERVICE}/api/payrolls/employee/${employeeId}`,
    BY_STATUS: (status: string) => `${API_CONFIG.PAYROLL_SERVICE}/api/payrolls/status/${status}`,
    APPROVE: (id: number) => `${API_CONFIG.PAYROLL_SERVICE}/api/payrolls/${id}/approve`,
    ACCEPT: (id: number) => `${API_CONFIG.PAYROLL_SERVICE}/api/payrolls/${id}/accept`,
    REJECT: (id: number) => `${API_CONFIG.PAYROLL_SERVICE}/api/payrolls/${id}/reject`,
    PAY: (id: number) => `${API_CONFIG.PAYROLL_SERVICE}/api/payrolls/${id}/pay`,
  },

  // WageConfig endpoints (Payroll Service)
  WAGE_CONFIGS: {
    BASE: `${API_CONFIG.PAYROLL_SERVICE}/api/admin/wage-configs`,
    BY_ID: (id: number) => `${API_CONFIG.PAYROLL_SERVICE}/api/admin/wage-configs/${id}`,
    BY_ROLE: (role: string) => `${API_CONFIG.PAYROLL_SERVICE}/api/admin/wage-configs/role/${role}`,
    BY_ROLE_ACTIVE: (role: string) => `${API_CONFIG.PAYROLL_SERVICE}/api/admin/wage-configs/role/${role}/active`,
  },
};
