// Browser code talks only to this Next.js API gateway. The gateway route
// owns the real microservice base URLs on the server side.
export const API_CONFIG = {
  GATEWAY_BASE: '/api/gateway',
};

const gatewayUrl = (service: string, path: string): string =>
  `${API_CONFIG.GATEWAY_BASE}/${service}${path}`;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints (Identity Service)
  AUTH: {
    LOGIN: gatewayUrl('identity', '/api/auth/login'),
    REGISTER: gatewayUrl('identity', '/api/auth/register'),
    GOOGLE: gatewayUrl('identity', '/api/auth/google'),
    VALIDATE: gatewayUrl('identity', '/api/auth/validate'),
    REFRESH: gatewayUrl('identity', '/api/auth/refresh'),
    LOGOUT: gatewayUrl('identity', '/api/auth/logout'),
    LINK_GOOGLE: gatewayUrl('identity', '/api/auth/link-google'),
    SET_PASSWORD: gatewayUrl('identity', '/api/auth/set-password'),
    HEALTH: gatewayUrl('identity', '/api/auth/health'),
  },

  // Identity admin endpoints
  IDENTITY: {
    USERS: gatewayUrl('identity', '/api/admin/users'),
    USER_BY_ID: (id: string) => gatewayUrl('identity', `/api/admin/users/${id}`),
    ASSIGN_MANDOR: (buruhId: string) =>
      gatewayUrl('identity', `/api/admin/users/${buruhId}/assign-mandor`),
    UNASSIGN_MANDOR: (buruhId: string) =>
      gatewayUrl('identity', `/api/admin/users/${buruhId}/unassign-mandor`),
    INTERNAL_USER_BY_ID: (id: string) =>
      gatewayUrl('identity', `/api/internal/users/${id}`),
  },
  
  // Plantation endpoints
  PLANTATIONS: {
    BASE: gatewayUrl('plantation', '/api/plantations'),
    BY_ID: (id: number | string) => gatewayUrl('plantation', `/api/plantations/${id}`),
    BY_OWNER: (ownerId: number | string) =>
      gatewayUrl('plantation', `/api/plantations/owner/${ownerId}`),
    ASSIGN_MANDOR: (id: number | string) =>
      gatewayUrl('plantation', `/api/plantations/${id}/mandor`),
    TRANSFER_MANDOR: gatewayUrl('plantation', '/api/plantations/transfer-mandor'),
    HEALTH: gatewayUrl('plantation', '/actuator/health'),
  },
  
  // Harvest endpoints
  HARVESTS: {
    BASE: gatewayUrl('harvest', '/harvests'),
    MY: gatewayUrl('harvest', '/harvests/my'),
    BY_ID: (id: number | string) => gatewayUrl('harvest', `/harvests/${id}`),
    BY_PLANTATION: (plantationId: number | string) =>
      `${gatewayUrl('harvest', '/harvests')}?plantationId=${plantationId}`,
    UPDATE_STATUS: gatewayUrl('harvest', '/harvests/update'),
    HEALTH: gatewayUrl('harvest', '/actuator/health'),
  },
  
  // Shipment endpoints
  SHIPMENTS: {
    BASE: gatewayUrl('shipment', '/api/shipments'),
    BY_ID: (id: number | string) => gatewayUrl('shipment', `/api/shipments/${id}`),
    BY_HARVEST: (harvestId: number | string) =>
      `${gatewayUrl('shipment', '/api/shipments')}?harvestId=${harvestId}`,
    BY_STATUS: (status: string) =>
      `${gatewayUrl('shipment', '/api/shipments')}?status=${status}`,
    UPDATE_STATUS: (id: number | string) =>
      gatewayUrl('shipment', `/api/shipments/${id}/status`),
    ADMIN_APPROVAL: (id: number | string) =>
      gatewayUrl('shipment', `/api/shipments/${id}/admin-approval`),
    HEALTH: gatewayUrl('shipment', '/api/shipments/health'),
  },

  // Payroll endpoints
  PAYROLL: {
    EMPLOYEES: gatewayUrl('payroll', '/api/employees'),
    EMPLOYEE_BY_ID: (id: number | string) => gatewayUrl('payroll', `/api/employees/${id}`),
    EMPLOYEE_BY_CODE: (employeeCode: string) =>
      gatewayUrl('payroll', `/api/employees/code/${employeeCode}`),
    EMPLOYEES_BY_PLANTATION: (plantationId: number | string) =>
      gatewayUrl('payroll', `/api/employees/plantation/${plantationId}`),
    EMPLOYEES_BY_STATUS: (status: string) =>
      gatewayUrl('payroll', `/api/employees/status/${status}`),
    PAYROLLS: gatewayUrl('payroll', '/api/payrolls'),
    PAYROLL_BY_ID: (id: number | string) => gatewayUrl('payroll', `/api/payrolls/${id}`),
    PAYROLLS_BY_EMPLOYEE: (employeeId: number | string) =>
      gatewayUrl('payroll', `/api/payrolls/employee/${employeeId}`),
    PAYROLLS_BY_STATUS: (status: string) =>
      gatewayUrl('payroll', `/api/payrolls/status/${status}`),
    APPROVE_PAYROLL: (id: number | string) =>
      gatewayUrl('payroll', `/api/payrolls/${id}/approve`),
    PAY_PAYROLL: (id: number | string) =>
      gatewayUrl('payroll', `/api/payrolls/${id}/pay`),
    HEALTH: gatewayUrl('payroll', '/actuator/health'),
  },

  EMPLOYEES: {
    BASE: gatewayUrl('payroll', '/api/employees'),
    BY_ID: (id: number | string) => gatewayUrl('payroll', `/api/employees/${id}`),
    BY_CODE: (employeeCode: string) =>
      gatewayUrl('payroll', `/api/employees/code/${employeeCode}`),
    BY_PLANTATION: (plantationId: number | string) =>
      gatewayUrl('payroll', `/api/employees/plantation/${plantationId}`),
    BY_STATUS: (status: string) => gatewayUrl('payroll', `/api/employees/status/${status}`),
  },

  PAYROLLS: {
    BASE: gatewayUrl('payroll', '/api/payrolls'),
    BY_ID: (id: number | string) => gatewayUrl('payroll', `/api/payrolls/${id}`),
    BY_EMPLOYEE: (employeeId: number | string) =>
      gatewayUrl('payroll', `/api/payrolls/employee/${employeeId}`),
    BY_STATUS: (status: string) => gatewayUrl('payroll', `/api/payrolls/status/${status}`),
    APPROVE: (id: number | string) => gatewayUrl('payroll', `/api/payrolls/${id}/approve`),
    ACCEPT: (id: number | string) => gatewayUrl('payroll', `/api/payrolls/${id}/accept`),
    REJECT: (id: number | string) => gatewayUrl('payroll', `/api/payrolls/${id}/reject`),
    PAY: (id: number | string) => gatewayUrl('payroll', `/api/payrolls/${id}/pay`),
  },

  WAGE_CONFIGS: {
    BASE: gatewayUrl('payroll', '/api/wage-configs'),
    BY_ID: (id: number | string) => gatewayUrl('payroll', `/api/wage-configs/${id}`),
    BY_ROLE: (role: string) => gatewayUrl('payroll', `/api/wage-configs/role/${role}`),
    BY_ROLE_ACTIVE: (role: string) =>
      gatewayUrl('payroll', `/api/wage-configs/role/${role}/active`),
  },
};
