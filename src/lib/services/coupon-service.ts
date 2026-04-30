// Coupon Service Layer
// Business logic for coupon operations

import { getCouponRepository, getEventRepository } from '../adapters/factory';
import { Location, Coupon } from '@/types';

export class CouponService {
  private couponRepo = getCouponRepository();
  private eventRepo = getEventRepository();

  /**
   * Issue a new coupon for a user at a supplier
   */
  async issueCoupon(params: {
    userId: string;
    supplierId: string;
    partId: string;
    price: number;
    inventoryId?: string;
    userLocation?: Location;
  }): Promise<Coupon> {
    const coupon = await this.couponRepo.issueCoupon(
      params.userId,
      params.supplierId,
      params.partId,
      params.price,
      params.inventoryId,
      params.userLocation
    );

    // Log event
    await this.eventRepo.logCouponEvent(
      coupon.id,
      'coupon_issued',
      params.userId,
      {
        supplierId: params.supplierId,
        partId: params.partId,
        price: params.price,
      }
    );

    return coupon;
  }

  /**
   * Mark coupon as viewed/opened
   */
  async markCouponViewed(couponId: string, userId: string): Promise<void> {
    await this.couponRepo.updateCouponState(couponId, 'opened', userId);
    await this.eventRepo.logCouponEvent(couponId, 'coupon_viewed', userId);
  }

  /**
   * Mark that user started navigation to supplier
   */
  async markNavigationStarted(couponId: string, userId: string): Promise<void> {
    await this.couponRepo.updateCouponState(couponId, 'navigation_started', userId);
    await this.eventRepo.logCouponEvent(couponId, 'navigation_started', userId);
  }

  /**
   * Redeem a coupon (supplier action)
   */
  async redeemCoupon(params: {
    couponId: string;
    redeemedBy: string; // Supplier user ID
    orderAmount: number;
  }): Promise<void> {
    const coupon = await this.couponRepo.getCoupon(params.couponId);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    if (coupon.state === 'redeemed') {
      throw new Error('Coupon already redeemed');
    }

    if (coupon.state === 'expired') {
      throw new Error('Coupon has expired');
    }

    if (new Date(coupon.expiresAt) < new Date()) {
      throw new Error('Coupon has expired');
    }

    await this.couponRepo.redeemCoupon(
      params.couponId,
      params.redeemedBy,
      params.orderAmount
    );

    await this.eventRepo.logCouponEvent(
      params.couponId,
      'coupon_redeemed',
      params.redeemedBy,
      { orderAmount: params.orderAmount }
    );
  }

  /**
   * Get user's coupons
   */
  async getUserCoupons(userId: string): Promise<Coupon[]> {
    return this.couponRepo.getUserCoupons(userId);
  }

  /**
   * Get coupon by code (for supplier verification)
   */
  async getCouponByCode(code: string): Promise<Coupon | null> {
    return this.couponRepo.getCouponByCode(code);
  }
}

// Singleton instance
export const couponService = new CouponService();
