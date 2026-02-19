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
  username: string;
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
  id: number;
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

// API Response Types
export interface ApiError {
  error: string;
}

export interface ApiSuccess {
  message: string;
}
