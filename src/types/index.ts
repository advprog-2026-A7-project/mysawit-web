// User & Auth Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
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
}

export interface AuthResponse {
  token: string;
  type: string;
  id: string;
  username: string;
  email: string;
  role: string;
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

// Payroll Types
export interface Payroll {
  id: number;
  eventId?: string;
  userId: string;
  roleType?: string;
  sourceType?: string;
  sourceReference?: string;
  kilograms?: number;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  bonusAmount: number;
  deductionAmount: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'ACCEPTED' | 'REJECTED' | 'PAID' | 'CANCELLED';
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  walletSettled?: boolean;
  walletTransferAmount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRequest {
  userId: string;
  roleType?: string;
  sourceType?: string;
  sourceReference?: string;
  kilograms?: number;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  bonusAmount?: number;
  deductionAmount?: number;
  status?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface Wallet {
  id: number;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: number;
  transactionId: string;
  userId: string;
  gateway: string;
  status: string;
  amountSawitDollar: number;
  amountIdr: number;
  checkoutUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export interface WalletTopUpRequest {
  amountSawitDollar: number;
  gateway?: string;
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
