// Adapter Factory
// Returns correct adapter based on config

import { config } from '../config';
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
    partsRepo = config.dataSource === 'live'
      ? new SupabasePartsRepository()
      : new MockPartsRepository();
  }
  return partsRepo;
}

export function getSupplierRepository(): SupplierRepository {
  if (!supplierRepo) {
    supplierRepo = config.dataSource === 'live'
      ? new SupabaseSupplierRepository()
      : new MockSupplierRepository();
  }
  return supplierRepo;
}

export function getInventoryRepository(): InventoryRepository {
  if (!inventoryRepo) {
    inventoryRepo = config.dataSource === 'live'
      ? new SupabaseInventoryRepository()
      : new MockInventoryRepository();
  }
  return inventoryRepo;
}

export function getCouponRepository(): CouponRepository {
  if (!couponRepo) {
    couponRepo = config.dataSource === 'live'
      ? new SupabaseCouponRepository()
      : new MockCouponRepository();
  }
  return couponRepo;
}

export function getVehicleRepository(): VehicleRepository {
  if (!vehicleRepo) {
    vehicleRepo = config.dataSource === 'live'
      ? new SupabaseVehicleRepository()
      : new MockVehicleRepository();
  }
  return vehicleRepo;
}

export function getEventRepository(): EventRepository {
  if (!eventRepo) {
    eventRepo = config.dataSource === 'live'
      ? new SupabaseEventRepository()
      : new MockEventRepository();
  }
  return eventRepo;
}

export function getSettlementRepository(): SettlementRepository {
  if (!settlementRepo) {
    settlementRepo = config.dataSource === 'live'
      ? new SupabaseSettlementRepository()
      : new MockSettlementRepository();
  }
  return settlementRepo;
}
