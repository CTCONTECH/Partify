import { createClient } from '@/lib/supabase/client';
import { Coupon, Location } from '@/types';
import { couponService } from '@/lib/services/coupon-service';

export interface LiveCouponContext {
  supplier: {
    id: string;
    name: string;
    address: string;
    location: string;
    coordinates: Location;
  };
  part: {
    id: string;
    partNumber: string;
    partName: string;
  };
  inventory: {
    id: string;
    price: number;
    stock: number;
  };
}

function toCoupon(row: any): Coupon {
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    supplierId: row.supplier_id,
    partId: row.part_id,
    originalPrice: Number(row.original_price),
    discountAmount: Number(row.discount_amount),
    discountPercent: Number(row.discount_percent),
    finalPrice: Number(row.final_price),
    state: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    redeemedAt: row.redeemed_at || undefined,
  };
}

export async function getLiveCouponContext(supplierId: string, partId: string): Promise<LiveCouponContext | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_coupon_context', {
    supplier_id_filter: supplierId,
    part_id_filter: partId,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    supplier: {
      id: row.supplier_id,
      name: row.business_name,
      address: row.address,
      location: row.suburb,
      coordinates: {
        lat: Number(row.latitude || 0),
        lon: Number(row.longitude || 0),
      },
    },
    part: {
      id: row.part_id,
      partNumber: row.part_number,
      partName: row.part_name,
    },
    inventory: {
      id: row.inventory_id,
      price: Number(row.price),
      stock: Number(row.stock),
    },
  };
}

export async function getOrIssueLiveCoupon(params: {
  userId: string;
  supplierId: string;
  partId: string;
  inventoryId: string;
  price: number;
  userLocation?: Location;
}): Promise<Coupon> {
  const supabase = createClient();

  const { data: existing, error: existingError } = await supabase
    .from('coupon_issues')
    .select('*')
    .eq('user_id', params.userId)
    .eq('supplier_id', params.supplierId)
    .eq('part_id', params.partId)
    .in('status', ['issued', 'opened', 'navigation_started'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return toCoupon(existing);

  return couponService.issueCoupon({
    userId: params.userId,
    supplierId: params.supplierId,
    partId: params.partId,
    inventoryId: params.inventoryId,
    price: params.price,
    userLocation: params.userLocation,
  });
}
