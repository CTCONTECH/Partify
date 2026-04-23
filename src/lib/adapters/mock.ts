// Mock Data Adapter
// Uses existing mockData.ts - works without Supabase

import {
  PartsRepository,
  SupplierRepository,
  InventoryRepository,
  CouponRepository,
  VehicleRepository,
  EventRepository,
  SettlementRepository,
} from '../repositories/types';
import { mockParts, mockSuppliers, mockInventory } from '@/app/data/mockData';
import { createCoupon, updateCouponState as updateCouponStateUtil } from '../coupon';
import { calculateDistance, calculateFuelCost } from '../geolocation';
import { Location, Supplier, Part, InventoryItem, SupplierResult, Coupon, CouponState } from '@/types';

// In-memory storage for mock mode
const mockCoupons = new Map<string, Coupon>();
const mockVehicles = new Map<string, any[]>();
const mockEvents: any[] = [];

export class MockPartsRepository implements PartsRepository {
  async searchParts(query: string): Promise<Part[]> {
    if (!query.trim()) return mockParts;

    return mockParts.filter(part =>
      part.partName.toLowerCase().includes(query.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(query.toLowerCase()) ||
      part.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getPartById(id: string): Promise<Part | null> {
    return mockParts.find(p => p.id === id) || null;
  }

  async getPartByNumber(partNumber: string): Promise<Part | null> {
    return mockParts.find(p => p.partNumber === partNumber) || null;
  }
}

export class MockSupplierRepository implements SupplierRepository {
  async getSuppliers(): Promise<Supplier[]> {
    return mockSuppliers;
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    return mockSuppliers.find(s => s.id === id) || null;
  }

  async findNearestSuppliers(
    location: Location,
    partId?: string,
    maxDistanceKm: number = 50
  ): Promise<Supplier[]> {
    let suppliers = mockSuppliers;

    // Filter by part availability if partId provided
    if (partId) {
      const supplierIds = mockInventory
        .filter(inv => inv.partId === partId && inv.stock > 0)
        .map(inv => inv.supplierId);
      suppliers = suppliers.filter(s => supplierIds.includes(s.id));
    }

    // Calculate distances and filter by max distance
    const suppliersWithDistance = suppliers
      .map(supplier => ({
        ...supplier,
        distance: calculateDistance(location, supplier.coordinates),
      }))
      .filter(s => s.distance <= maxDistanceKm)
      .sort((a, b) => a.distance - b.distance);

    return suppliersWithDistance;
  }
}

export class MockInventoryRepository implements InventoryRepository {
  async getPartAvailability(partId: string, userLocation?: Location): Promise<SupplierResult[]> {
    const part = mockParts.find(p => p.id === partId);
    if (!part) return [];

    const inventory = mockInventory.filter(inv => inv.partId === partId && inv.stock > 0);

    const results = inventory.map(inv => {
      const supplier = mockSuppliers.find(s => s.id === inv.supplierId);
      if (!supplier) return null;

      const distance = userLocation
        ? calculateDistance(userLocation, supplier.coordinates)
        : 5.0;

      const fuelCost = calculateFuelCost(distance);
      const totalCost = inv.price + fuelCost;

      return {
        id: supplier.id,
        name: supplier.name,
        location: supplier.location,
        address: supplier.address,
        coordinates: supplier.coordinates,
        distance,
        itemPrice: inv.price,
        fuelCost,
        totalCost,
        stockQty: inv.stock,
        partNumber: part.partNumber,
        partName: part.partName,
      } as SupplierResult;
    }).filter(Boolean) as SupplierResult[];

    // Add best price/distance/total flags
    if (results.length > 0) {
      const minPrice = Math.min(...results.map(r => r.itemPrice));
      const minDistance = Math.min(...results.map(r => r.distance));
      const minTotal = Math.min(...results.map(r => r.totalCost));

      results.forEach(result => {
        result.isBestPrice = result.itemPrice === minPrice;
        result.isClosest = result.distance === minDistance;
        result.isBestTotal = result.totalCost === minTotal;
      });
    }

    return results;
  }

  async getSupplierInventory(supplierId: string): Promise<InventoryItem[]> {
    return mockInventory.filter(inv => inv.supplierId === supplierId);
  }

  async updateStock(inventoryId: string, newStock: number): Promise<void> {
    const item = mockInventory.find(inv => inv.partId === inventoryId);
    if (item) {
      item.stock = newStock;
      item.lastUpdated = new Date().toISOString().split('T')[0];
    }
  }

  async updatePrice(inventoryId: string, newPrice: number): Promise<void> {
    const item = mockInventory.find(inv => inv.partId === inventoryId);
    if (item) {
      item.price = newPrice;
      item.lastUpdated = new Date().toISOString().split('T')[0];
    }
  }
}

export class MockCouponRepository implements CouponRepository {
  async issueCoupon(
    userId: string,
    supplierId: string,
    partId: string,
    price: number,
    userLocation?: Location
  ): Promise<Coupon> {
    const coupon = createCoupon(userId, supplierId, partId, price, 5);
    mockCoupons.set(coupon.id, coupon);

    // Store in localStorage for persistence across page reloads
    if (typeof window !== 'undefined') {
      localStorage.setItem(`coupon_${supplierId}_${partId}`, JSON.stringify(coupon));
    }

    return coupon;
  }

  async getCoupon(couponId: string): Promise<Coupon | null> {
    return mockCoupons.get(couponId) || null;
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    for (const coupon of mockCoupons.values()) {
      if (coupon.code === code) return coupon;
    }
    return null;
  }

  async getUserCoupons(userId: string): Promise<Coupon[]> {
    const coupons: Coupon[] = [];
    for (const coupon of mockCoupons.values()) {
      if (coupon.userId === userId) {
        coupons.push(coupon);
      }
    }
    return coupons.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateCouponState(couponId: string, newState: CouponState, actorId?: string): Promise<void> {
    updateCouponStateUtil(couponId, newState);
    const coupon = mockCoupons.get(couponId);
    if (coupon) {
      coupon.state = newState;
      mockCoupons.set(couponId, coupon);
    }
  }

  async redeemCoupon(couponId: string, redeemedBy: string, orderAmount: number): Promise<void> {
    const coupon = mockCoupons.get(couponId);
    if (coupon && coupon.state !== 'redeemed') {
      coupon.state = 'redeemed';
      coupon.redeemedAt = new Date().toISOString();
      mockCoupons.set(couponId, coupon);
      updateCouponStateUtil(couponId, 'redeemed');
    }
  }
}

export class MockVehicleRepository implements VehicleRepository {
  async getUserVehicles(userId: string): Promise<any[]> {
    return mockVehicles.get(userId) || [];
  }

  async addVehicle(userId: string, vehicle: any): Promise<any> {
    const vehicles = mockVehicles.get(userId) || [];
    const newVehicle = {
      id: `v_${Date.now()}`,
      userId,
      ...vehicle,
      createdAt: new Date().toISOString(),
    };
    vehicles.push(newVehicle);
    mockVehicles.set(userId, vehicles);
    return newVehicle;
  }

  async setPrimaryVehicle(vehicleId: string): Promise<void> {
    for (const [userId, vehicles] of mockVehicles.entries()) {
      vehicles.forEach(v => {
        v.isPrimary = v.id === vehicleId;
      });
      mockVehicles.set(userId, vehicles);
    }
  }
}

export class MockEventRepository implements EventRepository {
  async logCouponEvent(
    couponId: string,
    eventType: string,
    actorId?: string,
    metadata?: any
  ): Promise<void> {
    mockEvents.push({
      id: `evt_${Date.now()}`,
      couponId,
      eventType,
      actorId,
      metadata,
      createdAt: new Date().toISOString(),
    });
  }
}

export class MockSettlementRepository implements SettlementRepository {
  async generateMonthlySettlement(supplierId: string, year: number, month: number): Promise<string> {
    // Mock implementation - would calculate from redeemed coupons
    return `settlement_${supplierId}_${year}_${month}`;
  }

  async getSupplierSettlements(supplierId: string): Promise<any[]> {
    return [];
  }

  async getSettlementDetails(settlementId: string): Promise<any> {
    return null;
  }
}
