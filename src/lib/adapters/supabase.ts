// Supabase Data Adapter
// Uses real Supabase database - requires connection

import { createClient } from '../supabase/client';
import {
  PartsRepository,
  SupplierRepository,
  InventoryRepository,
  CouponRepository,
  VehicleRepository,
  EventRepository,
  SettlementRepository,
} from '../repositories/types';
import { Location, Supplier, Part, InventoryItem, SupplierResult, Coupon, CouponState } from '@/types';

const supabase = createClient();

export class SupabasePartsRepository implements PartsRepository {
  async searchParts(query: string): Promise<Part[]> {
    let queryBuilder = supabase.from('parts').select('*');

    if (query.trim()) {
      queryBuilder = queryBuilder.or(`part_name.ilike.%${query}%,part_number.ilike.%${query}%,category.ilike.%${query}%`);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }

  async getPartById(id: string): Promise<Part | null> {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  async getPartByNumber(partNumber: string): Promise<Part | null> {
    const { data, error} = await supabase
      .from('parts')
      .select('*')
      .eq('part_number', partNumber)
      .single();

    if (error) return null;
    return data;
  }
}

export class SupabaseSupplierRepository implements SupplierRepository {
  async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('active', true);

    if (error) throw error;
    return this.transformSuppliers(data || []);
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return this.transformSupplier(data);
  }

  async findNearestSuppliers(
    location: Location,
    partId?: string,
    maxDistanceKm: number = 50
  ): Promise<Supplier[]> {
    const { data, error } = await supabase.rpc('find_nearest_suppliers', {
      user_lat: location.lat,
      user_lon: location.lon,
      part_id_filter: partId || null,
      max_distance_km: maxDistanceKm,
      result_limit: 10,
    });

    if (error) throw error;
    return data?.map(s => ({
      id: s.supplier_id,
      name: s.business_name,
      location: s.suburb,
      address: s.address,
      coordinates: { lat: s.latitude, lon: s.longitude },
      distance: s.distance_km,
      rating: s.rating,
      totalParts: 0,
    })) || [];
  }

  private transformSupplier(data: any): Supplier {
    return {
      id: data.id,
      name: data.business_name,
      location: data.suburb,
      address: data.address,
      coordinates: this.parseCoordinates(data.coordinates),
      rating: data.rating,
      totalParts: data.total_parts,
    };
  }

  private transformSuppliers(data: any[]): Supplier[] {
    return data.map(d => this.transformSupplier(d));
  }

  private parseCoordinates(geog: any): Location {
    // PostGIS geography parsing - simplified
    // In production, use proper PostGIS client
    return { lat: 0, lon: 0 };
  }
}

export class SupabaseInventoryRepository implements InventoryRepository {
  async getPartAvailability(partId: string, userLocation?: Location): Promise<SupplierResult[]> {
    const { data, error } = await supabase.rpc('get_part_availability', {
      part_id_filter: partId,
      user_lat: userLocation?.lat || null,
      user_lon: userLocation?.lon || null,
    });

    if (error) throw error;

    const results = (data || []).map(item => ({
      id: item.supplier_id,
      name: item.business_name,
      location: item.suburb,
      address: item.address,
      coordinates: { lat: 0, lon: 0 }, // Parse from geog
      distance: item.distance_km || 0,
      itemPrice: item.price,
      fuelCost: item.fuel_cost,
      totalCost: item.total_cost,
      stockQty: item.stock,
      partNumber: item.part_number,
      partName: item.part_name,
    }));

    // Add best flags
    if (results.length > 0) {
      const minPrice = Math.min(...results.map(r => r.itemPrice));
      const minDistance = Math.min(...results.map(r => r.distance));
      const minTotal = Math.min(...results.map(r => r.totalCost));

      results.forEach(r => {
        r.isBestPrice = r.itemPrice === minPrice;
        r.isClosest = r.distance === minDistance;
        r.isBestTotal = r.totalCost === minTotal;
      });
    }

    return results;
  }

  async getSupplierInventory(supplierId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('supplier_inventory')
      .select('*')
      .eq('supplier_id', supplierId);

    if (error) throw error;
    return data || [];
  }

  async updateStock(inventoryId: string, newStock: number): Promise<void> {
    const { error } = await supabase
      .from('supplier_inventory')
      .update({ stock: newStock })
      .eq('id', inventoryId);

    if (error) throw error;
  }

