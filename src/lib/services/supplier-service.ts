// Supplier Service Layer
// Business logic for supplier operations

import { getSupplierRepository, getInventoryRepository } from '../adapters/factory';
import { Location, Supplier, InventoryItem } from '@/types';

export class SupplierService {
  private supplierRepo = getSupplierRepository();
  private inventoryRepo = getInventoryRepository();

  /**
   * Get all active suppliers
   */
  async getSuppliers(): Promise<Supplier[]> {
    return this.supplierRepo.getSuppliers();
  }

  /**
   * Get supplier details
   */
  async getSupplierById(id: string): Promise<Supplier | null> {
    return this.supplierRepo.getSupplierById(id);
  }

  /**
   * Find nearest suppliers to user location
   */
  async findNearestSuppliers(
    location: Location,
    partId?: string,
    maxDistanceKm?: number
  ): Promise<Supplier[]> {
    return this.supplierRepo.findNearestSuppliers(
      location,
      partId,
      maxDistanceKm
    );
  }

  /**
   * Get supplier inventory
   */
  async getSupplierInventory(supplierId: string): Promise<InventoryItem[]> {
    return this.inventoryRepo.getSupplierInventory(supplierId);
  }

  /**
   * Update stock level (supplier action)
   */
  async updateStock(inventoryId: string, newStock: number): Promise<void> {
    return this.inventoryRepo.updateStock(inventoryId, newStock);
  }

  /**
   * Update price (supplier action)
   */
  async updatePrice(inventoryId: string, newPrice: number): Promise<void> {
    return this.inventoryRepo.updatePrice(inventoryId, newPrice);
  }
}

// Singleton instance
export const supplierService = new SupplierService();
