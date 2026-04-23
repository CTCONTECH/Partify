// Adapter Factory
// Returns correct adapter based on config

import { isLiveMode } from '../config';
import {
  PartsRepository,
  SupplierRepository,
  InventoryRepository,
  CouponRepository,
  VehicleRepository,
  EventRepository,
  SettlementRepository,
} from '../repositories/types';

import {
  MockPartsRepository,
  MockSupplierRepository,
  MockInventoryRepository,
  MockCouponRepository,
  MockVehicleRepository,
  MockEventRepository,
  MockSettlementRepository,
} from './mock';

import {
  SupabasePartsRepository,
  SupabaseSupplierRepository,
  SupabaseInventoryRepository,
  SupabaseCouponRepository,
  SupabaseVehicleRepository,
  SupabaseEventRepository,
  SupabaseSettlementRepository,
} from './supabase';

// Singleton instances
let partsRepo: PartsRepository;
let supplierRepo: SupplierRepository;
let inventoryRepo: InventoryRepository;
let couponRepo: CouponRepository;
let vehicleRepo: VehicleRepository;
let eventRepo: EventRepository;
let settlementRepo: SettlementRepository;

export function getPartsRepository(): PartsRepository {
  if (!partsRepo) {
    partsRepo = isLiveMode()
      ? new SupabasePartsRepository()
      : new MockPartsRepository();
  }
  return partsRepo;
}

export function getSupplierRepository(): SupplierRepository {
  if (!supplierRepo) {
    supplierRepo = isLiveMode()
      ? new SupabaseSupplierRepository()
      : new MockSupplierRepository();
  }
  return supplierRepo;
}

export function getInventoryRepository(): InventoryRepository {
  if (!inventoryRepo) {
    inventoryRepo = isLiveMode()
      ? new SupabaseInventoryRepository()
      : new MockInventoryRepository();
  }
  return inventoryRepo;
}

export function getCouponRepository(): CouponRepository {
  if (!couponRepo) {
    couponRepo = isLiveMode()
      ? new SupabaseCouponRepository()
      : new MockCouponRepository();
  }
  return couponRepo;
}

export function getVehicleRepository(): VehicleRepository {
  if (!vehicleRepo) {
    vehicleRepo = isLiveMode()
      ? new SupabaseVehicleRepository()
      : new MockVehicleRepository();
  }
  return vehicleRepo;
}

export function getEventRepository(): EventRepository {
  if (!eventRepo) {
    eventRepo = isLiveMode()
      ? new SupabaseEventRepository()
      : new MockEventRepository();
  }
  return eventRepo;
}

export function getSettlementRepository(): SettlementRepository {
  if (!settlementRepo) {
    settlementRepo = isLiveMode()
      ? new SupabaseSettlementRepository()
      : new MockSettlementRepository();
  }
  return settlementRepo;
}
