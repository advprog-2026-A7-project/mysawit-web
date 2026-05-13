// User & Auth Types
export type UserRole = 'BURUH' | 'MANDOR' | 'SUPIR' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: 'BURUH' | 'MANDOR' | 'SUPIR';
  certificationNumber?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  type: string;
  id: string;
  username: string;
  email: string;
  role: UserRole;
  googleLinked: boolean;
  hasPassword: boolean;
}

export interface GoogleAuthRequest {
  idToken: string;
  username?: string;
  role?: 'BURUH' | 'MANDOR' | 'SUPIR';
  certificationNumber?: string;
}

export interface SetPasswordRequest {
  password: string;
}

export interface AssignMandorRequest {
  mandorId: string;
}

export interface UserDetailResponse {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  googleLinked: boolean;
  hasPassword: boolean;
  createdAt: string;
  mandorId: string | null;
  certificationNumber: string | null;
  kebunId: string | null;
}

export interface UserSearchParams {
  name?: string;
  email?: string;
  role?: UserRole;
}

export interface MessageResponse {
  message: string;
}

// Plantation Types
export interface Plantation {
  id: number;
  name: string;
  location: string;
  area: number; // in hectares
  ownerId: number;
  description?: string;
  plantDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlantationRequest {
  name: string;
  location: string;
  area: number;
  ownerId?: number;
  description?: string;
  plantDate?: string;
}

// Harvest Types
export interface Harvest {
  id: number;
  plantationId: number;
  harvestDate: string;
  weight: number; // in kg
  quality: 'PREMIUM' | 'STANDARD' | 'LOW';
  harvesterId?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HarvestRequest {
  plantationId: number;
  harvestDate: string;
  weight: number;
  quality?: string;
  harvesterId?: number;
  notes?: string;
}

// Shipment Types
export interface Shipment {
  id: number;
  harvestId: number;
  destination: string;
  weight: number; // in kg
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  shipperName?: string;
  vehicleNumber?: string;
  shipmentDate?: string;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentRequest {
  harvestId: number;
  destination: string;
  weight: number;
  status?: string;
  shipperName?: string;
  vehicleNumber?: string;
  shipmentDate?: string;
  deliveryDate?: string;
  notes?: string;
}

// Employee Types
export interface Employee {
  id: number;
  name: string;
  employeeCode: string;
  position: string;
  plantationId?: number;
  phoneNumber?: string;
  address?: string;
  hireDate?: string;
  baseSalary: number;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeRequest {
  name: string;
  employeeCode: string;
  position: string;
  plantationId?: number;
  phoneNumber?: string;
  address?: string;
  hireDate?: string;
  baseSalary: number;
  status?: string;
}

// Payroll Types
export interface Payroll {
  id: number;
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  bonusAmount: number;
  deductionAmount: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'ACCEPTED' | 'REJECTED' | 'PAID' | 'CANCELLED';
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRequest {
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  bonusAmount?: number;
  deductionAmount?: number;
  status?: string;
  paymentMethod?: string;
  notes?: string;
}

// WageConfig Types
export interface WageConfig {
  id: number;
  roleType: string;
  ratePerKg: number;
  effectiveDate: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WageConfigRequest {
  roleType: string;
  ratePerKg: number;
  effectiveDate: string;
  description?: string;
  createdBy?: string;
}

// API Response Types
export interface ApiError {
  error: string;
}

export interface ApiSuccess {
  message: string;
}
