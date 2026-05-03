export interface Location {
  lat: number;
  lon: number;
}

export interface FuelProfile {
  fuelType: string;
  fuelGrade: string;
  consumptionLPer100Km: number;
  pricePerLitre: number;
  region: string;
  priceEffectiveFrom: string;
  source: string;
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
  id?: string;
  partId: string;
  supplierId: string;
  price: number;
  stock: number;
  lastUpdated: string;
  partNumber?: string;
  partName?: string;
  category?: string;
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

// ── Supplier Import Staging Pipeline ────────────────────────────────────────

export type ImportSourceType = 'manual' | 'csv' | 'api' | 'sftp';
export type ImportJobStatus = 'pending' | 'processing' | 'review' | 'approved' | 'rejected' | 'error';
export type ImportRowMatchStatus = 'pending' | 'matched' | 'unmatched' | 'error' | 'skipped';

export interface ImportJob {
  id: string;
  supplierId: string;
  sourceType: ImportSourceType;
  status: ImportJobStatus;
  fileName?: string;
  rowCount: number;
  matchedCount: number;
  unmatchedCount: number;
  errorCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRow {
  id: string;
  jobId: string;
  rowNumber: number;
  rawPartNumber: string;
  normalizedPartNumber: string;
  rawDescription?: string;
  price?: number;
  stock?: number;
  matchStatus: ImportRowMatchStatus;
  matchedPartId?: string;
  matchReason?: string;
  matchConfidence?: number;
  errorReason?: string;
  approvedAt?: string;
  createdAt: string;
}

/** Shape for a single row submitted by the supplier (before DB insertion) */
export interface ImportRowInput {
  rowNumber: number;
  rawPartNumber: string;
  rawDescription?: string;
  price?: number;
  stock?: number;
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
