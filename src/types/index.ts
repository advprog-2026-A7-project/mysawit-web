// User & Auth Types
export type EntityId = string | number;
export type UserRole = 'BURUH' | 'MANDOR' | 'SUPIR' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: UserRole | string;
  createdAt: string;
  updatedAt?: string;
  mandorId?: string;
  certificationNumber?: string;
  kebunId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  certificationNumber?: string;
  mandorId?: string;
  kebunId?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  type: string;
  id: EntityId;
  username: string;
  email: string;
  role: string;
}

export interface AssignMandorRequest {
  mandorId: string;
}

export interface MessageResponse {
  message: string;
}

// Plantation Types
export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Plantation {
  id: EntityId;
  code?: string;
  name: string;
  location: string;
  area: number; // in hectares
  ownerId?: EntityId;
  mandorId?: string;
  description?: string;
  plantDate?: string;
  coordinates?: Coordinate[];
  createdAt: string;
  updatedAt: string;
}

export interface PlantationRequest {
  name: string;
  location: string;
  area: number;
  ownerId?: EntityId;
  description?: string;
  plantDate?: string;
  coordinates: Coordinate[];
}

export interface AssignPlantationMandorRequest {
  mandorId: string;
}

export interface TransferPlantationMandorRequest {
  mandorId: string;
  fromPlantationId: EntityId;
  toPlantationId: EntityId;
}

// Harvest Types
export type HarvestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type HarvestQuality = 'PREMIUM' | 'STANDARD' | 'LOW';

export interface Harvest {
  id: EntityId;
  plantationId: EntityId;
  weight: number; // in kg
  harvestDate?: string;
  quality?: HarvestQuality;
  harvesterId?: EntityId;
  foremanId?: EntityId;
  harvesterName?: string;
  news?: string;
  photos?: string[];
  status?: HarvestStatus;
  rejectionReason?: string;
  statusUpdatedDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HarvestRequest {
  plantationId: EntityId;
  harvestDate?: string;
  weight: number;
  news?: string;
  photos?: string[];
  quality?: HarvestQuality | string;
  harvesterId?: EntityId;
  notes?: string;
}

export interface UpdateHarvestStatusRequest {
  id: EntityId;
  status: HarvestStatus;
  rejectionReason?: string;
}

// Shipment Types
export type ShipmentStatus =
  | 'MEMUAT'
  | 'MENGIRIM'
  | 'TIBA'
  | 'ADMIN_APPROVED'
  | 'PARTIALLY_REJECTED'
  | 'PENDING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export interface ShipmentItem {
  harvestId: EntityId;
  weightKg: number;
}

export interface Shipment {
  id: EntityId;
  mandorUserId?: EntityId;
  supirUserId?: EntityId;
  harvestId?: EntityId;
  destination: string;
  totalKg?: number;
  weight?: number; // in kg, kept for the older dummy contract
  status: ShipmentStatus;
  items?: ShipmentItem[];
  shipperName?: string;
  vehicleNumber?: string;
  shipmentDate?: string;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentRequest {
  supirUserId?: EntityId;
  destination: string;
  items?: ShipmentItem[];
  harvestId?: EntityId;
  weight: number;
  status?: string;
  shipperName?: string;
  vehicleNumber?: string;
  shipmentDate?: string;
  deliveryDate?: string;
  notes?: string;
}

export interface ShipmentStatusRequest {
  status: ShipmentStatus;
}

// Payroll Types
export interface Employee {
  id: EntityId;
  name: string;
  employeeCode: string;
  position: string;
  plantationId?: EntityId;
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
  employeeCode?: string;
  position: string;
  plantationId?: EntityId;
  phoneNumber?: string;
  address?: string;
  hireDate?: string;
  baseSalary: number;
  status?: string;
}

// Payroll Types
export interface Payroll {
  id: EntityId;
  employeeId: EntityId;
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
  employeeId: EntityId;
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
