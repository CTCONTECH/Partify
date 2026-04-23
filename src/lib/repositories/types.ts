// Repository Interface Types
// Defines contracts that both mock and Supabase adapters must implement

import { Location, Supplier, Part, InventoryItem, SupplierResult, Coupon, CouponState } from '@/types';

export interface PartsRepository {
  searchParts(query: string): Promise<Part[]>;
  getPartById(id: string): Promise<Part | null>;
  getPartByNumber(partNumber: string): Promise<Part | null>;
}

export interface SupplierRepository {
  getSuppliers(): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | null>;
  findNearestSuppliers(location: Location, partId?: string, maxDistanceKm?: number): Promise<Supplier[]>;
}

export interface InventoryRepository {
  getPartAvailability(partId: string, userLocation?: Location): Promise<SupplierResult[]>;
  getSupplierInventory(supplierId: string): Promise<InventoryItem[]>;
  updateStock(inventoryId: string, newStock: number): Promise<void>;
  updatePrice(inventoryId: string, newPrice: number): Promise<void>;
}

export interface CouponRepository {
  issueCoupon(
    userId: string,
    supplierId: string,
    partId: string,
    price: number,
    userLocation?: Location
  ): Promise<Coupon>;
  getCoupon(couponId: string): Promise<Coupon | null>;
  getCouponByCode(code: string): Promise<Coupon | null>;
  getUserCoupons(userId: string): Promise<Coupon[]>;
  updateCouponState(couponId: string, newState: CouponState, actorId?: string): Promise<void>;
  redeemCoupon(couponId: string, redeemedBy: string, orderAmount: number): Promise<void>;
}

export interface VehicleRepository {
  getUserVehicles(userId: string): Promise<any[]>;
  addVehicle(userId: string, vehicle: {
    make: string;
    model: string;
    year: number;
    engine: string;
  }): Promise<any>;
  setPrimaryVehicle(vehicleId: string): Promise<void>;
}

export interface EventRepository {
  logCouponEvent(
    couponId: string,
    eventType: 'coupon_issued' | 'coupon_viewed' | 'navigation_started' | 'coupon_redeemed' | 'coupon_expired',
    actorId?: string,
    metadata?: any
  ): Promise<void>;
}

export interface SettlementRepository {
  generateMonthlySettlement(supplierId: string, year: number, month: number): Promise<string>;
  getSupplierSettlements(supplierId: string): Promise<any[]>;
  getSettlementDetails(settlementId: string): Promise<any>;
}
