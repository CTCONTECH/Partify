import { Coupon, CouponState } from '@/types';

/**
 * Generate a unique coupon code
 */
export function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PFY-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new coupon (mock - will use Supabase backend)
 */
export function createCoupon(
  userId: string,
  supplierId: string,
  partId: string,
  originalPrice: number,
  discountPercent: number = 5 // Default 5% discount
): Coupon {
  const discountAmount = Math.round(originalPrice * (discountPercent / 100) * 100) / 100;
  const finalPrice = originalPrice - discountAmount;

  // 24 hour expiry
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return {
    id: `cpn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    code: generateCouponCode(),
    userId,
    supplierId,
    partId,
    originalPrice,
    discountAmount,
    discountPercent,
    finalPrice,
    state: 'issued',
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  };
}

/**
 * Update coupon state (mock - will use Supabase backend)
 */
export function updateCouponState(couponId: string, newState: CouponState): void {
  // This will be replaced with Supabase API call
  console.log(`Coupon ${couponId} state updated to ${newState}`);

  // Store state change in localStorage for demo
  if (typeof window !== 'undefined') {
    const key = `coupon_state_${couponId}`;
    localStorage.setItem(key, JSON.stringify({
      state: newState,
      timestamp: new Date().toISOString()
    }));
  }
}

/**
 * Check if coupon is expired
 */
export function isCouponExpired(coupon: Coupon): boolean {
  return new Date(coupon.expiresAt) < new Date();
}

/**
 * Get time remaining for coupon
 */
export function getCouponTimeRemaining(coupon: Coupon): string {
  const now = new Date();
  const expiry = new Date(coupon.expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

/**
 * Format coupon code for display (add spaces)
 */
export function formatCouponCode(code: string): string {
  // PFY-ABCD1234 → PFY-ABCD 1234
  if (code.includes('-') && code.length > 8) {
    const parts = code.split('-');
    if (parts[1] && parts[1].length >= 8) {
      return `${parts[0]}-${parts[1].substring(0, 4)} ${parts[1].substring(4)}`;
    }
  }
  return code;
}