  async updatePrice(inventoryId: string, newPrice: number): Promise<void> {
    const { error } = await supabase
      .from('supplier_inventory')
      .update({ price: newPrice })
      .eq('id', inventoryId);

    if (error) throw error;
  }
}

export class SupabaseCouponRepository implements CouponRepository {
  async issueCoupon(
    userId: string,
    supplierId: string,
    partId: string,
    price: number,
    userLocation?: Location
  ): Promise<Coupon> {
    const { data, error } = await supabase.rpc('issue_coupon', {
      p_user_id: userId,
      p_supplier_id: supplierId,
      p_part_id: partId,
      p_inventory_id: null,
      p_price: price,
      p_user_lat: userLocation?.lat || null,
      p_user_lon: userLocation?.lon || null,
    });

    if (error) throw error;

    // Fetch the created coupon
    const coupon = await this.getCoupon(data);
    if (!coupon) throw new Error('Failed to retrieve issued coupon');
    return coupon;
  }

  async getCoupon(couponId: string): Promise<Coupon | null> {
    const { data, error } = await supabase
      .from('coupon_issues')
      .select('*')
      .eq('id', couponId)
      .single();

    if (error) return null;
    return this.transformCoupon(data);
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    const { data, error } = await supabase
      .from('coupon_issues')
      .select('*')
      .eq('code', code)
      .single();

    if (error) return null;
    return this.transformCoupon(data);
  }

  async getUserCoupons(userId: string): Promise<Coupon[]> {
    const { data, error } = await supabase
      .from('coupon_issues')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => this.transformCoupon(d));
  }

  async updateCouponState(couponId: string, newState: CouponState, actorId?: string): Promise<void> {
    const updates: any = { status: newState };

    const { error } = await supabase
      .from('coupon_issues')
      .update(updates)
      .eq('id', couponId);

    if (error) throw error;
  }

  async redeemCoupon(couponId: string, redeemedBy: string, orderAmount: number): Promise<void> {
    const { error } = await supabase
      .from('coupon_issues')
      .update({
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
        redeemed_by: redeemedBy,
        actual_order_amount: orderAmount,
      })
      .eq('id', couponId)
      .eq('status', ['issued', 'opened', 'navigation_started']);

    if (error) throw error;

    // Log event
    await supabase.rpc('log_coupon_event', {
      p_coupon_id: couponId,
      p_event_type: 'coupon_redeemed',
      p_actor_id: redeemedBy,
      p_metadata: { order_amount: orderAmount },
    });
  }

  private transformCoupon(data: any): Coupon {
    return {
      id: data.id,
      code: data.code,
      userId: data.user_id,
      supplierId: data.supplier_id,
      partId: data.part_id,
      originalPrice: data.original_price,
      discountAmount: data.discount_amount,
      discountPercent: data.discount_percent,
      finalPrice: data.final_price,
      state: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      redeemedAt: data.redeemed_at,
    };
  }
}

export class SupabaseVehicleRepository implements VehicleRepository {
  async getUserVehicles(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  async addVehicle(userId: string, vehicle: any): Promise<any> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ user_id: userId, ...vehicle })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async setPrimaryVehicle(vehicleId: string): Promise<void> {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('user_id')
      .eq('id', vehicleId)
      .single();

    if (!vehicle) return;

    // This is handled by trigger in database
    const { error } = await supabase
      .from('vehicles')
      .update({ is_primary: true })
      .eq('id', vehicleId);

    if (error) throw error;
  }
}

export class SupabaseEventRepository implements EventRepository {
  async logCouponEvent(
    couponId: string,
    eventType: string,
    actorId?: string,
    metadata?: any
  ): Promise<void> {
    const { error } = await supabase.rpc('log_coupon_event', {
      p_coupon_id: couponId,
      p_event_type: eventType,
      p_actor_id: actorId || null,
      p_metadata: metadata || null,
    });

    if (error) throw error;
  }
}

export class SupabaseSettlementRepository implements SettlementRepository {
  async generateMonthlySettlement(supplierId: string, year: number, month: number): Promise<string> {
    const { data, error } = await supabase.rpc('generate_monthly_settlement', {
      p_supplier_id: supplierId,
      p_year: year,
      p_month: month,
    });

    if (error) throw error;
    return data;
  }

  async getSupplierSettlements(supplierId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('supplier_monthly_settlements')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('settlement_month', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getSettlementDetails(settlementId: string): Promise<any> {
    const { data: settlement, error: settlementError } = await supabase
      .from('supplier_monthly_settlements')
      .select('*')
      .eq('id', settlementId)
      .single();

    if (settlementError) throw settlementError;

    const { data: lineItems, error: itemsError } = await supabase
      .from('settlement_line_items')
      .select('*')
      .eq('settlement_id', settlementId);

    if (itemsError) throw itemsError;

    return { ...settlement, lineItems: lineItems || [] };
  }
}
