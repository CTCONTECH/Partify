export interface Location {
  lat: number;
  lon: number;
}

export interface Supplier {
  id: string;
  name: string;
  location: string;
  address: string;
  coordinates: Location;
  distance?: number;
  rating: number;
  totalParts: number;
}

export interface Part {
  id: string;
  partNumber: string;
  partName: string;
  category: string;
  compatibility: string;
  description: string;
}

export interface InventoryItem {
  partId: string;
  supplierId: string;
  price: number;
  stock: number;
  lastUpdated: string;
}

export interface SupplierResult {
  id: string;
  name: string;
  location: string;
  address: string;
  coordinates: Location;
  distance: number;
  itemPrice: number;
  fuelCost: number;
  totalCost: number;
  stockQty: number;
  partNumber: string;
  partName: string;
  isBestPrice?: boolean;
  isClosest?: boolean;
  isBestTotal?: boolean;
}

export type CouponState = 'issued' | 'opened' | 'navigation_started' | 'redeemed' | 'expired' | 'cancelled';

export interface Coupon {
  id: string;
  code: string;
  userId: string;
  supplierId: string;
  partId: string;
  originalPrice: number;
  discountAmount: number;
  discountPercent: number;
  finalPrice: number;
  state: CouponState;
  expiresAt: string;
  createdAt: string;
  redeemedAt?: string;
  cancelledAt?: string;
}

export interface RedemptionEvent {
  id: string;
  couponId: string;
  supplierId: string;
  redeemedBy: string;
  orderAmount: number;
  discountAmount: number;
  timestamp: string;
  metadata?: any;
}

export interface SupplierStatement {
  supplierId: string;
  month: string;
  totalRedemptions: number;
  grossTrackedValue: number;
  totalDiscount: number;
  commissionRate: number;
  commissionOwed: number;
  redemptions: RedemptionEvent[];
}
