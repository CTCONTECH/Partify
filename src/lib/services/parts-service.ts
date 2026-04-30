// Parts Service Layer
// Business logic for parts search and availability

import { getPartsRepository, getInventoryRepository } from '../adapters/factory';
import { createClient } from '@/lib/supabase/client';
import { isLiveMode } from '@/lib/config';
import { VehicleOption } from '@/lib/vehicle-catalog';
import { FuelProfile, Location, Part, SupplierResult } from '@/types';

export class PartsService {
  private partsRepo = getPartsRepository();
  private inventoryRepo = getInventoryRepository();

  /**
   * Search for parts by query
   */
  async searchParts(query: string): Promise<Part[]> {
    return this.partsRepo.searchParts(query);
  }

  async searchCompatibleParts(
    vehicle: VehicleOption,
    query = ''
  ): Promise<Part[]> {
    if (!isLiveMode()) {
      const parts = await this.searchParts(query);
      return parts;
    }

    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_compatible_parts', {
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      vehicle_year: vehicle.year,
      vehicle_engine: vehicle.engine,
      search_query: query,
      result_limit: 100,
    });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      partNumber: row.part_number,
      partName: row.part_name,
      category: row.category,
      description: row.description || '',
      compatibility: Array.isArray(row.compatibility)
        ? row.compatibility.join(', ')
        : (row.compatibility || ''),
    }));
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
    userLocation?: Location,
    vehicle?: VehicleOption | null
  ): Promise<SupplierResult[]> {
    const fuelProfile = vehicle
      ? await this.getVehicleFuelProfile(vehicle)
      : undefined;

    return this.inventoryRepo.getPartAvailability(partId, userLocation, fuelProfile ?? undefined);
  }

  async getVehicleFuelProfile(vehicle: VehicleOption, region = 'coastal'): Promise<FuelProfile | null> {
    if (!isLiveMode()) {
      return {
        fuelType: 'petrol',
        fuelGrade: '95',
        consumptionLPer100Km: 8.0,
        pricePerLitre: 22.53,
        region,
        priceEffectiveFrom: '2026-04-01',
        source: 'mock',
      };
    }

    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_vehicle_fuel_profile', {
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      vehicle_year: vehicle.year,
      vehicle_engine: vehicle.engine,
      fuel_region: region,
    });

    if (error) {
      console.warn('Vehicle fuel profile unavailable:', error.message);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;

    return {
      fuelType: row.fuel_type,
      fuelGrade: row.fuel_grade,
      consumptionLPer100Km: Number(row.consumption_l_per_100km || 8.0),
      pricePerLitre: Number(row.price_per_litre || 22.53),
      region: row.region || region,
      priceEffectiveFrom: row.price_effective_from,
      source: row.source,
    };
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
