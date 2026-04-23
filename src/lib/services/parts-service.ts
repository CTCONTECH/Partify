// Parts Service Layer
// Business logic for parts search and availability

import { getPartsRepository, getInventoryRepository } from '../adapters/factory';
import { Location, Part, SupplierResult } from '@/types';

export class PartsService {
  private partsRepo = getPartsRepository();
  private inventoryRepo = getInventoryRepository();

  /**
   * Search for parts by query
   */
  async searchParts(query: string): Promise<Part[]> {
    return this.partsRepo.searchParts(query);
  }

  /**
   * Get part details by ID
   */
  async getPartById(id: string): Promise<Part | null> {
    return this.partsRepo.getPartById(id);
  }

  /**
   * Get part availability across suppliers with pricing
   */
  async getPartAvailability(
    partId: string,
    userLocation?: Location
  ): Promise<SupplierResult[]> {
    return this.inventoryRepo.getPartAvailability(partId, userLocation);
  }

  /**
   * Get part details with stats
   */
  async getPartWithStats(partId: string): Promise<{
    part: Part | null;
    supplierCount: number;
    priceRange: { min: number; max: number };
  }> {
    const part = await this.getPartById(partId);
    if (!part) {
      return {
        part: null,
        supplierCount: 0,
        priceRange: { min: 0, max: 0 },
      };
    }

    const availability = await this.inventoryRepo.getPartAvailability(partId);
    const prices = availability.map(a => a.itemPrice);

    return {
      part,
      supplierCount: availability.length,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
    };
  }
}

// Singleton instance
export const partsService = new PartsService();
