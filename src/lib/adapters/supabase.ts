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
  ImportRepository,
} from '../repositories/types';
import { Location, Supplier, Part, InventoryItem, SupplierResult, Coupon, CouponState, ImportJob, ImportRow, ImportRowInput, ImportSourceType } from '@/types';

const supabase = createClient();

function normalizePartNumber(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function toPart(row: any): Part {
  const compatibility = Array.isArray(row.compatibility)
    ? row.compatibility.join(', ')
    : (row.compatibility || '');

  return {
    id: row.id,
    partNumber: row.part_number,
    partName: row.part_name,
    category: row.category,
    compatibility,
    description: row.description || '',
  };
}

export class SupabasePartsRepository implements PartsRepository {
  async searchParts(query: string): Promise<Part[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      const { data, error } = await supabase.from('parts').select('*');
      if (error) throw error;
      return (data || []).map((row: any) => toPart(row));
    }

    const normalized = normalizePartNumber(trimmed);
    let aliasPartIds: string[] = [];

    // Alias lookup allows supplier/OEM/aftermarket part numbers to resolve to canonical parts.
    if (normalized) {
      const { data: aliasMatches } = await supabase
        .from('part_number_aliases')
        .select('part_id')
        .eq('alias_part_number_normalized', normalized)
        .limit(50);

      aliasPartIds = Array.from(new Set((aliasMatches || []).map((row: any) => row.part_id)));
    }

    const { data: textMatches, error: textError } = await supabase
      .from('parts')
      .select('*')
      .or(`part_name.ilike.%${trimmed}%,part_number.ilike.%${trimmed}%,category.ilike.%${trimmed}%`)
      .limit(100);

    if (textError) throw textError;

    let aliasMatches: any[] = [];
    if (aliasPartIds.length > 0) {
      const { data: aliasParts, error: aliasError } = await supabase
        .from('parts')
        .select('*')
        .in('id', aliasPartIds);

      if (aliasError) throw aliasError;
      aliasMatches = aliasParts || [];
    }

    const merged = new Map<string, Part>();
    [...aliasMatches, ...(textMatches || [])].forEach((part: any) => {
      merged.set(part.id, toPart(part));
    });

    return Array.from(merged.values());
  }

  async getPartById(id: string): Promise<Part | null> {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return toPart(data);
  }

  async getPartByNumber(partNumber: string): Promise<Part | null> {
    const normalized = normalizePartNumber(partNumber);

    if (normalized) {
      const { data: alias } = await supabase
        .from('part_number_aliases')
        .select('part_id')
        .eq('alias_part_number_normalized', normalized)
        .limit(1)
        .maybeSingle();

      if (alias?.part_id) {
        const { data: part } = await supabase
          .from('parts')
          .select('*')
          .eq('id', alias.part_id)
          .maybeSingle();

        if (part) return toPart(part);
      }
    }

    const { data } = await supabase
      .from('parts')
      .select('*')
      .eq('part_number', partNumber)
      .maybeSingle();

    return data ? toPart(data) : null;
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
    const { data, error } = await (supabase as any).rpc('find_nearest_suppliers', {
      user_lat: location.lat,
      user_lon: location.lon,
      part_id_filter: partId || null,
      max_distance_km: maxDistanceKm,
      result_limit: 10,
    });

    if (error) throw error;
    return data?.map((s: any) => ({
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
    const { data, error } = await (supabase as any).rpc('get_part_availability', {
      part_id_filter: partId,
      user_lat: userLocation?.lat || null,
      user_lon: userLocation?.lon || null,
    });

    if (error) throw error;

    const results: SupplierResult[] = (data || []).map((item: any) => ({
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
      const minPrice = Math.min(...results.map((r: SupplierResult) => r.itemPrice));
      const minDistance = Math.min(...results.map((r: SupplierResult) => r.distance));
      const minTotal = Math.min(...results.map((r: SupplierResult) => r.totalCost));

      results.forEach((r: SupplierResult) => {
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
    const { data, error } = await (supabase as any).rpc('issue_coupon', {
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
    return (data || []).map((d: any) => this.transformCoupon(d));
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
      .in('status', ['issued', 'opened', 'navigation_started']);

    if (error) throw error;

    // Log event
    await (supabase as any).rpc('log_coupon_event', {
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
    const { error } = await (supabase as any).rpc('log_coupon_event', {
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
    const { data, error } = await (supabase as any).rpc('generate_monthly_settlement', {
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

function toImportJob(row: any): ImportJob {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    sourceType: row.source_type as ImportSourceType,
    status: row.status,
    fileName: row.file_name ?? undefined,
    rowCount: row.row_count,
    matchedCount: row.matched_count,
    unmatchedCount: row.unmatched_count,
    errorCount: row.error_count,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toImportRow(row: any): ImportRow {
  return {
    id: row.id,
    jobId: row.job_id,
    rowNumber: row.row_number,
    rawPartNumber: row.raw_part_number,
    normalizedPartNumber: row.normalized_part_number,
    rawDescription: row.raw_description ?? undefined,
    price: row.price ?? undefined,
    stock: row.stock ?? undefined,
    matchStatus: row.match_status,
    matchedPartId: row.matched_part_id ?? undefined,
    errorReason: row.error_reason ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    createdAt: row.created_at,
  };
}

export class SupabaseImportRepository implements ImportRepository {
  async createJob(
    supplierId: string,
    sourceType: ImportSourceType,
    rows: ImportRowInput[],
    fileName?: string
  ): Promise<ImportJob> {
    // 1. Create the job record
    const { data: jobData, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        supplier_id: supplierId,
        source_type: sourceType,
        file_name: fileName ?? null,
        row_count: rows.length,
      })
      .select()
      .single();

    if (jobError) throw jobError;
    const jobId = jobData.id;

    // 2. Insert all rows
    if (rows.length > 0) {
      const rowInserts = rows.map(r => ({
        job_id: jobId,
        row_number: r.rowNumber,
        raw_part_number: r.rawPartNumber,
        raw_description: r.rawDescription ?? null,
        price: r.price ?? null,
        stock: r.stock ?? null,
      }));

      const { error: rowsError } = await supabase
        .from('import_rows')
        .insert(rowInserts);

      if (rowsError) throw rowsError;
    }

    // 3. Run alias-matching on the DB
    const { error: procError } = await (supabase as any).rpc('process_import_job', {
      p_job_id: jobId,
    });
    if (procError) throw procError;

    // 4. Return refreshed job
    const { data: refreshed, error: refreshError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (refreshError) throw refreshError;
    return toImportJob(refreshed);
  }

  async getJobs(supplierId: string): Promise<ImportJob[]> {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(toImportJob);
  }

  async getJobWithRows(jobId: string): Promise<{ job: ImportJob; rows: ImportRow[] } | null> {
    const { data: jobData, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError) throw jobError;
    if (!jobData) return null;

    const { data: rowsData, error: rowsError } = await supabase
      .from('import_rows')
      .select('*')
      .eq('job_id', jobId)
      .order('row_number', { ascending: true });

    if (rowsError) throw rowsError;

    return {
      job: toImportJob(jobData),
      rows: (rowsData || []).map(toImportRow),
    };
  }

  async resolveRow(rowId: string, partId: string): Promise<void> {
    const { error } = await supabase
      .from('import_rows')
      .update({
        matched_part_id: partId,
        match_status: 'matched',
        error_reason: null,
      })
      .eq('id', rowId);

    if (error) throw error;

    // Refresh job counts by re-running process step (counts only, matched rows already set)
    const { data: rowData } = await supabase
      .from('import_rows')
      .select('job_id')
      .eq('id', rowId)
      .single();

    if (rowData?.job_id) {
      await supabase
        .from('import_jobs')
        .update({
          matched_count: supabase
            .from('import_rows')
            .select('id', { count: 'exact', head: true })
            .eq('job_id', rowData.job_id)
            .eq('match_status', 'matched') as any,
          unmatched_count: supabase
            .from('import_rows')
            .select('id', { count: 'exact', head: true })
            .eq('job_id', rowData.job_id)
            .eq('match_status', 'unmatched') as any,
        })
        .eq('id', rowData.job_id);
    }
  }

  async approveJob(jobId: string): Promise<{ upserted: number }> {
    const { data, error } = await (supabase as any).rpc('approve_import_job', {
      p_job_id: jobId,
    });

    if (error) throw error;
    return { upserted: data?.upserted ?? 0 };
  }

  async rejectJob(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('import_jobs')
      .update({ status: 'rejected' })
      .eq('id', jobId);

    if (error) throw error;
  }
}
